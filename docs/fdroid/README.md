---
type: Runbook
title: Releasing through F-Droid
description: How a tag becomes an F-Droid release, the versionCode scheme, why the recipe looks the way it does, and local `fdroid build`.
tags: [fdroid, release]
---

# F-Droid

SlashFacts is built and signed by F-Droid from this repository's tags. The build recipe
lives in fdroiddata as `metadata/fish.proto.slashfacts.yml`; `fish.proto.slashfacts.yml`
here is a copy of it, submitted in
[fdroiddata!51170](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51170).
The store listing (text, icon, screenshots, changelogs) comes from
`fastlane/metadata/android/` in this repository, not from fdroiddata.

## Releasing a new version

F-Droid's bot polls this repository for tags and builds new versions on its own, so a
release needs no change in fdroiddata. Versions come from release-please (see "Releasing"
in `AGENTS.md`):

1. Merging to `main` keeps a release PR open that bumps `expo.version` in
   `apps/mobile/app.json` and derives `expo.android.versionCode` from it
   (MAJOR×10000 + MINOR×100 + PATCH, so 1.1.0 is 10100). The bot reads both from `app.json`
   (`UpdateCheckData`), since `android/` only exists after `expo prebuild`.
2. On that release PR, add the changelog for each locale in
   `fastlane/metadata/android/<locale>/changelogs/`, named after the **highest split
   versionCode**, `versionCode × 1000 + 3`: versionCode 10100 gets `10100003.txt`. F-Droid
   matches changelog files against the APKs' versionCodes, not against `app.json`, so a file
   named `10100.txt` is silently ignored.
3. Merge the release PR. It tags `vX.Y.Z`; only tags matching `^v[\d.]+$` are considered.

## Per-ABI APKs

The recipe builds three APKs from each tag, each with one native ABI, so a phone downloads
about a third of the universal 95 MB APK. Their versionCodes are derived from `app.json`'s:

| ABI | versionCode |
|---|---|
| armeabi-v7a | `versionCode × 1000 + 1` |
| arm64-v8a | `versionCode × 1000 + 2` |
| x86_64 | `versionCode × 1000 + 3` |

## Why the recipe looks the way it does

It follows the Expo apps already in fdroiddata (e.g. Breathly, SimpleDay):

- Expo modules build from source (autolinking `buildFromSource: [".*"]`), because the
  prebuilt AARs shipped in their npm packages fail F-Droid's scanner.
- The Linux `hermesc` and the Gradle files that declare `node_modules` Maven repos are
  `scanignore`d; every other flagged file under `node_modules` is `scandelete`d. See
  `docs/licensing-audit.md` for the breakdown.
- The buildserver only has JDK 21, so the React Native Gradle plugin's toolchain and every
  library's JVM target move to 21. `react-native-reanimated` and `react-native-worklets`
  hardcode Kotlin's target to 17 and get their own `sed`.
- Node comes from Debian, as fdroiddata asks. Trixie's 20.19.2 is below React Native's
  minimum (^20.19.4), so it is installed from forky (24.x).
- Expo's generated `gradle.properties` has no trailing newline, so lines are appended with
  `printf '\n…'`, never `echo`. An `echo` glues onto the last property and breaks the build.

## Testing the recipe locally

`fdroid build` runs in fdroidserver's Docker image
(`registry.gitlab.com/fdroid/docker-executable-fdroidserver:master`). `local-build/` wraps
it the way the buildserver runs the recipe:

```sh
cd docs/fdroid/local-build
./setup.sh                      # once: the images and the SDK/NDK volume
./fdroid-build.sh               # every build entry; or e.g. ./fdroid-build.sh 10100002
```

APKs and logs land in `local-build/out/<run>/`. On an x86_64 Linux machine with Docker, the
three ABIs take about 15 minutes. The scripts take care of what the image doesn't do on its own:

- The recipe's `sudo` steps (Node from Debian forky) only run on the real buildserver, so
  the `Dockerfile` bakes them into a derived image, and `setup.sh` installs the NDK and SDK
  platform into the `sfsdk` volume.
- The fdroiddata-style working directory lives on a Docker volume, not a bind mount, whose
  file ownership on macOS breaks `expo prebuild --clean`.
- `fdroid build -l` expects the source already cloned into `build/fish.proto.slashfacts`,
  next to a `build/.fdroidvcs-fish.proto.slashfacts` file holding `git <Repo URL>`; without it
  fdroid deletes the clone and clones again.
- `fdroid lint` flags `Categories` here because the directory lacks fdroiddata's
  `config/`; the merge request's pipeline runs the real lint. `fdroid lint` and
  `fdroid rewritemeta` in an fdroiddata checkout should both leave the metadata unchanged.

On macOS (Apple silicon), the image runs under amd64 emulation: one ABI takes about 15
minutes, and an 8 GB Docker VM needs Gradle capped through `GRADLE_PROPERTIES=<file>` with
`org.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=1g`, `kotlin.daemon.jvmargs=-Xmx1g` and
`org.gradle.workers.max=1`. With two workers, R8 running next to lint was killed out of
memory.
