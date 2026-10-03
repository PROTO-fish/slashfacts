# 0002. Day only: no night mode

**Status:** Accepted
**Date:** 2026-10-04

## Context

The home screen's footer tier held a night-mode toggle that swapped ink and paper. The app
needed a visible credit for its publisher, PROTO/fish, and an entry point to an About
screen carrying the GPL-3.0 notice (issue #22). The footer tier is the only quiet spot on
home, and it is reserved at the same height on every screen so the launch buttons never
move.

Two ways to keep night mode without its button were considered: following the system
setting (`useColorScheme()`, `prefers-color-scheme` on the web), or keeping the toggle
next to the credit in the same row.

## Decision

The app is day only: black ink on white paper. The PROTO/fish mark replaces the toggle in
the footer tier and opens About. The NIGHT palette, the night backdrop tile and the saved
`night` setting are removed. `usePalette()` stays, so styles keep naming their colours
through the palette tokens.

## Consequences

- One look on every device, and less code: no theme context, no second backdrop tile, a
  fixed dark status bar.
- Saved settings written before this change may still carry a `night` key. Nothing reads
  it, and it is harmless.
- Users who had picked night mode on the web lose it.
- Bringing night mode back means restoring a second palette and deciding where its control
  lives, since the footer tier now belongs to the mark. That calls for a new ADR.
