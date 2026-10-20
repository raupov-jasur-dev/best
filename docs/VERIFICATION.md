# Buxara Best — tekshiruv va chiqarish holati

Sana: 2026-10-20. **To‘liq production reliz yakunlanmagan.** Yangi kod lokal tekshirildi va mavjud Vercel loyihasiga himoyalangan preview sifatida joylashtirildi. Render yangilanishi va frontend production promotion bajarilmadi.

## Amalga oshirilgan ishlar

- `frontend-vercel/`: yangi editorial bosh sahifa, kategoriya, qidiruv, maqola, 404, mobil menyu, light/dark mavzu, loading/empty/error holatlari. Buxara Best logotipi, favicon, social tasvir va litsenziyali lokal shriftlar. Kategoriyalar bazadan olinadi; arxiv qidiruvi va pagination server orqali ishlaydi.
- `frontend-vercel/assets/js/{api,layout,public,admin,cms-views,cms-editor}.js`: umumiy komponentlar va alohida CMS modullari. CMS dashboard, yangilik/category CRUD, media preview/progress, qoralama/nashr/featured, moderatsiya, Telegram holati/retry/reconciliation, saqlanadigan kategoriya tartibi va homepage ko‘rinishi.
- `backend/src/`: eski REST kontraktlarini saqlagan `/api/v1`, `/api/config`, `/api/home`, admin presentation API, validatsiya va xavfsiz media/publishing jarayonlari. Express fallback ham shu frontend/admin fayllaridan foydalanadi.
- `scripts/`, `tests/`, `package-lock.json`: explicit migratsiya, backup/restore tekshiruvi, explicit admin boshqaruvi, real izolyatsiyalangan PostgreSQL testlari va takrorlanadigan build/install.
- Eski EJS/Django shablonlari va media yo‘llari saqlandi; takroriy eski admin canonical panelga yo‘naltirildi. Infratuzilma identifikatorlari va mavjud domenlar qayta nomlanmadi.

## Tasdiqlangan tuzatishlar

Production JWT fallback, har restartdagi admin paroli/roli reseti, avtomatik `sync(alter)`, wildcard Vercel CORS, public response orqali private media/Telegram maydonlari chiqishi, HTML attribute XSS, localStorage JWT, uploaddan oldin eski mediani o‘chirish va Telegram duplicate retry muammolari tuzatildi. Qoralama Telegramga yuborilmaydi; noaniq yetkazilish operator tekshiruvisiz qayta yuborilmaydi.

Backup gate noto‘g‘ri/yo‘q/kelajak/eskirgan sanani, matn ko‘rinishidagi restore tasdig‘ini va checksum/source mos kelmasligini rad etadi. Katta dump checksum’i cheklangan xotira bilan hisoblanadi. Keyingi accessibility tekshiruvida topilgan public/admin logotipining label/name nomuvofiqligi ham tuzatildi.

Credential qiymatlari hisobotga kiritilmagan. Nazoratli rotation ro‘yxati: DATABASE_URL paroli, JWT_SECRET, ADMIN_PASSWORD, TELEGRAM_BOT_TOKEN va arxivdagi OpenWeather kaliti. Qayta tiklash va amaldagi servis muhiti tasdiqlanmasdan rotation yoki Git history rewrite bajarilmadi. Tafsilot: [SECURITY.md](SECURITY.md).

## Bajarilgan testlar

| Tekshiruv | Haqiqiy natija |
| --- | --- |
| `npm test` | **28/28 PASS**, 0 fail, 0 skipped; 72.1 soniya |
| API integratsiyasi | 20 test: login/role/CORS, category/news CRUD, draft/published, upload failure/limits, public list/detail/search/pagination, moderatsiya, presentation, Telegram concurrency/retry, restart saqlanishi, additive migration |
| Backup receipt | 4 test: source, sana, restore boolean, o‘zgargan checksum |
| Telegram qo‘shimcha testlari | 4 test: URL size rejection’dan keyin multipart, timeout’da blind retry yo‘qligi, host allowlist, draft’da tarmoq chaqiruvi yo‘qligi |
| Playwright | **9/9 PASS**, 0 fail/flaky/skipped; 133.4 soniya |
| Responsive | 1440×1000, 768×1024, 390×844; public/detail/search/pagination, XSS, CMS CRUD/publish, moderatsiya, presentation, session storage, menyu/Escape, reduced motion va overflow tekshirildi |
| axe accessibility | Tekshirilgan public/CMS ekranlarida WCAG 2 A/AA va 2.1 A/AA: 0 violation; live preview login’da desktop/mobile 0 violation |
| JavaScript syntax | **51 fayl, 0 failure** |
| Static build / diff | Build PASS; `git diff --check` PASS |
| Dependency audit / production install | `npm audit`: 0 vulnerability; alohida toza katalogda yakuniy `npm ci --omit=dev --no-fund` PASS, 137 paket qo‘shildi, 138 paket audit qilindi, 0 vulnerability. Install scriptlari o‘chirilmadi. Upstream `dottie` deprecation ogohlantirishi saqlanadi |

API va brauzer testlari faqat izolyatsiyalangan lokal PostgreSQL’da bajarildi. Sinov maqolalari productionga yuborilmadi. Upload failure testidagi 502 loglari ataylab yaratilgan provider xatolaridir.

## Performance

Lighthouse 13.5.0, Playwright Chromium, lokal Express va test fixture’lari. Yakuniy o‘lchovlarda boshqa agent brauzer testlari parallel ishlatilmadi; har viewport uchun uchta ketma-ket audit olindi.

| Median natija | Mobil | Desktop |
| --- | --- | --- |
| Performance | **80** (77–88) | **96** (96–99) |
| Accessibility / Best practices / SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| LCP | 2.60 s | 0.66 s |
| CLS | 0 | 0 |
| TBT | 622 ms | 158 ms |

Dastlabki lokal audit 26/50 performance va 0.178/0.150 CLS ko‘rsatgan. Header joyi oldindan rezervlandi, Intl formatter’lar qayta ishlatiladi, pastdagi kategoriya seksiyalari `content-visibility` bilan chiziladi. Dastlabki Latin shriftlar 277,384 baytdan 91,748 baytga kamaytirildi; glyphlar va litsenziyalar saqlandi. Bir parallel brauzer yuklamasi ostidagi mobil audit 41 bo‘lgan — bu alohida saqlandi, yakuniy median hisobiga aralashtirilmadi.

Mobil TBT hali yaxshilanishi mumkin. Bu natijalar production Lighthouse yoki real foydalanuvchilarning Core Web Vitals/INP bahosi emas. Xususiy raw hisobotlar, olti audit va screenshotlar ignored `.qa/` katalogida; qayta ishga tushirish: `node tests/server.js`, boshqa terminalda `AUDIT_RUNS=3 node scripts/performance.mjs` (PowerShell’da env alohida o‘rnatiladi).

## Vercel

- Mavjud loyiha: `best`, root `frontend-vercel`; yangi loyiha ochilmadi.
- [Yakuniy preview](https://best-1p55msh54-kqirol002-2036s-projects.vercel.app): **READY**, `dpl_CLfwkV42vqj1s7fsSPumFgRoYhji`. Vercel Authentication saqlandi.
- `/`, `/admin/`, `/config.js`, eski `.html?id=` yo‘li 200; legacy category yo‘li 308; noma’lum sahifa branded 404. CSP va Render API config tekshirildi.
- Desktop/mobile haqiqiy API bilan bo‘sh holat, 7 dinamik kategoriya, optimallashtirilgan shrift, admin login va overflow/runtime tekshiruvlari PASS. Production hisobiga kirilmadi va CMS mutatsiyasi yuborilmadi.
- [Production frontend](https://bukharabest.vercel.app): HTTP 200, **eski deployment**. Hozirgi rollback deployment: `dpl_Ge4cSmSR8yTsUNL4BsrUXx1maU5E`. Yangi preview productionga ko‘tarilmadi.

## Render, kontent va media

[Mavjud backend](https://best-cda1.onrender.com) ishlayapti: `/health` 200 va DB ulanishi OK; `/api/news` va `/api/categories` 200; production frontend Origin uchun CORS bor. `/api/v1/config` esa **404** — yangi backend hali joylashtirilmagan.

Tekshiruv davomida live javoblar o‘zgardi: avval 1 nashr/12 kategoriya, keyin 0 nashr/7 kategoriya. Sababi tasdiqlanmadi. Ushbu ish production CRUD, schema migratsiyasi, reset/seed yoki view sonini oshiradigan article-detail chaqiruvini bajarmadi. To‘g‘ri tarixiy baza ulanganini Render kirishisiz tasdiqlab bo‘lmaydi; health 200 buning o‘rnini bosmaydi.

Avvalgi live maqolaning Catbox rasmi bu muhitdan yuklanmadi; HEAD tekshiruvi tarmoq xatosi bilan tugadi. URL o‘zgartirilmadi va boshqa rasm bilan almashtirilmadi. Oxirgi live feed bo‘sh bo‘lgani sababli production article/media mavjudligi yakuniy tasdiqlanmadi. Lokal real image render, media failure/fallback va upload jarayonlari testlardan o‘tgan.

## Telegram

Mock orqali text/photo/video, caption escaping/uzunligi, frontend link, draft, multipart fallback, concurrent claim va retry tekshirildi. Production kanalga hech qanday test xabari yuborilmadi.

Saqlangan lokal konfiguratsiyada read-only `getMe` 200, `getChatMember` 400 bo‘lgan; keyingi tekshiruvlarda timeout ham kuzatilgan. 400 sababini hamda Render’dagi haqiqiy kanal konfiguratsiyasini tasdiqlash uchun servis kirishi kerak. **Live kanalga muvaffaqiyatli nashr tasdiqlanmagan.** Xavfsiz test kanalida alohida tekshiruv zarur.

## Mobil API va qolgan majburiy qadamlar

`/api/v1`, umumiy PostgreSQL, public config/home, pagination/filter/errors va admin-only mutation kontraktlari kod va [API.md](API.md) hujjatida tayyor. Bu endpointlar Render yangilangach live bo‘ladi. Kontent o‘zgarishi keyingi API so‘rovlarida ko‘rinadi; native ilova kodi/dizayni/binary o‘zgarishi ilova yangilanishini talab qilishi mumkin. Android/iOS ilovalari qurilmadi.

1. Mavjud Render hisobiga CLI/API yoki connector kirishini muhitda sozlash; maxfiy kalitni chatga yubormaslik.
2. To‘g‘ri amaldagi DATABASE_URL va tarixiy kontentni tekshirish, live count farqi sababini aniqlash.
3. Production dump va alohida bo‘sh bazada muvaffaqiyatli restore bilan backup receipt tayyorlash. Bunday production backup hozir yo‘q.
4. Exposed credential’larni recovery yo‘li bilan rejalashtirilgan tartibda almashtirish; kuchli JWT/TLS/CORS muhitini tasdiqlash.
5. [DEPLOY.md](../DEPLOY.md) bo‘yicha additive migration → mavjud Render deploy → v1/content/media tekshiruvi → Vercel production staging/promotion tartibida chiqarish.
6. Kanal sozlamasini tasdiqlash va xavfsiz test kanali bilan Telegramni tekshirish. Muvaffaqiyatsiz release’da yozilgan rollback rejasi qo‘llanadi.
