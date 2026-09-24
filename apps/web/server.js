/**
 * Static file server for Railway. No framework, no dependencies: the app is a folder of
 * files with a single-page fallback.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Media that never changes within a build but carries no hash in its name. */
const STATIC_TYPES = new Set(['.woff2', '.png', '.svg', '.ico']);

/**
 * How long the browser may keep a file.
 *
 * Vite writes a content hash into every name under /assets/, so those can never go stale:
 * a change produces a different URL. The font and the icons cannot claim that — their
 * names are fixed — so they get a month rather than a year, and no `immutable`. Replacing
 * one therefore reaches everybody within a month instead of never.
 *
 * Everything else (index.html, the manifest, the service worker) must be revalidated every
 * time, or a deploy would never reach a returning visitor.
 */
function cacheControl(requested, ext) {
  if (requested.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (STATIC_TYPES.has(ext)) return 'public, max-age=2592000';
  return 'no-cache';
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(ROOT, requested);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // Unknown paths are client routes, not 404s.
    filePath = join(ROOT, 'index.html');
  }

  const ext = extname(filePath);
  res.writeHead(200, {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'cache-control': cacheControl(requested, ext),
    'x-content-type-options': 'nosniff',
  });
  createReadStream(filePath).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`SlashFacts serving ${ROOT} on :${PORT}`);
});
