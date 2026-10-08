/* Service worker ringan: hanya menyimpan kerangka aplikasi (halaman dan ikon).
   Permintaan ke server Apps Script (lintas asal, POST) tidak pernah disentuh. */
const VERSI = 'absensi-v3';
const KERANGKA = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(KERANGKA); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // config.js memuat alamat server: selalu coba jaringan dulu agar perubahan alamat langsung berlaku.
  if (url.pathname.slice(-10) === '/config.js') {
    e.respondWith(fetch(req).then(function (res) { const s = res.clone(); caches.open(VERSI).then(function (c) { c.put(req, s); }); return res; }).catch(function () { return caches.match(req); }));
    return;
  }
  // Halaman: coba jaringan dulu (agar pembaruan cepat sampai), cadangan dari simpanan.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        const salinan = res.clone();
        caches.open(VERSI).then(function (c) { c.put('index.html', salinan); });
        return res;
      }).catch(function () { return caches.match('index.html'); })
    );
    return;
  }
  // Berkas statis: simpanan dulu.
  e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
});
