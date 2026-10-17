var CACHE_NAME = 'persia-cache-v4';
var urlsToCache = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function() {});
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
  // درخواست‌های API رو کش نکن
  if (url.hostname.includes('script.google.com') || url.hostname.includes('qrserver.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request).then(function(res) {
        if (event.request.method === 'GET' && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, resClone);
          });
        }
        return res;
      }).catch(function() {
        return caches.match('./index.html');
      });
    })
  );
});
