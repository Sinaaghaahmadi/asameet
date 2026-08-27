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

## امضای نسخه Release (برای انتشار در فروشگاه‌ها)

workflow ‏`.github/workflows/release.yml` امضا را خودکار انجام می‌دهد. کافی است یک
بار کلید بسازید و چهار Secret را روی مخزن تنظیم کنید؛ از آن به بعد هر تگ `v*`
یک APK امضاشدهٔ آمادهٔ فروشگاه تولید می‌کند.

### ۱. ساخت کلید انتشار

```bash
keytool -genkeypair -v -keystore my-release-key.jks -alias asameet \
  -keyalg RSA -keysize 2048 -validity 10000
```

> **این فایل را گم نکنید و از آن نسخهٔ پشتیبان بگیرید.** اندروید فقط به‌روزرسانی‌هایی
> را می‌پذیرد که با *همان* کلید نسخهٔ قبل امضا شده باشند. اگر کلید را از دست بدهید،
> دیگر نمی‌توانید اپ منتشرشده را به‌روزرسانی کنید و باید با appId جدید از صفر شروع کنید.

### ۲. تبدیل کلید به Base64

فایل `.jks` باینری است و Secret فقط متن می‌پذیرد:

```bash
base64 -w0 my-release-key.jks > my-release-key.b64   # لینوکس
base64 -i my-release-key.jks | tr -d '\n' > my-release-key.b64   # مک
```

### ۳. تنظیم Secretها

در **Settings → Secrets and variables → Actions → New repository secret**:

| نام Secret | مقدار |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | کل محتوای `my-release-key.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | رمز keystore (همان که به `-storepass` دادید) |
| `ANDROID_KEY_ALIAS` | نام کلید — در مثال بالا `asameet` |
| `ANDROID_KEY_PASSWORD` | رمز خودِ کلید؛ اگر با رمز keystore یکی است، خالی بگذارید یا همان را بنویسید |

Secretها فقط به runner داده می‌شوند، در لاگ نمایش داده نمی‌شوند و در artifactها
نمی‌آیند: keystore داخل `$RUNNER_TEMP` باز می‌شود، نه در workspace.

### ۴. انتشار

```bash
git tag v1.0.1 && git push origin v1.0.1
```

یا از **Actions → Publish Release → Run workflow** شماره نسخه را وارد کنید.

workflow پس از build این کارها را انجام می‌دهد:

1. `zipalign -p -f 4` — هم‌ترازسازی، پیش‌نیاز نصب روی اندروید
2. `apksigner sign` — امضا با طرح‌های v1، v2 و v3
3. `apksigner verify --print-certs` — **اگر امضا معتبر نباشد build شکست می‌خورد**، تا
   هیچ‌وقت فایل غیرقابل‌نصب منتشر نشود. اثر انگشت گواهی در لاگ چاپ می‌شود.

اگر `ANDROID_KEYSTORE_BASE64` تنظیم نشده باشد، workflow به بیلد debug برمی‌گردد و در
متن Release صریحاً می‌نویسد که فایل امضانشده است — پس هیچ‌وقت به‌اشتباه ادعای امضا نمی‌کند.

### امضای دستی (بدون CI)

```bash
cd mobile/asameet/android && ./gradlew assembleRelease
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -1)"
"$BT/zipalign" -p -f 4 app/build/outputs/apk/release/app-release-unsigned.apk aligned.apk
"$BT/apksigner" sign --ks my-release-key.jks --out asameet.apk aligned.apk
"$BT/apksigner" verify --print-certs asameet.apk
```

## تغییر آدرس سرور

آدرس مقصد هر اپ در `capacitor.config.json` کلید `server.url` است. پس از انتقال به
دامنه نهایی، آن را به‌روز کنید (workflow این کار را با ورودی `app_url` خودکار انجام می‌دهد).
