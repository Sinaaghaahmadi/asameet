import type { NextConfig } from "next";

// Build targets:
//   STATIC_EXPORT=1 → serverless-free static demo (GitHub Pages)
//   VERCEL=1        → Vercel's own builder (must NOT use standalone output:
//                     it relocates the node-file-trace manifests and the
//                     builder then fails with ENOENT next-server.js.nft.json)
//   otherwise       → self-hosted Node/Docker, which needs standalone
const isStatic = process.env.STATIC_EXPORT === "1";
const isVercel = process.env.VERCEL === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : isVercel ? {} : { output: "standalone" as const }),
  ...(basePath ? { basePath } : {}),
  ...(isStatic
    ? {}
    : {
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
      }),
};

export default nextConfig;
