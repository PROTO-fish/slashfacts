# Architecture

SlashFacts is an npm-workspaces monorepo: one pure TypeScript engine and one Expo app that
runs on Android, iOS and the web. `AGENTS_INDEX.md` maps tasks to files.

## Code layout

```
packages/core     pure TypeScript, zero dependencies, no DOM
  facts.ts        the 64 facts, answers as digit sequences
  mastery.ts      FactStat + recordAttempt() + masteryLevel()
  scheduler.ts    nextFact(), weighted adaptive selection
  session.ts      rounds of 10
  score.ts        rate, mean time and the per-table breakdown, counted once
  storage.ts      the Storage interface only — no implementation
  slash/geometry.ts   the gesture engine: pure, no React, fully tested

apps/mobile       Expo (React Native, and react-native-web for the website)
  slash/useSlashNative.ts  react-native-gesture-handler pan -> geometry
  slash/SlashPad.tsx  the pad and the live stroke
  game/useQuestionLoop.ts  the question loop: grade, hold, reveal, re-arm
  game/QuestionView.tsx    one question on screen
  components/TableSelect.tsx  the picker: tap or slash across the tables
  storage/native.ts   expo-sqlite, implementing the core Storage interface
  storage/native.web.ts    IndexedDB, the same interface, in the web build
  haptics.ts          expo-haptics feedback (haptics.web.ts: navigator.vibrate)
  public/             web build only: page template, manifest, icons, service worker
  server.mjs          dependency-free static server for Railway
  plugins/            Expo config plugins (release APK asks for VIBRATE only)
```

The engine is pure and injects its own RNG, so scheduling is deterministic under test and
the adaptive algorithm can be replaced without touching a single component.

## Data

Everything is stored locally (SQLite on Android and iOS, IndexedDB on the web) — no accounts, no backend, nothing to leak. A
`Storage` implementation is the only thing a sync backend would need to replace.

## Platforms

The Expo app in `apps/mobile` depends on `@slash/core` unchanged, including
`geometry.ts`, so every platform reads a stroke through one implementation. The gesture
source is react-native-gesture-handler everywhere, feeding the same `extendStroke`. Two
things differ on the web, each through a `.web.ts` sibling Metro picks for the web build:
storage (IndexedDB instead of expo-sqlite) and haptics (`navigator.vibrate` instead of
expo-haptics). [`adr/0001-one-expo-app-for-every-platform.md`](adr/0001-one-expo-app-for-every-platform.md)
records why the separate Vite web app was dropped.

## Web deployment (Railway)

Live at **https://slashfacts.proto.fish**, served from the Expo app's web export.
`railpack.json` installs only the mobile and core workspaces and runs
`npm run -w apps/mobile build:web`; `railway.json` starts `node apps/mobile/server.mjs`, which
binds `$PORT`, serves `apps/mobile/dist`, falls back to `index.html` for client routes, and
marks hashed assets immutable.
