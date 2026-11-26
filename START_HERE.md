# GramClimate — Run in VS Code

Latest source: 23 November 2026, commit d52908aed701b281cb5e91429795a8b1d380a9a2.
ZIP packaged on 24 November 2026.

Includes email registration/login, dashboard, profiles, PCA and clustering,
real-data evaluation, seasonal diagnostics, and climate animation controls.

## 1. Open the project

Install Node.js 24 LTS and VS Code. Extract the ZIP completely, then open the
inner **GramClimate** folder in VS Code (the folder containing package.json).
Choose Terminal > New Terminal. Run all commands below from that folder.
Internet access is needed to install dependencies; Docker and Python are not
required for running the website. Do not run npm install: use the pinned pnpm
commands below to preserve the dependency lockfile.

## 2. First-time setup

Run these commands one at a time:

```sh
npx --yes pnpm@11.25.0 install --frozen-lockfile
npx --yes pnpm@11.25.0 build
```

Initialize the LOCAL database. Run each migration once, in this order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_workable_killmonger.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_yummy_morbius.sql
```

These commands use a local SQLite-backed database. A Cloudflare account or
cloud login is not needed. Do not add `--remote`.

## 3. Start the website

```sh
npx --yes pnpm@11.25.0 dev
```

Open **http://localhost:5173/login**. If the terminal prints another port,
use that port instead. Choose **Create account**, enter a name and email,
and create a password of at least 12 characters. Then use **Sign in with email**.
Passwords are stored as bcrypt hashes; they are not stored as readable text.

The portable development server also includes the starter's mock ChatGPT
identity. This is for development only. A dashboard that opens without an
email login may be using that mock identity. Email accounts have separate
profiles; registering does not copy the mock user's profile.

To test again later, only run the `dev` command. Do not repeat the database
migrations. Stop the server with **Ctrl+C** in its terminal.

## What is saved locally?

Email accounts, sessions and profiles use `.wrangler/state` in this project.
Keep that directory if you want to retain local accounts. It is intentionally
not included in this ZIP. Accounts from the hosted website are not included
and do not automatically work on your local copy.

Uploaded datasets and experiment runs remain session-based; export them before
closing or refreshing the workspace. Motion preferences are device-local.

## Current limitations

- Google OAuth, email verification and password-reset emails are not configured.
  The Forgot password control explains this; it does not send a reset email.
  Save your local account password in a password manager.
- The hosted private website still has its separate ChatGPT access gate.
- The bundled weather profiles are real NOAA GFS grid data, not verified local
  panchayat observations or a live forecast feed. Panchayat names are documented
  separately; they have not been joined to model-ready boundaries.
- PCA variance retention and cluster separation are not forecast accuracy.
- This package is for local development. Do not expose the mock-auth development
  server publicly or assume it is a ready-made Vercel deployment.

## Checks and troubleshooting

The source passed a production build, TypeScript checks and 24 automated tests
on Linux before packaging. A complete browser login check and execution on your
Mac/Windows machine have not been verified.

Optional checks:

```sh
npx --yes pnpm@11.25.0 exec tsc --noEmit
node --experimental-strip-types --test tests/*.test.mjs
```

- **No such table / account storage error:** stop dev, build, then apply the two
  database migrations above from this same project folder.
- **Table already exists:** that migration was applied earlier; do not repeat it.
  Continue with any migration not yet applied. Do not delete your database.
- **Too many login attempts:** wait 15 minutes before trying again.
- **Node version error:** run `node -v` and install Node.js 24 LTS.
- **Port occupied:** stop the other server, or use the URL printed by this one.

See README.md for research details and the rest of the project documentation.
