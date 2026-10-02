# Contributing to SlashFacts

Thanks for helping. Bug reports, ideas and fixes are all welcome. SlashFacts is a small
project maintained by PROTO/fish, so every contribution starts as an issue and becomes a pull
request only when a maintainer asks for one.

## Issues first, pull requests on request

1. **Open an issue.** Search the existing ones first. For a bug, give the steps to reproduce
   it, what you expected, and the device, OS and browser or app version. For an idea, describe
   the problem it solves before the solution.
2. **Wait for a maintainer.** They discuss it in the issue and decide whether a change should
   be made, and in what shape.
3. **Open a pull request only once a maintainer asks for one in the issue.** Link it
   (`Closes #12`). Pull requests nobody asked for are closed without review, however small:
   this covers code, docs, translations and typo fixes alike.

This applies to everyone, maintainers' coding agents included.

## What won't be accepted

The app is offline and account-free by design, for children:

- no network calls, analytics, crash reporting, ads or third-party SDKs;
- no new Android permission: the release build asks for `VIBRATE` only
  (see [`docs/licensing-audit.md`](docs/licensing-audit.md));
- no dependency that isn't free software under a GPL-3.0-compatible license, or the F-Droid
  build breaks.

## Developer Certificate of Origin

SlashFacts is licensed under the GPL-3.0 and is also distributed by PROTO/fish through
app stores. To keep that possible, every commit must be signed off, certifying that you
wrote the change or otherwise have the right to submit it under the project's license —
the [Developer Certificate of Origin 1.1](https://developercertificate.org/):

```sh
git commit -s -m "fix: describe the change"
```

This adds a `Signed-off-by: Your Name <you@example.com>` trailer. Pull requests with
unsigned commits can't be merged.

## Pull request checklist

When a maintainer has asked for a pull request:

- Branch from `main` and keep the branch to the one change agreed in the issue.
- Write commit messages and the PR title in
  [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) form
  (`fix: keep the pad inside short windows`).
- Sign off every commit (see above).
- Run `npm run typecheck && npm test`; both must pass.
- Don't name a coding agent or AI tool in commits, trailers (`Co-Authored-By`,
  "Generated with …"), code, docs or the PR. Whoever or whatever wrote the change, your
  sign-off makes it yours.
- Don't add tool-specific instruction files or config directories.

`AGENTS.md` details the branch, worktree, commit-message and versioning conventions;
`AGENTS_INDEX.md` maps tasks to files.
