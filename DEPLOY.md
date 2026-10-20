# Existing Vercel + Render release procedure

Preserve the existing service, domains, database, media folders and project identifiers. Do not create replacement production projects or reset data.

## Verified targets and access

- Vercel project: `best`, project ID `prj_5xVdOF2YhwIuHb1fYUppsBRQDmAQ`, team `team_f5yCuDrzKJ9GBUkpwZfyIxQa`, root `frontend-vercel`, framework Other, Node 24.
- Existing frontend: https://bukharabest.vercel.app
- Existing active backend content endpoint: https://best-cda1.onrender.com/api/news
- Health endpoint: https://best-cda1.onrender.com/health
- Git source: `raupov-jasur-dev/best`.
- Vercel MCP inspection returned scope 403; the CLI's existing credentials successfully inspected and linked the same project.
- Render CLI/API access is now authenticated in workspace `Best` (`tea-daigjfjm8hqs73cpcj5g`), existing Node service `srv-daigqgh594qs738n1f70`, root empty/repository root, repo `raupov-jasur-dev/best`, branch `master`.
- The local `.env` points to a different, empty Neon database. It is not the production source and must never replace the existing Render environment. The actual Render database was inspected read-only and matches the public/admin APIs.
- A production pg_dump18.6 backup was restored into a separate empty local PostgreSQL cluster. Every row in categories/news/users/news_images/comments matched checksums. Receipt: `backups/buxara-best-2026-10-20T18-44-42-401Z.dump.json` (ignored, restricted Windows ACL). The additive migration completed at 18:50:22Z with existing row checksums unchanged. No account/content reset occurred.
- The actual Render environment has been preserved as a local Windows DPAPI encrypted recovery snapshot. Secret values were not printed, committed, or overwritten.

Latest verified preview: https://best-1p55msh54-kqirol002-2036s-projects.vercel.app (`dpl_CLfwkV42vqj1s7fsSPumFgRoYhji`, READY, existing project, Vercel Authentication retained). Authenticated HTTP routing/config checks and desktop/mobile browser checks passed. The live API currently returns an empty published feed, so this final preview verifies the real empty state and seven dynamic categories; it does not prove restored article/media availability.

The latest pre-release production rollback target was re-inspected: `dpl_Asc6ZczarLr2zbvFSACGJSc2LQTg`, https://best-63t6gmuk2-kqirol002-2036s-projects.vercel.app, aliased to https://bukharabest.vercel.app. Existing Render rollback deploy: `dep-dbbqnj9jfumc73d36l70`, commit `2c7c3b62fe74363813545763453392f84866464b`. Restore the old `npm install` build setting if rebuilding that old commit, which has no lockfile. Release deployment/promotion is recorded separately after live verification.

Read-only observations changed during verification: an earlier live browser check showed one published article and twelve categories; subsequent API checks returned zero published articles and seven categories. No production CRUD, view-incrementing article request, migration or Telegram send was issued by this work. Confirm the correct existing Render database/service and investigate this difference before release. Do not seed or initialize the current live database to make the frontend appear populated.

Keep backend and database production changes blocked until the correct existing Render service, environment and tested backup are accessible. A frontend preview may be inspected against the legacy API; it is not evidence that the new backend/security fixes are deployed. Do not promote a preview as the full release before the backend is ready.

## 1. Back up and prove recovery

Pause editorial writes for the backup/migration window. Retain the currently deployed backend commit and Vercel production deployment ID.

Set the existing service's correct `DATABASE_URL` in a secure environment. Install the PostgreSQL client tools compatible with the server; optional `PG_BIN` is a directory containing `pg_dump` and `pg_restore`.
Configure the client certificate trust with `PGSSLROOTCERT` when the provider requires it; the CLI deliberately uses certificate verification for remote databases.

```sh
npm run db:backup
# BACKUP_RECEIPT points to the generated .dump.json.
# RESTORE_DATABASE_URL points to a separate EMPTY disposable PostgreSQL database.
npm run db:verify-backup
```

Passwords pass through libpq environment variables rather than command arguments or logs. Backups/receipts remain under ignored `backups/`; store a protected off-host copy. Restore verification refuses a destination with existing tables and never runs `--clean`. The receipt records checksum, source fingerprint and successful restore verification. Production migration requires that matching receipt less than 24 hours old. A successful dump alone is insufficient.

The production backup and migration described above are verified. Future schema changes still require a fresh matching, restore-tested receipt; do not reuse an expired receipt or the local empty database.

## 2. Prepare Render environment

Use the repository root containing `package.json`.

- Build: `npm ci --omit=dev`
- Start: `npm start`
- Health check: `/health`
- `NODE_ENV=production`, correct existing `DATABASE_URL`, unique 32+ character `JWT_SECRET`.
- `FRONTEND_URL=https://bukharabest.vercel.app`; keep existing `SITE_BASE_URL` if it is a valid public domain. Telegram article links deliberately use `FRONTEND_URL`.
- `CORS_ORIGINS` is a comma-separated exact-origin allowlist for any extra/custom/preview domains. No wildcard tenants.
- Keep all current storage/Telegram credentials; coordinate controlled rotations of exposed values as documented in [SECURITY.md](docs/SECURITY.md).
- `TELEGRAM_DRY_RUN=true` for staging/tests. Set false only for the intended production channel after verification.
- TLS verifies certificates by default. Supply `DATABASE_CA_CERT` if necessary. Do not silently weaken SSL verification.

Do not change database names, existing accounts or public media paths. The server never creates or resets administrator accounts during restart. No new default categories or synthetic stories are inserted into production.

## 3. Additive migration and backend deployment

After a tested backup, run `npm run db:migrate` with `NODE_ENV=production` and the verified `BACKUP_RECEIPT` in a trusted maintenance environment. This adds `site_settings`, a migration ledger and two feed indexes. Existing news/category/user schema and values are untouched. A transaction and advisory lock serialize migration execution. For this small existing dataset transactional index creation is acceptable; reassess lock time on a large dataset before a maintenance window.

Deploy the reviewed backend commit to the existing Render service. Never push to an auto-deploy branch until environment/secrets and backup gates are satisfied. Verify health, DB connectivity, published listing/categories, v1 aliases and public config. Test login on staging, with the existing role behavior. Avoid production article-detail smoke requests when a strict non-mutating test is required: legacy detail increments views.

If the new table is not yet present, public reads use default presentation; protected presentation writes explain the migration requirement. This compatibility fallback is not a substitute for the release migration.

## 4. Vercel frontend deployment

Keep the existing linked project and domains. `frontend-vercel/vercel.json` sets `node build.js`, output `dist`, and no dependency install for the static frontend. Configure public values in the existing project's Vercel environment or use the CLI's public build variables:

```sh
npx vercel --scope team_f5yCuDrzKJ9GBUkpwZfyIxQa --build-env PUBLIC_API_URL=https://best-cda1.onrender.com --build-env PUBLIC_SITE_URL=https://bukharabest.vercel.app
```

The checkout root is linked and the project's configured root remains `frontend-vercel`. Never place backend secrets into public variables. Do not rely on NEXT_PUBLIC variables being automatically interpolated into static JavaScript: the explicit build generates `config.js`.

After backend verification, stage a production deployment with `--prod --skip-domain`, test it, then promote that exact deployment. Preserve `.html?id=` links and legacy redirects. Unknown pages use the branded 404.

## 5. Read-only production smoke checks

- Health, published list, categories, config/home API and exact CORS origin.
- Homepage/category/search and media load; old numeric and slug links resolve.
- Admin login/session, keyboard navigation and real dashboard, using an existing authorized account.
- No draft creation, delete, media mutation or Telegram publish during production smoke testing.
- Telegram permission checks may use read-only getMe/getChat/getChatMember in a trusted environment. Actual sends belong only to an explicitly configured safe test channel.

## Rollback

Keep the database backup, its receipt, current Render commit/deployment and Vercel deployment ID together. Roll back a failed backend to the prior working Render deployment and restore prior environment settings if they changed; do not reset administrator passwords. The migration is additive, so the old backend can run with the additional table/indexes. Prefer leaving additive schema in place rather than dropping settings data.

For frontend failure, restore/promote the previously recorded production deployment on the same project. Vercel rollback can suspend automatic production assignment; restore it intentionally when resuming releases.

Restore the protected database dump only after an incident assessment and explicit database recovery window: restoring over a live database can lose writes since the backup. Do not automate a destructive restore as a normal deploy rollback.
