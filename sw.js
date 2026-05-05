// ─── VERSIÓN DEL CACHE ───────────────────────────────────────────────────────
// Cambia este número cada vez que subas cambios a GitHub.
// El SW detectará la nueva versión, descargará los archivos frescos
// y notificará a la app para que se recargue automáticamente.
const CACHE_VERSION = 'GYM FLOW-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// INSTALL: precachea todos los assets con la nueva versión
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(c => Promise.allSettled(ASSETS.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())  // activa inmediatamente sin esperar
  );
});

// ACTIVATE: borra caches viejos (de versiones anteriores), nunca toca localStorage
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Notifica a todos los tabs abiertos que hay una nueva versión
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// FETCH: network-first para HTML (siempre fresco), cache-first para assets
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Overpass API y otros servicios externos de datos: siempre red, nunca caché
  if (url.hostname.includes('overpass-api.de') || url.hostname.includes('overpass.kumi.systems')) {
    return; // deja pasar sin interceptar
  }

  const isHTML = e.request.destination === 'document' || url.pathname.endsWith('.html') || url.pathname === '/';

  if (isHTML) {
    // HTML: intenta red primero, cae a cache si sin conexión
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Assets (JS, CSS, fonts, images): cache-first, actualiza en background
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});
