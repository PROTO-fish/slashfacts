# F-Droid

SlashFacts is built and signed by F-Droid from this repository's tags. The build recipe
lives in fdroiddata as `metadata/fish.proto.slashfacts.yml`; `fish.proto.slashfacts.yml`
here is a copy of it, submitted in
[fdroiddata!51170](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51170).
The store listing (text, icon, screenshots, changelogs) comes from
`fastlane/metadata/android/` in this repository, not from fdroiddata.

## Releasing a new version

F-Droid's bot polls this repository for tags and builds new versions on its own, so a
release needs no change in fdroiddata:

1. Bump `expo.version` and `expo.android.versionCode` in `apps/mobile/app.json`. The bot
   reads both from there (`UpdateCheckData`), since `android/` only exists after
   `expo prebuild`.
2. Add the changelog for each locale in `fastlane/metadata/android/<locale>/changelogs/`,
   named after the **highest split versionCode**, `versionCode × 1000 + 3`: versionCode 2
   gets `2003.txt`. F-Droid matches changelog files against the APKs' versionCodes, not
   against `app.json`, so a file named `2.txt` is silently ignored.
3. Merge to `main`, then tag the merge commit `vX.Y.Z` and push the tag. Only tags matching
   `^v[\d.]+$` are considered.

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
- Expo's generated `gradle.properties` has no trailing newline, so lines are appended with
  `printf '\n…'`, never `echo`. An `echo` glues onto the last property and breaks the build.

## Testing the recipe locally

`fdroid build` runs in fdroidserver's Docker image
(`registry.gitlab.com/fdroid/docker-executable-fdroidserver:master`). The image ships an
empty Android SDK, and on macOS a few things need care:

- Add Node at the version the recipe pins (its `sudo` block only runs on the real
  buildserver), and install the NDK and SDK platform into a mounted SDK directory.
- Keep the fdroiddata-style working directory on a Docker volume, not a macOS bind mount,
  whose file ownership breaks `expo prebuild --clean`.
- `fdroid build -l` expects the source already cloned into `build/fish.proto.slashfacts`.
- Under amd64 emulation in an 8 GB Docker VM, cap Gradle's memory from a mounted
  `~/.gradle/gradle.properties` (`org.gradle.jvmargs=-Xmx2560m`,
  `kotlin.daemon.jvmargs=-Xmx1536m`, `org.gradle.workers.max=2`), or the daemon is killed.
- Build one ABI with `fdroid build -v -l fish.proto.slashfacts:1002`. `fdroid lint` and
  `fdroid rewritemeta` should both leave the metadata unchanged.
