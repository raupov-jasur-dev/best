# Execution plan / audit baseline

1. Preserve existing PostgreSQL, URLs, media and user records; never run a production reset or automatic schema alteration.
2. Harden configuration, auth, CORS, uploads, errors and atomic Telegram publication. Add explicit additive migrations and backup/restore instructions.
3. Add /api/v1 aliases, public config/home feeds, persisted category presentation and API documentation while retaining /api.
4. Replace static public screens with an ivory/ink/cinnabar editorial system; dynamic categories, server-filtered feeds, article/search/archive states, accessible navigation.
5. Replace Bootstrap admin with a responsive editorial CMS; real statistics, paginated CRUD, media previews/progress, moderation, safe Telegram retry and presentation controls.
6. Install reproducible dependencies; run API integration, mocked Telegram/media, syntax/build and desktop/tablet/mobile browser/accessibility/performance checks.
7. Inspect existing Render and Vercel access; back up before migrations, deploy backend then frontend only if access and database recovery are verified. Record live evidence and exact blockers.

Confirmed baseline: backend/src/server.js is the runtime entry; backend/src/app.js mounts /api only (legacy EJS controller is unmounted). Static production is frontend-vercel; two duplicated admin SPAs exist. config.js assigns a placeholder then Render URL. No lockfile or migrate.js exists. Startup and admin/seed scripts use sync(alter), startup resets admin credentials; default seed password; permissive *.vercel.app CORS; plaintext errors leak provider details; admin HTML attribute and inline-handler injection; localStorage JWT; limited list-only pagination in admin; global latest-40 category selection; unsafe Telegram HTML truncation, duplicate retries, unbounded provider downloads; media replacement deletes old files before upload/save succeeds.

Existing local .env.example changes contain credential-shaped values. Original values preserved only in ignored .env for recovery; examples will be sanitized. Credential values must never enter reports. Production mutations are prohibited until a tested database backup exists.

## Status after implementation

Steps 1–7 are implemented:28 previously completed critical-workflow tests plus4 production TLS tests,9 browser scenarios,53-file syntax/build/a11y checks and measured local Lighthouse audits. The actual Render database was authenticated, backed up, restored separately and compared row-for-row before the additive migration. Backend deploy and existing Vercel production promotion are verified, with real content and administrator browser smoke checks at desktop/tablet/mobile widths. No production DELETE/reset/seed or test Telegram send occurred. Historical deleted-record recovery, third-party Catbox access and coordinated credential rotation remain external work, as recorded in [VERIFICATION.md](VERIFICATION.md).
