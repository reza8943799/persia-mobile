var CACHE_NAME = 'persia-cache-v5';
var urlsToCache = [
  './',
  './index.html',
  './glass-reference.html',
  './brands-db.js',
  './patch.js',
  './manifest.json',
  './splash.jpg',
  './font/Vazirmatn-Regular.woff2',
  './font/Vazirmatn-Bold.woff2'
];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // کش کردن تک‌به‌تک فایل‌ها تا اگر یک فایل نبود، بقیه فایل‌ها از قلم نیفتند
      return Promise.all(
        urlsToCache.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  // درخواست‌های API آنلاین رو کش نکن
  if (url.hostname.includes('script.google.com') || url.hostname.includes('qrserver.com')) {
    return;
  }
  event.respondWith(
    // ignoreSearch باعث می‌شود glass-reference.html?embed=1 هم از روی کش آفلاین خوانده شود!
    caches.match(event.request, { ignoreSearch: true }).then(function(response) {
      return response || fetch(event.request).then(function(res) {
        if (event.request.method === 'GET' && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, resClone);
          });
        }
        return res;
      }).catch(function() {
        if (url.pathname.endsWith('glass-reference.html')) {
          return caches.match('./glass-reference.html');
        }
        return caches.match('./index.html');
      });
    })
  );
});
