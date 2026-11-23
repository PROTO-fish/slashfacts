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

### Standalone landing on OVH

https://slashfacts.app serves only the landing page and its linked assets and
privacy page. It reuses `apps/mobile/public/landing.html`, with the Play button
pointing to https://slashfacts.proto.fish/play and link previews pointing to
`slashfacts.app`. The Expo app, manifest and service worker stay on Railway.

Before the first deployment, confirm the domain's document root in OVH and
check the corresponding directory as seen by the SFTP login. In GitHub
**Settings → Environments → slashfacts / production**, configure:

| Kind | Name | Value |
|---|---|---|
| Secret | `OVH_SFTP_HOST` | SFTP hostname, without a protocol or port (SSH port 22) |
| Secret | `OVH_SFTP_USER` | SFTP login with write access to the site |
| Secret | `OVH_SFTP_PASSWORD` | SFTP password |
| Variable | `OVH_SITE_ROOT` | Confirmed, existing document root, absolute in the SFTP session or relative to its starting directory; omit the trailing slash. No default. |
| Secret | `OVH_SFTP_KNOWN_HOSTS` | OpenSSH known_hosts entry (or entries) for the exact SFTP host, with the key verified independently against OVH before saving. Do not learn it during deployment. |

Keep the environment's `main` and `site-*` deployment rules. The workflow itself
must be dispatched from `main` even for a rollback. A repo ruleset, if present,
must allow the workflow token to **create** `site-*` tags; avoid moving or deleting
published tags.

1. **Release:** In **Actions → Site deploy → Run workflow**, select `main` and
   leave the tag input blank. It creates an annotated `site-YYYY-MM-DD` tag
   in UTC, using `.2`, `.3`, etc. if taken, at the exact dispatch commit. It
   deploys that tag in the same run: a tag pushed with the workflow token
   does not trigger a second workflow.
2. **Rollback or retry:** Dispatch from `main` with the exact existing
   `site-*` tag. The workflow deploys the tagged snapshot without minting
   another tag. Use a previously successful tag for rollback; a tag can
   exist even if its deployment failed.

Deployments do not overlap. Wait for the current run before dispatching another
one; GitHub may replace a pending run with a newer dispatch. The uploader
overwrites staged paths without deleting unrelated remote files. If obsolete
files are served, review and remove them separately; rollback won't remove
them. Uploads are not atomic: a failed run can leave partial changes. The job
passes only if public GETs for `/` and every staged asset return matching
bytes. If verification fails, check the document root and caching before
retrying or rolling back.

To inspect the artifact locally without uploading anything, run from the repo
root (the output directory must not exist):

```sh
node apps/mobile/scripts/stage-site.mjs apps/mobile/public "$(mktemp -d)/site"
```
