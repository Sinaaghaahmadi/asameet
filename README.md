<div align="center">
  <img src="public/logo.png" width="96" alt="Asameet logo" />

  # آسامیت | Asameet

  **بستر هوشمند گفت‌وگو** — The Intelligent Conversation Platform

  پیام‌رسانی به روانی تلگرام + جلسات آنلاین به قدرت گوگل‌میت + دستیار هوش مصنوعی

  تهیه شده با ❤️ توسط ایرانی‌ها — گروه برنامه‌نویسی آ
</div>

---

## پنج خروجی محصول

| # | خروجی | مسیر / نحوه دسترسی |
|---|-------|---------------------|
| ۱ | **سایت معرفی محصول** | صفحه فرود در `/` (هیرو، ویژگی‌ها، تعرفه، FAQ، درباره ما، تماس) |
| ۲ | **محصول PWA** | همان دامنه — قابل نصب روی اندروید/iOS (`manifest.webmanifest` + Service Worker) |
| ۳ | **نسخه اندروید محصول** | `mobile/asameet` + گیت‌هاب اکشن `Build Android APKs` |
| ۴ | **پنل مدیریت** | تب «مدیریت» پس از ورود با حساب `admin` — کنترل و نظارت، نمودار، خروجی اکسل |
| ۵ | **اپ اندروید پیام‌رسان (شبیه تلگرام)** | `mobile/asameet-messenger` — فقط چت و تماس (`/?mode=messenger`) |

## دموی زنده

- **دموی عمومی (GitHub Pages، رایگان):** https://sinaaghaahmadi.github.io/asameet/
  - فعال‌سازی یک‌باره: **Settings → Pages → Branch: `gh-pages` → Save** — از آن پس هر push خودکار منتشر می‌شود (workflow «Deploy Static Demo»)
- **نسخه کامل (Vercel):** پروژه‌های متصل به مخزن با هر push خودکار build می‌گیرند (شامل API واقعی و دستیار هوش مصنوعی)

## اجرای محلی

```bash
npm install
npm run dev          # http://localhost:3000
```

حساب‌های دمو (ورود سریع از مودال ورود): `user1` / `teacher1` / `admin` — رمز: `123456`

## تکنولوژی

Next.js 16 (App Router) · TypeScript 5 strict · Tailwind CSS 4 · Framer Motion · Zustand · TanStack Query · Radix UI · Recharts · Socket.io · Prisma (SQLite) · PWA · Capacitor (Android) · Anthropic Claude (دستیار هوشمند)

## ساختار

```
src/app              # لایه‌بندی، صفحه اصلی (SPA تک‌مسیره)، globals.css، API routes
src/components       # landing / shared / messenger / calls / meetings / admin / ui
src/lib              # i18n (fa,en,fr,de,ar) · types · server store · utils · socket
src/stores           # Zustand
prisma               # اسکیما + seed برای استقرار سرور
mini-services        # سرویس بلادرنگ Socket.io
mobile               # دو اپ اندروید Capacitor
docs                 # پرامپت محصول، استقرار، اندروید، سیستم طراحی
```

## هوش مصنوعی

مسیر `/api/ai` سه حالت دارد: **صورت‌جلسه**، **خلاصه جلسه** و **هم‌فکری**. با تنظیم
`ANTHROPIC_API_KEY` از مدل Claude استفاده می‌شود؛ بدون کلید، خروجی دموی آماده برمی‌گردد
تا ارائه عمومی بدون هزینه هم کار کند.

## استقرار

- **دمو رایگان:** Vercel (بدون تنظیمات اضافه — `vercel.json` آماده است)
- **سرور و دامنه نهایی:** `docker compose up -d` + نمونه کانفیگ `nginx.conf.example` — راهنمای کامل در [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **اندروید:** راهنمای ساخت APK در [docs/ANDROID.md](docs/ANDROID.md)

مستندات بیشتر: [پرامپت محصول](docs/ASAMEET_PROMPT.md) · [سیستم طراحی](docs/DESIGN_SYSTEM.md)
