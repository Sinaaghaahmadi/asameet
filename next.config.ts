import type { NextConfig } from "next";

// Build targets:
//   VERCEL=1  → Vercel's own builder (must NOT use standalone output: it
//               relocates the node-file-trace manifests and the builder then
//               fails with ENOENT next-server.js.nft.json)
//   otherwise → self-hosted Node/Docker, which needs standalone
//
// The old STATIC_EXPORT target (GitHub Pages demo with an in-browser fake
// API) was retired when real accounts arrived: the app now requires the
// server API on every screen past the landing page.
const isVercel = process.env.VERCEL === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isVercel ? {} : { output: "standalone" as const }),
  ...(basePath ? { basePath } : {}),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:dir(fonts|icons)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
