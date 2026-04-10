// MathBox Service Worker
// 策略：HTML network-first，靜態資源 stale-while-revalidate，API 不快取
const CACHE_NAME = 'mathbox-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 跨域請求不處理
  if (url.origin !== self.location.origin) return;

  // API 請求完全不走 SW
  if (url.pathname.startsWith('/api')) return;

  // HTML 導航：network-first，失敗時回退快取，最後回退 '/'
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('/')))
    );
    return;
  }

  // 靜態資源：stale-while-revalidate
  e.respondWith(
    caches.match(req).then(cached => {
      const fetched = fetch(req)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});
