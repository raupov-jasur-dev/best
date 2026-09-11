# Deploy: Frontend → Vercel | Backend → Railway

## Arxitektura

```
Brauzer
   │
   ├─► Vercel  (frontend-vercel/)   →  HTML/JS sayt + Admin SPA
   │
   └─► Railway (backend/)           →  Node.js API + PostgreSQL
            │
            ├─► Cloudinary (rasm/video)
            └─► Telegram Bot API
```

---

## 1. Cloudinary (1 daqiqa)

1. https://cloudinary.com → Sign up
2. Dashboard dan oling:
   - Cloud name
   - API Key
   - API Secret

---

## 2. Telegram Bot

1. @BotFather → `/newbot` → token oling
2. Kanal yarating, botni **Administrator** qiling
3. Channel ID oling (masalan `-1001234567890`)

---

## 3. Backend → Railway

### 3.1 Loyihani yuklash

**Variant A — GitHub (tavsiya):**
1. GitHubga `bukhara-best` repozitoriyasini push qiling
2. https://railway.app → New Project → Deploy from GitHub
3. Reponi tanlang

**Variant B — CLI:**
```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

### 3.2 PostgreSQL

Railway loyiha ichida:
- **+ New** → **Database** → **Add PostgreSQL**
- Variables da `DATABASE_URL` avtomatik paydo bo‘ladi

### 3.3 Environment Variables

Railway → Variables → quyidagilarni qo‘ying:

| Variable | Qiymat |
|----------|--------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (Railway o‘zi beradi) |
| `JWT_SECRET` | uzun random matn (32+ belgi) |
| `CLOUDINARY_CLOUD_NAME` | ... |
| `CLOUDINARY_API_KEY` | ... |
| `CLOUDINARY_API_SECRET` | ... |
| `TELEGRAM_BOT_TOKEN` | ... |
| `TELEGRAM_CHANNEL_ID` | ... |
| `FRONTEND_URL` | `https://YOUR-APP.vercel.app` (keyin to‘ldirasiz) |
| `SITE_BASE_URL` | `https://YOUR-APP.vercel.app` |

### 3.4 Start Command

Settings → Deploy:
```
npm start
```

Root Directory: loyiha ildizi (yoki `bukhara-best` agar monorepo)

### 3.5 Domain

Settings → Networking → **Generate Domain**  
Masalan: `https://bukhara-best-production.up.railway.app`

Bu URL ni saqlang — frontend uchun kerak.

### 3.6 Admin yaratish

Railway → Service → **Shell** (yoki lokalda):

```bash
node scripts/createAdmin.js admin SizningParolingiz
```

### 3.7 Tekshirish

Brauzerda oching:
```
https://YOUR-RAILWAY-URL.up.railway.app/health
```
Javob: `{"ok":true,...}`

```
https://YOUR-RAILWAY-URL.up.railway.app/api/news
```

---

## 4. Frontend → Vercel

### 4.1 config.js ni to‘ldirish

`frontend-vercel/config.js` faylida:

```js
window.__API_URL__ = 'https://YOUR-RAILWAY-URL.up.railway.app';
```

(Railway domainingizni yozing, oxirida `/` bo‘lmasin)

### 4.2 Vercelga yuklash

**Variant A — Vercel Dashboard:**
1. https://vercel.com → Add New Project
2. GitHub repo ulang **YOKI** `frontend-vercel` papkasini drag & drop
3. **Root Directory**: `frontend-vercel` (agar monorepo bo‘lsa)
4. Framework Preset: **Other**
5. Build Command: bo‘sh qoldiring
6. Output Directory: `.` yoki bo‘sh
7. Deploy

**Variant B — CLI:**
```bash
cd frontend-vercel
npx vercel
# keyin production:
npx vercel --prod
```

### 4.3 Vercel Environment (ixtiyoriy)

Agar config.js o‘rniga env ishlatmoqchi bo‘lsangiz, keyinroq build script qo‘shish mumkin.
Hozircha `config.js` yetarli.

### 4.4 Frontend URL ni Railwayga qaytarish

Vercel domain chiqgach (masalan `https://bukhara-best.vercel.app`):

1. Railway → Variables
2. `FRONTEND_URL` = `https://bukhara-best.vercel.app`
3. `SITE_BASE_URL` = `https://bukhara-best.vercel.app`
4. Redeploy (avtomatik yoki manual)

Bu CORS uchun muhim.

---

## 5. Yakuniy tekshiruv

1. **Vercel URL** oching → yangiliklar chiqishi kerak
2. `/admin/` → login (admin / parolingiz)
3. Yangilik yarating → rasm yuklang → **Saqlash va e’lon qilish**
4. Telegram kanalda post chiqishi kerak
5. Saytda yangilik darhol ko‘rinishi kerak

---

## Muammolar va yechimlar

| Muammo | Yechim |
|--------|--------|
| CORS error | Railwayda `FRONTEND_URL` to‘g‘ri Vercel domainiga tengmi? |
| API ulanmadi | `frontend-vercel/config.js` dagi URL to‘g‘rimi? `/` bilan tugamasin |
| Admin login ishlamayapti | Railway `/api/admin/login` ishlayaptimi? JWT_SECRET bormi? |
| Rasm yuklanmayapti | Cloudinary kalitlari to‘g‘rimi? |
| Telegram ishlamayapti | Bot kanalga admin qilinganmi? Channel ID to‘g‘rimi? |
| DB xato | Railway Postgres plugin qo‘shilganmi? `DATABASE_URL` bormi? |

---

## Lokal test (split)

```bash
# Terminal 1 — backend
cd bukhara-best
cp .env.example .env   # local qiymatlar
npm install
npm run dev

# Terminal 2 — frontend
cd frontend-vercel
# config.js da: window.__API_URL__ = 'http://localhost:3000';
npx serve .
# yoki oddiy: python -m http.server 5173
```

Brauzer: http://localhost:5173

---

## Media: ImgBB (Cloudinary o‘rniga)

1. https://api.imgbb.com/ ga kiring (yoki imgbb.com → About → API)
2. API key oling
3. Railway Variables:
   ```
   STORAGE_PROVIDER=imgbb
   IMGBB_API_KEY=sizning_kalitingiz
   ```
4. Cloudinary o‘zgaruvchilarini bo‘sh qoldirish mumkin

**Eslatma:** ImgBB faqat **rasm** yuklaydi. Video kerak bo‘lsa Cloudinary ham sozlang.
