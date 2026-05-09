// =============================================================================
// Tiny static file server — Node builtins only, runs fully offline.
// Used by `npm run serve` for local development. PORT env var overrides 3000.
// =============================================================================

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]+$/, '');
const PORT = Number(process.env.PORT) || 3000;

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
        const body = await readFile(filePath);
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
    console.log(`RangeOffice dev server: http://localhost:${PORT}`);
});
