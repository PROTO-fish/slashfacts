# Agent index

Where to look, by task. Paths are relative to the repo root. Keep this file current: when
you add, move, or delete a file listed here, update its entry in the same commit.

## Repo shape

npm workspaces monorepo (`package.json`: `packages/*`, `apps/*`).

| Path | What |
|---|---|
| `packages/core` | `@slash/core` — pure TypeScript rules and gesture engine. No DOM, no React Native, no dependencies. Shared by both apps. |
| `apps/web` | Vite + React web app / PWA, deployed to Railway. |
| `apps/mobile` | Expo / React Native app for iOS and Android. |
| `docs/plans/` | Implementation plans, current and past (`mobile-port-plan.md` is active). |
| `docs/adr/` | Architecture Decision Records (template in `docs/adr/README.md`). |
| `README.md` | Public landing page: what the app is, how to run it. |
| `docs/design.md` | Product rules and design rationale — read before changing behaviour. |
| `docs/architecture.md` | Code layout, storage, mobile, deployment. |
| `AGENTS.md` | Branching, worktrees, commits, versioning. |
| `CONTRIBUTING.md` | Contribution rules: issue first, pull request only on request, DCO sign-off. |

## Find by task

| I need to… | Look at |
|---|---|
| Change game rules, which tables exist | `packages/core/src/facts.ts` (`MIN_TABLE`/`MAX_TABLE`) |
| Change mastery / the "tick" | `packages/core/src/mastery.ts` |
| Change which fact is asked next | `packages/core/src/scheduler.ts` |
| Change round structure (10 facts, retry until correct) | `packages/core/src/session.ts` |
| Change the end-of-round score | `packages/core/src/score.ts` |
| Change FACTS data (table progress, practice-next list) | `packages/core/src/progress.ts` |
| Change the app name / brand strings | `packages/core/src/brand.ts` |
| Change the storage contract | `packages/core/src/storage.ts` (interface only) |
| Change how a stroke is read into digits | `packages/core/src/slash/geometry.ts` — shared by web and mobile; test in `packages/core/test/geometry.test.ts` |
| Add a core export | `packages/core/src/index.ts` |
| Run tests | `npm test` (vitest; `packages/core/test/`) |

## Web ↔ mobile file pairs

Each web file has a native counterpart with the same logic. A behaviour change usually
belongs in both — or better, in `@slash/core`.

| Concern | Web (`apps/web/src/`) | Mobile (`apps/mobile/src/`) |
|---|---|---|
| App shell / screen switch | `App.tsx`, `main.tsx` | `App.tsx`, `../index.ts`, `browserSetup.web.ts` (service worker, zoom guard) |
| App state + persistence wiring | `state.ts` | `state.ts` |
| Storage implementation | `storage/idb.ts` (IndexedDB) | `storage/native.ts` (expo-sqlite); `storage/native.web.ts` (IndexedDB, same database as `idb.ts`) in the Expo web build |
| Haptics | `haptics.ts` (navigator.vibrate) | `haptics.ts` (expo-haptics); `haptics.web.ts` (navigator.vibrate) in the Expo web build |
| Gesture input adapter | `slash/useSlash.ts` (pointer events) | `slash/useSlashNative.ts` (RNGH `Gesture.Pan`) |
| Answer pad + live stroke | `slash/SlashPad.tsx` | `slash/SlashPad.tsx` |
| Question loop (grade, hold, reveal, re-arm) | `game/useQuestionLoop.ts` | `game/useQuestionLoop.ts` |
| One question on screen + clock | `game/QuestionView.tsx` | `game/QuestionView.tsx` (Reanimated) |
| Home (table picker + start) | `screens/Home.tsx` | `screens/Home.tsx` |
| Round + session summary | `screens/Practice.tsx` | `screens/Practice.tsx` |
| FACTS screen | `screens/Stats.tsx` | `screens/Stats.tsx` |
| Table picker (reads `stroke.visits`, never `strokeDigits()`) | `components/TableSelect.tsx` | `components/TableSelect.tsx` |
| Score panels | `components/Result.tsx` | `components/Result.tsx` |
| Night-mode toggle | `components/NightToggle.tsx` | `components/NightToggle.tsx` |
| Styling | `theme.css` (single stylesheet — source of truth for the design) | `theme/tokens.ts`, `theme/fonts.ts`, `theme/useBreakpoint.ts`, `theme/ThemeContext.tsx`, plus per-component `StyleSheet`s |
| Big START / HOME buttons | inline in screens | `components/Launch.tsx` |
| Inline SVG icons | inline in components | `components/icons.tsx` |
| Striped gauge fill | CSS `repeating-linear-gradient` | `components/StripedFill.tsx` |

When matching the mobile look to the web, read the relevant rules in
`apps/web/src/theme.css` in full first — the native styles are translations of it.

## Web app specifics (`apps/web/`)

| Path | What |
|---|---|
| `index.html` | Meta tags, favicon, manifest link |
| `public/manifest.webmanifest`, `public/icon-*.png`, `public/favicon.ico`, `public/logo.png` | PWA / favicon / link-preview assets |
| `public/sw.js` | Service worker |
| `public/privacy.html` | Privacy policy (store listings link to it) |
| `public/fonts/` | Archivo variable woff2 |
| `server.js` | Dependency-free static server used on Railway |
| `vite.config.ts` | Build config |
| `../../railway.json` | Railway build/start commands |
| `../../railpack.expo-web.json` | Build recipe for a Railway service serving the Expo web build (`RAILPACK_CONFIG_FILE`) |

## Mobile app specifics (`apps/mobile/`)

| Path | What |
|---|---|
| `app.json` | Expo config: name, bundle ids (`fish.proto.slashfacts`), icons, splash, plugins, Android permissions (release asks for `VIBRATE` only) |
| `plugins/withDebugInternet.js` | Re-adds `INTERNET` to the debug manifest only, so debug builds reach Metro while release stays offline |
| `eas.json` | EAS Build profiles (development / preview / production) |
| `metro.config.js` | Monorepo resolution + `.js` import fallback (retried extensionless, so `.web.ts` files win in the web build) — touch with care |
| `public/` | Web build only: `index.html` template (meta tags, share previews), manifest, icons, `sw.js`, `privacy.html`, font licence. Copied as is by `npm run build:web` |
| `babel.config.js` | `babel-preset-expo` + worklets plugin |
| `assets/` | App icon, Android adaptive icon layers, splash |
| `assets/fonts/` | Four static Archivo TTFs (instanced from the variable font) + `OFL.txt` |
| `src/assets.d.ts` | `*.ttf` module typing |

Commands (run in `apps/mobile`): `npx expo start --lan` (dev server for Expo Go),
`npm run typecheck`, `npx expo export --platform ios|android` (bundle check),
`npm run build:web` (web build into `dist/`; serve it with `SITE_DIR=apps/mobile/dist node apps/web/server.js`).
