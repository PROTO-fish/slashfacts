# Contributing to SlashFacts

Thanks for helping. Bug reports, fixes and ideas are all welcome — open an issue before
starting on anything large, so we can agree on the shape of it first.

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

## Working on the code

`AGENTS.md` describes the branch, worktree, commit-message (Conventional Commits) and
versioning conventions; `AGENTS_INDEX.md` maps tasks to files. Before opening a pull
request:

```sh
npm run typecheck
npm test
```

The app is offline and account-free by design: no network calls, analytics, ads or
third-party SDKs. Changes that add any of these won't be accepted.
