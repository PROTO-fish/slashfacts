# 0003. Tablets: a zoomed paper column on the backdrop

**Status:** Accepted
**Date:** 2026-10-04

## Context

Every screen was tuned on phones. On a tablet the app capped itself at a 560pt column on
the ink background: two wide black bars, a status bar lost black on black, and a table
grid and answer pad sized for a phone in the middle of a 10–13" screen. iPadOS and
Android 16 both ignore a portrait lock on large screens, so landscape and Split View had
to work too, and they did not (issue #27).

Four layouts were tried on a 13" iPad:

- **The phone layout on full-width paper.** Fixed the bars and the status bar, but left
  the pad about a fifth of the screen wide.
- **The website's framed card** (a rounded phone shape on the crumpled-paper backdrop),
  scaled to the screen's height. The most branded, but it shrinks the content and reads as
  an iPhone app in a box, which App Review sometimes questions.
- **The phone layout zoomed, on full-width paper.** The right size, but landscape left wide
  empty white margins.
- **The phone layout zoomed, in a full-height paper column on the backdrop.**

## Decision

On a native window at least 600pt in both directions, the app is a full-height paper
column, 452 layout points wide (Home's 420pt grid and its margins), on the crumpled-paper
backdrop. The column is zoomed by one factor (`tabletScale` in `theme/viewport.tsx`): the
window's width, or 0.75 of its height when that is smaller, over 688pt, held between 0.8
and 1.5. That is 1.5× on a 13" iPad in portrait, about 1.1–1.2× on a 9.7–11" one, and below
1× on a short landscape screen, so the layout always has the ~917pt of height a tall phone
gives it.

Every size written for a phone is multiplied by the factor: `useBreakpoint()` returns
scaled metrics, `useScaledStyles()` scales a StyleSheet's lengths, and the few inline
numbers (font clamps, stroke widths, icon sizes) multiply by `scale` themselves. Nothing
uses a scale transform, which would soften text on iOS. The backdrop tile was lightened, and
the website, which shares it, gets the lighter tile too.

## Consequences

- Tablets get the phone design at a tablet's size, in every orientation and Split View
  width, with no second layout to maintain. Phones and the website are unchanged.
- A new screen must take its lengths from `useScaledStyles()` and `useBreakpoint()`, or it
  will draw phone-sized on a tablet.
- A fractional zoom makes measured widths land up to half a point over the real ones, so
  any row that divides its width into equal cells must floor them and leave a point spare
  on a tablet (`TableSelect`, `SlashPad`).
- Gesture thresholds (`tapSlop` and the rest) are not scaled: they measure a finger, and a
  point is about the same physical size on any screen.
- A tablet-specific layout (more columns, side-by-side panels) would replace the zoom and
  calls for a new ADR.
