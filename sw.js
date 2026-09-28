// ============================================================================
// SERVICE WORKER — DAFTAR OBAT ANESTESI
// ============================================================================
// Tujuan: membuat aplikasi bisa "diinstal" (Add to Home Screen) di Android &
// iPhone dan tetap bisa dibuka walau sinyal lemah, TANPA membuat data obat
// jadi basi. Karena itu strateginya dipisah:
//   - App shell (HTML/CSS/JS/ikon)  -> cache-first (cepat, bisa offline)
//   - Panggilan ke Google Apps Script (data spreadsheet) -> SELALU network,
//     tidak pernah di-cache, supaya perubahan di spreadsheet langsung
//     terlihat setiap kali dibuka/refresh tanpa perlu update apa pun.
// ============================================================================

var CACHE_NAME = 'obat-anestesi-shell-v1';
var APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .catch(function (err) { console.warn('Gagal cache app shell:', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Data spreadsheet (via Google Apps Script) HARUS selalu live dari network.
  if (url.indexOf('script.google.com') !== -1 || url.indexOf('script.googleusercontent.com') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function () {
        return new Response(
          JSON.stringify({ ok: false, error: 'Tidak ada koneksi internet — data live memerlukan koneksi ke Google Spreadsheet.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Aset lain (app shell): coba cache dulu, baru network, agar tetap ringan & bisa offline.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request);
    })
  );
});
