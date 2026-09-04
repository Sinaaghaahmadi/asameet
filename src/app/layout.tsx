import type { Metadata, Viewport } from "next";
import "./fonts.css";
import "./globals.css";
import "./talk.css";
import { ClientProviders } from "@/components/shared/client-providers";

const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://asatalk.vercel.app"),
  title: "آساتاک | Asatalk — پیام‌رسان و تماس",
  description:
    "آساتاک؛ پیام‌رسان سریع و تماس صوتی و تصویری با تمام امکانات: گروه، کانال، پیام صوتی و ویدئویی، چند حساب و تنظیمات کامل.",
  applicationName: "Asatalk",
  manifest: `${bp}/asatalk.webmanifest`,
  icons: {
    icon: [
      { url: `${bp}/asatalk/icons/favicon.svg`, type: "image/svg+xml" },
      { url: `${bp}/asatalk/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: `${bp}/asatalk/icons/apple-touch-icon.png`,
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "آساتاک" },
  openGraph: {
    title: "آساتاک | Asatalk",
    description: "پیام‌رسان و تماس صوتی و تصویری خانوادهٔ آسا — سریع، شیشه‌ای، خودمانی.",
    images: [`${bp}/asatalk/og.png`],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ClientProviders>
          <div className="talk min-h-dvh">{children}</div>
        </ClientProviders>
      </body>
    </html>
  );
}
