# GramClimate real-data validation v2

Protocol fixed on 17 October 2026 before requesting the new 2026 evaluation data.

- Spatial units: the same 16 returned GFS grid cells as the archived 2025 pilot. No panchayat or unseen-site claims.
- Features: six weather variables at 24 h and 72 h provider offsets, averaged within each period. Raw cloud cover is retained; analysis clips only cloud cover to [0,100]. No target labels or synthetic observations.
- Training: 1 January–30 June 2025. Validation: 4 July–30 September 2025, with a three-day boundary gap. Previously exposed October–December 2025 results are not a fresh test.
- Candidate grid fixed now: K-Means k=2,3,4,5; PCA variance 90%, 95%, or no reduction; deterministic farthest-first with up to 16 starts, selected by training inertia. The existing single-start PCA90/k4 model is the baseline.
- Fit scaling and PCA on training only. Compare fixed training memberships on later profiles using Euclidean silhouette in the original 12-dimensional space standardized by training statistics. This measures seasonal persistence of a regionalization, not daily forecast accuracy.
- Candidate eligibility: all training clusters contain at least two cells, validation silhouette >0, and mean adjusted Rand agreement >=0.65 over 100 synchronized circular seven-day training block resamples. Select eligible candidate by validation silhouette, then stability, then fewer clusters. If none qualifies, retain the baseline.
- Save the selection before requesting any 2026 values. Fresh temporal test: 4 January–30 September 2026. Report pooled and quarterly scores; do not select or retune using these results.
- Promotion gate: pooled test silhouette gain >=0.02, lower bound of a paired 500-resample seven-day test bootstrap 95% interval >0, and no negative quarterly candidate silhouette. Otherwise retain baseline. This is a bounded pilot gate, not proof of general superiority.
- Bootstrap intervals condition on the fitted models and sampled grid. They do not quantify new-region uncertainty. Record singleton groups, sample counts, source hashes and exact configuration.
- Independent weather observations and administrative joins remain required before any panchayat downscaling or microclimate accuracy claim.
