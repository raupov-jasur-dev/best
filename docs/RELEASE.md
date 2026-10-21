# Production release execution

The original local/UI verification is in [VERIFICATION.md](VERIFICATION.md). This release uses the existing Render and Vercel projects and preserves their domains.

Release verified on 2026-10-21 Asia/Tashkent (2026-10-20 UTC). The existing Render service and actual Neon database have been authenticated and verified. The local `.env` database is a different empty database; its administrator/channel settings also differ from Render and must not replace production secrets.

The actual database, public listing and authorized CMS agree: one published article, seven categories, one user, zero gallery images and zero comments. PostgreSQL lifetime table statistics show 13 category inserts/6 deletes and 8 news inserts/7 deletes. Startup logs show 12 categories at 16:57 UTC and 7 at 17:50 UTC under the same old commit. This confirms database content changes rather than frontend pagination. The logs do not identify a deletion actor or exact deletion time; historical recovery requires a pre-deletion backup or Neon recovery access. This release did not perform production DELETE, reset or seed operations.

An exported MVCC snapshot was dumped using PostgreSQL18.6, restored into a separate new local cluster and compared row-for-row by checksum in UTC. All five business tables match, including existing user/password/role and media fields. Backups are outside Render, excluded from Git/frontend upload and restricted to the Windows owner and SYSTEM. The actual Render environment was preserved with Windows DPAPI encryption; no secret values are in this document or source.

The additive production migration created only the settings/migration tables and two feed indexes. Before/after full business-table checksums match. The backup receipt and sanitized evidence are under ignored `backups/` and `.qa/` respectively.

Telegram read-only checks against the actual Render configuration return getMe/getChat/getChatMember200; the bot is administrator with can_post_messages=true. Historical logs contain chat-not-found failures. Reported403 was not reproduced. The stale local channel returns400/member-list-inaccessible and must not be copied into production. No production test message was sent.

The backend release is LIVE at https://best-cda1.onrender.com, deploy `dep-dbbrkot9fdbs73f53vf0`, source `762dd1b617de06cedb4464258acf41cdbbed965b`. Health, v1 configuration, public content, existing admin authentication, protected CMS reads, CORS and legacy static media checks passed. Render uses repository root, `npm ci --omit=dev`, `npm start` and `/health`.

Production frontend `dpl_6v6MtEEzZLYdbAHg8cteuvqJvHM6` was staged with production variables, checked through the authenticated CLI and promoted to https://buxara-best.vercel.app. Browser verification of the existing preview against the new live backend and then the public production domain passed at desktop/tablet/mobile widths. Actual admin login, dashboard, management/editor reads, category/search, legacy article, mobile menus and axe checks passed. No editorial writes or Telegram sends occurred; one normal article-detail read increments its view counter.

An old-backend configuration restart before release rehashed the same existing admin password at18:59:25Z. Identity, privileges and the working password remain preserved. The new backend starts at19:02 and does not mutate accounts; subsequent logins leave the account timestamp unchanged. Backup comparison confirms content/media/category fields unchanged, with only this prior account rehash and the intentional article view counter differing.

All16 original Render environment values are unchanged. Only exact non-secret CORS origins were added; public-only PUBLIC_API_URL and PUBLIC_SITE_URL were added to Vercel. Git-triggered Vercel master builds and Render auto-deploy were temporarily held for the controlled release; restore the original null ignored-build command and Render autoDeploy=yes after the final documentation push, and verify the readback. Protection settings remain unchanged.

The pre-release rollback targets remain Render `dep-dbbqnj9jfumc73d36l70` and Vercel `dpl_Asc6ZczarLr2zbvFSACGJSc2LQTg`. Restoring old backend code would reintroduce its startup account/schema side effects: prefer the known-good release and a forward fix, and review those risks before any old-code rollback. Never restore the database merely to roll back application code.

Remaining external limits: historical deleted-record recovery needs a pre-deletion backup or Neon recovery access; Catbox image/video requests time out from this environment; Telegram live delivery was deliberately not tested on the production channel. Full evidence and actual test results: [VERIFICATION.md](VERIFICATION.md).
