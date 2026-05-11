// =============================================================================
// Tiny static file server — Node builtins only, runs fully offline.
//
// Modes (selected by `npm run` script):
//   `npm run dev`  — serves files raw. sw.js keeps the `__CACHE_VERSION__`
//                    placeholder, which puts the service worker in network-
//                    first mode so code edits show up on reload.
//   `npm run prod` — sets STAMP_CACHE=1. The server intercepts sw.js and
//                    substitutes the placeholder with a per-process timestamp,
//                    making the SW behave exactly like a deployed release.
//                    Restart the server to "ship" a new version locally.
//
// PORT env var overrides the default 3000.
// =============================================================================

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');
const PORT = Number(process.env.PORT) || 3000;
const STAMP_CACHE = process.env.STAMP_CACHE === '1';
const CACHE_STAMP = `prod-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const MIME = {
    '.html':        'text/html; charset=utf-8',
    '.js':          'application/javascript; charset=utf-8',
    '.css':         'text/css; charset=utf-8',
    '.json':        'application/json; charset=utf-8',
    '.svg':         'image/svg+xml',
    '.png':         'image/png',
    '.ico':         'image/x-icon',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const shouldStampServiceWorker = (requested) => STAMP_CACHE && requested === 'sw.js';

createServer(async (req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const stripped = urlPath.replace(/^\/+/, '');
    const requested = stripped || 'index.html';
    const filePath = normalize(join(ROOT, requested));

    if (!filePath.startsWith(ROOT + sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }
    try {
        const raw = await readFile(filePath);
        const body = shouldStampServiceWorker(requested)
            ? Buffer.from(raw.toString('utf8').replace('__CACHE_VERSION__', CACHE_STAMP))
            : raw;
        res.writeHead(200, {
            'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        res.end(body);
    } catch (_) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
}).listen(PORT, () => {
    const mode = STAMP_CACHE ? `prod (cache stamp: ${CACHE_STAMP})` : 'dev';
    console.log(`OpenRangeOffice ${mode} server: http://localhost:${PORT}`);
});
