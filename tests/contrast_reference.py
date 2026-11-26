"""Check the research projection against NumPy and sklearn, including unequal weights."""
import json
import numpy as np
from sklearn.metrics import adjusted_rand_score, silhouette_score
for path in ['/tmp/contrast-reference.json','/tmp/contrast-weighted-reference.json']:
    record=json.load(open(path))
    data=record['input']; result=record['result']; rank=record['settings']['components']
    rows=sorted(data['training']['rows'],key=lambda r:r['id'])
    later={r['id']:r for r in data['validation']['rows']}
    x=np.array([r['values'] for r in rows]); y=np.array([later[r['id']]['values'] for r in rows])
    z=(x-x.mean(0))/x.std(0,ddof=1); zv=(y-x.mean(0))/x.std(0,ddof=1)
    groups=np.array([r['block'] for r in rows])
    residual=z.copy()
    for group in np.unique(groups): residual[groups==group]-=z[groups==group].mean(0)
    for fit in result['fits']:
        weights=np.sqrt(fit['reliability']); weighted=z*weights
        ct=weighted.T@weighted/(len(z)-1)
        rw=residual*weights; cw=rw.T@rw/(len(z)-len(np.unique(groups)))
        a=fit['effectiveAlpha']; matrix=(1-a)*ct/np.trace(ct)+a*cw/np.trace(cw)
        values,vectors=np.linalg.eigh(matrix); basis=vectors[:,np.argsort(values)[::-1][:rank]]
        actual=np.array(fit['basis']).T
        np.testing.assert_allclose(actual@actual.T,basis@basis.T,atol=1e-8)
        np.testing.assert_allclose(fit['eigenvalues'],np.sort(values)[::-1],atol=1e-9)
        effective=weights[:,None]*actual
        u,s,_=np.linalg.svd(effective,full_matrices=False); q=u[:,s>1e-10]
        retention=np.linalg.norm(residual@q)**2/np.linalg.norm(residual)**2
        np.testing.assert_allclose(retention,fit['withinRetention'],atol=1e-9)
        for c in fit['candidates']:
            np.testing.assert_allclose(c['stabilityARI'],adjusted_rand_score(c['labels'],c['validationLabels']),atol=1e-12)
            np.testing.assert_allclose(c['training']['silhouette'],silhouette_score(z,c['labels']),atol=1e-9)
            np.testing.assert_allclose(c['validationFixedLabels']['silhouette'],silhouette_score(zv,c['labels']),atol=1e-9)
    print(path,'independent checks passed')
