self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('app-cache').then(cache => cache.addAll([
      '/',
      '/manifest.json',
      'https://picsum.photos/seed/pwa-icon-192/192/192',
      'https://picsum.photos/seed/pwa-icon-512/512/512'
    ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
