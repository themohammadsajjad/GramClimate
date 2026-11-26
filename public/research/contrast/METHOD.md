# Within-group contrast PCA — research prototype 0.1

23 October 2026. Original project: PCA-Based Downscaling of Block-Level Weather Forecast Features to Panchayat-Level Clusters.

## Scope

This is an executable research hypothesis, not a validated invention. It produces representations and exploratory clusters, not numerical panchayat weather forecasts. No patent application has been prepared or filed by this software. No local accuracy claim is supported by the bundled data.

## Exact objective

Given n training profiles with p features, compute training column means and sample standard deviations. Set constant standardized columns to zero. Let Z be the standardized matrix and D = diag(sqrt(q)), where each declared feature reliability weight q is in [0,1]. X = ZD. Let R contain X minus its declared group means. With B groups:

Ct = X'X / (n - 1)
Cw = R'R / (n - B)
M = (1 - alpha) Ct / trace(Ct) + alpha Cw / trace(Cw)

Choose the leading m orthonormal eigenvectors V of M, maximizing trace(V'MV), subject to V'V = I. Scores are XV. This is a positive covariance mixture; it is NOT the foreground-minus-background objective of contrastive PCA. Group contributions are proportional to their within-group degrees of freedom, not equally weighted blocks. Trace normalization can amplify weak/noisy local variation: document reliability and evaluate sensitivity before drawing conclusions.

If trace(Cw) is negligible, alpha is effectively zero and every resolution fails the local-evidence gate. Zero total weighted variance is rejected. Reliability is supplied by the analyst with a documented basis. It is not learned or calibrated in this release. No missing values are filled.

All comparisons use the same rank m and candidate k values. Baselines are ordinary PCA (alpha=0, q=1) and reliability-weighted PCA (alpha=0, supplied q). The proposed mixture uses the supplied alpha and q. Rank and alpha are user controls; joint automatic optimization of them is not implemented.

## Common-space reporting

The effective loadings for unweighted Z are DV. Obtain an orthonormal basis Q for their span. Common total retention is ||ZQ||² / ||Z||². Common within-group retention uses group-centred Z in the same ratio. Weighted-space within retention is reported separately. Eigenvalues of M describe the mixed objective, not percentages of original weather variance.

Cluster metrics use original Z, including features downweighted by the projection. Validation uses the training means, scales, basis and centroids. Validation silhouette keeps training memberships fixed. Temporal ARI compares training memberships against nearest-training-centroid assignments on validation profiles. Static covariates can inflate persistence. Per-location peer overlap is the Jaccard overlap of same-cluster neighbours, excluding the location itself; it is not a confidence probability.

## Resolution gate

Evaluate k=2 through maxK with deterministic 16-start K-Means. Retain the largest k with all requested clusters present, at least two members per cluster in both periods, temporal ARI >= 0.65, nonzero weighted within-group input variation, and common within-group retention >= 0.50. If no candidate passes, report unresolved.

These are exploratory engineering thresholds, not statistically calibrated significance tests. This is a candidate-resolution gate, not a hierarchical split/merge algorithm. Validation is used to select resolution; it cannot also establish unbiased generalization. There is no guarantee that more clusters or greater retention improves actual local weather relevance.

## Bundled real-data experiment

16 NOAA GFS cells, from Open-Meteo previous-runs archives. Training: 1 January–30 June 2025. Validation: 4 July–30 September 2025. Four groups are created by sorting cells by latitude then longitude and taking consecutive groups of four. They are analyst-defined latitude strips, NOT administrative blocks or panchayats. The weather values are real archived model output. All q=1 because differential reliability is unknown. The 2026 frozen benchmark is not read by this module. Source archives and hashes remain available in Real-data validation.

## Input contract

POST /api/contrast with JSON {"input": ..., "settings": {"alpha":0.5,"components":2,"maxK":4}}.

Input fields:
- schemaVersion: 1.
- scope: research-grid or panchayat.
- provenance: source, grouping, reliabilityBasis strings; boundarySource is required for panchayat scope. Cite exact releases, administrative codes, spatial join method, acquisition dates and units in these declarations.
- periods: training and validation arrays of two ISO dates [start,end]. Validation must follow training. Use a forecast-lead-aware purge interval; the endpoint checks non-overlap only.
- training and validation: Dataset objects, each with name, source (gfs/uploaded/synthetic), features, rows. One row per location: id, name, block, latitude, longitude, values.
- featureRoles: one weather/local role per feature, with at least one weather feature. Panchayat scope also requires local covariates.
- reliability: one finite numeric weight in [0,1] per feature, at least one positive.

6–120 locations, 2–20 features, at least two groups with three locations each. Both periods must have matching location IDs, coordinates, group memberships and feature order. Labels/targets are prohibited as feature names. Missing/nonfinite numeric values, invalid dates and overlapping periods are rejected. Source/boundary declarations are user-supplied, not independently authenticated. Upload max 450 KB in the UI, 500 KB endpoint body limit.

The grid-input.json download is a complete runnable example. Do not rename its groups to real panchayats. For actual panchayat research, replace both datasets with correctly joined administrative records and independent local features. Weather model resolution must be preserved in provenance; copying coarse values cannot create local weather information.

## Reproduction and verification

Node 24: node --test tests/engine.test.mjs tests/real-data.test.mjs tests/contrast.test.mjs
Python with NumPy and scikit-learn: python tests/contrast_reference.py (after Node tests).

Independent checks compare projectors, eigenvalues, retention, ARI and silhouette. Unit tests cover zero within-group contrast, alpha-zero baseline equivalence, row-order invariance, training/validation separation and malformed input. These establish implementation correctness, not scientific validity.

## Required next research

Acquire verified panchayat polygons and local covariates, retain provenance and source licenses, predefine spatial/temporal holdouts, compare weighted/multilevel/contrastive alternatives, add local-only ablations, and assess relevance using independent station data. Match rank and k when claiming gains. Keep a new final test untouched. A claim-wise prior-art review and a demonstrated technical effect are still outstanding.
