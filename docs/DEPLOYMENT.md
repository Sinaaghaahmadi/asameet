# راهنمای استقرار آسامیت

دو مسیر استقرار پشتیبانی می‌شود: **دموی رایگان (Vercel)** برای ارائه عمومی، و
**سرور اختصاصی + دامنه** برای محیط نهایی. همه زیرساخت هر دو مسیر در مخزن آماده است.

---

## ۰. دموی استاتیک رایگان (GitHub Pages) — همیشه فعال

گیت‌هاب اکشن `Deploy Static Demo (GitHub Pages)` با هر push یک نسخه کاملاً استاتیک
می‌سازد و روی برنچ `gh-pages` منتشر می‌کند؛ آدرس نهایی: `https://sinaaghaahmadi.github.io/q/`

**فعال‌سازی یک‌باره (فقط بار اول، توسط ادمین مخزن):**
Settings → Pages → Build and deployment → Source: *Deploy from a branch* → Branch: `gh-pages` / `(root)` → Save

- بدون هیچ سرور یا کلیدی کار می‌کند — لایه `src/lib/client-api.ts` همه درخواست‌های
  `/api/*` را با همان store دمو **داخل مرورگر** پاسخ می‌دهد.
- برای پرزنت و ارائه عمومی کافی است؛ داده‌ها با رفرش صفحه ریست می‌شوند.
- محدودیت‌ها: دستیار هوشمند فقط خروجی دمو می‌دهد و ارتباط بلادرنگ بین دو مرورگر برقرار نمی‌شود (این‌ها به سرور نیاز دارند — بخش‌های بعدی).

## ۱. دموی رایگان (Vercel)

- مخزن را به Vercel وصل کنید (Framework: Next.js — تنظیمات از `vercel.json` خوانده می‌شود) یا با CLI:

```bash
npx vercel --prod
```

- هیچ متغیر محیطی الزامی نیست:
  - داده‌ها از **فروشگاه درون‌حافظه‌ای** (`src/lib/server/store.ts`) با داده دموی کامل سرو می‌شوند (روی cold start ریست می‌شود — برای ارائه کافی است).
  - مسیر `/api/ai` بدون کلید، خروجی دموی آماده برمی‌گرداند.
- اختیاری: `ANTHROPIC_API_KEY` را ست کنید تا صورت‌جلسه/خلاصه/هم‌فکری واقعی با مدل Claude تولید شود.

## ۲. سرور اختصاصی + دامنه (مرحله نهایی)

### پیش‌نیاز
- سروری با Docker و Docker Compose (Ubuntu 22+ پیشنهاد می‌شود)
- یک دامنه (مثلاً `asameet.online`) با رکورد `A` به IP سرور

### گام‌ها

```bash
git clone <repo> && cd <repo>
cp .env.example .env          # مقادیر را تنظیم کنید
docker compose up -d --build  # web:3000 + chat:3001
```

سپس nginx و SSL:

```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo cp nginx.conf.example /etc/nginx/sites-available/asameet
# دامنه را داخل فایل ویرایش کنید
sudo ln -s /etc/nginx/sites-available/asameet /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d asameet.online -d www.asameet.online
```

### متغیرهای محیطی

| متغیر | توضیح |
|-------|-------|
| `NEXT_PUBLIC_APP_URL` | آدرس عمومی اپ (برای متادیتا و لینک‌ها) |
| `NEXT_PUBLIC_SOCKET_URL` | آدرس سرویس بلادرنگ؛ خالی = حالت polling |
| `ANTHROPIC_API_KEY` | کلید Claude برای دستیار هوشمند (اختیاری) |
| `DATABASE_URL` | مسیر SQLite یا آدرس PostgreSQL |

### دیتابیس پایدار (Prisma)

نسخه دمو از فروشگاه درون‌حافظه‌ای استفاده می‌کند. برای داده پایدار روی سرور:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

اسکیمای کامل (User, Chat, Message, Call, Meeting, ClassSession + جداول واسط) در
`prisma/schema.prisma` آماده است؛ برای مهاجرت، آداپتور داده در
`src/lib/server/store.ts` را با کوئری‌های Prisma (`src/lib/db.ts`) جایگزین کنید —
شکل API تغییری نمی‌کند.

### سرویس بلادرنگ

`mini-services/chat-service` یک سرویس Socket.io مستقل است (پیام، تایپینگ، حضور،
رویدادهای جلسه). در docker-compose روی پورت ۳۰۰۱ بالا می‌آید و nginx مسیر
`/socket.io/` را به آن پروکسی می‌کند. سپس `NEXT_PUBLIC_SOCKET_URL=https://دامنه` را
ست و rebuild کنید.

## ۳. اپ‌های اندروید

پس از تغییر دامنه، آدرس اپ‌ها را به‌روز کنید:
گیت‌هاب اکشن **Build Android APKs** را با ورودی `app_url` دامنه جدید اجرا کنید —
APK ها به‌صورت artifact ساخته می‌شوند. جزئیات در [ANDROID.md](ANDROID.md).

## ۴. چک‌لیست انتقال نهایی

- [ ] رکورد DNS دامنه → IP سرور
- [ ] `docker compose up -d --build`
- [ ] nginx + certbot (SSL)
- [ ] `.env` کامل (`APP_URL`, `SOCKET_URL`, `ANTHROPIC_API_KEY`)
- [ ] Prisma migrate + seed برای داده پایدار
- [ ] اجرای workflow اندروید با دامنه جدید
- [ ] تست PWA (نصب روی موبایل) روی دامنه جدید
