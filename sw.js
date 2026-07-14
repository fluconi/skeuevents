// ============================================================
// Service Worker — Skål Europe Events
// Strategia: "stale-while-revalidate" solo per i file statici
// dello stesso dominio (HTML/CSS/JS/immagini). Le chiamate a
// Supabase e a librerie esterne (esm.sh) passano sempre dritte
// alla rete, senza essere intercettate: i dati degli eventi
// devono sempre essere aggiornati, mai serviti dalla cache.
// ============================================================

const CACHE_NAME = 'skal-events-v1';

const APP_SHELL = [
  './',
  './index.html',
  './event.html',
  './admin.html',
  './config.js',
  './manifest.json',
  './logo-skal-europe.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {}) // non bloccare l'installazione se un file manca
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Lascia passare senza intercettare: dominio esterno (Supabase, esm.sh)
  // o richieste non-GET (POST/PATCH/DELETE verso l'API).
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request)
        .then(response => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
