"""Select on 2025 data; evaluate once on the separately collected 2026 archive."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, adjusted_rand_score
from threadpoolctl import threadpool_limits
threadpool_limits(1)

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / 'public/research'
parser = argparse.ArgumentParser()
parser.add_argument('stage', choices=['select', 'test'])
parser.add_argument('--archive', type=Path, required=True)
args = parser.parse_args()
OUT.mkdir(exist_ok=True)

def load_daily(folder):
    arrays, locations, features = [], [], None
    hashes = {}
    clipped = 0
    reference_times = None
    for path in sorted(folder.glob('GRID-*.json')):
        raw = path.read_bytes()
        hashes[path.name] = hashlib.sha256(raw).hexdigest()
        data = json.loads(raw)
        h = data['hourly']
        keys = [k for k in h if k != 'time']
        if features is None: features = keys
        assert keys == features, 'Feature order changed'
        times = np.array(h['time'], dtype='datetime64[h]')
        assert len(times) % 24 == 0 and np.all(np.diff(times) == np.timedelta64(1,'h'))
        if reference_times is None: reference_times = times
        assert np.array_equal(times,reference_times), 'Timestamps differ across locations'
        values = np.array([h[f] for f in features], dtype=float).T
        assert not np.isinf(values).any(), 'Invalid infinite source value'
        for j, f in enumerate(features):
            if f.startswith('cloud_cover'):
                clipped += int(((values[:, j] < 0) | (values[:, j] > 100)).sum())
                values[:, j] = values[:, j].clip(0,100)
        arrays.append(values.reshape(-1,24,len(features)).mean(axis=1))
        locations.append({'id':path.stem, 'name':path.stem, 'block':'Unassigned research grid', 'latitude':data['latitude'], 'longitude':data['longitude']})
    assert len(arrays) == 16 and len({(r['latitude'],r['longitude']) for r in locations}) == 16
    daily = np.stack(arrays, axis=1)
    days = times[::24].astype('datetime64[D]').astype(str)
    complete = np.isfinite(daily).all(axis=(1,2))
    excluded = days[~complete].tolist()
    if excluded:
        assert args.stage == 'test' and excluded == ['2026-04-18', '2026-04-19'], 'Unexpected missingness requires review'
    return daily[complete], days[complete], features, locations, hashes, clipped

def lloyd(x, k, start):
    centers = [x[start].copy()]
    while len(centers) < k:
        distances = ((x[:,None,:]-np.array(centers)[None,:,:])**2).sum(axis=2).min(axis=1)
        centers.append(x[distances.argmax()].copy())
    centers = np.array(centers)
    labels = np.full(len(x), -1)
    for _ in range(100):
        nxt = ((x[:,None,:]-centers[None,:,:])**2).sum(axis=2).argmin(axis=1)
        if np.array_equal(nxt, labels): break
        labels = nxt
        for c in range(k):
            if (labels==c).any(): centers[c] = x[labels==c].mean(axis=0)
    inertia = sum(((x[labels==c]-x[labels==c].mean(axis=0))**2).sum() for c in np.unique(labels))
    return labels, float(inertia)

def fit(x, config):
    mu, sigma = x.mean(axis=0), x.std(axis=0, ddof=1)
    sigma = np.where(sigma<1e-12,1,sigma)
    z = (x-mu)/sigma
    pca = PCA(svd_solver='full').fit(z)
    r = int(np.searchsorted(pca.explained_variance_ratio_.cumsum(),config['variance']/100-1e-10)+1)
    reduced = z if config['reduction']=='none' else pca.transform(z)[:,:r]
    labels,inertia = min((lloyd(reduced,config['k'],s) for s in range(config['starts'])), key=lambda v:v[1])
    return dict(labels=labels, mean=mu, scale=sigma, inertia=inertia, components=len(x[0]) if config['reduction']=='none' else r)

def score(x, model):
    return float(silhouette_score((x-model['mean'])/model['scale'],model['labels']))

def sample(rng,n):
    starts=rng.integers(0,n,size=int(np.ceil(n/7)))
    return ((starts[:,None]+np.arange(7))%n).ravel()[:n]

def save_profile(name, cube, features, locations, period, hashes, notes):
    data={'name':f'NOAA GFS · {period}', 'source':'gfs', 'features':features,
          'provenance':{'provider':'NOAA GFS via Open-Meteo', 'period':period, 'unit':'Research grid cell; administrative join pending', 'hourlyRecords':int(len(cube)*24*len(locations)), 'sha256':hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest(), 'notes':notes},
          'rows':[{**loc,'values':row.tolist()} for loc,row in zip(locations,cube.mean(axis=0))]}
    (OUT/f'{name}.json').write_text(json.dumps(data,indent=2))
    return data

cube, dates, features, locations, hashes, clipped = load_daily(args.archive)
baseline={'algorithm':'kmeans','k':4,'variance':90,'starts':1,'reduction':'pca','eps':1.2,'minPts':4}
if args.stage == 'select':
    train=cube[dates<'2025-07-01']
    val=cube[(dates>='2025-07-04') & (dates<'2025-10-01')]
    assert len(train)==181 and len(val)==89
    np.savez_compressed(ROOT/'training_daily.npz',train=train,validation=val)
    configs=[baseline]+[{**baseline,'k':k,'starts':16,'reduction':reduction,'variance':variance} for k in [2,3,4,5] for reduction,variance in [('pca',90),('pca',95),('none',100)]]
    rng=np.random.default_rng(20261017)
    samples=[sample(rng,len(train)) for _ in range(100)]
    results=[]
    for i,config in enumerate(configs):
        model=fit(train.mean(axis=0),config)
        stability=float(np.mean([adjusted_rand_score(model['labels'],fit(train[idx].mean(axis=0),config)['labels']) for idx in samples]))
        sizes=np.bincount(model['labels']).tolist()
        result={'id':f'candidate-{i}','config':config,'labels':model['labels'].tolist(),'sizes':sizes,'train':score(train.mean(axis=0),model),'validation':score(val.mean(axis=0),model),'stability':stability,'components':model['components']}
        result['eligible']=i>0 and min(sizes)>=2 and len(sizes)==config['k'] and stability>=.65 and result['validation']>0
        results.append(result)
    eligible=[r for r in results if r['eligible']]
    selected=max(eligible,key=lambda r:(r['validation'],r['stability'],-r['config']['k'])) if eligible else results[0]
    selection={'protocolSha256':hashlib.sha256((ROOT/'PROTOCOL_V2.md').read_bytes()).hexdigest(),'selected':selected['id'],'candidates':results,'testInspected':False}
    (OUT/'selection.json').write_text(json.dumps(selection,indent=2))
    notes=['Archived model forecasts, not station observations.','24/72 h provider offsets; exact model initialization timestamps unavailable.','Cloud cover clipped to [0,100] in summaries; raw responses preserved.','Locations are not verified panchayats.']
    save_profile('train',train,features,locations,'Jan–Jun 2025',hashes,notes)
    save_profile('validation',val,features,locations,'4 Jul–30 Sep 2025',hashes,notes)
    (ROOT/'source_2025.json').write_text(json.dumps({'hashes':hashes,'clipped':clipped},indent=2))
    print(json.dumps({'selected':selected,'eligibleCandidates':len(eligible)},indent=2))
else:
    selection=json.loads((OUT/'selection.json').read_text())
    assert selection['testInspected'] is False
    train=np.load(ROOT/'training_daily.npz')['train']
    test=cube[(dates>='2026-01-04') & (dates<='2026-09-30')]
    test_dates=dates[(dates>='2026-01-04') & (dates<='2026-09-30')]
    assert len(test)==268
    old=json.loads((OUT/'train.json').read_text())
    assert features==old['features']
    assert all(a['id']==b['id'] and abs(a['latitude']-b['latitude'])<1e-5 and abs(a['longitude']-b['longitude'])<1e-5 for a,b in zip(locations,old['rows'])), 'Grid shifted; independent alignment needed'
    selected=next(c for c in selection['candidates'] if c['id']==selection['selected'])
    base_model=fit(train.mean(axis=0),baseline)
    model=fit(train.mean(axis=0),selected['config'])
    base=score(test.mean(axis=0),base_model); candidate=score(test.mean(axis=0),model)
    rng=np.random.default_rng(20261018)
    deltas=[]
    for _ in range(500):
        x=test[sample(rng,len(test))].mean(axis=0)
        deltas.append(score(x,model)-score(x,base_model))
    interval=np.percentile(deltas,[2.5,97.5]).tolist()
    quarterly=[]
    for start,end,name in [('2026-01-04','2026-03-31','Q1 2026'),('2026-04-01','2026-06-30','Q2 2026'),('2026-07-01','2026-09-30','Q3 2026')]:
        part=test[(test_dates>=start)&(test_dates<=end)]
        quarterly.append({'period':name,'days':len(part),'baseline':score(part.mean(axis=0),base_model),'candidate':score(part.mean(axis=0),model)})
    promote=bool(selected['eligible'] and candidate-base>=.02 and interval[0]>0 and all(q['candidate']>=0 for q in quarterly))
    result={'protocolSha256':selection['protocolSha256'],'dataQualityAmendmentSha256':hashlib.sha256((ROOT/'DATA_QUALITY_AMENDMENT.md').read_bytes()).hexdigest(),'selected':selected,'baselineConfig':baseline,'test':{'period':'4 Jan–30 Sep 2026','days':268,'excludedDates':['2026-04-18','2026-04-19'],'locations':16,'hourlyRecords':102912,'baseline':base,'candidate':candidate,'delta':candidate-base,'pairedDeltaCI95':interval,'quarterly':quarterly},'promoted':promote,'activeConfig':selected['config'] if promote else baseline,'source':{'provider':'NOAA GFS via Open-Meteo','clippedValuesInDownloaded2026Archive':clipped,'rawHashes':hashes},'limits':['Same-site temporal persistence; no unseen-site evaluation.','Conditional bootstrap interval; spatial sample is only 16 grid cells.','Two incomplete days excluded across all cells; no imputation.','No station observations or validated panchayat joins.','Scores are cluster separation, not forecast accuracy.']}
    (OUT/'benchmark.json').write_text(json.dumps(result,indent=2))
    np.savez_compressed(ROOT/'heldout_daily.npz',test=test)
    save_profile('test',test,features,locations,'4 Jan–30 Sep 2026',hashes,old['provenance']['notes']+['18–19 April excluded from every feature and cell because cloud-cover data is missing; 268 complete days.'])
    print(json.dumps(result,indent=2))
