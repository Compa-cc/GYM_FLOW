const CACHE_VERSION = 'gym-flow-v4'; // 🔥 cambia esto en cada deploy
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
];

// INSTALL → precarga y fuerza activación inmediata
self.addEventListener('install', e => {
  self.skipWaiting(); // 🔥 activa inmediatamente

  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS))
  );
});

// ACTIVATE → limpia versiones viejas
self.addEventListener('activate', e => {
  e.waitUntil(
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

// FETCH
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  const isHTML =
    e.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/';

  if (isHTML) {
    // 🔥 SIEMPRE red primero (evita app vieja)
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // assets: cache + actualización en background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request)
          .then(res => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
            }
            return res;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});
