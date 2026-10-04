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
stale_after: 2026-10-11T00:00:00Z
---

# State

Checked on 2026-10-04. The MR changes every few days, so read its live state first:

```sh
curl -s https://gitlab.com/api/v4/projects/fdroid%2Ffdroiddata/merge_requests/51170 \
  | grep -oE '"(state|detailed_merge_status|sha|updated_at)":"[^"]*"'
```

| | |
|---|---|
| State | Open, mergeable, squash on merge, maintainers may push |
| Fork, branch | `gitlab.com/proto-fish/fdroiddata`, branch `slashfacts` (unprotected) |
| Head | `348d53f9c`, pipeline passed |
| Builds | `v1.0.0` by full hash, three per-ABI APKs (versionCode 1001–1003) |
| Review | A packager asked for Node from Debian; done in `348d53f9c` and answered |

The review comments need a GitLab login to read through the API.

# Compliance

Against the [contribution rules](fdroiddata-contributing.md):

| Rule | Status |
|---|---|
| One branch per app, fork `master` untouched, branch not protected | Yes. The branch is named `slashfacts`, not the app id (a recommendation); renaming it would close the MR. |
| Pipeline passes | Yes, on the current head. |
| `fdroid lint` / `rewritemeta` clean, local `fdroid build` | Yes (arm64, versionCode 1002). |
| Template filled in | Yes, but stale since `348d53f9c`: the pipeline boxes are unticked, and the build notes still say Node comes from nodejs.org. |
| Fastlane metadata upstream, `en-US` | Yes. `v1.0.0` only has `changelogs/1.txt`, which F-Droid ignores, so 1.0.0 shows no changelog. |
| Only the latest version, full `commit` hash | Yes, as long as no new tag lands during review. |
| Reproducible Builds | Off: no upstream-signed APKs, so F-Droid signs. This can't be switched later. |
| ABI split | Yes, 34 MB per ABI instead of 95 MB universal. |

# Open items

- Update the MR description: tick the pipeline box, explain or fix the Reports tab, and say
  Node comes from Debian forky.
- Keep the release PR unmerged until this MR is merged.
- After the merge, mark this concept `status: deprecated`.
