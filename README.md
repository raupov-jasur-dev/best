# Bukhara Best — Node.js News Portal

Professional migration from Django to **Node.js + Express + PostgreSQL + Cloudinary + Telegram Bot API**.

Frontend design (ZenBlog template) is preserved as much as possible via SSR with EJS.

## Stack

- **Backend**: Node.js, Express.js, Sequelize, PostgreSQL
- **Auth**: JWT + bcrypt
- **Media**: Cloudinary
- **Telegram**: Bot API (photo/video/message)
- **Frontend**: EJS templates (same layout/CSS as original) + custom Admin SPA
- **Deploy ready**: Railway (backend + Postgres), Vercel (if static), Cloudinary

## Project structure

```
bukhara-best/
├── backend/src/
│   ├── config/          # database, cloudinary, env
│   ├── controllers/     # auth, news, category, comment, dashboard, pages
│   ├── middleware/      # auth, upload, error
│   ├── models/          # User, Category, News, NewsImage, Comment
│   ├── routes/api.js
│   ├── services/        # telegramService, uploadService
│   ├── utils/
│   ├── app.js
│   └── server.js
├── frontend/
│   ├── public/          # static (css, js, assets, admin/)
│   └── views/           # EJS templates
├── scripts/             # createAdmin, seed
├── .env.example
├── package.json
└── README.md
```

## 1. Installation

```bash
cd bukhara-best
cp .env.example .env
# Edit .env with real values
npm install
```

## 2. PostgreSQL

Create a database:

```bash
createdb bukhara_best
# or use Railway / any Postgres URL
```

Set in `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/bukhara_best
```

## 3. Environment variables

See `.env.example`. Required for production:

- `DATABASE_URL`
- `JWT_SECRET` (long random string)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
- `SITE_BASE_URL`, `FRONTEND_URL`

## 4. Cloudinary setup

1. Create account at https://cloudinary.com
2. Copy Cloud name, API Key, API Secret into `.env`

## 5. Telegram Bot setup

1. Talk to @BotFather → `/newbot` → get token
2. Create a channel, add the bot as administrator
3. Get channel ID (e.g. via @userinfobot or API)
4. Put token and channel ID into `.env`

## 6. Create admin user

```bash
node scripts/createAdmin.js admin yourSecurePassword
# or
npm run admin:create
```

Default seed (optional):

```bash
node scripts/seed.js
```

## 7. Local development

```bash
npm run dev
# or
npm start
```

Open:

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

Login with the admin you created.

## 8. Admin flow (test checklist)

1. Login → Dashboard (stats, top viewed)
2. Categories → create
3. News → Create
   - Title, description, content, category
   - Upload main image, additional images, video
   - **Saqlash** → status=draft, no Telegram
   - **Saqlash va e'lon qilish** → published + Telegram send
4. If Telegram fails → news still saved, `telegram_status=failed`, Retry button appears
5. Frontend shows published news immediately
6. Views counter increases on detail page
7. Search works
8. Comments can be moderated

## 9. Production

```bash
NODE_ENV=production npm start
```

### Railway (backend + Postgres)

1. New project → Deploy from GitHub or CLI
2. Add PostgreSQL plugin → copy `DATABASE_URL`
3. Set all env vars from `.env.example`
4. Start command: `npm start`
5. Root directory: project root

### Cloudinary / Telegram

Already configured via env — no extra steps.

### Frontend on Vercel (optional)

If you later split pure static frontend, point API to Railway URL and set `FRONTEND_URL` / CORS.

## 10. API overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/admin/login | - | Login |
| GET | /api/admin/dashboard | JWT | Stats |
| GET | /api/news | - | List published |
| GET | /api/news/:idOrSlug | - | Detail + views++ |
| POST | /api/admin/news | JWT | Create (multipart) |
| PUT | /api/admin/news/:id | JWT | Update |
| DELETE | /api/admin/news/:id | JWT | Delete |
| POST | /api/admin/news/:id/publish | JWT | Publish + TG |
| POST | /api/admin/news/:id/telegram-retry | JWT | Retry TG |
| CRUD | /api/admin/categories | JWT | Categories |
| GET/POST/... | /api/admin/comments | JWT | Comments |

## Notes on design

Original Django templates (ZenBlog) and CSS/JS assets are kept. Public pages are rendered server-side with EJS so layout, colors, cards, navbar, footer and responsiveness stay the same. Admin is a new lightweight SPA under `/admin`.

Django/Python is fully removed from the runtime path.

## Security

- Passwords hashed with bcrypt
- JWT in Authorization header
- Helmet, CORS, rate limiting
- File type + size validation
- Secrets only via `.env`

---

**Author migration**: Django → Node.js Express + PostgreSQL + Cloudinary + Telegram

---

## Deploy (Vercel + Railway)

Batafsil: **[DEPLOY.md](./DEPLOY.md)**

Qisqa:
1. **Railway** — backend + PostgreSQL (`npm start`)
2. **Cloudinary** + **Telegram** — env ga qo‘ying
3. **Vercel** — `frontend-vercel/` papkasini deploy qiling
4. `frontend-vercel/config.js` da Railway URL yozing
5. Railwayda `FRONTEND_URL` = Vercel domain

