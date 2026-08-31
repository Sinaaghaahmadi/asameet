# راهنمای استقرار آسامیت

آسامیت یک اپ Next.js با پایگاه‌دادهٔ Postgres (Supabase) است. لایهٔ داده کاملاً
داخل دیتابیس پیاده شده (توابع `public.api_*` از جنس SECURITY DEFINER در
`supabase/migrations/`) و سرور Next فقط یک لایهٔ نازک احراز هویت/پروکسی است؛
به همین دلیل **استقرار به هیچ Secret اجباری‌ای نیاز ندارد** — کلید anon عمومی
است و همراه کد نگه‌داری می‌شود (`src/lib/server/api.ts`).

## ۱. استقرار وب (Vercel — وضعیت فعلی production)

- مخزن به Vercel متصل است؛ هر push روی `main` خودکار build و منتشر می‌شود.
- متغیر اختیاری: `ANTHROPIC_API_KEY` تا دستیار هوشمند به‌جای خروجی دمو،
  خروجی واقعی مدل Claude بدهد. وضعیت را از `GET /api/ai` می‌توان دید.

## ۲. سرور اختصاصی + دامنه

### پیش‌نیاز
- سروری با Docker و Docker Compose (Ubuntu 22+ پیشنهاد می‌شود) یا یک PaaS
  با پشتیبانی Docker (مثل لیارا)
- یک دامنه (مثلاً `asameet.online`) با رکورد `A` به IP سرور

### گام‌ها

```bash
git clone <repo> && cd <repo>
docker compose up -d --build  # web:3000
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

### متغیرهای محیطی (همه اختیاری)

| متغیر | توضیح |
|-------|-------|
| `NEXT_PUBLIC_APP_URL` | آدرس عمومی اپ (برای متادیتا و لینک‌ها) |
| `ANTHROPIC_API_KEY` | کلید Claude برای دستیار هوشمند |
| `ASAMEET_SUPABASE_URL` | فقط برای اشاره به پروژهٔ دیتابیس دیگر |
| `ASAMEET_SUPABASE_ANON_KEY` | کلید anon همان پروژه |

### پایگاه‌داده

دیتابیس روی Supabase (پلن رایگان) میزبانی می‌شود و از سرور وب جداست؛ جابه‌جایی
سرور وب هیچ اثری روی داده‌ها ندارد. برای برپایی یک دیتابیس تازه، migration های
`supabase/migrations/` را به‌ترتیب اجرا کنید و آدرس/کلید پروژهٔ جدید را با دو
متغیر بالا بدهید. حساب‌ها با bcrypt هش می‌شوند و **اولین ثبت‌نام، مدیر می‌شود**.

## ۳. اپ‌های اندروید

پس از تغییر دامنه، گیت‌هاب اکشن **Release** (یا **Build Android APKs**) را با
ورودی `app_url` روی دامنهٔ جدید اجرا کنید تا APK ها به آدرس تازه اشاره کنند.
جزئیات در [ANDROID.md](ANDROID.md).

## ۴. چک‌لیست انتقال نهایی

- [ ] رکورد DNS دامنه → IP سرور
- [ ] `docker compose up -d --build`
- [ ] nginx + certbot (SSL)
- [ ] `ANTHROPIC_API_KEY` (اختیاری، برای دستیار هوشمند)
- [ ] اجرای workflow انتشار با `app_url` دامنهٔ جدید
- [ ] تست PWA (نصب روی موبایل) و ثبت‌نام/ورود روی دامنهٔ جدید
