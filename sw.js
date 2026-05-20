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

// FETCH → Estrategia Network First para HTML y Stale-While-Revalidate para Assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 🔥 NUEVO: Si la app consulta por la versión, responde directamente
  if (url.pathname.endsWith('/get-version')) {
    e.respondWith(new Response(CACHE_VERSION, { headers: { 'Content-Type': 'text/plain' } }));
    return;
  }
  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // 🔥 Clonamos la petición para evitar conflictos de CORS en GitHub Pages
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }) // Evita que el navegador use caché interno
        .then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // Si no hay internet, usa el caché
    );
  } else {
    // Para imágenes, fuentes y estilos: Cache First + actualización en background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => null);
        return cached || fetchPromise;
      })
    );
  }
});
