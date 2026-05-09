// =============================================================================
// RangeOffice service worker.
//
// Bump CACHE_NAME whenever a cached asset changes. The new value both
// invalidates the previous cache (deleted on 'activate') and changes the bytes
// of this script — that byte change is what tells the browser an update is
// available, which drives the in-app update prompt.
// =============================================================================

const CACHE_NAME = 'rangeoffice-v1';
const ASSETS = [
    './',
    'index.html',
    'app.js',
    'core.js',
    'styles.css',
    'JsBarcode.all.min.js',
    'manifest.webmanifest',
    'icon.svg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        )
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
