# Serving the website from the Expo app

**Status:** Active

Issue: [#9](https://github.com/PROTO-fish/slashfacts/issues/9).

## Goal

One UI codebase for web, Android and iOS: the website becomes the Expo app's web export
(react-native-web), and `apps/web` is deleted. `apps/web` stays live and untouched until the
new build passes every acceptance criterion in the issue.

## What changes

| Concern | Before (`apps/web`) | After (`apps/mobile`, web build) |
|---|---|---|
| Storage | `storage/idb.ts` | `storage/native.web.ts`: the same IndexedDB database, store and key, so the live site's progress carries over on the same origin |
| Haptics | `haptics.ts` | `haptics.web.ts`, same `navigator.vibrate` patterns |
| Page template, meta tags | `index.html` | `public/index.html` |
| Manifest, icons, privacy policy | `public/` | `public/`, copied unchanged |
| Service worker | `public/sw.js` (cache `slashfacts-v1`) | `public/sw.js` (cache `slashfacts-v2`, so the old build's files are dropped), registered by `src/browserSetup.web.ts` |
| Build | `vite build` | `npm run build:web` (`expo export -p web`) into `apps/mobile/dist` |
| Hosting | `apps/web/server.js` | the same server, pointed at the new build with `SITE_DIR` |

Metro picks the `.web.ts` files because `metro.config.js` now retries an unresolved `.js`
import without its extension, which lets Metro apply its platform extensions.

Layout fixes the web build needed, all in shared code and invisible on phones:

- The shell is a card capped at 560px on an ink-coloured backdrop, as `.app` is on the web.
- The wordmark grows with the window up to the web's cap (`useBreakpoint().wordmarkSize`), and
  the pad's height budget subtracts that growth, which keeps the 0 key on screen at laptop
  heights (the native counterpart of #6).
- Pad keys are floored to whole pixels: three exact thirds wrapped the third key onto its own
  row in the browser.
- From 700px wide and 900px tall the practice stage is centred, as `.stage` is on the web.

## Steps

1. [x] Make `apps/mobile` build for the web.
2. [x] Web storage, haptics, page template, installable-app files.
3. [ ] Deploy the build to a second Railway service next to `slashfacts.proto.fish`.
4. [ ] Compare both against the acceptance criteria in #9, on real devices.
5. [ ] Cut over: point `slashfacts.proto.fish` at the new build, delete `apps/web`, update
   `AGENTS_INDEX.md`, `AGENTS.md`, `docs/architecture.md` and `railpack.json`, write the ADR.

## Progress log

- **2026-10-02 — The web build works locally.** Checked with a scripted headless Chromium,
  side by side with the current build:
  - Home and practice screens match at 390×844, 360×640, 820×1180, 1280×720, 1366×768,
    1512×806, 1440×900 and 1920×1080; the 0 key stays on screen at every size.
  - Drawing answers with a mouse and with touch grades the same as the current site, wrong
    answers included.
  - Progress saved by the current build on an origin opens in the new build on that origin.
  - No console errors.
  - Still differs: the FACTS screen sits at the top instead of being centred vertically.
  - Page weight: 377 KB of gzipped JavaScript against 55 KB today, plus four TTF fonts
    (121 KB each) against one 90 KB woff2. To be judged against the criteria in #9.
  - Not yet checked: Safari and Firefox, a trackpad, real phones, offline use and install
    (the service worker needs HTTPS or localhost).
