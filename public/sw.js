const CACHE_NAME = "drenagem-padua-pwa-v1";
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache real-time APIs, server functions, or Supabase endpoints
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/api")
  ) {
    return;
  }

  // Network-first strategy with cache fallback for same-origin static assets & shell
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          (url.pathname.startsWith("/assets/") ||
            PRECACHE_ASSETS.includes(url.pathname))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response(
          "Sem conexão com a internet. Verifique sua rede e tente novamente.",
          {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }
        );
      })
  );
});

