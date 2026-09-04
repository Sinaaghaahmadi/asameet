/* Asatalk service worker — offline shell + static asset caching.
   All asset URLs are relative to the SW location so it works at the domain
   root (Vercel/self-hosted) and under a base path. */
const CACHE = "asatalk-v1";
const STATIC_ASSETS = [
  "./",
  "asatalk.webmanifest",
  "asatalk/icons/icon-192.png",
  "asatalk/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache only successful, same-origin, non-API GET responses — an error page
   or expired asset must never shadow the real thing offline. */
function cacheable(res) {
  return res && res.ok && (res.type === "basic" || res.type === "default");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // API requests carry per-user data: network only, never cached.
  if (url.pathname.includes("/api/")) return;

  const isStatic =
    url.pathname.includes("/_next/static/") ||
    /\.(png|svg|woff2|webmanifest|ico|css|js)$/.test(url.pathname);

  if (isStatic) {
    // Hashed/immutable assets: cache-first.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (cacheable(res)) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return res;
          })
      )
    );
  } else {
    // Pages: network-first, falling back to the cached shell offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(new URL("./", self.location).href))
        )
    );
  }
});
