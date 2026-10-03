# Licensing audit — F-Droid readiness

**Date:** 2026-09-24 · **Project license:** GPL-3.0-only · **Publisher:** PROTO/fish

## Result

Everything shipped is free software and compatible with GPL-3.0. No anti-features are expected.

## JavaScript dependencies (production)

Counted from `npm ls --all --omit=dev` for each workspace, reading each package's `license` field.

| Workspace | MIT | BSD-2/3 | ISC | Apache-2.0 | BlueOak-1.0.0 | CC0-1.0 | Other |
|---|---|---|---|---|---|---|---|
| `apps/mobile` | 139 | 12 | 5 | 2 | 4 (glob, minimatch, minipass, path-scurry) | 1 (mdn-data) | none |

BlueOak-1.0.0 and CC0-1.0 are permissive licenses, compatible with GPL-3.0. Our own workspaces
(`@slash/core`, `mobile`) declare `GPL-3.0-only`.

## Android native dependencies

Checked with `./gradlew :app:dependencies --configuration releaseRuntimeClasspath` after
`expo prebuild`.

- **No** `com.google.android.gms`, Firebase, `com.google.android.play`, install-referrer,
  crash-reporting or analytics artifacts.
- The groups present are AndroidX, React Native / Hermes / Fresco / Yoga / SoLoader / fbjni
  (Meta, MIT), Expo modules (MIT), Material Components, Guava, Gson, OkHttp / Okio, Kotlin, and
  `io.github.lukmccall.pika`. All are Apache-2.0, MIT or BSD, and all come from Maven Central or
  Google Maven.
- Repositories: `mavenCentral()`, `google()` and `www.jitpack.io`, all on fdroidserver's allowed list.
- `expo.modules.webview` (`expo-dom-webview`) is pulled in by `expo` itself. It is MIT and has
  no network code of its own.

## Scanner

`fdroid scanner --exit-code` (fdroidserver 2.4.5) on the release APK exits 0: no known
non-free classes, and no extra signing blocks.

`fdroid build` also scans the source tree after `npm ci` and `expo prebuild`, and that scan
is stricter: it flagged 89 files under `node_modules`. They fall into three groups, and the
recipe (`docs/fdroid/fish.proto.slashfacts.yml`) handles each the way the Expo apps
already in fdroiddata do:

- **Prebuilt Expo module AARs/JARs** (`local-maven-repo/`, `prebuilds/`). The recipe sets
  Expo autolinking's `buildFromSource: [".*"]`, so every module compiles from source and
  the prebuilt files go unused; `scandelete` removes them.
- **Files that never reach the Android build:** iOS strings, xcframeworks, macOS and
  Windows tools, `esbuild`, `dotslash`, and expo-sqlite's opt-in `libsql`/`vec` libraries
  and wasm (the default build compiles SQLite from its vendored C source). `scandelete`
  removes them.
- **Needed at build time:** the Linux `hermesc` (compiles the JS bundle to Hermes bytecode)
  and four Gradle files that declare `node_modules` Maven repos. These are `scanignore`d,
  as in other accepted React Native recipes.

## Permissions (release APK)

| Permission | Why |
|---|---|
| `VIBRATE` | Haptic feedback on every answer |
| `…DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | App-private, added by AndroidX; not a user-facing permission |

Expo adds `INTERNET`, `READ/WRITE_EXTERNAL_STORAGE` and `SYSTEM_ALERT_WINDOW` by default. The
release build removes all four via `android.blockedPermissions` in `app.json`. Debug builds
get `INTERNET` back through `plugins/withDebugInternet.js`, so they can still load from Metro.

## Assets

| Asset | License |
|---|---|
| Archivo typeface: the static TTF instances in `apps/mobile/assets/fonts/` | SIL OFL 1.1, © The Archivo Project Authors. `OFL.txt` ships next to them, and the website serves it at `/fonts/OFL.txt`. |
| App icon and brand mark (`/×`) | Original work by the publisher, GPL-3.0 with the rest of the project |
| PROTO/fish mark (`>_`, `components/Mark.tsx`) | The publisher's own logo, drawn from `logo-mark.svg` on proto.fish |

## Anti-features

None. The app makes no network requests, has no tracking, ads or non-free dependencies, and
no upstream non-free code.
