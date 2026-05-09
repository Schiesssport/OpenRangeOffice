// =============================================================================
// RangeOffice service worker.
//
// Network-first strategy: every GET tries the network first and only falls
// back to the cache when offline (or the request fails). This means a normal
// F5 always picks up the latest deployed version when online, while preserving
// full offline functionality on a range with no connectivity.
//
// The cache is still pre-warmed on install so the very first offline boot has
// every asset available. Successful network responses replace the cached copy,
// so the offline cache stays current as the user uses the app online.
//
// CACHE_NAME bumps are still meaningful — they change this script's bytes
// (which triggers the browser's SW update flow and the in-app update prompt)
// and atomically swap to a freshly populated cache via install + activate.
// Bump it whenever you ship a coordinated version that should land
// immediately, even on offline-only clients.
// =============================================================================

const CACHE_NAME = 'rangeoffice-v2';
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
    if (event.request.method !== 'GET') return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
            const response = await fetch(event.request);
            if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
                cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
        } catch (_) {
            const cached = await cache.match(event.request);
            return cached || new Response('', { status: 504, statusText: 'offline-no-cache' });
        }
    })());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
