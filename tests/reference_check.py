"""Compare engine results with independent numerical implementations.

First produce /tmp/gram-analysis.json using the engine, then run this file.
Requires numpy and scikit-learn in the verification environment only.
"""
import json
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cluster import AgglomerativeClustering, DBSCAN
from sklearn.metrics import adjusted_rand_score, silhouette_score, davies_bouldin_score

with open('/tmp/gram-analysis.json') as source:
    fixture = json.load(source)
x = np.array([row['values'] for row in fixture['data']['rows']])
z = (x - x.mean(axis=0)) / x.std(axis=0, ddof=1)
reference = PCA().fit(z)
for result in fixture['runs']:
    np.testing.assert_allclose(result['ratios'], reference.explained_variance_ratio_, atol=1e-9)
    scores = np.array(result['scores'])
    np.testing.assert_allclose(scores.T @ scores / (len(x)-1), np.diag(reference.explained_variance_), atol=1e-8)
    reduced = scores[:, :result['components']]
    labels = np.array(result['labels'])
    valid = labels >= 0
    assert abs(silhouette_score(reduced[valid], labels[valid]) - result['silhouette']) < 1e-9
    assert abs(davies_bouldin_score(reduced[valid], labels[valid]) - result['daviesBouldin']) < 1e-9
    algorithm = result['settings']['algorithm']
    if algorithm == 'agglomerative':
        expected = AgglomerativeClustering(n_clusters=4, linkage='average').fit_predict(reduced)
        assert adjusted_rand_score(expected, labels) == 1
    elif algorithm == 'dbscan':
        expected = DBSCAN(eps=1.2, min_samples=4).fit_predict(reduced)
        assert adjusted_rand_score(expected, labels) == 1
    print(algorithm, 'reference checks passed')
