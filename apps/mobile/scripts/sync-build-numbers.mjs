// Derives the store build numbers in app.json from its version, so they never need bumping by
// hand. Run from the repo root (the release workflow does, on the release PR):
//
//   node apps/mobile/scripts/sync-build-numbers.mjs
//
// MAJOR.MINOR.PATCH → MAJOR×10000 + MINOR×100 + PATCH, so 1.1.0 → 10100: it only ever grows,
// and two versions never share a number. Android's versionCode is that integer; iOS's
// buildNumber is the same digits as a string. F-Droid reads `versionCode` straight out of
// app.json with a regex (UpdateCheckData in its recipe) and builds 1000 × code + ABI, so it
// must stay a literal number in this file, never computed in an app.config.
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../app.json', import.meta.url);
const config = JSON.parse(readFileSync(path, 'utf8'));
const { version } = config.expo;

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
if (!match) throw new Error(`app.json version "${version}" is not MAJOR.MINOR.PATCH`);
const [major, minor, patch] = match.slice(1).map(Number);
if (minor > 99 || patch > 99) throw new Error(`${version}: minor and patch must stay below 100`);
const code = major * 10000 + minor * 100 + patch;

config.expo.android.versionCode = code;
config.expo.ios.buildNumber = String(code);
writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
console.log(`${version} → build ${code}`);
