# پرامپت کامل محصول: آسامیت | Asameet.online

## ۱. معرفی محصول

**آسامیت (Asameet.online)** یک پلتفرم وب جامع ترکیبی از **Telegram + Google Meet** است که قابلیت‌های پیام‌رسانی، تماس صوتی/تصویری، جلسات آنلاین، کلاس‌های آنلاین و پنل مدیریت را در یک اپلیکیشن واحد ارائه می‌دهد.

---

## ۲. فناوری‌ها و تکنولوژی ستک

| لایه | فناوری | نسخه/جزئیات |
|------|--------|-------------|
| **فریمورک** | Next.js (App Router) | v16 |
| **زبان** | TypeScript | v5 (strict) |
| **استایلینگ** | Tailwind CSS | v4 + shadcn/ui (New York style) |
| **آیکون‌ها** | Lucide React | - |
| **انیمیشن** | Framer Motion | - |
| **بانک اطلاعاتی** | Prisma ORM | SQLite (client only) |
| **حالت مدیریت سمت کلاینت** | Zustand | - |
| **حالت مدیریت سمت سرور** | TanStack Query | - |
| **اتصال بلادرنگ** | Socket.io (mini-service) | پورت جداگانه |
| **سرویس ساید** | Next.js API Routes | `/api/*` |
| **تم/دارک مود** | next-themes | - |
| **اعلان‌ها** | Sonner (toast) | - |
| **نمودارها** | Recharts | - |
| **آیکون‌های ۳بعدی** | کلاس‌های CSS سفارشی `.icon-3d`, `.card-3d` | - |
| **PWA** | Web App Manifest + Service Worker | - |

---

## ۳. معماری پروژه

### ۳.۱ ساختار پوشه‌ها

```
/home/z/my-project/
├── prisma/
│   └── schema.prisma          # مدل‌های دیتابیس
├── db/
│   └── custom.db              # فایل SQLite
├── public/
│   ├── manifest.json           # PWA manifest
│   ├── logo.png                # لوگوی آسامیت
│   └── fonts/
│       ├── Vazir-Regular.woff2
│       ├── Vazir-Bold.woff2
│       ├── Vazir-Medium.woff2
│       ├── Vazir-Light.woff2
│       ├── Vazir-Thin.woff2
│       └── Vazir-Black.woff2
├── src/
│   ├── app/
│   │   ├── layout.tsx          # لایه‌بندی اصلی (RTL، فونت، PWA)
│   │   ├── page.tsx            # صفحه اصلی (مسیر تنها `/`)
│   │   └── globals.css         # سیستم CSS کامل (گلاسمورفیسم، انیمیشن)
│   ├── components/
│   │   ├── landing/
│   │   │   └── landing-page.tsx    # صفحه فرود کامل
│   │   ├── shared/
│   │   │   ├── app-shell.tsx       # پوسته اپلیکیشن (سایدبار + محتوا)
│   │   │   ├── login-modal.tsx     # مودال ورود
│     │   │   ├── language-switcher.tsx  # تغییر زبان
│   │   │   └── client-providers.tsx    # پراودرهای کلاینت
│   │   ├── messenger/
│   │   │   └── messenger-view.tsx  # پیام‌رسان (چت)
│   │   ├── calls/
│   │   │   └── calls-view.tsx      # تماس‌ها
│   │   ├── meetings/
│   │   │   ├── meetings-view.tsx   # جلسات
│   │   │   └── classes-view.tsx    # کلاس‌های آنلاین
│   │   ├── admin/
│   │   │   └── admin-view.tsx      # پنل مدیریت
│   │   └── ui/                       # کامپوننت‌های shadcn/ui
│   ├── lib/
│   │   ├── i18n/
│   │   │   ├── index.tsx         # هسته i18n (I18nProvider, useT, useLocale)
│   │   │   └── locales/
│   │   │       ├── fa.ts         # فارسی (پیش‌فرض)
│   │   │       ├── en.ts         # انگلیسی
│   │   │       ├── fr.ts         # فرانسوی
│   │   │       ├── de.ts         # آلمانی
│   │   │       └── ar.ts         # عربی
│   │   ├── socket.ts             # اتصال Socket.io
│   │   ├── db.ts                 # کلاینت Prisma
│   │   └── utils.ts              # ابزارهای عمومی
│   ├── stores/
│   │   └── app-store.ts         # Zustand store اصلی
│   └── lib/
│       └── seed.ts               # دیتای اولیه
├── mini-services/
│   └── chat-service/            # سرویس Socket.io (پورت جداگانه)
└── api/                         # API Routes
    ├── auth/route.ts            # احراز هویت
    ├── users/route.ts           # مدیریت کاربران
    ├── chats/route.ts           # چت‌ها
    ├── meetings/route.ts        # جلسات
    └── admin/route.ts           # عملیات مدیریت
```

### ۳.۲ معماری تک‌صفحه‌ای (SPA)
- **تنها یک مسیر:** `/` (در `src/app/page.tsx`)
- مدیریت نماها از طریق `useAppStore` (Zustand):
  - `view: 'landing' | 'app'` — نمایش صفحه فرود یا اپلیکیشن
  - `tab: 'chats' | 'calls' | 'meetings' | 'classes' | 'admin'` — تب فعال در اپلیکیشن
- تغییر نما بدون بارگذاری مجدد صفحه (CSR)

### ۳.۳ Gateway و پروکسی
- تنها پورت ۳۰۰۰ به بیرون باز است
- درخواست‌های API به پورت‌های دیگر از طریق `?XTransformPort={Port}` در URL
- WebSocket از طریق `io("/?XTransformPort={Port}")`

---

## ۴. سیستم بین‌المللی‌سازی (i18n)

### ۴.۱ پشتیبانی از زبان‌ها
| کد | زبان | پیش‌فرض | RTL |
|-----|------|---------|-----|
| `fa` | فارسی | ✅ | ✅ |
| `en` | English | ❌ | ❌ |
| `fr` | Français | ❌ | ❌ |
| `de` | Deutsch | ❌ | ❌ |
| `ar` | العربية | ❌ | ✅ |

### ۴.۲ پیاده‌سازی
- سیستم سفارشی بر پایه **React Context** (نه next-intl یا کتابخانه خارجی)
- `I18nProvider` در بالاترین سطح کامپوننت درخت
- `useT()` — تابع ترجمه: `t('key')` → رشته ترجمه‌شده
- `useLocale()` — دریافت لوکال فعلی
- `RTL_LOCALES = ['fa', 'ar']` — آرایه زبان‌های RTL
- تغییر زبان: `dir` و `lang` تگ `<html>` به‌صورت پویا تغییر می‌کند
- **بیش از ۲۰۰ کلید ترجمه** در هر زبان
- زبان ذخیره شده در `localStorage`
- تقسیم رشته‌ها با `.split(/[،,]/)` برای پشتیبانی از کامای فارسی و انگلیسی

### ۴.۳ دسته‌بندی کلیدهای ترجمه
- `common.*` — عناصر مشترک (ذخیره، حذف، جستجو...)
- `landing.*` — صفحه فرود (هیرو، ویژگی‌ها، آمار، تعرفه‌ها، FAQ...)
- `login.*` — مودال ورود
- `nav.*` — ناوبری (چت‌ها، تماس‌ها، جلسات...)
- `messenger.*` — پیام‌رسان (نوشتن، فوروارد، سنجاق...)
- `calls.*` — تماس‌ها (صوتی، تصویری، از دست رفته...)
- `meetings.*` — جلسات (ایجاد، پیوستن، ضبط...)
- `classes.*` — کلاس‌ها (تخته دیجیتال، حضور غیاب...)
- `admin.*` — پنل مدیریت (کاربران، سرور، خروجی اکسل...)

---

## ۵. سیستم طراحی بصری

### ۵.۱ فونت
- **فونت اصلی:** Vazir (فونت فارسی حرفه‌ای)
- **وزن‌های پشتیبانی‌شده:** Thin (100), Light (300), Regular (400), Medium (500), Bold (700), Black (900)
- **فرمت:** WOFF2 و WOFF (آپلود شده در `/public/fonts/`)
- **بارگذاری:** `font-display: swap` برای بهینه‌سازی عملکرد
- **fallback:** `'Vazir', 'Vazirmatn', system-ui, sans-serif`

### ۵.۲ رنگ‌بندی
- **رنگ اصلی (Primary):** Teal/Emerald — `oklch(0.55 0.15 170)` (روشن) / `oklch(0.65 0.16 170)` (تاریک)
- **متغیرهای سفارشی Asameet:**
  - `--asameet: #0d9488` (روشن) / `#14b8a6` (تاریک)
  - `--asameet-light: #14b8a6` / `#2dd4bf`
  - `--asameet-dark: #0f766e` / `#0d9488`
  - `--asameet-50: #f0fdfa` / `#042f2e`
- **نظام رنگ‌ها:** OKLCH با تغییرات خودکار برای حالت تاریک/روشن
- **محدودیت:** بدون استفاده از رنگ‌های Indigo یا آبی مگر صراحتاً درخواست شود

### ۵.۳ سیستم گلاسمورفیسم (Glassmorphism)

کلاس‌های CSS سفارشی:

| کلاس | توضیح |
|------|--------|
| `.glass` | گلاس پایه (blur 16px, saturate 180%) |
| `.glass-subtle` | گلاس ظریف (blur 8px, شفافیت بیشتر) |
| `.glass-strong` | گلاس قوی (blur 24px, شفافیت کمتر) |
| `.glass-card` | کارت گلاس (border-radius 16px + hover) |
| `.glass-nav` | نوار ناوبری گلاس (blur 20px) |
| `.btn-glass` | دکمه گلاس با افکت hover و ripple |
| `.btn-glass-primary` | دکمه گلاس با رنگ primary (teal) |

متغیرهای CSS گلاس:
```css
--glass-bg: rgba(255, 255, 255, 0.65);     /* روشن */
--glass-bg: rgba(17, 24, 39, 0.65);        /* تاریک */
--glass-border: rgba(255, 255, 255, 0.25);
--glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
--glass-blur: blur(16px) saturate(180%);
```

### ۵.۴ آیکون‌های ۳بعدی
- کلاس `.icon-3d`: سایه چندلایه + hover با scale و translateY
- کلاس `.card-3d`: کارت با پرسپکتیو ۳بعدی و rotateX هنگام hover
- کلاس `.img-glow`: درخشش گرادیان سبز-آبی دور تصاویر هنگام hover

### ۵.۵ انیمیشن‌ها
| انیمیشن | توضیح |
|---------|--------|
| `.animate-gradient-x` | گرادیان متحرک (6 ثانیه) |
| `.animate-float` | شناوری عمودی (3 ثانیه) |
| `.animate-pulse-ring` | حلقه نبض‌دار |
| `.slide-in` | اسلاید ورود (RTL/LTR آگاه) |
| Framer Motion | `fadeUp`, `fadeIn`, `scaleIn`, `stagger` برای بخش‌های صفحه فرود |
| AnimatePresence | ترنزیشن نرم بین تب‌ها و نماها |

### ۵.۶ سایر جلوه‌های بصری
- اسکرول‌بار سفارشی (Telegram-style، 6px عرض)
- الگوی نقطه‌ای (`.dot-pattern`) برای پس‌زمینه
- افکت ripple روی دکمه‌ها (`.ripple`)
- Focus ring با درخشش (`.focus-glow`)
- گرادیان هیرو (`.hero-gradient`): `teal → emerald → zinc → teal`
- پس‌زمینه‌های گرادیانی برای تماس‌ها و جلسات
- حباب پیام RTL-aware (`.msg-bubble-own`, `.msg-bubble-other`)

---

## ۶. صفحه فرود (Landing Page)

### ۶.۱ ساختار بخش‌ها

1. **نوار ناوبری (Navbar)** — `glass-nav`, چسبنده به بالا
   - لوگو + نام آسامیت
   - لینک‌ها: ویژگی‌ها، تعرفه‌ها، سوالات متداول
   - دکمه‌ها: ورود، شروع کنید
   - LanguageSwitcher + Dark Mode Toggle
   - منوی همبرگری برای موبایل

2. **بخش هیرو (Hero)**
   - گرادیان متحرک (`.hero-gradient`)
   - عنوان اصلی + زیرعنوان + ۲ دکمه CTA
   - تصویر/اسکرین‌شات محصول

3. **ویژگی‌ها (Features)** — ۶ کارت گلاس با آیکون‌های ۳بعدی
   - پیام‌رسانی فوری
   - تماس صوتی و تصویری
   - جلسات و کنفرانس
   - کلاس‌های آنلاین
   - امنیت پیشرفته

4. **آمار (Stats)** — ۴ شاخص با انیمیشن شمارش
   - کاربر فعال، تماس روزانه، جلسه موفق، کشور

5. **چگونه کار می‌کند (How It Works)** — ۳ مرحله

6. **نظرات کاربران (Testimonials)** — ۳ نظر با آواتار و ستاره

7. **تعرفه‌ها (Pricing)** — ۳ طرح (رایگان، حرفه‌ای، سازمانی)
   - لیست ویژگی‌ها با آیکون Check
   - دکمه شروع

8. **سوالات متداول (FAQ)** — ۵ سوال با Accordion

9. **CTA پایانی** — دکمه شروع رایگان

10. **فوتر** — لینک‌ها، شبکه‌های اجتماعی، دانلود اپلیکیشن

### ۶.۲ تعرفه‌ها (Pricing Plans)

| ویژگی | رایگان | حرفه‌ای | سازمانی |
|--------|--------|---------|--------|
| چت نامحدود | ✅ | ✅ | ✅ |
| تماس ۱ به ۱ | ✅ | ✅ | ✅ |
| تماس گروهی ویدئویی | ❌ | ✅ | ✅ |
| اشتراک صفحه | ❌ | ✅ | ✅ |
| فضای ابری | ۱GB | ۱۰GB | نامحدود |
| تخته دیجیتال | ❌ | ✅ | ✅ |
| پنل مدیریت | ❌ | ✅ | ✅ |
| پشتیبانی اولویت‌دار | ❌ | ✅ | ✅ |
| برندینگ سفارشی | ❌ | ❌ | ✅ |
| دسترسی API | ❌ | ❌ | ✅ |
| حداکثر شرکت‌کنندگان | ۱۰ | ۵۰ | نامحدود |

---

## ۷. اپلیکیشن اصلی (App Shell)

### ۷.۱ سایدبار
- عرض ۶۸px، گرادیان تیره (`zinc-900 → zinc-950`)
- آواتار کاربر در بالا با tooltip
- ۵ آیتم ناوبری (چت‌ها، تماس‌ها، جلسات، کلاس‌ها، مدیریت)
- آیکن‌ها: `MessageSquare`, `Phone`, `Video`, `GraduationCap`, `Shield`
- آیتم فعال: گرادیان teal-emerald + scale + سایه
- بَج شمارش خوانده‌نشده (قرمز)
- اندیکاتور آنلاین (نقطه سبز نبض‌دار)
- دکمه‌های پایین: دارک مود، تغییر زبان، خروج
- انیمیشن Framer Motion بین تب‌ها (`AnimatePresence`)

### ۷.۲ نماها (Views)

#### ۷.۲.۱ پیام‌رسان (Messenger)
- **لیست چت‌ها (سمت چپ/راست):**
  - فیلترها: همه، خوانده‌نشده، گروه‌ها، کانال‌ها
  - جستجو
  - آیتم چت: آواتار، نام، آخرین پیام، زمان، تعداد خوانده‌نشده
  - دکمه چت جدید / گروه جدید
- **پنل پیام (سمت راست/چپ):**
  - هدر: آواتار، نام، وضعیت آنلاین
  - لیست پیام‌ها: حباب‌های RTL-aware (own/other)، reply، reaction
  - فیلتر پیام: همه، تصاویر، فایل‌ها، لینک‌ها
  - ورودی: فیلد متنی + دکمه ارسال + پیوست فایل + پیام صوتی
  - وضعیت پیام: ارسال‌شده (✓)، تحویل‌شده (✓✓)، خوانده‌شده (آبی)
  - پیام‌های سیستمی
  - رپلای و فوروارد
  - پاسخ رگبارداری (typing indicator)
- **بلادرنگ:** Socket.io برای ارسال/دریافت پیام

#### ۷.۲.۲ تماس‌ها (Calls)
- **تب‌ها:** اخیر، مخاطبین
- **لیست تماس‌های اخیر:**
  - آیکون تماس صوتی/تصویری
  - جهت: ورودی، خروجی، از دست رفته
  - مدت تماس
- **لیست مخاطبین:**
  - جستجو
  - آواتار + نام + وضعیت آنلاین
  - دکمه‌های تماس صوتی/تصویری
- **صفحه تماس فعال:**
  - آواتار بزرگ + نام + وضعیت
  - دکمه‌های کنترل: میکروفون، دوربین، بلندگو، پایان تماس
  - تایمر تماس

#### ۷.۲.۳ جلسات (Meetings)
- **لیست جلسات:**
  - فیلترها: همه، زمان‌بندی‌شده، فعال
  - جستجو
  - کارت جلسه: نوع (جلسه/کنفرانس/کلاس)، عنوان، زمان، حداکثر شرکت‌کنندگان
  - دکمه‌ها: پیوستن، کپی لینک
  - مودال ایجاد جلسه
- **اتاق جلسه:**
  - گرادیان پس‌زمینه: `zinc-900 → teal-950`
  - گرید شرکت‌کنندگان (responsive: 1/2/3 ستون)
  - نوار کنترل: میکروفون، دوربین، اشتراک صفحه، دست بالا، چت، پایان
  - پنل چت جلسه (باز/بسته)
  - تایمر مدت جلسه
  - کپی لینک جلسه

#### ۷.۲.۴ کلاس‌های آنلاین (Classes)
- **لیست کلاس‌ها:**
  - جستجو
  - کارت کلاس: نام، معلم، زمان
  - مودال ایجاد کلاس
- **اتاق کلاس:**
  - گرادیان پس‌زمینه: `zinc-900 → violet-950`
  - ویدئوی معلم (بزرگ) + ویدئوی دانش‌آموزان
  - **تخته دیجیتال (Whiteboard):**
    - Canvas HTML5 با 2x resolution
    - ابزارها: قلم، پاک‌کن
    - رنگ‌ها: teal, red, blue, amber, black
    - تنظیم اندازه قلم (slider)
    - پاک کردن و ذخیره تخته
    - فقط معلم می‌تواند تخته را فعال کند
  - **لیست دانش‌آموزان (سایدبار):**
    - وضعیت حضور/غیاب
    - بلند کردن دست
    - بی‌صدا کردن (فقط معلم)
  - نوار کنترل مشابه جلسه

#### ۷.۲.۵ پنل مدیریت (Admin)
- **تب‌ها:** نمای کلی، کاربران، سرور
- **نمای کلی (Overview):**
  - کارت‌های آماری: کل کاربران، کاربران فعال، کل چت‌ها، کل جلسات، تماس‌های فعال
  - نمودار فعالیت (AreaChart - Recharts)
  - نمودار توزیع کاربران (PieChart)
- **مدیریت کاربران:**
  - جدول کاربران: نام کاربری، نام نمایشی، نقش، وضعیت، آخرین فعالیت
  - جستجوی کاربران
  - عملیات: معلق کردن، فعال‌سازی
  - **خروجی اکسل:** کاربران، جلسات، کلاس‌ها، کامل
  - **ورود از اکسل:** آپلود فایل `.xlsx`، دانلود فایل نمونه
- **سرور:**
  - وضعیت سرور (CPU، حافظه، آپتایم)
  - اطلاعات سیستم (نسخه، پلتفرم، Node)

---

## ۸. مدل‌های دیتابیس (Prisma Schema)

### ۸.۱ User
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| username | String (unique) | نام کاربری |
| password | String | رمز عبور |
| displayName | String | نام نمایشی |
| avatar | String? | آدرس آواتار |
| role | String | `user`, `teacher`, `host`, `admin` |
| status | String | `online`, `offline`, `away`, `busy` |
| isOnline | Boolean | وضعیت اتصال |
| lastSeen | DateTime | آخرین بازدید |

### ۸.۲ Chat
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| name | String? | نام گروه |
| type | String | `private`, `group` |
| avatar | String? | آواتار گروه |
| isPinned | Boolean | سنجاق‌شده |
| lastMessage | String? | آخرین پیام |
| lastMessageAt | DateTime? | زمان آخرین پیام |

### ۸.۳ Message
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| chatId | String | شناسه چت |
| senderId | String | فرستنده |
| content | String | محتوا |
| type | String | `text`, `image`, `file`, `voice`, `system` |
| replyToId | String? | پاسخ به |
| isRead | Boolean | خوانده‌شده |
| isPinned | Boolean | سنجاق‌شده |
| reactions | String? | JSON آرایه واکنش‌ها |

### ۸.۴ Call
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| type | String | `audio`, `video` |
| status | String | `ringing`, `active`, `ended` |
| initiatorId | String | آغازکننده |
| duration | Int? | مدت (ثانیه) |

### ۸.۵ Meeting
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| title | String | عنوان جلسه |
| type | String | `meeting`, `conference`, `class` |
| link | String (unique) | لینک جلسه |
| status | String | `scheduled`, `active`, `ended` |
| maxParticipants | Int | حداکثر شرکت‌کنندگان (پیش‌فرض: ۱۰۰) |
| isRecording | Boolean | در حال ضبط |

### ۸.۶ ClassSession
| فیلد | نوع | توضیح |
|------|------|--------|
| id | UUID | کلید اصلی |
| title | String | عنوان کلاس |
| teacherId | String | معلم |
| attendance | String? | JSON داده حضور غیاب |
| whiteboardData | String? | JSON وضعیت تخته |

### ۸.۷ جداول واسط
- **ChatMember:** `chatId + userId` (unique), role (`admin`, `member`)
- **CallParticipant:** `callId + userId` (unique), isMuted, isCameraOff
- **MeetingParticipant:** `meetingId + userId` (unique), role (`host`, `co_host`, `speaker`, `participant`), handRaised
- **ClassMember:** `classId + userId` (unique), isPresent

---

## ۹. API Routes

| مسیر | متد | توضیح |
|------|------|--------|
| `/api/auth` | POST | ورود کاربر (username + password) |
| `/api/users` | GET | لیست کاربران |
| `/api/chats` | GET/POST | دریافت/ایجاد چت‌ها |
| `/api/chats/[id]/messages` | GET/POST | پیام‌های یک چت |
| `/api/meetings` | GET/POST | دریافت/ایجاد جلسات |
| `/api/meetings?type=class` | GET | فیلتر جلسات (کلاس) |
| `/api/admin/stats` | GET | آمار سیستم |
| `/api/admin/users` | GET | لیست کاربران مدیریت |
| `/api/admin/export` | GET | خروجی اکسل |
| `/api/admin/import` | POST | ورود از اکسل |
| `/api/admin/server` | GET | معیارهای سرور |

---

## ۱۰. ارتباطات بلادرنگ (Socket.io)

### ۱۰.۱ سرویس
- Mini-service جداگانه در `mini-services/chat-service/`
- پورت مستقل
- اتصال از طریق: `io("/?XTransformPort={Port}")`

### ۱۰.۲ ایونت‌ها
| ایونت | جهت | توضیح |
|--------|------|--------|
| `send-message` | Client → Server | ارسال پیام |
| `receive-message` | Server → Client | دریافت پیام جدید |
| `join-meeting` | Client → Server | پیوستن به جلسه |
| `participant-joined` | Server → Client | شرکت‌کننده جدید |
| `leave-meeting` | Client → Server | ترک جلسه |
| `typing` | Client → Server | در حال نوشتن |
| `user-online` | Server → Client | کاربر آنلاین شد |
| `user-offline` | Server → Client | کاربر آفلاین شد |

---

## ۱۱. PWA (Progressive Web App)

### ۱۱.۱ Manifest
- نام: `آسامیت | Asameet`
- نام کوتاه: `آسامیت`
- زبان: `fa`، جهت: `rtl`
- display: `standalone`
- رنگ تم: `#0d9488` (teal)
- دسته‌بندی‌ها: `communication`, `social`, `productivity`
- آیکون: 512x512 PNG

### ۱۱.۲ Shortcuts
- چت‌ها: `/?tab=chats`
- تماس‌ها: `/?tab=calls`
- جلسات: `/?tab=meetings`

### ۱۱.۳ پشتیبانی
- Safe area iOS: `.safe-area-top`, `.safe-area-bottom`
- نصب روی اندروید و iOS به‌عنوان PWA

---

## ۱۲. سیستم مدیریت وضعیت (Zustand Store)

### ۱۲.۱ State
```typescript
interface AppState {
  view: 'landing' | 'app'        // نمای فعلی
  tab: 'chats' | 'calls' | 'meetings' | 'classes' | 'admin'
  currentUser: LoginUser | null   // کاربر واردشده
  isDarkMode: boolean             // حالت تاریک
  sidebarOpen: boolean            // وضعیت سایدبار
  activeCallId: string | null     // تماس فعال
  activeMeetingId: string | null  // جلسه فعال
  showLoginModal: boolean         // نمایش مودال ورود
  showCallModal: boolean          // نمایش مودال تماس
  unreadCounts: Record<string, number>  // شمارش‌های خوانده‌نشده
}
```

### ۱۲.۲ Actions
- `setView`, `setTab` — تغییر نما و تب
- `login(user)` — ورود (تبدیل نما به `app`)
- `logout()` — خروج (تبدیل نما به `landing`)
- `toggleDarkMode()` — تغییر حالت تاریک/روشن (تغییر کلاس `dark` روی `document.documentElement`)
- `setSidebarOpen`, `setActiveCallId`, `setActiveMeetingId`, `setShowLoginModal`, `setShowCallModal`
- `setUnreadCount(tab, count)` — بروزرسانی شمارش

---

## ۱۳. مودال ورود

### ۱۳.۱ ورود سریع (Quick Login)
- ۳ حساب آزمایشی پیش‌فرض با نقش‌های مختلف:
  - **کاربر عادی** (برای تست چت و تماس)
  - **معلم** (برای تست کلاس آنلاین)
  - **مدیر سیستم** (برای تست پنل مدیریت)
- یک کلیک ورود بدون نیاز به رمز عبور

### ۱۳.۲ ورود دستی (Manual Login)
- فیلد نام کاربری + رمز عبور
- ارسال به `/api/auth`
- خطاهای: ورود ناموفق، خطای شبکه

---

## ۱۴. قوانین و استانداردهای کد

### ۱۴.۱ TypeScript
- Strict typing در سراسر پروژه
- ES6+ import/export
- بدون `any` مگر ضروری باشد

### ۱۴.۲ کامپوننت‌ها
- `shadcn/ui` به جای پیاده‌سازی سفارشی
- `'use client'` برای کامپوننت‌های کلاینت
- `'use server'` برای عملیات سرور
- `next/image` برای تصاویر

### ۱۴.۳ استایلینگ
- Tailwind CSS 4 class‌ها
- استفاده از `cn()` از `@/lib/utils` برای ترکیب class
- Responsive: `sm:`, `md:`, `lg:`, `xl:`
- RTL-aware: `start`, `end` به جای `left`, `right`
- Touch-friendly: حداقل 44px عناصر تعاملی

### ۱۴.۴ Semantیک و دسترسی‌پذیری
- استفاده از تگ‌های معنایی: `main`, `header`, `nav`, `section`, `article`
- ARIA: `aria-label`, roles
- `sr-only` برای Screen Reader
- Alt text برای تصاویر
- Keyboard navigation

### ۱۴.۵ Footers
- Footer باید `sticky/fixed` به پایین (کوتاهی محتوا)
- `min-h-screen flex flex-col` روی wrapper + `mt-auto` روی footer

---

## ۱۵. ویژگی‌های کلیدی Telegram-like

1. **سرعت و روانی:** انیمیشن‌های روان (Framer Motion)، بدون مکث
2. **اسلاید RTL/LTR:** پیام‌ها از سمت راست (فارسی) یا چپ (انگلیسی) وارد می‌شوند
3. **وضعیت پیام:** ارسال‌شده (✓)، تحویل (✓✓)، خوانده‌شده (آبی)
4. **حباب پیام:** border-radius متفاوت برای فرستنده و گیرنده در RTL
5. **اسکرول‌بار نازک:** 6px، شفاف، مشابه Telegram
6. **Typing indicator:** نمایش «در حال نوشتن...» در هدر چت
7. **پاسخ رگبارداری (Reply):** نمایش پیام اصلی در بالا
8. **پین کردن پیام:** سنجاق در هدر چت
9. **جستجو در چت:** فیلتر پیام‌ها
10. **فیلتر چت‌ها:** همه، خوانده‌نشده، گروه‌ها، کانال‌ها

---

## ۱۶. ویژگی‌های کلیدی Google Meet-like

1. **اتاق جلسه با گرید ویدئو:** 1/2/3 ستون responsive
2. **نوار کنترل پایین:** میکروفون، دوربین، اشتراک صفحه، دست بالا، چت، پایان
3. **تایمر مدت:** شمارش ثانیه‌ای
4. **کپی لینک جلسه:** `https://asameet.online/meet/{link}`
5. **پنل شرکت‌کنندگان:** لیست با نقش و وضعیت
6. **چت حین جلسه:** پنل کناری
7. **تخته دیجیتال (ویژه کلاس):** Canvas HTML5 با ابزار طراحی
8. **حضور غیاب (ویژه کلاس):** وضعیت حاضر/غایب دانش‌آموزان
9. **بلند کردن دست:** برای دانش‌آموزان
10. **کنترل معلم:** بی‌صدا کردن دانش‌آموز، حذف دانش‌آموز

---

## ۱۷. ویژگی‌های متمایزکننده

1. **ترکیب Telegram + Google Meet:** هر دو قابلیت در یک پلتفرم
2. **کلاس‌های آنلاین:** تخته دیجیتال، مدیریت دانش‌آموزان
3. **پشتیبانی RTL کامل:** فارسی و عربی به‌صورت پیش‌فرض
4. **۵ زبان:** فارسی، انگلیسی، فرانسوی، آلمانی، عربی
5. **گلاسمورفیسم:** طراحی مدرن با افکت‌های شیشه‌ای
6. **PWA:** نصب روی موبایل بدون نیاز به اپ استور
7. **آیکون‌های ۳بعدی:** سایه و پرسپکتیو سفارشی
8. **تم تاریک/روشن:** کامل با متغیرهای OKLCH
9. **مدیریت حرفه‌ای:** پنل ادمین با نمودار و خروجی اکسل
10. **سیستم دانه‌ای (Granular):** نقش‌های user/teacher/host/admin

---

## ۱۸. دیتای اولیه (Seed)

- کاربران آزمایشی:
  - `admin` (مدیر سیستم)
  - `teacher1` (معلم)
  - `user1`, `user2`, `user3` (کاربران عادی)
- چت‌های نمونه (خصوصی و گروهی)
- پیام‌های نمونه در هر چت
- جلسات نمونه با وضعیت‌های مختلف

---

## ۱۹. محدودیت‌ها و قیود

1. **تک مسیر:** تنها `/` — هیچ مسیر دیگری تعریف نشده
2. **پورت ۳۰۰۰:** فقط این پورت به بیرون باز است
3. **SQLite فقط:** بانک اطلاعاتی SQLite client-only
4. **بدون `bun run build`:** فقط `bun run dev`
5. **بدون تست:** کد تستی نوشته نمی‌شود
6. **بدون Indigo/آبی:** مگر درخواست صریح
7. **بدون تصاویر placeholder:** از تصاویر واقعی و باکیفیت استفاده شود
8. **z-ai-web-dev-sdk فقط در backend:** استفاده سمت کلاینت ممنوع
9. **API routes:** به جای Server Actions استفاده شود

---

## ۲۰. خلاصه پروژه

آسامیت یک پلتفرم ارتباطی جامع مبتنی بر وب است که با تلفیق قابلیت‌های پیام‌رسانی Telegram و کنفرانس ویدئویی Google Meet، تجربه‌ای یکپارچه برای ارتباط، آموزش و همکاری آنلاین ارائه می‌دهد. این محصول با پشتیبانی کامل از زبان فارسی (RTL)، طراحی گلاسمورفیسم مدرن، آیکون‌های ۳بعدی، و معماری SPA بر پایه Next.js 16، یک راه‌حل همه‌کاره برای تیم‌ها، معلمان و سازمان‌هاست.
