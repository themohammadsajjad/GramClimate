"""Independent PCA and metric verification for real GFS profiles."""
import json
import numpy as np
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score

with open('/tmp/gram-real-reference.json') as source:
    fixture=json.load(source)
x=np.array([r['values'] for r in fixture['data']['rows']])
z=(x-x.mean(axis=0))/x.std(axis=0,ddof=1)
pca=PCA(svd_solver='full').fit(z)
for run in fixture['runs']:
    np.testing.assert_allclose(run['ratios'],pca.explained_variance_ratio_,atol=1e-9)
    labels=np.array(run['labels']);valid=labels>=0
    reduced=z if run['settings'].get('reduction')=='none' else np.array(run['scores'])[:,:run['components']]
    if 1<len(np.unique(labels[valid]))<valid.sum():
        assert abs(silhouette_score(z[valid],labels[valid])-run['commonSilhouette'])<1e-9
        assert abs(davies_bouldin_score(z[valid],labels[valid])-run['commonDaviesBouldin'])<1e-9
        assert abs(silhouette_score(reduced[valid],labels[valid])-run['silhouette'])<1e-9
    print(run['settings']['algorithm'],run['settings'].get('reduction','pca'),'independent numerical checks passed')
