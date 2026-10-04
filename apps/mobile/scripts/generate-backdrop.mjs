// Generates the crumpled-paper tiles behind the framed card on a desktop window
// (src/theme/viewport.tsx). Run from apps/mobile:
//
//   node scripts/generate-backdrop.mjs
//
// The texture is two layers of cellular (Worley) noise: every cell is a flat facet that
// catches the light at its own angle, and the thin band where two cells meet is a crease.
// Cells are hashed modulo a whole number per tile, so the tile repeats without a seam.
// No per-pixel grain: it would be invisible at these greys and would triple the file size.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SIZE = 640;
/** [cells across the tile, facet weight, hash seed] — a coarse fold and a finer one. */
const LAYERS = [
  [5, 1, 21],
  [14, 0.45, 22],
];
/** The grey every facet starts from, so the backdrop reads as dark paper, not a black hole. */
const BASE = 20;
/** Brightness of a value of 1, in grey levels above BASE. */
const STRENGTH = 36;

function hash(i, j, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s + 1, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function brightness(x, y) {
  let v = 0.3;
  let crease = 0;
  for (const [n, weight, seed] of LAYERS) {
    const cell = SIZE / n;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    let f1 = Infinity;
    let f2 = Infinity;
    let tilt = 0;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const wi = (((cx + i) % n) + n) % n;
        const wj = (((cy + j) % n) + n) % n;
        const px = (cx + i + hash(wi, wj, seed)) * cell;
        const py = (cy + j + hash(wi, wj, seed + 1)) * cell;
        const d = Math.hypot(x - px, y - py);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          tilt = hash(wi, wj, seed + 2);
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    v += weight * 0.32 * (tilt - 0.5);
    const width = Math.max(1, cell * 0.02);
    const edge = f2 - f1;
    if (edge < width) crease = Math.max(crease, weight * (1 - edge / width));
  }
  return v + 0.32 * crease;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** An 8-bit greyscale PNG, every row Sub-filtered: flat facets compress to almost nothing. */
function png(grey) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(SIZE, 0);
  header.writeUInt32BE(SIZE, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // colour type: greyscale
  const raw = Buffer.alloc(SIZE * (SIZE + 1));
  for (let y = 0; y < SIZE; y++) {
    const row = y * (SIZE + 1);
    raw[row] = 1;
    for (let x = 0; x < SIZE; x++) {
      const left = x > 0 ? grey[y * SIZE + x - 1] : 0;
      raw[row + 1 + x] = (grey[y * SIZE + x] - left) & 0xff;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const day = new Uint8Array(SIZE * SIZE);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const g = Math.max(0, Math.min(255, Math.round(BASE + brightness(x, y) * STRENGTH)));
    day[y * SIZE + x] = g; // light marks on the black ink
  }
}

const dir = new URL('../assets/backdrop/', import.meta.url);
writeFileSync(new URL('crumple-day.png', dir), png(day));
