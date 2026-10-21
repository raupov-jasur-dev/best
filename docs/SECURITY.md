# Verified security changes and operations

- Removed automatic `sync({alter:true})`, startup category seeding and recurring administrator password/privilege resets. Account creation and password reset are explicit scripts; no default passwords.
- Production refuses missing/short/development JWT secrets. HS256 is pinned. Login has a separate failed-attempt limiter. Active status and actual role are checked on each request.
- CORS uses exact frontend/site/explicit origins; no wildcard Vercel tenancy. Backend JSON errors no longer expose SQL/provider internals.
- Admin uses tab-scoped session storage, removes the legacy persistent localStorage token and API override, escapes text and all HTML attributes, and has no dynamic inline event handlers. Both hosts send CSP that blocks inline scripts and object embedding. Bearer tokens remain supported for mobile clients. A successful same-origin XSS could still access a tab token; CSP and escaping are defenses, not a claim that JavaScript storage is HttpOnly.
- Upload fields are constrained; image/video MIME, signatures, byte limits and provider responses are validated. New uploads complete before article writes. Media replacement and deletion retain old hosted assets for recovery.
- Public APIs no longer expose provider deletion IDs or Telegram error/message identifiers. Media URLs reject unsafe schemes, credentials and foreign HTTP hosts. Public article/comment text is escaped rather than interpreted as HTML.
- Telegram uses an atomic durable claim, bounded captions without cutting HTML tags/entities, HTTPS provider allowlists, bounded streamed fallback downloads and timeouts. Ambiguous delivery blocks automatic retry. No tests publish to a real channel.
- Comments are rate limited, length checked and require moderation.
- Backup receipts require a genuine boolean restore confirmation, a valid recent timestamp and a matching source/checksum. Invalid, missing, future or stale dates are refused. Dump hashing uses a bounded buffer rather than loading a large database backup into memory.

## Credentials requiring controlled rotation

Credential-shaped values existed in the working `.env.example`; the committed revision also had unsafe JWT/admin defaults. The original local working values were preserved in ignored `.env` before the tracked example was sanitized. Do not commit, screenshot or print that file.

Review/rotate the original **DATABASE_URL password**, **JWT_SECRET**, **ADMIN_PASSWORD**, **TELEGRAM_BOT_TOKEN**, and the **OpenWeather API key** in the archived weather template if real. The archived hardcoded weather key was removed; a recovery copy remains only under ignored `.qa/`. Audit any reused passwords and issued JWTs. Telegram channel ID, usernames and public site/social URLs are identifiers, not authentication secrets. Cloudinary/Freeimage/ImgBB/Catbox key fields were empty in the inspected examples; rotate them only if another exposed copy exists.

Rotation must be coordinated with a verified backup, current service access, secret manager recovery and staged environment updates. Changing JWT_SECRET invalidates current sessions. Use BotFather for bot-token rotation and update the existing Render service. This change deliberately does not rotate live credentials or rewrite Git history.

The local example points to an empty database, not the actual Render database; it was not initialized or mutated. Authorized Render access established the real production connection. A production snapshot was restored into a separate empty cluster with matching row checksums before the additive migration. Original Render secrets remain unchanged, with a private Windows DPAPI recovery snapshot. Never copy the local example over the existing Render environment.

Current SQL, public APIs and authenticated CMS agree on one published article/seven categories. Historical old-backend logs and lifetime delete counters confirm prior data changes, but do not identify an actor/time; recovering already absent records needs a pre-deletion backup or provider history. No production DELETE/reset/seed was performed. The old backend rehashed the existing password on a configuration restart before the new deploy; identity, privileges and the same working password remain preserved. Account data remains stable after the new startup. Full findings are in [VERIFICATION.md](VERIFICATION.md).

## Remaining operational safeguards

Use TLS verification by default. `DATABASE_CA_CERT` accepts a provider CA; `DATABASE_SSL_REJECT_UNAUTHORIZED=false` exists only as an explicit compatibility escape hatch and should be avoided. Configure exact preview domains in `CORS_ORIGINS` for authenticated preview testing. Do not add all `*.vercel.app` origins.

In-memory rate limits are per instance. Configure a shared limiter if the existing backend is scaled horizontally. Anonymous detail requests increment views, as in the existing API; do not interpret them as deduplicated audience analytics.
