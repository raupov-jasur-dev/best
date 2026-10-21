# Buxara Best verification and production release

Verified 2026-10-21 Asia/Tashkent (2026-10-20 UTC). Both existing production services now run the release. No replacement projects, database resets, content deletions or secret rotations were performed.

## Production targets

| Target | Verified result |
| --- | --- |
| [Public website](https://buxara-best.vercel.app) | Editorial frontend, HTTP200; production deployment `dpl_HfWijD76xc2gDqvx2f6ankAhbxxa`, READY and assigned to the official domain |
| [CMS](https://buxara-best.vercel.app/admin/) | Existing administrator login and authenticated dashboard/news/categories/comments/presentation/editor reads PASS |
| [Render backend](https://best-cda1.onrender.com/health) | LIVE `dep-dbc562m1egvs739i5cig`, release commit `dee83efe17aadc9ce27c04c764d6dc9ca99cb731`; health200 and database connected |
| [Mobile/public configuration](https://best-cda1.onrender.com/api/v1/config) | HTTP200, Buxara Best branding; versioned news/categories/home APIs and legacy `/api` routes verified |

Vercel remains project `best`, root `frontend-vercel`. Render remains service `srv-daigqgh594qs738n1f70`, repository root, branch `master`, build `npm ci --omit=dev`, start `npm start`, health `/health`. The 16 original Render environment values are unchanged; only a non-secret exact-origin `CORS_ORIGINS` allowlist was added. Public API/site build variables were added to Vercel without overwriting existing secrets. Deployment Protection remains enabled.

Domain maintenance on October21 changes only the official public URL to `https://buxara-best.vercel.app`, configuration defaults, metadata and documentation. Render FRONTEND_URL/SITE_BASE_URL already matched; SOCIAL_SITE and Vercel PUBLIC_SITE_URL were aligned. Authentication secrets remain untouched. Targeted build/syntax, offline Telegram URL, actual CMS login, dynamic news/categories, search/navigation, new-domain CORS/canonical/sharing checks pass. Article HTML/UI was checked with an actual read-only CMS snapshot intercepted in the test browser, avoiding the public detail API's view-counter write. No maintenance migration, production content write or Telegram send occurred. The old domain is no longer listed on this project, so no reassignment or forced redirect was attempted.

## Implemented changes

The public homepage, category/search/archive, article, navigation, mobile menu, 404 and loading/empty/error states use the new editorial identity, local licensed fonts and responsive layouts. Categories and homepage presentation come from the database. Existing `.html?id=` article links remain functional. Shared modules replace duplicated frontend logic.

The CMS provides real statistics, paginated/filterable content, news/category CRUD, image/video previews and progress, draft/published/featured controls, moderation, persisted category presentation and Telegram status/retry/reconciliation. Production smoke tests use existing content without saving editorial changes; CRUD and publishing tests ran against isolated PostgreSQL.

Verified security fixes include removal of JWT defaults, startup account resets and automatic schema alterations; exact-origin CORS; HTML/attribute escaping and CSP; tab-scoped admin sessions; upload validation and retained old media; private provider/Telegram fields excluded from public responses; bounded Telegram captions/downloads and durable duplicate prevention. Production TLS retains certificate verification and no longer emits the verified pg SSL-alias warning. See [SECURITY.md](SECURITY.md).

## Database investigation and preservation

The actual Render PostgreSQL18.6 database differs from the empty database configured in the local `.env`. Production SQL, public APIs and the authenticated dashboard agree on **1 published article, 7 categories and 1 administrator**; gallery images/comments are zero. Current listing filters, pagination and cache checks do not explain the earlier zero-news observation, which was not reproduced.

Historical Render startup logs show 12 categories at 16:57 UTC and 7 at 17:50 under the same old commit. PostgreSQL lifetime statistics show 13 category inserts/6 deletes and 8 news inserts/7 deletes. These are evidence of historical data changes, not an audit identifying who deleted records or exactly when. Recovery of already absent records requires a pre-deletion backup or Neon recovery history; no speculative restore was attempted.

A production exported MVCC snapshot was dumped with pg_dump18.6 and restored into a separate empty local database. Counts and full row checksums matched for all five business tables, including passwords, roles and media fields. The protected off-Render backup receipt is `backups/buxara-best-2026-10-20T18-44-42-401Z.dump.json` (ignored). The additive migration completed at 18:50:22Z; all business-table checksums before/after matched.

During service configuration, the **old** backend restarted at 18:59 UTC and rehashed the existing admin password, before the new backend became live at 19:02. Backup comparison identifies only the password hash and account update timestamp as changed: identity, email, role, active state and the working password are preserved. The account timestamp remains stable after the new backend starts and after actual CMS logins. No corrective password overwrite was performed. The new startup code does not update accounts or alter schema.

Post-release backup comparison confirms all content, category, media and user identity/privilege fields are preserved. One intentional production article-detail browser read advanced the ordinary view counter from5 to6 and its update timestamp; no test article, comment, category or Telegram message was created.

## Actual checks

| Check | Result |
| --- | --- |
| Previously completed critical tests | **28/28 PASS**, zero failures/skips; API authentication/roles, category/news CRUD, draft/published, upload failures/limits, listing/detail/search/pagination, moderation, presentation, Telegram concurrency/retry, restart, migration and backup receipts |
| Additional production TLS configuration tests | **4/4 PASS**; secure SSL normalization, encoded credentials, no alias warning, explicit compatibility option |
| Previously completed Playwright suite | **9/9 PASS**, desktop1440x1000/tablet768x1024/mobile390x844; CRUD/publishing remained isolated from production |
| JavaScript syntax | **53 files PASS**, zero failures |
| Static build / diff | PASS |
| Dependency audit / clean production install | 0 vulnerabilities; `npm ci --omit=dev --no-fund` PASS, 137 packages installed/138 audited; upstream `dottie` deprecation remains |
| Production backend | Health/config/home, legacy/versioned news/categories, existing login/me/dashboard and protected CMS reads200; anonymous admin401; foreign Origin403; approved origins return exact CORS headers |
| Staged production HTTP | Authenticated Vercel CLI checks for public/CMS/config/article/static JS200; normalized CMS source matches repository; production artifact promoted without rebuilding |
| Preview with new live backend | Existing content, actual CMS login, read-only routes and responsive checks PASS |
| Public production browser | Real headline/7 dynamic categories, category/search, legacy article, CMS login/read-only management/editor, mobile menus, session storage PASS; 0 runtime errors/overflow |
| Production axe | Public homepage and authenticated CMS dashboard: 0 WCAG2A/AA and2.1A/AA violations |
| Public routing/security | `/`, `/admin/`, config and legacy article200; legacy category308; branded missing-page404; CSP verified |
| Backend legacy media | Existing static image HEAD200 with `Cross-Origin-Resource-Policy: cross-origin` |

The initial staging browser request was denied by Vercel's development-to-production Trusted Sources rule. Protection was preserved: staged HTTP checks used the authenticated CLI, browser checks used the existing preview, and the promoted primary domain then passed the full browser smoke. A source-comparison harness was corrected to normalize Windows CRLF; deployed JavaScript content was identical.

## Measured performance

Previously completed Lighthouse13.5.0 local fixture audits used three sequential samples per viewport. Median mobile performance80 (77-88), desktop96 (96-99); accessibility/best-practices/SEO100 each; LCP2.60s/0.66s, CLS0/0, TBT622ms/158ms. Latin fonts were reduced from277,384 to91,748 bytes with licenses/glyphs retained. These are lab results, not production Core Web Vitals or field INP. No production score is invented. Private reports/screenshots are under ignored `.qa/`.

## Telegram and remaining external work

The actual Render bot/channel configuration passes read-only getMe/getChat/getChatMember200; the bot is administrator with `can_post_messages=true`. Historical failures are `chat not found`; the reported403 was not reproduced. The local saved channel differs and must not replace Render configuration. Mock tests cover text/photo/video, captions, links, drafts, multipart fallback and safe retry. No production test message was sent, so live text/photo/video delivery is not claimed.

The existing article's Catbox image and video HEAD requests time out from this environment (`UND_ERR_CONNECT_TIMEOUT`). URLs and hosted assets were preserved; a generic replacement was not introduced. Backend media compatibility and frontend failure fallbacks work, but third-party media availability remains externally unverified.

Historical deletion recovery requires a pre-deletion backup/Neon recovery access. Previously exposed credential candidates still require coordinated rotation as listed in [SECURITY.md](SECURITY.md); no secret was changed during this release. Keep an additional protected off-device backup copy.

Versioned APIs, shared PostgreSQL, admin-only mutations, configuration and pagination/error contracts are live and documented in [API.md](API.md). Subsequent content requests reflect saved changes; native application code/design/binary changes may still require an app update. Android/iOS applications were not built.
