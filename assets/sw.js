// Cendere service worker. Cache adına build sürümü gömülür: __BUILD__ placeholder'ını
// tools/prune-dist.mjs her build'de bundle hash'iyle değiştirir → her deploy yeni
// cache adı üretir, activate eski cache'leri siler, cihazlar yeni sürümü GÖRÜR.
// Strateji: navigasyon + index.html/manifest = network-first (ağ yoksa cache'e düş);
// hash'li asset'ler = cache-first (adları içerikle değiştiği için bayatlamazlar).

const CACHE = 'cendere-__BUILD__';
const CORE = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

/** Uygulama kabuğu mu? — bunlar hep ağdan denenir ki yeni sürüm anında gelsin. */
function isNetworkFirst(req) {
  if (req.mode === 'navigate') return true;
  const path = new URL(req.url).pathname;
  return path.endsWith('/index.html') || path.endsWith('/manifest.webmanifest') || path.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (isNetworkFirst(req)) {
    // Network-first: taze yanıt cache'e de yazılır; ağ başarısızsa cache, o da yoksa kabuk
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./index.html')))
    );
    return;
  }

  // Cache-first: hash'li asset'ler değişmez; ilk kullanımda cache'e alınır
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok && new URL(req.url).origin === location.origin) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
    )
  );
});
