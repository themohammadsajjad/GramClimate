# Missing-data amendment

Recorded on 22 October 2026 before any 2026 model scores were computed.

The first held-out evaluation stopped at its finite-value check. Each of the 16 cells has 29 missing cloud-cover values at the 72-hour provider offset, from 18 April 2026 13:00 UTC through 19 April 2026 17:00 UTC (464 missing values in total).

Use complete calendar days shared by every location and variable. Exclude 18 and 19 April from every test feature and cell, preserving the raw responses. Do not fill values, change features, reselect candidates or change promotion thresholds. The intended January 4–September 30 test has 268 usable days (102,912 hourly-location records), rather than 270. Q2 has 89 usable days. The paired block bootstrap samples the common retained-day sequence; its blocks may cross the two-day gap and year-period endpoints, so its interval remains conditional and approximate.

This is a disclosed response to missingness, not a performance-driven protocol change. The original protocol and frozen selection are retained unchanged.
