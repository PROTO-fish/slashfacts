# Architecture

SlashFacts is an npm-workspaces monorepo: a dependency-free TypeScript engine
(`packages/core`) and one Expo app (`apps/mobile`) for Android, iOS and the web.
See [the file index](../AGENTS_INDEX.md) for modules and
[design rules](design.md) for gameplay constraints.

## Engine and app boundary

The engine owns facts, mastery, scheduling, rounds, scoring and stroke geometry.
It has no DOM, React Native or storage implementation. Scheduling accepts an
injected RNG for deterministic tests.

The app owns persistence, gestures, timers and feedback:

- `state.ts` loads settings and statistics, calls the engine and saves updates.
- `slash/useSlashNative.ts` feeds react-native-gesture-handler events into the
  shared `extendStroke()` geometry on every platform.
- `slash/SlashPad.tsx` measures cells, draws ink and routes digit releases.
- `game/useQuestionLoop.ts` grades once, holds feedback and re-arms the clock.
  It keeps the graded fact visible after the engine advances.

[ADR 0001](adr/0001-one-expo-app-for-every-platform.md) explains the single-app decision.

## Storage and platform code

The app implements the core `Storage` interface with SQLite on native platforms
(`storage/native.ts`) and IndexedDB on the web (`storage/native.web.ts`).
Settings and statistics stay on-device; there are no accounts or sync backend.
Storage failures must not interrupt practice, though progress may not be saved.

IndexedDB avoids expo-sqlite's web worker and cross-origin isolation requirements.
Its database, store and key preserve compatibility with the previous web app.

Metro selects `.web.ts` siblings for browser-specific code: storage, haptics,
browser setup and splash loading. Native haptics use expo-haptics; web haptics
use `navigator.vibrate`. `browserSetup.web.ts` registers the service worker
outside development. See the [licensing audit](licensing-audit.md) for release
permission constraints enforced by Expo config plugins.

## Web deployment

https://slashfacts.proto.fish serves the Expo web export.
`railpack.json` installs the mobile and core workspaces, including the root,
and runs `npm run -w apps/mobile build:web`, exporting to `apps/mobile/dist`.
`railway.json` starts `node apps/mobile/server.mjs`.

The dependency-free server binds to `$PORT` (default 3000), marks hashed assets
immutable and serves existing files directly. `/` serves the landing page;
`/play` opens the app. Unknown paths fall back to the app's `index.html`.
