import type { Metadata, Viewport } from "next";
import "./talk.css";

const bp = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "آساتاک | Asatalk — پیام‌رسان و تماس",
  description: "آساتاک؛ پیام‌رسان سریع و تماس صوتی و تصویری با تمام امکانات: گروه، کانال، پیام صوتی و ویدئویی، چند حساب و تنظیمات کامل.",
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
    description: "پیام‌رسان و تماس صوتی و تصویری خانوادهٔ آسامیت — سریع، شیشه‌ای، خودمانی.",
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

export default function TalkLayout({ children }: { children: React.ReactNode }) {
  return <div className="talk min-h-dvh">{children}</div>;
}
