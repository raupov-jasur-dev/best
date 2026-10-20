# Production release execution

The original local/UI verification is in [VERIFICATION.md](VERIFICATION.md). This release uses the existing Render and Vercel projects and preserves their domains.

At 2026-10-20 18:50 UTC, the existing Render service and actual Neon database have been authenticated and verified. The local `.env` database is a different empty database; its administrator/channel settings also differ from Render and must not replace production secrets.

The actual database, public listing and authorized CMS agree: one published article, seven categories, one user, zero gallery images and zero comments. PostgreSQL lifetime table statistics show 13 category inserts/6 deletes and 8 news inserts/7 deletes. Startup logs show 12 categories at 16:57 UTC and 7 at 17:50 UTC under the same old commit. This confirms database content changes rather than frontend pagination. The logs do not identify a deletion actor or exact deletion time; historical recovery requires a pre-deletion backup or Neon recovery access. This release did not perform production DELETE, reset or seed operations.

An exported MVCC snapshot was dumped using PostgreSQL18.6, restored into a separate new local cluster and compared row-for-row by checksum in UTC. All five business tables match, including existing user/password/role and media fields. Backups are outside Render, excluded from Git/frontend upload and restricted to the Windows owner and SYSTEM. The actual Render environment was preserved with Windows DPAPI encryption; no secret values are in this document or source.

The additive production migration created only the settings/migration tables and two feed indexes. Before/after full business-table checksums match. The backup receipt and sanitized evidence are under ignored `backups/` and `.qa/` respectively.

Telegram read-only checks against the actual Render configuration return getMe/getChat/getChatMember200; the bot is administrator with can_post_messages=true. Historical logs contain chat-not-found failures. Reported403 was not reproduced. The stale local channel returns400/member-list-inaccessible and must not be copied into production. No production test message was sent.

Release sequencing temporarily holds Git-triggered Vercel master builds, while explicit staged production uploads remain testable. The prior ignored-build command is saved for restoration. Public-only PUBLIC_API_URL and PUBLIC_SITE_URL were added for preview/production without changing existing secrets. Backend deploy, staged frontend promotion and final smoke results will be recorded after completion.
