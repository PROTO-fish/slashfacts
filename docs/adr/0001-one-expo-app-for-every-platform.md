# 0001. One Expo app for every platform

**Status:** Accepted
**Date:** 2026-10-02

## Context

SlashFacts started as a Vite + React web app (`apps/web`). The Expo port (`apps/mobile`)
added Android and iOS, sharing the engine in `packages/core` but writing everything above it a
second time: twelve mirrored files and two styling systems (`theme.css` on the web,
`StyleSheet`s on mobile). Every behaviour change had to be made and checked twice, and the
two apps could drift.

## Decision

The website is the Expo app's web export, through react-native-web, and `apps/web` is deleted.
Where the browser needs different code, a `.web.ts` sibling replaces the native file in the
web build: storage (IndexedDB, the same database the Vite app used, so visitors kept their
progress) and haptics (`navigator.vibrate`). `apps/mobile/public/` holds the page template,
manifest, icons, privacy policy and service worker. Railway builds `npm run -w apps/mobile
build:web` and serves it with `apps/mobile/server.mjs`.

## Consequences

- One UI codebase: a change is made once and reaches Android, iOS and the web.
- The website is heavier: 377 KB of gzipped JavaScript instead of 55 KB, and four TTF fonts
  (121 KB each) instead of one 90 KB woff2. Trimming that is open work.
- The design reference is no longer a stylesheet: layout lives in React Native styles, so a
  layout change must be checked on a phone, a tablet and a desktop browser window.
- Comments that cite `theme.css` or `apps/web/...` point at the removed app; read them with
  `git show 0ced619:apps/web/...`.
- Rejected alternative: keep both apps and move only the shared logic (`state.ts`,
  `useQuestionLoop.ts`, the gesture handling) into a package. Lower risk, but it left about
  800 lines of mirrored UI and the two styling systems in place.
