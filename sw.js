const CACHE_NAME = 'gym-flow-v1';
const ASSETS = [
  './',
  './index.html',
  './img/Pecho_01.jpg', // Agrega aquí los nombres de tus fotos principales
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});