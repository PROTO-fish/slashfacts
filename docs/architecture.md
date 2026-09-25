# Architecture

SlashFacts is an npm-workspaces monorepo: one pure TypeScript engine shared by a web app
and a native app. `AGENTS_INDEX.md` maps tasks to files and pairs each web file with its
mobile counterpart.

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

apps/web          Vite + React
  slash/useSlash.ts   pointer events -> geometry
  slash/SlashPad.tsx  the pad and the live stroke
  game/useQuestionLoop.ts  the question loop: grade, hold, reveal, re-arm
  game/QuestionView.tsx    one question on screen
  components/TableSelect.tsx  the picker: tap or slash across the tables
  components/Matrix.tsx       the map, read-only
  storage/idb.ts      IndexedDB, implementing the core Storage interface
  server.js           dependency-free static server for Railway

apps/mobile       Expo (React Native), same screens as apps/web
  slash/useSlashNative.ts  react-native-gesture-handler pan -> geometry
  storage/native.ts   expo-sqlite, implementing the core Storage interface
  haptics.ts          expo-haptics feedback
  plugins/            Expo config plugins (release APK asks for VIBRATE only)
```

The engine is pure and injects its own RNG, so scheduling is deterministic under test and
the adaptive algorithm can be replaced without touching a single component.

## Data

Everything is stored locally (IndexedDB on the web, SQLite on mobile) — no accounts, no backend, nothing to leak. A
`Storage` implementation is the only thing a sync backend would need to replace.

## iOS / Android

The Expo app in `apps/mobile` depends on `@slash/core` unchanged, including
`geometry.ts`, which lives there precisely so web and native read a stroke through one
implementation. Three things have platform implementations: the `Storage` interface
(expo-sqlite), the gesture source (react-native-gesture-handler feeding the same
`extendStroke`), and haptics (expo-haptics). See [`plans/mobile-port-plan.md`](plans/mobile-port-plan.md) for the
full port plan.

## Web deployment (Railway)

Live at **https://slashfacts.proto.fish**. `railpack.json` installs only the web and core
workspaces and runs `npm run -w apps/web build`; `railway.json` starts
`node apps/web/server.js`, which binds `$PORT`, serves `apps/web/dist`, falls back to
`index.html` for client routes, and marks hashed assets immutable.
