"""Independent check of the archived translation diagnostic and register integrity."""
import json
from pathlib import Path
import numpy as np
from sklearn.metrics import adjusted_rand_score, silhouette_score

root = Path(__file__).resolve().parents[1]
reference = json.loads(Path('/tmp/contrast-reference.json').read_text())
report = json.loads((root/'public/research/contrast/seasonal-diagnosis.json').read_text())
data = reference['input']
rows = sorted(data['training']['rows'], key=lambda r:r['id'])
later = {r['id']:r for r in data['validation']['rows']}
x = np.array([r['values'] for r in rows])
y = np.array([later[r['id']]['values'] for r in rows])
z = (x-x.mean(0))/x.std(0, ddof=1)
zv = (y-x.mean(0))/x.std(0, ddof=1)
shift = zv.mean(0)
np.testing.assert_allclose(shift, [r['meanShiftInTrainingSpatialSD'] for r in report['features']], atol=1e-9)
for fit, diagnostic in zip(reference['result']['fits'], report['fits']):
    basis = np.array(fit['basis']).T
    scores = z@basis
    raw = zv@basis
    centered = (zv-shift)@basis
    ratio = np.linalg.norm(shift@basis)/np.sqrt(np.mean(np.sum(scores**2, axis=1)))
    np.testing.assert_allclose(ratio, diagnostic['shiftToTrainingRadius'], atol=1e-9)
    for c, d in zip(fit['candidates'], diagnostic['candidates']):
        labels = np.array(c['labels'])
        ids = np.unique(labels)
        centers = np.array([scores[labels==i].mean(0) for i in ids])
        assign = lambda s: ids[np.argmin(np.sum((s[:,None]-centers[None,:])**2,axis=2),axis=1)]
        np.testing.assert_allclose(adjusted_rand_score(labels,assign(raw)),d['originalARI'])
        np.testing.assert_allclose(adjusted_rand_score(labels,assign(centered)),d['recenteredARI'])
        np.testing.assert_allclose(silhouette_score(zv-shift,labels),d['fixedLabelSilhouette'])
reg = json.loads((root/'public/research/panchayats/phagwara-2024.json').read_text())
assert reg['count']==len(reg['records'])==91
assert len({r['record_id'] for r in reg['records']})==91
assert all(r['lgd_code'] is None and r['geometry'] is None and r['model_ready'] is False for r in reg['records'])
print('Independent seasonal metrics and register integrity passed')
