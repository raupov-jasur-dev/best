# Buxara Best API v1

One Express application and PostgreSQL database serve the website and future mobile clients. Both `/api` (legacy) and `/api/v1` mount the same handlers. Existing numeric IDs, news slugs, media URLs and `.html?id=` links remain valid. Display names never rename infrastructure.

## Public endpoints

| Method | Path under either API prefix | Contract |
|---|---|---|
| GET | `/config` | Brand, website URL, social links, presentation order, client capabilities. No credentials. |
| GET | `/home` | `data.featured`, `latest`, `trending` (global views order), `sections[{category,news}]`. Each visible category is queried independently. |
| GET | `/categories` | Database categories, published `postsCount`, `sortOrder`, `showOnHomepage`. |
| GET | `/categories/:idOrSlug` | One category. |
| GET | `/news` | Published only. Filters below. |
| GET | `/news/:idOrSlug` | Published article, category, ordered gallery and approved comments. Increments views once per request. |
| POST | `/news/:id/comments` | JSON `authorName` (1–120 characters, optional), `content` (2–5000). New comments wait for moderation. |

`/news` accepts `page` (1–100000, default 1), `limit` (1–50, default 9), `category` (ID or slug), `search` (up to 200 characters; title, description and content), `featured=true|false`, and `sort=views` (otherwise latest publication, then descending ID). `%` and `_` are literal search characters. Listing response:

```json
{"success":true,"data":[],"pagination":{"total":0,"page":1,"limit":9,"pages":0}}
```

Dates are ISO 8601; IDs and view counts are numeric; booleans are JSON booleans. News uses `title`, `slug`, `shortDescription`, `content`, `categoryId`, `category`, `mainImage`, `video`, `status`, `featured`, `views`, `publishedAt`, `createdAt`, `updatedAt`. Content is plain text, never executable HTML. Media can be null. Native clients should render this content as text and support missing/failed images. Provider deletion identifiers and Telegram errors/message IDs are admin-only; this fixes a prior public information leak.

## Authentication and administrator endpoints

`POST /admin/login` accepts JSON `username`, `password`. Existing success shape stays `{success,token,user}`. Use `Authorization: Bearer <token>`. Password hashes are never returned. JWT uses HS256; default expiry is 8 hours. Every mutation checks the current account's active status and admin role. Editor accounts retain their existing role and do not gain administrator access. Passwords and privileges are never changed at server startup.

| Method | Path | Behavior |
|---|---|---|
| GET | `/admin/me` | Current active user. |
| GET | `/admin/dashboard` | Actual totals, views and top stories. |
| GET | `/admin/news` | Paginated; `status`, `search`, `category`, `featured=true`, `telegramStatus`. |
| GET | `/admin/news/:id` | Full article for editing. |
| POST / PUT | `/admin/news[/:id]` | JSON or multipart; fields below. |
| DELETE | `/admin/news/:id` | Transactionally remove article and its comments/gallery records. Retain media files for recovery. Does not delete the Telegram channel message. |
| POST | `/admin/news/:id/publish` | Publish, then safely attempt Telegram. |
| POST | `/admin/news/:id/telegram-retry` | Attempt for a published article only. Already delivered is a no-op. |
| POST | `/admin/news/:id/telegram-resolve` | Reconcile uncertain delivery after checking the channel: `{messageId:"123"}` or `{confirmedNotSent:true}`. In-flight claims require at least 3 minutes before reconciliation. Does not itself send a message. |
| GET / POST / PUT / DELETE | `/admin/categories[/:id]` | Category management. `name`, `description`, optional multipart `icon`. Used categories cannot be deleted. Display-name edits preserve slugs. |
| GET | `/admin/comments` | Paginated moderation queue. |
| PATCH / DELETE | `/admin/comments/:id` | `{isApproved:true|false}` or deletion. String `"false"` is treated correctly. |
| GET / PUT | `/admin/presentation` | Persist homepage category visibility and order in `site_settings`. |

Article fields: required nonempty `title` (max 1000), existing `categoryId`, optional `shortDescription` (max 10000), `content` (max 1000000), `status=draft|published`, `featured=true|false`, `publishAndTelegram=true|false`. The explicit legacy `publishAndTelegram=true` publishes the article. Transition to published attempts Telegram; editing an already published article does not duplicate its channel post. Saving an existing published article preserves its selected state.

Multipart fields: `mainImage` (one), `video` (one), `additionalImages` (up to five per request), with JPEG/PNG/WebP/GIF images up to 10 MB each and MP4/WebM/MOV videos up to 50 MB. MIME and file signatures must agree. Existing Catbox, Freeimage, ImgBB and Cloudinary provider choices remain supported; Freeimage/ImgBB video requests continue through supported video providers. All requested media is uploaded before a database transaction saves the article. Failed uploads do not erase old media or partly save the article. A provider may retain an orphaned new upload after a later failure; cleanup is an explicit operational task.

New uploads are range-fetched and signature-checked before their URL is saved. Errors `MEDIA_UPLOAD_UNCERTAIN` and `MEDIA_DELIVERY_UNVERIFIED` return502 and never trigger blind re-upload; `MEDIA_NOT_CONFIGURED` returns503. Existing media URLs and JSON fields remain unchanged for Android clients. Cloudinary requires all three server-side credentials; videos over6MB use signed chunked streaming and MP4/H.264/AAC output. No permanent media storage uses Render's filesystem. A complete account and verified live delivery are required before selecting `STORAGE_PROVIDER=cloudinary`; the release does not provision accounts or fabricate credentials.

Presentation update example (array order is the desired order):

```json
{"categories":[{"id":3,"showOnHomepage":true},{"id":7,"showOnHomepage":false}]}
```

IDs must exist and cannot repeat. Omitted categories retain the default order by ID. Homepage-hidden categories remain in navigation and archives. Until the additive migration runs, reads use defaults; admin saves return `503 MIGRATION_REQUIRED`.

## Errors, cache and publication behavior

Errors are JSON `{success:false,code,message}`. Codes include `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `CORS_DENIED` / forbidden (403), `NOT_FOUND` (404), `CONFLICT`, `PUBLICATION_LOCKED`, `DELIVERY_UNCERTAIN` (409), `RATE_LIMITED` (429), and `MIGRATION_REQUIRED` (503). Legacy error messages are retained where applicable. Unexpected internal errors never expose SQL, connection strings, tokens or provider payloads.

API responses use `Cache-Control: no-store`: the next website or app request reflects a committed publish, edit or deletion. Lists always exclude drafts. Offline native caches must be invalidated or refreshed by the native client; this API does not push updates into offline devices. Native application code, layout, permissions and binary changes can still require an app-store update.

Telegram uses an atomic conditional update on existing news columns before contacting the channel. Successful deliveries retain message IDs. Timeouts/5xx that may have delivered are marked uncertain and cannot be blindly retried. A server crash after sending leaves the durable in-flight marker; an operator checks the channel and reconciles it. Telegram has no cross-system transaction with PostgreSQL: exactly-once delivery cannot be guaranteed, so ambiguous cases require a human channel check. `TELEGRAM_DRY_RUN=true` does not publish anything and records `skipped`, never a fake success.

`GET /health` checks an actual database connection and returns 503 when unavailable. Health uses the stable existing infrastructure service identifier and the current display brand.

The backend's original root API index is preserved for JSON/default HTTP clients. Browsers requesting `text/html` receive the shared public fallback frontend at the same root.
