"""Collect the held-out archive only after a validation selection has been saved."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
import argparse
import hashlib
import json

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
selection=ROOT.parent/'public/research/selection.json'
assert selection.exists(), 'Run selection before requesting held-out data'
selection_hash=hashlib.sha256(selection.read_bytes()).hexdigest()
args.output.mkdir(parents=True,exist_ok=True)
features=json.loads((ROOT.parent/'public/research/train.json').read_text())['features']

def collect(item):
    i,(lat,lon)=item
    name=f'GRID-{i+1:03d}.json'
    params={'latitude':lat,'longitude':lon,'start_date':'2026-01-01','end_date':'2026-09-30','hourly':','.join(features),'models':'gfs_seamless','elevation':'nan','cell_selection':'nearest','timezone':'GMT','wind_speed_unit':'ms'}
    url='https://previous-runs-api.open-meteo.com/v1/forecast?'+urlencode(params)
    path=args.output/name
    if path.exists(): raw=path.read_bytes()
    else:
        with urlopen(url,timeout=55) as response: raw=response.read()
        payload=json.loads(raw)
        assert 'hourly' in payload, 'Source returned an error'
        path.write_bytes(raw)
    d=json.loads(raw)
    assert d['hourly']['time'][0]=='2026-01-01T00:00' and d['hourly']['time'][-1]=='2026-09-30T23:00'
    assert len(d['hourly']['time'])==6552
    print(name,'verified',flush=True)
    return {'file':name,'request':url,'sha256':hashlib.sha256(raw).hexdigest(),'retrievedAt':datetime.now(timezone.utc).isoformat()}

points=[(lat,lon) for lat in [31,31.25,31.5,31.75] for lon in [75.5,75.75,76,76.25]]
with ThreadPoolExecutor(max_workers=2) as pool:
    records=list(pool.map(collect,enumerate(points)))
assert hashlib.sha256(selection.read_bytes()).hexdigest()==selection_hash
(args.output/'manifest.json').write_text(json.dumps({'selectionSha256BeforeDownload':selection_hash,'source':'NOAA GFS via Open-Meteo','dataLicense':'CC BY 4.0; hosted API non-commercial terms are separate','records':records},indent=2))
