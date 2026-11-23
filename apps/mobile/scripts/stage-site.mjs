import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const [source, output] = process.argv.slice(2);
if (!source || !output || process.argv.length !== 4) {
  throw new Error('Usage: node apps/mobile/scripts/stage-site.mjs <public directory> <new output directory>');
}

const siteUrl = 'https://slashfacts.app';
const gameUrl = 'https://slashfacts.proto.fish';
let landing = await readFile(join(source, 'landing.html'), 'utf8');

function replaceOnce(pattern, replacement) {
  if (landing.split(pattern).length !== 2) {
    throw new Error(`Expected one occurrence of ${pattern} in landing.html`);
  }
  landing = landing.replace(pattern, replacement);
}

// Keep the Railway landing and PWA untouched. Adapt only the standalone copy.
replaceOnce(`property="og:url" content="${gameUrl}/"`, `property="og:url" content="${siteUrl}/"`);
replaceOnce(`property="og:image" content="${gameUrl}/og.png"`, `property="og:image" content="${siteUrl}/og.png"`);
replaceOnce('href="/play"', `href="${gameUrl}/play"`);
replaceOnce('<link rel="manifest" href="/manifest.webmanifest">\n', '');

// Explicit allowlist: never copy the Expo entry point, game or service worker.
const assets = [
  'favicon.ico',
  'icon-180.png',
  'fonts/archivo-black.woff2',
  'fonts/OFL.txt',
  'og.png',
  'play-shot.webp',
  'privacy.html',
];
await mkdir(output);
await mkdir(join(output, 'fonts'));
for (const asset of assets) {
  await copyFile(join(source, asset), join(output, asset));
}
await writeFile(join(output, 'index.html'), landing);
