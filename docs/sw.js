const CACHE_NAME = 'web-set-v4';
const APP_FILES = [
  './', './index.html', './src/app.js', './src/engine.js', './src/cards.js',
  './src/storage.js', './src/time.js', './src/deal.js', './src/hints.js', './src/styles.css', './icons/icon.svg', './icons/apple-touch-icon.png', './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // URLs containing a seed query still resolve to the cached app shell when offline.
  const url = new URL(event.request.url);
  const request = event.request.mode === 'navigate' ? new Request(new URL('./index.html', self.registration.scope).href) : event.request;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok && response.type === 'basic' && url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then(cached => cached ?? Response.error()))
  );
});
