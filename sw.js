// ⚠️ اسم کش رو به v7 تغییر دادم تا حتماً کش قدیمی بمیره
var CACHE_NAME = 'persia-cache-v7-final'; 

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
  // درخواست‌های API رو دست نزن
  if (event.request.url.includes('script.google.com') || event.request.url.includes('qrserver.com')) {
    return;
  }

  // 🔑 راه‌حل اصلی: صفحات HTML همیشه اول از شبکه لود بشن
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        // اگه آنلاین بودیم، نسخه جدید رو بگیر و کش کن
        var resClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, resClone);
        });
        return response;
      }).catch(function() {
        // اگه آفلاین بودیم، از کش بخون
        return caches.match(event.request);
      })
    );
    return;
  }

  // بقیه فایل‌ها (عکس، فونت، اسکریپت‌ها): اول از کش، بعد شبکه
  event.respondWith(
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
        // اگه آفلاین بودیم و توی کش هم نبود
        if (event.request.url.includes('glass-reference.html')) {
          return caches.match('./glass-reference.html');
        }
        return caches.match('./index.html');
      });
    })
  );
});
