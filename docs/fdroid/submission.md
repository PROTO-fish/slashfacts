---
type: Merge Request
title: Inclusion merge request
description: Where SlashFacts' fdroiddata merge request stands, and how it complies with the rules.
resource: https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51170
tags: [fdroid, fdroiddata, release]
sources:
  - id: mr
    resource: https://gitlab.com/fdroid/fdroiddata/-/merge_requests/51170
    title: "fdroiddata!51170: New app: SlashFacts"
  - id: rules
    resource: fdroiddata-contributing.md
    title: fdroiddata contribution rules
stale_after: 2026-10-12T00:00:00Z
---

# State

Checked on 2026-10-05. The MR changes every few days, so read its live state first:

```sh
curl -s https://gitlab.com/api/v4/projects/fdroid%2Ffdroiddata/merge_requests/51170 \
  | grep -oE '"(state|detailed_merge_status|sha|updated_at)":"[^"]*"'
```

| | |
|---|---|
| State | Open, mergeable, squash on merge, maintainers may push |
| Fork, branch | `gitlab.com/proto-fish/fdroiddata`, branch `slashfacts` (unprotected) |
| Head | `72c57f4f47`, pipeline passed; the Reports tab is info only, with the R8 marker on all three APKs (22, 28 and 29 MB) |
| Builds | `v1.1.0` by full hash, three per-ABI APKs (versionCode 10100001–10100003), R8 on |
| Review | Round 1: Node from Debian, done in `348d53f9c`. Round 2: one command per list item and R8 on, done in `72c57f4f47` with release 1.1.0. Both answered. |

The review comments need a GitLab login to read through the API.

# Compliance

Against the [contribution rules](fdroiddata-contributing.md):

| Rule | Status |
|---|---|
| One branch per app, fork `master` untouched, branch not protected | Yes. The branch is named `slashfacts`, not the app id (a recommendation); renaming it would close the MR. |
| Pipeline passes | Yes, on the current head. |
| `fdroid lint` / `rewritemeta` clean, local `fdroid build` | Yes (arm64, versionCode 10100002), and the APK was smoke-tested on an emulator. |
| Template filled in | Yes, updated for 1.1.0 on 2026-10-05. |
| Fastlane metadata upstream, `en-US` | Yes, with the 1.1.0 changelog as `changelogs/10100003.txt`. |
| Only the latest version, full `commit` hash | Yes, as long as no new tag lands during review. |
| Reproducible Builds | Off: no upstream-signed APKs, so F-Droid signs. This can't be switched later. |
| ABI split | Yes, 29 MB per ABI instead of 95 MB universal. |

# Open items

- Don't tag another release while this MR is open: the recipe would have to move to it,
  with another review round.
- After the merge, mark this concept `status: deprecated`.
