# Agent index

Where to look, by task. Paths are relative to the repo root. Keep this file current: when
you add, move, or delete a file listed here, update its entry in the same commit.

## Repo shape

npm workspaces monorepo (`package.json`: `packages/*`, `apps/*`).

| Path | What |
|---|---|
| `packages/core` | `@slash/core` — pure TypeScript rules and gesture engine. No DOM, no React Native, no dependencies. |
| `apps/mobile` | The Expo / React Native app for Android, iOS and the web. Its web export is the website, deployed to Railway. |
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
| Change how a stroke is read into digits | `packages/core/src/slash/geometry.ts`; test in `packages/core/test/geometry.test.ts` |
| Add a core export | `packages/core/src/index.ts` |
| Run tests | `npm test` (vitest; `packages/core/test/`) |

## App files (`apps/mobile/src/`)

One codebase for Android, iOS and the web. A file with a `.web.ts` sibling has a browser
version that Metro picks for the web build; change both together.

| Concern | Files |
|---|---|
| App shell / screen switch | `App.tsx`, `../index.ts`; `browserSetup.web.ts` (service worker, zoom guard) on the web |
| App state + persistence wiring | `state.ts` |
| Storage implementation | `storage/native.ts` (expo-sqlite); `storage/native.web.ts` (IndexedDB) on the web |
| Haptics | `haptics.ts` (expo-haptics); `haptics.web.ts` (`navigator.vibrate`) on the web |
| Gesture input adapter | `slash/useSlashNative.ts` (RNGH `Gesture.Pan`) |
| Answer pad + live stroke | `slash/SlashPad.tsx` |
| Question loop (grade, hold, reveal, re-arm) | `game/useQuestionLoop.ts` |
| One question on screen + clock | `game/QuestionView.tsx` (Reanimated) |
| Home (table picker + start) | `screens/Home.tsx` |
| Round + session summary | `screens/Practice.tsx` |
| FACTS screen | `screens/Stats.tsx` |
| Table picker (reads `stroke.visits`, never `strokeDigits()`) | `components/TableSelect.tsx` |
| Score panels | `components/Result.tsx` |
| Night-mode toggle | `components/NightToggle.tsx` |
| Styling | `theme/tokens.ts`, `theme/fonts.ts`, `theme/useBreakpoint.ts` (breakpoints, wordmark size), `theme/ThemeContext.tsx`, plus per-component `StyleSheet`s |
| Big START / HOME buttons | `components/Launch.tsx` |
| Inline SVG icons | `components/icons.tsx` |
| Striped gauge fill | `components/StripedFill.tsx` |
| Launch splash overlay (native + web) | `components/Splash.tsx`, `components/splashImage.ts` / `.web.ts`, `public/splash.png`, `public/index.html` |
| Desktop phone frame (web): card size, rounded corners, crumpled-paper backdrop | `theme/viewport.tsx` (frame size; screens size against it, not the window), `App.tsx`, `components/backdropTexture.ts` / `.web.ts`, `assets/backdrop/`, `scripts/generate-backdrop.mjs` |

Many comments cite a `theme.css` rule or an `apps/web/...` file as the origin of a value.
Those name the previous Vite web app, removed in favour of the Expo web build (see
`docs/adr/0001-one-expo-app-for-every-platform.md`). Read them in history with
`git show 0ced619:apps/web/src/theme.css`.

## App specifics (`apps/mobile/`)

| Path | What |
|---|---|
| `app.json` | Expo config: name, bundle ids (`fish.proto.slashfacts`), icons, splash, plugins, Android permissions (release asks for `VIBRATE` only) |
| `plugins/withDebugInternet.js` | Re-adds `INTERNET` to the debug manifest only, so debug builds reach Metro while release stays offline |
| `eas.json` | EAS Build profiles (development / preview / production) |
| `metro.config.js` | Monorepo resolution + `.js` import fallback (retried extensionless, so `.web.ts` files win in the web build) — touch with care |
| `server.mjs` | Dependency-free static server for `dist/`, used on Railway |
| `../../railway.json`, `../../railpack.json` | Railway start command, and the build recipe (installs the mobile and core workspaces, runs `build:web`) |
| `public/` | Web build only: `index.html` template (meta tags, share previews), manifest, icons, `sw.js`, `privacy.html`, font licence. Copied as is by `npm run build:web` |
| `babel.config.js` | `babel-preset-expo` + worklets plugin |
| `assets/` | App icon, Android adaptive icon layers, splash |
| `assets/fonts/` | Four static Archivo TTFs (instanced from the variable font) + `OFL.txt` |
| `assets/backdrop/` | Day and night crumpled-paper tiles behind the desktop frame (web only); regenerate with `node scripts/generate-backdrop.mjs` |
| `src/assets.d.ts` | `*.ttf` module typing |

Commands (run in `apps/mobile`): `npx expo start --lan` (dev server for Expo Go),
`npm run typecheck`, `npx expo export --platform ios|android` (bundle check),
`npm run build:web` (web build into `dist/`; serve it with `node server.mjs`).
