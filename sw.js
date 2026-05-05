const CACHE_NAME = 'gym-flow-v2';
const ASSETS = [
  './',
  './index.html',
  './img/Pecho_01.jpg', // Agrega aquí los nombres de tus fotos principales
  './manifest.json'
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
