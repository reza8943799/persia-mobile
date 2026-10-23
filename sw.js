const CACHE_NAME = 'persia-cache-v10-final';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './splash.jpg'
];

// نصب و کش کردن فایل‌ها
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // فایل‌ها رو تک تک کش می‌کنیم تا اگه یکی ارور داد، بقیه کش بشن
      return Promise.all(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.error('خطا در کش:', url)))
      );
    })
  );
});

// پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// جادوی آفلاین شدن
self.addEventListener('fetch', (event) => {
  // فقط درخواست‌های GET رو مدیریت کن
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // اگه آنلاین بودیم، نسخه جدید رو کش کن و بفرست
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => {
        // اگه آفلاین بودیم، از کش بخون (با ignoreSearch برای اینکه ?v= رو هم ساپورت کنه)
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // اگه توی کش نبود و درخواست صفحه اصلی بود، index.html رو بده
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
