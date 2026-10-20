# Buxara Best

An editorial news platform on the existing **Node.js / Express / Sequelize / PostgreSQL** architecture. The production frontend lives in `frontend-vercel/`; the backend entry point is `backend/src/server.js`. Both Vercel and the Express fallback use the same public screens and admin assets.

## Local setup

Use Node.js 22 or newer (the linked Vercel project uses Node 24).
Do not overwrite an existing `.env` in this working copy; its original values were retained for recovery. The copy command below is for a fresh checkout.

```sh
npm ci
cp .env.example .env
# Set local DATABASE_URL and a unique JWT_SECRET in .env.
npm run db:migrate -- --init
npm run admin:create
npm run dev
```

`--init` is allowed only for a new, empty development database. Existing and production databases never run automatic schema synchronization. Set `ADMIN_USERNAME` and a 12+ character `ADMIN_PASSWORD` before explicitly creating an account. Existing accounts require the intentional `--reset-password` flag; their role and active state are retained.

Open `http://localhost:3000` and `/admin/`. Static-only local serving may use port 5173 with the development `config.js`; the Express fallback supplies same-origin config automatically.

## Structure

- `frontend-vercel/`: public HTML, shared core/layout/page modules, independent CMS modules, CSS design tokens, SVG brand, locally hosted fonts and static build.
- `backend/src/`: REST API, authentication, validation, media providers, transactional content operations and durable Telegram publication claims.
- `scripts/`: guarded migrations, backup/restore verification, explicit administrator management and source checks.
- `tests/`: real disposable PostgreSQL API integration tests and Playwright browser tests at desktop, tablet and mobile widths.
- `frontend/views/`, `frontend/public/`: retained legacy/fallback assets. Old EJS/Django templates are archived and are not the mounted public runtime. The duplicate old admin now forwards to the canonical admin.

## Validation

```sh
npm run check
npm test
npx playwright install chromium
npm run test:e2e
npm audit
```

Tests launch isolated local PostgreSQL clusters; they do not use `.env` database credentials and never send to Telegram. Browser QA data is explicitly labeled as test content and never shipped. On Windows the temporary database is gracefully stopped with `pg_ctl`. Native binary initialization can take longer on slow disks. Tests require the embedded PostgreSQL optional dependency for the current platform.

For an optional Lighthouse lab audit, start `node tests/server.js` in a separate terminal, then run `node scripts/performance.mjs`. Set `AUDIT_RUNS=3` for three sequential measurements per viewport and a median/range summary. Reports are written to ignored `.qa/`. Avoid competing browser tests during measurement. These fixture measurements are not production Core Web Vitals or field INP data. Optional font-maintenance tooling is documented in `frontend-vercel/assets/fonts/README.txt`; Python is not a runtime/build dependency.

For a static build, provide public deployment settings explicitly:

```sh
PUBLIC_API_URL=https://best-cda1.onrender.com PUBLIC_SITE_URL=https://bukharabest.vercel.app npm run build
```

On PowerShell set `$env:PUBLIC_API_URL` and `$env:PUBLIC_SITE_URL` before running the command. The output is `frontend-vercel/dist`; only allowlisted public assets are copied. No backend environment variable is bundled.

## Publishing and integration

The CMS has real statistics, pagination and filters, news editing with upload previews/progress, draft/published and featured controls, category CRUD, comment moderation, Telegram status/reconciliation and persisted category presentation. Public navigation uses database categories; homepage sections do not depend on the first page of news. Low-motion and dark public themes are included.

Catbox, Freeimage, ImgBB and Cloudinary uploads are retained. Telegram publishes channel messages, photos and videos. It is not an interactive command bot. `TELEGRAM_DRY_RUN=true` explicitly skips delivery. Ambiguous delivery requires checking the channel before enabling retry.

- [API and mobile contracts](docs/API.md)
- [Deployment, backup and rollback](DEPLOY.md)
- [Security changes and credential rotation](docs/SECURITY.md)
- [Audit and execution plan](docs/EXECUTION.md)
- [Verification evidence](docs/VERIFICATION.md)

Content and presentation updates are shared by website/mobile API requests. Native app code, design and binary changes may still require an app update.
