# اپ‌های اندروید آسامیت

دو اپلیکیشن اندروید با Capacitor ساخته می‌شوند:

| اپ | پوشه | App ID | محتوا |
|----|------|--------|-------|
| **آسامیت** (کامل) | `mobile/asameet` | `online.asameet.app` | همه امکانات: چت، تماس، جلسات، کلاس، مدیریت |
| **آسامیت پیام‌رسان** | `mobile/asameet-messenger` | `online.asameet.messenger` | فقط چت و تماس — تجربه تلگرام‌گونه (`/?mode=messenger`) |

هر دو اپ WebView بومی Capacitor هستند که به نسخه مستقرشده وب متصل می‌شوند —
همان معماری Progressive Web App با پوسته بومی، آیکون لانچر، اسپلش و رفتار
اپ مستقل.

## ساخت خودکار (پیشنهادی — بدون نیاز به هیچ ابزار محلی)

گیت‌هاب اکشن **Build Android APKs** (`.github/workflows/android.yml`):

1. در گیت‌هاب: **Actions → Build Android APKs → Run workflow**
2. ورودی `app_url` را آدرس استقرار بدهید (پیش‌فرض: دموی Vercel)
3. بعد از اتمام، دو artifact دانلود کنید:
   - `asameet-debug-apk`
   - `asameet-messenger-debug-apk`

APK های debug مستقیماً روی گوشی نصب می‌شوند (برای انتشار در استور به امضای release نیاز است — پایین را ببینید).

## ساخت محلی

پیش‌نیاز: Node 22، JDK 21، Android SDK (یا Android Studio)

```bash
cd mobile/asameet          # یا mobile/asameet-messenger
npm install
npx cap add android
npx cap sync android
npx @capacitor/assets generate --android --iconBackgroundColor '#0d9488'
cd android && ./gradlew assembleDebug
# خروجی: android/app/build/outputs/apk/debug/app-debug.apk
```

## امضای نسخه Release (برای انتشار)

```bash
keytool -genkey -v -keystore asameet.keystore -alias asameet -keyalg RSA -keysize 2048 -validity 10000
cd android && ./gradlew assembleRelease
# سپس apksigner یا تنظیم signingConfig در build.gradle
```

## تغییر آدرس سرور

آدرس مقصد هر اپ در `capacitor.config.json` کلید `server.url` است. پس از انتقال به
دامنه نهایی، آن را به‌روز کنید (workflow این کار را با ورودی `app_url` خودکار انجام می‌دهد).
