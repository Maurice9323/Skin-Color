// Service worker for skin only.
// Bump the number in VERSION to make phones drop the old cache right away.
const PREFIX = 'skin-';
const VERSION = PREFIX + 'v2';

const ASSETS = [
  './',
  './index.html',
  './manifest-skin.json',
  './skin-180.png',
  './skin-192.png',
  './skin-512.png',
  './skin-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Only clears this tool's old caches, never the other tool's.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(PREFIX) && k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Opens instantly from the cache (works offline), then quietly
// fetches a fresh copy so the next open has any update you pushed.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(VERSION).then((cache) =>
      cache.match(req, { ignoreSearch: true }).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network.then((res) => res || new Response('Offline and not cached yet.', { status: 503 }));
      })
    )
  );
});
