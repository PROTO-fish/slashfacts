# Agent instructions

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

Bump the version when merging to `main` for a release, based on the highest-impact commit
type included since the last release (a single breaking change forces a major bump even if
other commits in the same release are `fix`/`feat`).
