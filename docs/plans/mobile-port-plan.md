# Port SLASH × to iOS and Android (Expo)

**Status:** Active

## Context

SLASH × is a multiplication-tables trainer: the child answers by drawing one continuous
stroke through the digits of the answer. It exists today as a Vite + React web app
(`apps/web`) deployed to Railway, with the rules in a pure, dependency-free
`packages/core`. It installs as a PWA, but a PWA is not on the App Store, cannot be found
by a parent searching "times tables", and — decisively for this app — **iOS Safari has no
vibration API, so every iPhone user today gets no haptics at all**.

The goal is a real native app on both stores. The codebase was built for this: `@slash/core`
touches no browser API, and `slash/geometry.ts` — where all of the feel lives — is pure
TypeScript with no DOM. Those move across untouched. What gets rewritten is the shell: the
981-line stylesheet, seven components, and four small platform adapters.

The web app is not being retired. It keeps shipping to Railway from the same repo, and both
targets keep importing one copy of the engine so the gesture can never fork.

---

## Goals

1. **The gesture feels identical.** One shared `geometry.ts`, one shared test suite, zero
   duplicated engine code. A fast slash on a real phone reads the same digits it reads in
   the browser.
2. **Haptics work on iPhone** — the thing the web version can never deliver.
3. **Offline and account-free stays true.** No network, no analytics, no accounts. The
   privacy declarations on both stores say "no data collected" and are honest.
4. **One `@slash/core`.** Adding `apps/mobile` changes no rule and no existing test.
5. **Public on the App Store and Google Play**, 4+ / Everyone rating, with a hosted privacy
   policy and store assets.

### Non-goals

- No sync, no accounts, no backend. `Storage` stays a local interface.
- No navigation library. The three-screen `useState` switch in `App.tsx` is enough.
- No change to the rules, the scheduler, the mastery tick, or the round structure.

---

## What ports free, and what gets rewritten

Verified by reading every file — the platform surface is small and fully enumerated.

**Moves unchanged (≈900 lines):**

| What | Why it just works |
|---|---|
| `packages/core/src/*` (facts, mastery, scheduler, session, score, progress, storage, brand) | Grep confirms zero `window`/`document`/`navigator` references. |
| `apps/web/src/slash/geometry.ts` (266 lines) | No DOM. Its `strokePath()` already emits a valid SVG `d` string, which `react-native-svg` consumes verbatim. |
| `apps/web/test/geometry.test.ts`, `packages/core/test/core.test.ts` | Keep running under vitest, unchanged. |
| `game/useQuestionLoop.ts` (170 lines) | Ports with two one-line edits — see the adapter table. Its hard-won invariants (effects driven from refs, the frozen displayed fact) carry over as-is. |

**Rewritten:**

| File | Becomes | Note |
|---|---|---|
| `slash/useSlash.ts` (148) | `Gesture.Pan()` from react-native-gesture-handler | **Gets simpler.** Pan coordinates are already pad-local, so both `getBoundingClientRect()` calls disappear; RNGH keeps tracking outside the view, so `setPointerCapture` disappears too. |
| `slash/SlashPad.tsx` (128) | RN `View` + `react-native-svg` | **Gets simpler.** `onLayout` hands back `{x, y, width, height}` relative to the parent — exactly the `Cell` shape. `ResizeObserver` and `measure()` both disappear. |
| `theme.css` (981) | `theme/tokens.ts` + per-component `StyleSheet` | The bulk of the work. See "The stylesheet" below. |
| `Home`, `Practice`, `Stats`, `QuestionView`, `TableSelect`, `Result`, `NightToggle` | RN primitives | Logic is unchanged; only the markup and styling are. The four inline SVGs (check mark, night disc, restart, back arrow) move to `react-native-svg` verbatim. |
| `storage/idb.ts` (56) | `storage/native.ts` on `expo-sqlite` | ~30 lines. Same `Storage` interface, same swallow-all-errors discipline. |
| `haptics.ts` (8) | `expo-haptics` | ~8 lines. |
| `main.tsx`, `App.tsx` shell | Expo Router entry / `App.tsx` | Drop the service worker and `gesturestart` handler; add `BackHandler`. |

**The complete platform-API list to adapt** (there is nothing else):

- `window.setTimeout` / `clearTimeout` → bare `setTimeout` / `clearTimeout` (5 sites in
  `useQuestionLoop.ts`, 3 in `Stats.tsx`)
- `document.hidden` + `visibilitychange` → `AppState` from react-native
  (`useQuestionLoop.ts:146-149`) — this is the "phone locked mid-question" re-arm, and it
  matters more on native than it did on the web
- `navigator.vibrate` → `expo-haptics` (`haptics.ts`)
- `document.documentElement.dataset.theme` → theme context (`App.tsx:23`)
- `getBoundingClientRect` / `ResizeObserver` → `onLayout` (`SlashPad.tsx`, `TableSelect.tsx`)
- `setPointerCapture` → deleted, RNGH does it (`useSlash.ts`)
- `indexedDB` → `expo-sqlite` (`storage/idb.ts`)
- `navigator.serviceWorker` → deleted (`main.tsx`)

---

## Structural decision: promote `geometry.ts` into core

`geometry.ts` currently lives at `apps/web/src/slash/geometry.ts`. Copying it into
`apps/mobile` would be the single worst outcome of this port — two copies of the feel,
drifting apart, with the README's warning about `TableSelect` reading `stroke.visits`
instead of `strokeDigits()` now applying to two files.

**Move it to `packages/core/src/slash/geometry.ts`** and re-export from
`packages/core/src/index.ts`. `apps/web` imports it from `@slash/core` instead of a relative
path (one import line in each of `useSlash.ts`, `SlashPad.tsx`, `TableSelect.tsx`).
`test/geometry.test.ts` moves to `packages/core/test/`. This is a pure move with no
behaviour change, done and verified green **before any mobile code is written**.

`useSlash.ts` stays per-platform — it is the input adapter, and that is the point.

---

## The stylesheet

981 lines of CSS is the real cost, and three things in it do not exist in React Native:

1. **Custom properties.** `--ink` / `--paper` / `--border` / `--gap` / `--pad-x` /
   `--footer-tier` become a `tokens.ts` module read through a theme context. The app is two
   colours and every rule names them through these variables, so night mode stays one swap
   rather than a second stylesheet — exactly the discipline the CSS already keeps.
2. **Container queries** (`container-type: inline-size`, digit sizing at `24cqw`). RN has
   none. The pad already measures itself via `onLayout` for the gesture; derive font size
   from that same measured width.
3. **Media queries** (6 of them: `min-width: 900px`, `max-aspect-ratio: 2/5`, landscape
   `max-height: 650px`, `min-width/height: 700px`). Become a `useBreakpoint()` hook over
   `useWindowDimensions()`. The `safe-area-inset` rules (6 sites) become
   `react-native-safe-area-context`.
4. **The one `@keyframes drain`** (the answer clock) becomes a Reanimated `withTiming` on
   `scaleX`, restarted per question by `askedAt` and frozen while feedback plays.

### The font is a real blocker — decide early

`theme.css` loads **Archivo as a variable woff2**, and uses weights 800/900 plus
`font-stretch` at 108% and 112%. React Native cannot load woff2 and has poor variable-font
support. The fix is to ship **static TTF instances** via `expo-font`:

- Archivo ExtraBold (800), width 100%
- Archivo Black (900), width 100%
- Archivo Black at width ~108% and ~112% (SemiExpanded)

These can be instanced from the variable TTF with `fonttools varLib.instancer`, or taken
from the Google Fonts static Archivo / Archivo SemiExpanded families. Get the licence
(Archivo is OFL — redistribution is fine) confirmed and the four files produced in Phase 1,
because every screen depends on them.

---

## Phases

### Phase 0 — Accounts and the Play testing clock (start immediately, runs in parallel)

You have neither account. Both have lead times that dwarf the code:

- **Apple Developer Program** — $99/yr. Individual enrolment is typically 24–48h but can
  take over a week if identity verification stalls.
- **Google Play Console** — $25 one-time. **Individual developer accounts must run a
  closed test with at least 12 testers for 14 continuous days before production access is
  granted.** This is the critical path for Android. Enrol and line up 12 testers in week
  one, not at the end.

### Phase 1 — Foundation (no visible app yet)

1. Promote `geometry.ts` into `@slash/core`; update the three web imports; move the test.
   `npm test` green, web app unchanged.
2. Scaffold `apps/mobile` as an Expo app inside the existing npm workspace.
   `metro.config.js` needs `watchFolders` pointing at the repo root and
   `disableHierarchicalLookup: true` — the standard Expo-monorepo config. `@slash/core`
   exports raw `.ts`, so confirm Metro transpiles it through `babel-preset-expo`; this is
   the most likely place to lose an hour.
3. Produce the four Archivo TTFs, wire `expo-font`.
4. `tokens.ts` + theme context + `useBreakpoint()`.
5. Storage (`expo-sqlite`) and haptics (`expo-haptics`) adapters against the existing
   `Storage` interface.

**Done when:** a blank themed screen renders on a simulator with the right font, and a
round-trip `save()` → `load()` of `PersistedState` passes.

### Phase 2 — The gesture (the part that decides whether the port is any good)

1. `useSlashNative.ts`: `Gesture.Pan()` feeding the same `extendStroke`. Start with
   `.runOnJS(true)` — the geometry is immutable JS and this workload is small. If stroke
   latency shows on a real device, the fallback is to worklet-ise `extendStroke` (it is pure
   and has no closures over React state, so this is feasible).
2. `SlashPad` in RN: cells report themselves via `onLayout`; the live stroke draws as two
   `react-native-svg` `Path`s (casing + core) from the unchanged `strokePath()`.
3. Keep `sampleStep: 6` interpolation — it is what makes a fast flick skip nothing, and it
   matters as much with RNGH's batched updates as with coalesced pointer events.

**Done when:** on a physical iPhone and a physical Android, a straight slash from 6 to 4
reads `64` and not `645`, and every answer in the tables reads correctly via a straight
slash. Test on device, not in a simulator — this is a finger-speed question.

### Phase 3 — Screens

Port in this order, each verified on device before the next: `QuestionView` + the clock →
`Practice` + `Result` → `TableSelect` (remembering it reads `stroke.visits` directly, the
opposite of how an answer is read, and must never be switched to `strokeDigits()`) → `Home`
→ `Stats` → `NightToggle` and the app shell.

Add Android `BackHandler` mapping to the same behaviour as the ✕ button. Lock orientation to
portrait (the manifest already declares it) unless the landscape CSS breakpoint says
otherwise.

### Phase 4 — Store readiness

- App icons (1024² iOS, adaptive Android), splash screen, bundle IDs, versioning.
- **Privacy policy hosted** — serve it from the existing Railway app at `/privacy`.
  `server.js` already falls back to `index.html` for client routes; add a static page.
  Google Play requires the URL; Apple requires it in App Store Connect.
- App Privacy / Data safety: **no data collected**, no tracking. True, and easy to defend.
- Age rating 4+ / Everyone. **Recommendation: do not opt into Apple's Kids Category or
  Google's Designed for Families.** Both add parental-gate requirements and stricter review
  for a fully offline app that collects nothing — cost with no benefit here.
- Screenshots: iPhone 6.9" and 6.5", plus iPad if you want iPad (the 900px and 700×700
  breakpoints mean the layout is already tablet-aware); Android phone and 7"/10" tablet.
- `eas.json` with development / preview / production profiles; EAS Build and EAS Submit for
  both stores.

### Phase 5 — Submit

TestFlight first; Play closed test (the 14-day, 12-tester clock from Phase 0) then
production. Expect one round of review feedback on each.

---

## Verification

- `npm test` — core + geometry tests, unchanged and green, after the Phase 1 move.
- `npx expo start` on iOS simulator and Android emulator for layout.
- **Physical devices for the gesture.** Simulators cannot tell you whether a fast slash
  reads correctly; nothing else in this port carries that risk.
- Device checklist: every table's answers by slash; every answer by tap; a smudged
  single-digit tap (travels past `tapSlop`, must still grade as one digit); lock the phone
  mid-question and unlock (the question re-arms rather than counting an instant miss);
  night mode; force-quit and relaunch with progress intact; ERASE.
- Compare side by side against the live web app on the same phone, same hand.

---

## Risks

| Risk | Mitigation |
|---|---|
| **Play's 12-tester / 14-day closed test** gates Android production | Start Phase 0 in week one; it is the longest pole in the plan |
| Gesture latency under `runOnJS` | Measure on device in Phase 2; worklet-ise `extendStroke` if needed — it is pure, so this is available |
| Archivo woff2 unusable in RN | Instance static TTFs in Phase 1, before any screen depends on them |
| Metro + npm workspace resolution of raw-TS `@slash/core` | Known Expo-monorepo config; budget time in Phase 1 |
| Apple review for a minimal children's app | 4+ rating without the Kids Category; genuine offline functionality and no data collection make 4.2 a non-issue for a native build |
| The feel drifts between web and native | One `geometry.ts` in core, one test suite — enforced structurally in Phase 1 |

---

## What I need you to bring me

**Decisions:**
1. **App name and bundle IDs.** `SLASH ×` has a non-ASCII character — the store listing can
   carry it, the bundle ID cannot. Proposal: `com.<yourdomain>.slashx`.
2. **iPad and Android tablet — yes or no?** The layout is already tablet-aware, so "yes"
   costs mainly screenshots, but it is a support commitment.
3. Confirm **no Kids Category** (my recommendation above).

**Accounts and credentials** (Phase 0 — please start now):
4. Apple Developer Program enrolment, and an App Store Connect login I can be added to.
5. Google Play Console enrolment, **plus a list of 12 testers' Google account emails.**
6. An Expo account for EAS Build.

**Assets:**
7. The **Archivo source** — either the variable TTF (I can instance it) or the four static
   TTFs named in "The font". `apps/web/public/fonts/archivo-latin.woff2` is unusable as-is.
8. A **1024×1024 app icon** at full resolution. The existing `icon-512.png` is too small for
   the App Store.
9. A **privacy policy** — or tell me to draft one; it is short for an app that collects
   nothing, and I'll host it at `/privacy` on the existing Railway deploy.

**Hardware:**
10. **One physical iPhone and one physical Android phone.** Phase 2 cannot be signed off on
    a simulator.

Nothing in items 1–10 blocks Phase 1 except the font (item 7). I can start the
`geometry.ts` promotion and the Expo scaffold the moment you say go.

---

## Progress log

- **2026-09-16 — Phase 1 done.** `geometry.ts` promoted into `@slash/core`; `apps/mobile`
  scaffolded (Expo/TS) with Metro resolving the monorepo boundary; Archivo instanced as 4
  static TTFs; theme tokens, `useBreakpoint()`, storage (expo-sqlite) and haptics
  (expo-haptics) adapters in place. Verified via `expo export` for both platforms.
- **2026-09-16 — Phase 2 done.** `useSlashNative.ts` (react-native-gesture-handler Pan) and
  the native `SlashPad` built against the same `extendStroke()`. Verified by bundling; not
  yet verified on a physical device (still open — see below).
- **2026-09-16 — Phase 3 done.** Every screen ported: `Home`, `Practice`, `Stats`,
  `QuestionView` (Reanimated clock), `TableSelect`, `Result`, `NightToggle`, plus the app
  shell (`App.tsx`) with the same three-screen flow as web. `state.ts` and
  `useQuestionLoop.ts` ported with their platform-specific edits (AppState instead of
  document.hidden, expo-sqlite instead of IndexedDB).
- **2026-09-16 — Device-tested via Expo Go, fidelity pass done.** Charles ran the app on his
  physical iPhone over Expo Go (LAN dev server) and reported the screens didn't match the
  web design; he sent 5 reference screenshots (Home, Stats/FACTS, Practice/SESSION). Root
  cause: `theme.css` had only been read in fragments while building the native screens.
  Read all 981 lines and did a systematic corrective rewrite: ink-stroke colors were
  reversed (casing/core swapped), border-radius removed everywhere (design has none),
  font-weight/stretch → font-file mapping fixed throughout, icon stroke caps fixed
  (square/miter, not round), `Stats.tsx` table rows switched from boxed cards to ruled rows
  with column headers added (were missing entirely), the diagonal-stripe gauge pattern
  added (`StripedFill.tsx`, SVG pattern — RN has no `repeating-linear-gradient`), and the
  session-done actions switched from side-by-side to stacked full-width buttons. Re-tested
  against the screenshots; confirmed close but not yet pixel-perfect.
- **2026-09-17 — Two more device-reported bugs fixed.** (1) `Stats.tsx` header cells
  ("TABLE", "ACCURACY (LAST 10)") were inheriting the row's larger font size instead of the
  small header style, so they wrapped mid-word into vertical letter stacks — fixed by
  splitting column-width styles from text-size styles. (2) The end-of-session summary
  (`Practice.tsx`) was centered in a fixed-height box with no scrolling, so a long MISSED
  list ran under the title bar and past the bottom buttons — wrapped in a `ScrollView`
  (still centers a short summary via `flexGrow`, scrolls instead of overflowing when long).
  Both fixed blind (no device/simulator in this environment) from screenshots + `tsc`;
  awaiting on-device confirmation.
- **2026-09-16 — Phase 4 prep, the parts that don't need store accounts, done.** App icons
  generated from the existing web brand mark (`apps/web/public/icon-512.png`, upscaled to
  1024×1024 and flattened for iOS's no-alpha requirement; Android adaptive
  foreground/background/monochrome layers derived from it). Bundle identifiers set to
  `com.slashx.app` **as a placeholder — confirm this or a real domain-backed id before any
  store submission**. `eas.json` build profiles added. Privacy policy written and hosted at
  `apps/web/public/privacy.html` (built into `dist/`, will be live at
  `https://slash-x.up.railway.app/privacy.html` on the next Railway deploy — deploying
  wasn't done automatically, since it publishes to the live production app).

### What's still open

- **Continue the device-driven fidelity pass.** Expo Go on Charles's iPhone is now the
  actual verification loop (screenshot → fix blind against theme.css → he re-checks) — this
  is working but not finished; expect more rounds like 2026-09-17's until every screen
  matches. Android device pass hasn't started yet (iPhone only so far).
- **EAS login and first build** — blocked on Charles logging into his own Expo account
  (`npx eas-cli login`), not something done on his behalf. Needed to start the Play
  12-tester/14-day closed-test clock.
- Apple Developer Program enrolment (Charles has a Google Play account as of 2026-09-16;
  no Apple account yet).
- 12 Play testers' emails, for the closed-test clock.
- Confirm `com.slashx.app` (or supply the real one) before any EAS build gets submitted.
- Final 1024×1024 icon art — the current one is an upscale of a 512px source and will look
  soft at full size; fine for internal builds, not for a store listing.
