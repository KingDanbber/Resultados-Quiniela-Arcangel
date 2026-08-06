/* Quiniela Arcángel · Service Worker + Web Push */
const CACHE = "qa-arcangel-v2";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/variables.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./js/utils.js",
  "./js/icons.js",
  "./js/data.js",
  "./js/app.js",
  "./js/search.js",
  "./js/notifications.js",
  "./js/my-boleta.js",
  "./js/share.js",
  "./js/pwa.js",
  "./js/trophy3d.js",
  "./js/render/home.js",
  "./js/render/jornadas.js",
  "./js/render/historial.js",
  "./js/render/ganadores.js",
  "./js/render/tabla.js",
  "./js/render/jornada-detalle.js",
  "./img/logo-arcangel.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("espn") ||
    url.hostname.includes("thesportsdb") ||
    url.hostname.includes("futbolenvivo") ||
    url.hostname.includes("corsproxy") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("cdnjs")
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetched = fetch(req)
        .then((res) => {
          if (res && res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});

/** Web Push en segundo plano */
self.addEventListener("push", (event) => {
  let data = {
    title: "Quiniela Arcángel",
    body: "Hay novedades en la quiniela",
    url: "/",
    icon: "./img/logo-arcangel.png",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    }
  } catch (_) {
    try {
      data.body = event.data.text();
    } catch (__) {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Quiniela Arcángel", {
      body: data.body || "",
      icon: data.icon || "./img/logo-arcangel.png",
      badge: "./img/logo-arcangel.png",
      data: { url: data.url || "/" },
      vibrate: [80, 40, 80],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
