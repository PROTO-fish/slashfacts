// Generates the captioned store images from the raw app captures in captures/: Android
// captures for Google Play, iOS Simulator captures (iPhone 6.9", iPad 13") for the App
// Store, which wants each device's real screens. Run from apps/mobile:
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

/** The captions, one line per entry, in store order. */
const CAPTIONS = [
  ['How are', 'your tables', 'doin’?'],
  ['See it.', 'Remember it.', 'Slash it.'],
  ['Pick your', 'tables,', '2 to 9.'],
  ['Every fact,', 'at a glance.'],
  ['No account.', 'No ads.', 'No colors.'],
];
/** The App Store set ends on the session summary: the About screen shows web addresses,
 *  which App Store images must not. */
const IOS_CAPTURES = ['stroke', 'question', 'tables', 'facts', 'summary'];

/** [captures folder, capture names in caption order, output folder, width, height, device]. */
const SETS = [
  ['android', ['3', '2', '1', '4', '5'], join(PLAY, 'phoneScreenshots'), 1080, 2160, 'phone'],
  ['iphone', IOS_CAPTURES, join(OUT, 'iphone-6.9'), 1320, 2868, 'phone'],
  ['ipad', IOS_CAPTURES, join(OUT, 'ipad-13'), 2064, 2752, 'tablet'],
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

function shot(src, caption, tilt, w, h, device) {
  const u = w / 100;
  const tablet = device === 'tablet';
  // The device takes 80% of a phone canvas's width and runs off its bottom edge; a tablet
  // is narrower, so the whole iPad fits under the caption.
  const [fs, pw, top] = tablet ? [7 * u, 0.72 * w, 0.25 * h] : [10.5 * u, 0.8 * w, 0.285 * h];
  const border = Math.max(6, tablet ? 0.6 * u : 1.1 * u);
  const pad = tablet ? [pw * 0.025, pw * 0.025] : [pw * 0.04, pw * 0.035];
  const radius = tablet ? [pw * 0.05, pw * 0.025] : [pw * 0.1, pw * 0.055];
  const shadow = tablet ? 0.035 : 0.055;
  return `${base(w, h)}
.c{position:absolute;left:${7 * u}px;top:${0.075 * h}px;font-size:${fs}px;line-height:.9;letter-spacing:-.035em;word-spacing:.1em}
.ph{position:absolute;left:${(w - pw) / 2}px;top:${top}px;width:${pw}px;border:${border}px solid #000;border-radius:${radius[0]}px;padding:${pad[0]}px ${pad[1]}px;background:#fff;transform:rotate(${(tablet ? 2 : 4) * tilt}deg);box-shadow:${pw * shadow}px ${pw * shadow}px 0 #000}
.ph img{display:block;width:100%;border-radius:${radius[1]}px}
</style><div class=c>${caption.join('<br>')}</div><div class=ph><img src="${src}"></div>`;
}

for (const [folder, names, dir, w, h, device] of SETS) {
  mkdirSync(dir, { recursive: true });
  names.forEach((name, i) => {
    const src = pathToFileURL(join(CAPTURES, folder, `${name}.png`)).href;
    const tilt = i % 2 === 0 ? -1 : 1;
    render(shot(src, CAPTIONS[i], tilt, w, h, device), w, h, join(dir, `${i + 1}.png`));
  });
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
<div class=ph><img src="${pathToFileURL(join(CAPTURES, 'android', '3.png')).href}"></div>`;
render(feature, 1024, 500, join(PLAY, 'featureGraphic.png'));

rmSync(tmp, { recursive: true, force: true });
console.log(`Play: ${PLAY}\nApp Store: ${OUT}`);
