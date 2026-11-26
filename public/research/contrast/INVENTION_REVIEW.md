# Invention review brief — not a patent application

23 October 2026. Working concept: Within-Block Contrast-Preserving PCA for Stable Panchayat-Level Weather Clustering.

## Technical problem and implemented hypothesis

Global weather variance may dominate local within-group distinctions. Prototype 0.1 combines trace-normalized total and within-group covariance after declared reliability weighting, fits an orthogonal projection, and evaluates candidate cluster resolutions using temporal persistence, retention and minimum group size. It abstains when no resolution passes. Exact equations and input contract are in METHOD.md.

## Preliminary prior-art map

| Element | Known related work | Consequence for a novelty claim |
|---|---|---|
| Contrast-focused low-dimensional representation | Abid et al., Exploring patterns enriched in a dataset with contrastive principal component analysis (2018), https://www.nature.com/articles/s41467-018-04608-8 | Contrast preservation itself is not new. Our positive covariance mixture differs algebraically from foreground-minus-background cPCA; that difference alone does not establish an inventive step. |
| Between/within-group component decomposition | Multilevel Functional Principal Component Analysis, https://pmc.ncbi.nlm.nih.gov/articles/PMC2835171/ | Separating hierarchical covariance is established. Full comparison with multilevel methods remains necessary. |
| Unsupervised climate downscaling | ClimAlign (2020), https://arxiv.org/abs/2008.04679 | Unsupervised downscaling and latent representations cannot be claimed generically. |
| PCA in weather operational downscaling | US20250377482A1, https://patents.google.com/patent/US20250377482A1/en | PCA and variability-based ensemble selection appear in a published patent application. This is not a legal infringement conclusion or a finding that its claims cover this implementation. |

Search scope is preliminary, not exhaustive; no freedom-to-operate or patentability opinion is provided. Missing search results are not evidence of novelty.

## Candidate contribution to investigate

The coupled use of source reliability, within-block contrast retention and a temporal resolution gate in a specific panchayat regionalization workflow. This remains a hypothesis about a contribution, not an established invention. Each ingredient is known broadly; their combination may be considered routine unless a non-obvious mechanism and technical benefit can be substantiated.

## Implemented versus outstanding

Implemented: projection, declared feature weights, matched-rank baselines, k-candidate gate, unresolved state, temporal membership checks, JSON provenance/export, real grid experiment and numerical tests.

Outstanding: verified panchayat dataset; calibrated reliability estimator; automatic joint rank/alpha selection; hierarchical split/merge; independent microclimate validation; untouched geographic/temporal test; comprehensive claim chart; technical-effect evidence; professional eligibility assessment. No sensor-placement extension is part of this topic.

## Proposed evaluation before filing assessment

Pre-register splits and thresholds on new data. Compare standard, weighted, within-only and relevant multilevel/contrastive PCA at equal rank and k. Report retention, temporal/spatial stability, local observation relevance, runtime and sensitivity to grouping/noise. Include local-only and weather-only ablations to distinguish terrain clustering from weather response. Preserve negative outcomes. Current grid pilot cannot demonstrate panchayat downscaling or patent novelty.

## Human contribution record

The project owner and academic collaborators should record actual conceptual and experimental contributions, dates, alternatives considered and decisions made. Do not fill inventor names or assert human inventorship from software generation alone. Consult the university IPR cell/patent professional before preparing claims or making public disclosures of a prospective invention. The current Site audience remains owner-private.

Reference for review: Indian Patent Office CRI Guidelines 2025, https://ipindia.gov.in/frontend/pdf/patents/guidelines/GUIDELINES%20FOR%20EXAMINATION%20OF%20COMPUTER%20RELATED%20INVENTIONS%20%28CRIs%29%20-%202025.pdf . Eligibility, novelty, inventive step and sufficient disclosure require assessment of the actual proposed claims; this brief is not that assessment.
