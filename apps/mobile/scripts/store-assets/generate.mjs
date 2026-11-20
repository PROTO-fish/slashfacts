// Generates the captioned store images from the raw app captures in captures/. Run from
// apps/mobile:
//
//   node scripts/store-assets/generate.mjs
//
// Each image is an HTML page (caption, the capture in a tilted phone with a hard shadow)
// screenshotted by headless Chrome. Set CHROME to the browser binary if it isn't in the
// default macOS location.
//
// Google Play images go where fastlane and F-Droid read them; the App Store ones, which have
// no fastlane folder yet, go to out/ (ignored by git) for a manual upload.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../../../..');
const CAPTURES = join(HERE, 'captures');
const FONT = pathToFileURL(join(REPO, 'apps/mobile/assets/fonts/Archivo-Black-100.ttf')).href;
const PLAY = join(REPO, 'fastlane/metadata/android/en-US/images');
const OUT = join(HERE, 'out');
const CHROME =
  process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** [capture, caption (one line per entry), tilt direction], in store order. */
const SHOTS = [
  [3, ['How are', 'your tables', 'doin’?'], -1],
  [2, ['See it.', 'Remember it.', 'Slash it.'], 1],
  [1, ['Pick your', 'tables,', '2 to 9.'], -1],
  [4, ['Every fact,', 'at a glance.'], 1],
  [5, ['No account.', 'No ads.', 'No colors.'], -1],
];

/** [output folder, width, height]: Play phone, iPhone 6.9", iPad 13". */
const SIZES = [
  [join(PLAY, 'phoneScreenshots'), 1080, 2160],
  [join(OUT, 'iphone-6.9'), 1320, 2868],
  [join(OUT, 'ipad-13'), 2064, 2752],
];

const tmp = mkdtempSync(join(tmpdir(), 'store-assets-'));

function base(w, h) {
  return `<!doctype html><meta charset=utf-8><style>
@font-face{font-family:A;src:url(${FONT})}
*{box-sizing:border-box;margin:0}
html,body{width:${w}px;height:${h}px;background:#fff;color:#000;font-family:A;overflow:hidden;position:relative}`;
}

function render(html, w, h, out) {
  const page = join(tmp, 'page.html');
  writeFileSync(page, html);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${w},${h}`,
      `--screenshot=${out}`,
      pathToFileURL(page).href,
    ],
    { stdio: 'ignore' },
  );
}

function shot(capture, caption, tilt, w, h) {
  const u = w / 100;
  const tablet = w / h > 0.6;
  // A phone is drawn at 1:2. On a tablet it's sized by the height, on a phone by the width.
  const [fs, pw, top] = tablet ? [8 * u, (0.8 * h) / 2, 0.29 * h] : [10.5 * u, 0.8 * w, 0.285 * h];
  const border = Math.max(6, tablet ? 0.7 * u : 1.1 * u);
  const src = pathToFileURL(join(CAPTURES, `${capture}.png`)).href;
  return `${base(w, h)}
.c{position:absolute;left:${7 * u}px;top:${0.075 * h}px;font-size:${fs}px;line-height:.9;letter-spacing:-.035em;word-spacing:.1em}
.ph{position:absolute;left:${(w - pw) / 2}px;top:${top}px;width:${pw}px;border:${border}px solid #000;border-radius:${pw * 0.1}px;padding:${pw * 0.04}px ${pw * 0.035}px;background:#fff;transform:rotate(${4 * tilt}deg);box-shadow:${pw * 0.055}px ${pw * 0.055}px 0 #000}
.ph img{display:block;width:100%;border-radius:${pw * 0.055}px}
</style><div class=c>${caption.join('<br>')}</div><div class=ph><img src="${src}"></div>`;
}

for (const [dir, w, h] of SIZES) {
  mkdirSync(dir, { recursive: true });
  SHOTS.forEach(([capture, caption, tilt], i) =>
    render(shot(capture, caption, tilt, w, h), w, h, join(dir, `${i + 1}.png`)),
  );
}

// Play feature graphic, 1024 × 500: the slogan and the 9 × 2 capture.
const feature = `${base(1024, 500)}
.m{position:absolute;left:48px;top:44px;font-size:36px}
.s{position:absolute;left:44px;top:118px;font-size:86px;line-height:.86;letter-spacing:-.04em;word-spacing:.1em}
.tag{position:absolute;left:48px;bottom:40px;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.ph{position:absolute;width:300px;left:668px;top:-26px;transform:rotate(9deg);border:7px solid #000;border-radius:32px;padding:13px 11px;background:#fff;box-shadow:18px 18px 0 #000}
.ph img{display:block;width:100%;border-radius:18px}
</style><div class=m>/ FACTS</div><div class=s>How are<br>your tables<br>doin’?</div>
<div class=tag>No account · No ads · No tracking · No colors</div>
<div class=ph><img src="${pathToFileURL(join(CAPTURES, '3.png')).href}"></div>`;
render(feature, 1024, 500, join(PLAY, 'featureGraphic.png'));

rmSync(tmp, { recursive: true, force: true });
console.log(`Play: ${PLAY}\nApp Store: ${OUT}`);
