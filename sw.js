// ════════════════════════════════════════════════════════════════
// Quiniela Arcángel — Service Worker v1.3
// Estrategia: Network-first para datos Supabase, Cache-first para assets
// ════════════════════════════════════════════════════════════════

const CACHE_NAME = "arcangel-v1.3";

// Assets to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "./",
  "./quiniela-arcangel.html",
  "./manifest.json",
  "./img/logo-arcangel.png",
  // Equipos Liga MX
  "./img/america.png",
  "./img/atlas.png",
  "./img/chivas.png",
  "./img/cruz-azul.png",
  "./img/juarez.png",
  "./img/leon.png",
  "./img/mazatlan.png",
  "./img/monterrey.png",
  "./img/necaxa.png",
  "./img/pachuca.png",
  "./img/puebla.png",
  "./img/pumas.png",
  "./img/queretaro.png",
  "./img/san-luis.png",
  "./img/santos.png",
  "./img/tigres.png",
  "./img/tijuana.png",
  "./img/toluca.png",
];

// CDN URLs to cache (fonts, libraries)
const CDN_CACHE = "arcangel-cdn-v1.3";
const CDN_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdnjs.cloudflare.com",
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW] Installing v1.3...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache what we can, ignore failures for missing files
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => console.warn("[SW] Skip:", url))
        )
      );
    }).then(() => {
      console.log("[SW] Pre-cache complete");
      return self.skipWaiting(); // activate immediately
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== CDN_CACHE)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // take control immediately
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith("http")) return;

  // ── Supabase API: Network-first (always fresh data) ──
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // ── CDN (fonts, scripts): Cache-first with network fallback ──
  if (CDN_HOSTS.some((h) => url.hostname.includes(h))) {
    event.respondWith(cdnCacheFirst(request));
    return;
  }

  // ── App shell + local assets: Cache-first, update in background ──
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ── Everything else: Network with cache fallback ──
  event.respondWith(networkFirstWithFallback(request));
});

// ── STRATEGIES ────────────────────────────────────────────────

// Network-first: try network, fallback to cache
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    if (request.mode === "navigate") {
      const offlinePage = await caches.match("./quiniela-arcangel.html");
      if (offlinePage) return offlinePage;
    }
    return new Response("Sin conexión", { status: 503 });
  }
}

// Cache-first for CDN assets (rarely change)
async function cdnCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CDN_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("CDN no disponible", { status: 503 });
  }
}

// Stale-while-revalidate: return cache immediately, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);
  return cached || (await networkFetch) || new Response("Sin conexión", { status: 503 });
}

// ── BACKGROUND SYNC (para cuando se pierde conexión) ──────────
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("[SW] Background sync triggered");
  }
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Quiniela Arcángel", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || "Quiniela Arcángel ⚽", {
      body: data.body || "Hay novedades en tu quiniela",
      icon: "./img/logo-arcangel.png",
      badge: "./img/logo-arcangel.png",
      tag: "quiniela-update",
      renotify: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || "./" },
    })
  );
});

// Click on push notification → open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

console.log("[SW] Quiniela Arcángel SW v1.3 loaded ✅");
