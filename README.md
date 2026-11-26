# GramClimate

A working research website for PCA-based exploration of panchayat profiles. The interface and numerical engine were authored for this project; the application uses a licensed open-source framework and interface primitives. It is not an operational weather forecasting product.

## Run locally

Use Node.js 22.13+ and the pnpm version declared in `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The managed Sites environment uses its supervised preview and build helpers. Outside that environment, run `node /path/to/sites/scripts/configure-execution-profile.mjs` if using the Sites plugin, or follow the starter's runtime scripts. `pnpm build` produces the server Worker and client assets. The backend is a TypeScript HTTP endpoint so frontend and numerical computation deploy together. There is no Python service to operate. Python/scikit-learn is used only for independent verification, not application runtime.

## What works

- Synthetic pilot with 72 unique profiles, 12 numeric features and a fixed random seed.
- CSV upload, structural and numerical validation, server-side PCA and three clustering methods.
- Geographic coordinate plot and PCA plot with cluster filters, point inspection and zoom.
- Variance chart, signed component coefficients and original feature values.
- Dataset search, CSV export and full JSON report export.
- Session experiment history, silhouette and Davies–Bouldin scores.
- Responsive navigation and feature-detected WebMCP analysis tools.

## CSV contract

Required metadata: `id,name,block,latitude,longitude`. Every additional column is a numeric feature. Use 6–300 unique panchayats, 2–20 features and files below 500 KB. All rows must be complete. IDs, names and coordinates are excluded from PCA. Use a consistent historical/forecast time window. The downloadable sample CSV contains synthetic profiles, not observations.

The exported cluster CSV has a final `cluster` column for analysis results. Remove it before uploading again: otherwise it would be treated as an input feature. The JSON report includes the source profiles and all settings to preserve reproducibility.

## Method

Sample-standardized features → covariance eigendecomposition using Jacobi rotations → retain selected cumulative variance → cluster using retained scores. K-Means uses deterministic farthest-first initialization; agglomerative uses average linkage; DBSCAN uses Euclidean distances and includes the point itself in minimum points. No labels or supervised targets are used.

Results are in-sample descriptions. Scores are not forecast accuracy; weather response is not validated by cluster quality. The 2D chart may show components that were not both used in clustering when only one component is retained. Axis labels indicate the displayed space. Coordinate hulls are not official boundaries and the coordinate plot is not a distance-preserving map projection.

## Data handling

CSV contents are sent to `/api/analyze`. The app has no dataset database or durable upload storage. Loaded data and up to 20 experiment snapshots exist only in the browser session. Export before closing or reloading. Hosting infrastructure has its own operational logging policies. Hosted access remains owner-private by default.

## Project layout

- `app/workspace.tsx`: interactive research workspace.
- `app/globals.css`: responsive visual design.
- `app/api/analyze/route.ts`: bounded request parsing and analysis endpoint.
- `lib/climate/engine.ts`: dataset generation, validation, CSV parsing, PCA, clustering and scores.
- `tests/engine.test.mjs`: meaningful numerical and input edge cases.
- `tests/reference_check.py`: comparison against NumPy and scikit-learn.
- `docs/THIRD_PARTY_NOTICES.txt`: installed dependency metadata and discovered license texts.

## Before a commercial release

Obtain real-data and geographic-data rights, document original forecast resolution and temporal alignment, run independent evaluation and stability studies, conduct a security/load review, and define deployment support and retention terms. Patent novelty and commercial clearance have not been established. No custom-code public license has been granted here. Third-party components retain their own copyrights and license terms.

## Contrast research

The Contrast research tab runs an experimental within-group PCA covariance mixture through /api/contrast. It includes equal-rank baseline comparisons, declared feature reliability weights, frozen training transforms, temporal assignment checks and an unresolved output when evidence gates fail. Method and invention-review notes are downloadable from the tab. This is not a patent filing or a validated panchayat downscaler. The bundled 2025 archive experiment uses analyst-defined grid groups. See public/research/contrast/METHOD.md for the input contract and limitations.

## Account pages and profiles

The hosted app uses Sites' ChatGPT identity. `/login` is the welcome screen;
`/` requires sign-in. Sites controls who can access this private workspace.
An additional email/password account flow is available. Password hashes and hashed session tokens are stored in D1. The local portable dev server uses the
starter's mock identity for development, not production authentication.

Profiles (display name, organization, role, and research interests) are saved in
D1 under the server-provided user ID. Email is read-only and comes from the
identity provider. Motion preferences stay on the current device. Analysis
uploads and experiment history still need exporting before leaving the page.

For the first local profile setup, build and apply the schema before starting dev:

```sh
npx pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_workable_killmonger.sql
npx pnpm dev
```

Apply this migration once per local database. Hosted publication applies its own
migration separately. Never enable development mock identity in production.


### Email accounts

Open `/login` and choose **Create account**, then use **Sign in with email**.
Passwords use bcrypt (cost 12); account emails are normalized to lowercase.
Sessions last 24 hours, are stored as hashes, rotate on login, and are revoked
on logout. Cookies are HttpOnly, SameSite=Lax, and Secure on HTTPS.
Registration and login share persistent per-address and per-IP attempt limits.
Email accounts have separate profile IDs from ChatGPT accounts; matching an
email address does not merge accounts or grant access to an existing profile.

This is still an owner-private Site: the hosting platform's ChatGPT access gate
runs before the application's email login. Email registration does not grant
Site access. Local mock ChatGPT identity is development-only.

Email ownership verification, Google OAuth, and password-reset email delivery
are not configured. The Forgot password control explains this limitation and
does not claim to send an email. Save your password securely. To enable
self-service recovery, integrate an email provider and expiring single-use
reset tokens before accepting public users.

For an existing local database, apply the additional migration once after building:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_yummy_morbius.sql
```
