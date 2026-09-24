# Architecture Decision Records

One file per decision, named `NNNN-short-title.md` (zero-padded, sequential — see the
highest existing number in this folder to pick the next one). Once written, an ADR is not
edited to reflect a later reversal — a new ADR supersedes it and says so; the old one keeps
its original status and content as the historical record.

## Template

```markdown
# NNNN. Title

**Status:** Proposed | Accepted | Superseded by [NNNN](NNNN-slug.md) | Deprecated
**Date:** YYYY-MM-DD

## Context

What problem or question forced this decision. The constraints, not the solution.

## Decision

What was decided, stated plainly.

## Consequences

What this makes easier, what it makes harder, and what it forecloses.
```
