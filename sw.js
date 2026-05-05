const CACHE_VERSION = 'gym-flow-v4'; // ⚠️ cambia esto en cada deploy
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './img/Pecho_01.jpg'
];

/* =========================
   INSTALL (forzar nueva versión)
========================= */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()) // 🔥 activa inmediatamente
  );
});

/* =========================
   ACTIVATE (limpiar caches viejos)
========================= */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* =========================
   FETCH STRATEGY
========================= */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 🔥 APIs externas NO se cachean
  if (
    url.hostname.includes('overpass-api.de') ||
    url.hostname.includes('overpass.kumi.systems')
  ) {
    return;
  }

  const isHTML =
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/';

  /* =========================
     HTML → NETWORK FIRST (siempre actualizado)
  ========================= */
  if (isHTML) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* =========================
     ASSETS → STALE WHILE REVALIDATE
  ========================= */
  event.respondWith(
    caches.match(event.request).then(cached => {

      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
