// Service worker minimal — requis pour l'installabilité PWA.
// Stratégie « network-first » avec repli cache pour les navigations hors-ligne.
const CACHE = "rapports-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // On ne gère que les GET de navigation/pages (jamais les POST/API).
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        // Met en cache les pages navigables pour un repli hors-ligne.
        if (request.mode === "navigate") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/")))
  );
});
