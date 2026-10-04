# Agent instructions

This repository is **agent-agnostic**. This file follows the open
[AGENTS.md](https://agents.md) format and is the single source of instructions for every
coding agent, and for humans too. It is plain Markdown with no tool-specific syntax.

- **Don't add tool-specific instruction files or config directories to the repo.** If your
  tool doesn't read `AGENTS.md` natively, point it here from your own local setup: a local
  setting, or an untracked symlink listed in `.git/info/exclude`.
- **Never name a coding agent or AI tool** (Claude, Claude Code, Codex, Copilot, Cursor,
  Gemini, …) in commit messages, commit trailers (`Co-Authored-By`, "Generated with …"),
  code comments, docs, tracked files, pull requests or review comments. The history reads the
  same whoever, or whatever, wrote a change.
- **Nested files are allowed.** Per the AGENTS.md convention, an `AGENTS.md` inside a
  workspace (`apps/mobile`, `packages/core`) takes precedence for that subtree.
  None exist yet, so everything below applies repo-wide.

## Project overview

SlashFacts is a multiplication-tables trainer (2–9): the child answers by drawing one stroke
through the digits of the result. It is an npm-workspaces monorepo:

- `packages/core`: a pure TypeScript engine (facts, scheduler, gesture geometry). No DOM,
  no React Native, no dependencies.
- `apps/mobile`: one Expo app for Android, iOS and the web. Its web export is the website,
  deployed to Railway.

Read `AGENTS_INDEX.md` to find files, and `docs/design.md` before changing any gameplay
behaviour.

## Setup, build and test

```sh
npm install              # once per checkout / worktree
npm run dev              # the app in a browser, on http://localhost:8081
npm run typecheck        # core and the app
npm test                 # core engine + gesture tests (vitest)
npm run build            # website build in apps/mobile/dist
cd apps/mobile && npx expo start   # native app in Expo Go
```

Run `npm run typecheck && npm test` before every commit. A change to `packages/core` must
keep the app typechecking.

## Code style

- TypeScript in strict mode everywhere. Two-space indent, single quotes, semicolons.
- ESM: relative imports carry the `.js` extension, even from `.ts` files.
- `packages/core` stays pure: no platform APIs and no dependencies. Platform code lives in the
  apps, behind interfaces like `Storage`.
- One codebase for every platform. Where a platform needs its own code, add a sibling file
  with a platform suffix (`storage/native.web.ts` next to `storage/native.ts`) that exports
  the same names; Metro picks it for that platform. A change that touches one sibling
  usually belongs in the other too. Check a layout change on a phone, a tablet and a
  desktop browser window.
- Comments explain *why*. Match the density and tone of the surrounding code.

## Privacy and security constraints

The app is offline and account-free by design, for children. **Never add** network calls,
analytics, crash reporting, ads, or third-party SDKs. The Android release build must keep
asking for `VIBRATE` only (see `docs/licensing-audit.md`). Any new dependency must use a
GPL-3.0-compatible license and be free software, or the F-Droid build breaks.

## Contributing: issues first, pull requests on request

The contribution rules live in `CONTRIBUTING.md`; read it before opening anything on
GitHub. They apply to every agent, whoever it works for:

- **Every change starts from an issue.** Find the existing one or open it, then link it from
  the branch's pull request.
- **Never open a pull request until a maintainer asks for one**, in the issue or directly to
  you. Finishing the work isn't a request: commit on the branch, stop, and report back.
- Opening an issue or a pull request publishes on someone's behalf. Show the person you work
  for the draft first, unless they've told you to post it.
- Every commit is signed off (`git commit -s`), per the DCO in `CONTRIBUTING.md`.
- One scoped change per branch and PR (see Branching below). Titles follow Conventional
  Commits.

## Branching — read this before touching any file

Before the *first* edit of a new task — not before the first commit — check the current
branch:

```sh
git branch --show-current
```

If it prints `main`, stop and set up a worktree (see below) before writing or editing
anything. Editing on `main` and moving the change to a branch afterward is a recovery step
for a mistake, not the normal flow — it works because git happens to let you, not because
it's the intended order.

- `main` is the release branch. It always reflects what is (or is about to be) deployed.
- Never edit or commit directly on `main`. Do all new development — including a single-file
  fix or an audit follow-up — on a branch, then merge back.
- Name branches by the kind of change:
  - `feat/<short-description>` — new functionality
  - `bug/<short-description>` — a fix for broken behavior
- Keep branches scoped to one change. Don't mix an unrelated fix into a feature branch or
  vice versa — cherry-pick or split commits if a branch drifts.

## Finding files

Start with `AGENTS_INDEX.md` at the repo root: it maps tasks to files and pairs each web
file with its mobile counterpart. Check it before searching the tree. When you add, move,
or delete a file it lists, update the index in the same commit.

## Docs

- `docs/plans/` — implementation plans, current and past. Give a new plan a `**Status:**`
  line right under the title (`Active`, `Completed`, `Cancelled`) and update it in place as
  the work progresses; don't move or delete a plan once it's done, the folder is the
  history.
- `docs/adr/` — Architecture Decision Records for significant technical decisions, one file
  per decision (`docs/adr/NNNN-short-title.md`). See `docs/adr/README.md` for the template
  and numbering convention. Write one when a decision would otherwise have to be
  re-litigated or reverse-engineered from a diff later (a library choice, a structural
  tradeoff, something rejected and why).

## Worktrees

Use a separate `git worktree` per branch instead of switching branches in place, so multiple
agents (or an agent and a human) can work concurrently without stashing or blocking each
other. Keep worktrees as sibling directories, outside the main checkout, under
`../slashfacts-worktrees/`.

### Init (starting new work)

```sh
git fetch origin
git worktree add -b feat/<short-description> ../slashfacts-worktrees/feat-<short-description> origin/main
cd ../slashfacts-worktrees/feat-<short-description>
npm install
```

- Swap `feat/` for `bug/` for a bug-fix branch, and use the matching directory name so the
  branch and its worktree stay easy to pair up (`git worktree list`).
- Always branch from `origin/main`, not from whatever the main checkout happens to have
  locally, so the new branch starts from the real release state.
- `npm install` is needed per worktree — it's a separate `node_modules`, not shared with the
  main checkout.

### Clean up after the branch is merged to `main`

```sh
git -C <path-to-main-checkout> checkout main
git -C <path-to-main-checkout> pull
git worktree remove ../slashfacts-worktrees/feat-<short-description>
git branch -d feat/<short-description>
git push origin --delete feat/<short-description>   # only if it was pushed
```

`git branch -d` (lowercase) refuses to delete a branch with unmerged commits — treat that
refusal as a signal to check the merge actually landed before forcing anything.

### Clean up after the branch is cancelled (work abandoned, not merged)

```sh
git worktree remove --force ../slashfacts-worktrees/feat-<short-description>
git branch -D feat/<short-description>
git push origin --delete feat/<short-description>   # only if it was pushed
```

`--force`/`-D` discard uncommitted or unmerged work permanently — confirm with whoever owns
the branch before cancelling, unless you're cleaning up your own abandoned attempt.

### Housekeeping

Run `git worktree list` to see what's active, and `git worktree prune` if a worktree's
directory was deleted manually (e.g. `rm -rf`) instead of via `git worktree remove`.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
  `chore`.
- A `!` after the type/scope (`feat!:`) or a `BREAKING CHANGE:` footer marks a breaking
  change.
- The description is short, imperative, lowercase, no trailing period.
- The type in the commit maps directly to the version bump semver requires on release
  (`fix` → patch, `feat` → minor, breaking change → major) — see below.

## Versioning

Use [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- `MAJOR` — breaking change (incompatible API/behavior change).
- `MINOR` — new, backwards-compatible functionality.
- `PATCH` — backwards-compatible bug fix.

Don't bump versions by hand: release-please (`.github/workflows/release-please.yml`) does it
from the commit types since the last release — a single breaking change forces a major bump
even if the other commits are `fix`/`feat`. One version covers the repo: the root
`package.json` and the app (`apps/mobile/app.json`, `apps/mobile/package.json`).
`packages/core` is internal and keeps its own.

The store build numbers derive from the version, MAJOR×10000 + MINOR×100 + PATCH (1.1.0 →
10100), as `android.versionCode` and `ios.buildNumber` in `app.json`
(`apps/mobile/scripts/sync-build-numbers.mjs`). Minor and patch stay below 100. The F-Droid
recipe reads `versionCode` from `app.json` and publishes 1000 × code + 1/2/3, one per ABI.

## Releasing

1. Every push to `main` updates one open release PR (`chore(main): release X.Y.Z`): the
   version, `CHANGELOG.md`, and the build numbers. Commit titles become the changelog, so
   write them for a reader.
2. Before merging it, add the F-Droid changelog on the release PR's branch, one per locale:
   `fastlane/metadata/android/<locale>/changelogs/<1000 × code + 3>.txt` (for 1.1.0,
   `10100003.txt`), plain text, 500 characters at most, drawn from the release notes.
   F-Droid matches the file against the highest per-ABI versionCode; any other name is
   silently ignored.
3. Merge the release PR. That tags `vX.Y.Z` and publishes a GitHub Release with the same
   notes; F-Droid's update check picks up the tag on its own.
4. Build and submit the store builds from the tag (EAS for Google Play and the App Store).
