---
type: Reference
title: fdroiddata contribution rules
description: What fdroiddata asks of a merge request, summarised from its CONTRIBUTING.md and inclusion template; always re-check upstream.
resource: https://gitlab.com/fdroid/fdroiddata/-/blob/master/CONTRIBUTING.md
tags: [fdroid, fdroiddata, contributing, merge-request]
sources:
  - id: contributing
    resource: https://gitlab.com/fdroid/fdroiddata/-/blob/master/CONTRIBUTING.md
    title: fdroiddata CONTRIBUTING.md
    author: team:fdroid
    last_modified: 2025-09-22T22:05:15Z
  - id: inclusion-template
    resource: https://gitlab.com/fdroid/fdroiddata/-/blob/master/.gitlab/merge_request_templates/App%20inclusion.md
    title: fdroiddata "App inclusion" merge request template
    author: team:fdroid
    last_modified: 2026-09-19T21:40:27Z
  - id: inclusion-policy
    resource: https://f-droid.org/docs/Inclusion_Policy
    title: F-Droid Inclusion Policy
  - id: metadata-reference
    resource: https://f-droid.org/docs/Build_Metadata_Reference
    title: F-Droid Build Metadata Reference
stale_after: 2026-11-04T00:00:00Z
---

# Check upstream first

This page is a summary, and the rules belong to fdroiddata. They change without notice, so
before opening, updating or answering on a fdroiddata merge request:

1. Read the current [CONTRIBUTING.md][contributing] and, for a new app, the
   [App inclusion template][inclusion-template].
2. Compare their last change with `sources[].last_modified` above:

   ```sh
   for f in CONTRIBUTING.md '.gitlab/merge_request_templates/App inclusion.md'; do
     curl -s "https://gitlab.com/api/v4/projects/fdroid%2Ffdroiddata/repository/commits?per_page=1&path=$(printf %s "$f" | sed 's/ /%20/g')" \
       | grep -o '"committed_date":"[^"]*"'
   done
   ```

3. If either is newer, or `stale_after` has passed, update this page and its dates in the
   same change. Upstream wins over this summary whenever they disagree.

# Rules

From [CONTRIBUTING.md][contributing]:

- A first-time contributor of a new app may open a
  [Request for Packaging](https://gitlab.com/fdroid/rfp/-/issues) instead. Optional.
- Fork fdroiddata and work on **one branch per app**, ideally named after the application
  id. Never commit to the fork's `master`; keep it in sync with upstream instead.
- Don't open the merge request from a protected branch.
- The recipe goes in `metadata/<applicationId>.yml`. Run `fdroid readmeta`,
  `fdroid rewritemeta <id>`, `fdroid checkupdates <id>`, `fdroid lint <id>` (no warnings)
  and `fdroid build -v -l <id>`.[^contributing]
- The fork's pipeline must pass before the merge request is opened.
- Fill in the merge request template. Commits are squashed on merge.
- Answer the packagers' questions as soon as possible.
- After inclusion, `AutoUpdateMode: Version` with `UpdateCheckMode: Tags` builds new tags
  on its own.

From the [App inclusion template][inclusion-template]:

- The app meets the [Inclusion Policy][inclusion-policy]; the author is notified.
- Upstream holds Fastlane or Triple-T metadata with at least `en-US`, a summary and a
  description; images, icon and changelog are recommended. None of it goes in the MR.
- Title: `New app: <name>`. The fork is public, one app per MR, related fdroiddata and RFP
  issues are referenced.
- **Don't rebase the branch unless there is a conflict.**
- Metadata: valid YAML with LF endings, `AuthorName`, an issue tracker and contact,
  releases tagged with auto-update on, git submodules rather than srclibs.
- **Only the latest version** stays in the metadata before the merge; a newer release
  replaces the old build entries. No disabled versions.
- **`commit` is a full hash**, never a tag or a branch.
- Reproducible Builds: without them F-Droid signs with its own key, and that **can't be
  switched later**. Explain why if they're off.
- Split per ABI when the split APKs are much smaller.
- All pipelines pass; every warning and error in the Reports tab is fixed or explained.
  Don't pay for CI: if GitLab asks for a phone number or card, say so in the MR
  instead.[^inclusion-template]

# What this means for SlashFacts

- **Don't tag a release while the inclusion MR is open.** The template keeps only the
  latest version, so a new `vX.Y.Z` tag during review means rewriting the recipe for it,
  rebuilding and another review round. Hold the release PR until the MR is merged; after
  that, the bot builds new tags on its own.
- The submission's current state is in [Inclusion merge request](submission.md).

[^contributing]: fdroiddata CONTRIBUTING.md
[^inclusion-template]: fdroiddata "App inclusion" merge request template

[contributing]: https://gitlab.com/fdroid/fdroiddata/-/blob/master/CONTRIBUTING.md
[inclusion-template]: https://gitlab.com/fdroid/fdroiddata/-/blob/master/.gitlab/merge_request_templates/App%20inclusion.md
[inclusion-policy]: https://f-droid.org/docs/Inclusion_Policy
