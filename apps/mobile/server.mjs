/**
 * Static file server for Railway, serving the web export (`npm run build:web`). No
 * framework, no dependencies: the site is a folder of files with a single-page fallback,
 * compressed once at startup.
 * `.mjs` because this package isn't an ES module package, and Metro never bundles this file.
 */
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

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
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/** Media that never changes within a build but carries no hash in its name. */
const STATIC_TYPES = new Set(['.png', '.webp', '.svg', '.ico']);

/**
 * How long the browser may keep a file.
 *
 * The export writes a content hash into every name under /_expo/static/ (the bundle) and
 * /assets/ (the fonts), so those can never go stale: a change produces a different URL. The
 * icons cannot claim that — their names are fixed — so they get a month rather than a year,
 * and no `immutable`. Replacing one therefore reaches everybody within a month instead of
 * never.
 *
 * Everything else (index.html, the manifest, the service worker) must be revalidated every
 * time, or a deploy would never reach a returning visitor.
 */
function cacheControl(requested, ext) {
  if (requested.startsWith('/_expo/static/') || requested.startsWith('/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (STATIC_TYPES.has(ext)) return 'public, max-age=2592000';
  return 'no-cache';
}

/**
 * Text compresses about four to one, and the bundle alone is 1.7 MB raw. The export never
 * changes while the server runs, so every text file is compressed once, here, at the highest
 * settings, instead of on each request. PNG and woff2 are already compressed and are sent as
 * they are. The whole site fits in memory several times over.
 */
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.ttf', '.ico', '.txt']);
const COMPRESSED = new Map();

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (COMPRESSIBLE.has(extname(path))) {
      const raw = readFileSync(path);
      if (raw.length < 1024) continue;
      const br = brotliCompressSync(raw, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
        },
      });
      COMPRESSED.set(path, { br, gzip: gzipSync(raw, { level: 9 }) });
    }
  }
}
if (existsSync(ROOT)) walk(ROOT);

/** The best encoding this request accepts, among the ones we hold. */
function pickEncoding(header) {
  const accepted = new Set(
    String(header ?? '')
      .split(',')
      .map((part) => part.trim().split(';'))
      .filter(([, q]) => !q || !/^q=0(\.0*)?$/.test(q.trim()))
      .map(([name]) => name.trim()),
  );
  if (accepted.has('br')) return 'br';
  if (accepted.has('gzip')) return 'gzip';
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const requested = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  // `/` is the landing page; the app is at /play, and any other unknown path falls back to it.
  let filePath = join(ROOT, requested === '/' ? 'landing.html' : requested);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // Unknown paths are client routes, not 404s.
    filePath = join(ROOT, 'index.html');
  }

  const ext = extname(filePath);
  const headers = {
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    'cache-control': cacheControl(requested, ext),
    'x-content-type-options': 'nosniff',
  };
  const variants = COMPRESSED.get(filePath);
  if (variants) {
    // Caches (the CDN, the browser) must keep one copy per encoding.
    headers.vary = 'Accept-Encoding';
    const encoding = pickEncoding(req.headers['accept-encoding']);
    if (encoding) {
      const body = variants[encoding];
      res.writeHead(200, { ...headers, 'content-encoding': encoding, 'content-length': body.length });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }
  }
  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`SlashFacts serving ${ROOT} on :${PORT} (${COMPRESSED.size} files precompressed)`);
});
