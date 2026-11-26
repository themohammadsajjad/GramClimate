# Validation record

- TypeScript typecheck: passed.
- Six engine tests: passed (PCA reconstruction, repeatability, all-noise DBSCAN, CSV roundtrip, invalid input, spreadsheet formula protection).
- Independent NumPy/scikit-learn comparison on the fixed pilot: PCA variance and covariance match to numerical tolerance; silhouette and Davies–Bouldin match; average-linkage and DBSCAN partitions match exactly up to label permutation.
- Browser: dashboard loads, analysis endpoint completes, experiment row appears, CSV upload succeeds, search returns expected profile, and point details show original values.
- Server/client SVG title hydration mismatch found during QA and corrected by rendering a single title string.
- Responsive layout implemented in CSS. Browser viewport emulation was not available through the supported browser interface, so mobile visual QA is not claimed.
- WebMCP is feature-detected. The test browser did not expose modelContext, so WebMCP execution could not be verified and is not required for ordinary website use.

This is bounded verification of a research application. It is not a security audit, proof of zero bugs, performance certification or forecast validation. Live weather ingestion, official boundaries, durable accounts and patent novelty are outside this release.

## 2026 temporal validation release (22 October 2026)

The default now loads 16 real GFS grid profiles, January–June 2025. Selection used July–September 2025 after a three-day purge. A frozen 2026 test gives original standardized feature silhouette 0.597725962 for PCA90/k2/16 starts versus 0.241675415 for the previous PCA90/k4/single-start baseline. Paired seven-day bootstrap delta CI: [0.312611384, 0.423678646]. All three quarterly differences are positive. Two broad groups cannot establish finer-scale forecast skill.

Raw archives, hashes, selection, protocol and missing-data amendment are downloadable in Real-data validation. April 18–19 were excluded globally before scoring because of source cloud-cover gaps; 268 test days remain. No imputation or test-driven tuning was performed. This is same-grid temporal cluster persistence, not unseen-region validation or panchayat forecast accuracy.

Ten Node tests passed. Independent scikit-learn checks reproduced PCA ratios and clustering metrics for K-Means, no-PCA, average linkage and DBSCAN. TypeScript check passed. Browser QA verified the validation panel and benchmark API control. The live verification endpoint compares the TypeScript implementation with saved independent Python scores at 1e-8 tolerance.

## Contrast research prototype (23 October 2026)

Six additional tests passed for baseline equivalence, temporal leakage prevention, row ordering, zero local contrast, invalid data and metric bounds. NumPy independently reproduced projection subspaces, eigenvalues and retention; sklearn reproduced ARI and silhouette for equal and unequal reliability weights. TypeScript passed. Browser QA confirmed the real archive request, rendered comparison results and unresolved state.

At fixed alpha=0.5, rank=2 and k=2..4, common within-strip retention rose from 0.908573369 to 0.918006851. Total variance retention decreased. Validation silhouettes and assignments did not improve; temporal ARI was zero and all resolutions were rejected. This is a negative temporal-transfer finding, not an accuracy gain. The earlier frozen-membership silhouette benchmark measures a different property and does not contradict failed nearest-centroid assignment persistence. No parameters were retuned to hide this result. Real observations are weather grid cells; groups are declared latitude strips. No administrative panchayat join has been completed.
