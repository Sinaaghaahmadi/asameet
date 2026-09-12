/* Asameet service worker — offline shell + static asset caching.
   All asset URLs are relative to the SW location so it works at the domain
   root (Vercel/self-hosted) and under a base path. */
const CACHE = "asameet-v4";
const STATIC_ASSETS = [
  "./",
  "manifest.webmanifest",
  "logo.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
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

/* ---------------- Web push (Asatalk) ----------------
   Messages and calls that arrive while the app is closed. The payload is the
   JSON the app server sent; a call is shown with high priority and its own
   tag so a second ring replaces the first rather than stacking. */

const TALK_ICON = "asatalk/icons/icon-192.png";

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Asatalk", body: event.data ? event.data.text() : "" };
  }
  const isCall = data.kind === "call";
  const icon = new URL(TALK_ICON, self.location).href;
  event.waitUntil(
    self.registration.showNotification(data.title || "Asatalk", {
      body: data.body || "",
      icon,
      badge: icon,
      tag: data.tag || (isCall ? `call:${data.callId}` : `chat:${data.chatId}`),
      renotify: isCall,
      requireInteraction: isCall,
      vibrate: isCall ? [300, 120, 300, 120, 300] : [80],
      timestamp: Date.now(),
      data: {
        chatId: data.chatId || null,
        callId: data.callId || null,
        kind: data.kind || "message",
      },
    })
  );
});

/* Focus an open tab rather than reopening — a cold start loses call state. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { chatId, callId } = event.notification.data || {};
  const target = new URL("talk", self.location);
  if (callId) target.hash = `call=${callId}`;
  else if (chatId) target.hash = `chat=${chatId}`;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if (new URL(client.url).origin !== self.location.origin) continue;
          if (!new URL(client.url).pathname.includes("/talk")) continue;
          client.postMessage({ type: "asatalk:open", chatId, callId });
          return client.focus();
        }
        return self.clients.openWindow(target.href);
      })
  );
});
