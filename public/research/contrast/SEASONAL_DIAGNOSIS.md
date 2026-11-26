# Seasonal failure diagnosis — 29 October 2026

## What was tested
The archived 16-cell GFS input uses January–June 2025 training profiles and July 4–September 30 validation profiles. Four latitude strips are analyst groups, not official blocks. Use the input SHA-256 in seasonal-diagnosis.json to identify the exact input. Rank 2, alpha 0.5, reliability weights 1, candidate k=2,3,4 were retained without searching for a winning setting.

Run from the repository root:

    node --experimental-strip-types research/diagnose_seasons.mjs

The script fits the existing model, computes the regional mean shift in training-standardized features, subtracts that common vector from every validation profile, and reassigns against unchanged training centroids. It asserts that training labels and fixed-label validation silhouette remain unchanged.

## Findings
All raw assignments collapse into one cluster, with ARI 0. The common projected shift is 3.152 times the training score-cloud RMS radius for standard PCA and 2.993 for contrast PCA. Humidity, precipitation and pressure show particularly large shifts relative to the small between-cell variation used by the scaler. This is not a comparison against daily weather standard deviations.

After validation-cohort recentering:

| k | Standard PCA ARI | Contrast PCA ARI |
|---|---:|---:|
| 2 | 1.000 | 1.000 |
| 3 | 0.532 | 0.532 |
| 4 | 0.414 | 0.570 |

At k=2, membership sizes return to 13 and 3. At k=4 a singleton remains. Neither finer resolution passes the original agreement threshold of 0.65. Fixed-label validation silhouettes remain 0.625, 0.240 and 0.151 because common translation preserves pairwise distances.

The experiment isolates a removable common translation as a sufficient explanation for the k=2 collapse. Seasonal changes are a plausible source, but one cross-season comparison cannot separate seasonality from other temporal shifts. Residual finer-scale changes remain. A scalar accuracy claim is inappropriate for this unsupervised experiment.

## Why this is not improvement proof
Validation-cohort recentering is transductive: every validation location contributes to the correction. It is a diagnostic, not a previously frozen forecasting procedure. Both methods recover k=2 equally; the k=4 difference is exploratory and does not pass stability gates. No confidence interval or superiority claim is justified by this one small spatial cohort. No patent novelty is established.

## Next preregistered experiment
1. Obtain multiple complete historical years with identical variables and lead times. Preserve issue time, valid time, model/version and gaps. Train on full prior annual cycles; do not tune on the already inspected 2026 benchmark.
2. Estimate a pooled regional seasonal signal on training years only (e.g. a predeclared annual/semiannual harmonic basis). Preserve location deviations; do not zero each location's mean independently. Fit scaling, PCA and centroids only on training data.
3. Compare unadjusted standard PCA, seasonally adjusted standard PCA and seasonally adjusted contrast PCA at the same ranks and k. Keep cohort recentering as a separately labelled transductive comparator.
4. Freeze seasonal basis, weights, alpha, rank and gates before evaluating untouched years and geographically held-out blocks. Report per-season assignment ARI, occupancy, common-space retention and silhouette. Use temporally blocked resampling and spatially grouped uncertainty estimates; repeated forecasts are not independent locations.
5. Keep forecast accuracy evaluation separate: it requires independent local observations, appropriate units, lead-specific MAE/RMSE and precipitation-event metrics. Coarse model values are not ground truth.

## Panchayat verification status
The companion register contains 91 names and Phagwara block membership from the official Kapurthala district September 2024 nomination record. All three pages were visually checked. Source spelling is retained, line breaks joined. Source row numbers refer to electoral administration only; they must not enter unsupervised climate features or labels.

This verifies a dated name–block relationship, not present-day LGD identity, legal geometry, current completeness, coordinates or local weather. Those fields are null and model_ready is false. No joins to weather cells were guessed. The official Gram Manchitra service could not be retrieved during this work. Acquire current LGD records and documented boundaries, resolve names using official codes, check geometry and containment, and record boundary validity before enabling panchayat modelling. Independently verify local covariates and observations next. Official publication does not automatically establish unrestricted commercial reuse rights.
