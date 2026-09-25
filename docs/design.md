# Design rules

Why SlashFacts behaves the way it does. Read this before changing gameplay: most rules
here replaced something that was tried and removed, and the reason is written down so it
does not get re-tried.

## The premise: recall, not calculation

SlashFacts is about **multiplication facts**, and a fact is binary: you know it or you
don't. The app exists to build instant recall, and every rule below serves that.

- **The clock blocks calculation.** `ANSWER_LIMIT_MS` (6 s, `packages/core/src/session.ts`)
  is short enough to rule out counting on fingers, and long enough to read the fact and draw
  two digits. Three seconds was tried and proved brutal: most of it went on the gesture, not
  the recall. The app asks you to spit the answer out, not to work it out.
- **The visual language is binary too.** Black and white, brutalist, heavy Archivo type,
  no colour and no decoration. A known fact gets a tick and an unknown one gets nothing:
  no stars, no progress bars, no "almost". The monochrome palette isn't a style choice
  sitting on top of the app. It is the app's judgement made visible. Night mode swaps the
  two colours and adds none.
- **Only first-time answers count.** A fact answered after its answer was shown is reading,
  not recall (see *Mastery is one tick*).

A change that adds colour-coded feedback, partial credit or a softer grading scale works
against this premise. Discuss it in an issue first.

## How the gesture is read

Counting every cell the line touches does not work. A straight slash from **6** to **4**
crosses **5**, so `8 × 8 = 64` would read as `645`; reaching the `0` bar from the top row
crosses two whole rows. So a cell counts only when the stroke:

- **starts** in it, or
- **ends** in it, or
- **turns** inside it (a heading change over 60°).

Cells passed straight through are ignored. `packages/core/test/geometry.test.ts` checks every
answer in the tables against a straight slash between its digits.

**Selecting tables is the same gesture read the opposite way.** Tables are chosen by
slashing down the row labels on the map, so there is only ever one interaction to learn —
but there, every row the line crosses counts. `TableSelect.tsx` reads `stroke.visits`
directly and must never be switched to `strokeDigits()`.

There used to be a fourth way to earn a cell — **dwelling** in it, holding still to repeat
the digit, meant for a `100` a returning 10 table would need. It was removed: the 10 table
is never coming back, and while it existed a child pausing mid-stroke to think — not holding
on purpose, just resting — silently doubled whatever digit they stopped on, with no visual
sign it had happened. Resting anywhere in a stroke, for any length of time, now changes
nothing about the digits read from it.

Other details that matter to the feel: hit zones are each cell inset by 18%, so grazing a
neighbour's corner does nothing; pointer moves are interpolated at 6px, so a fast flick
never skips a cell; coalesced pointer events are used on high-rate touch screens.

A press that travels more than 14px is a **slash**, not a **tap**, even over one cell — a
finger that smudges while tapping a single digit still counts as a one-cell slash. `SlashPad`
does not care which: any release carrying exactly one digit goes through the same path as a
tap (`onTap`), so a smudged single-digit answer is never mistaken for a whole (longer) one
arriving early. `kind` still decides how the mark on screen behaves — a tap's ink is
momentary, a slash's holds for a beat — but never what gets graded.

## Which tables

`MIN_TABLE` and `MAX_TABLE` in `packages/core/src/facts.ts` are the single source of truth —
the pool and the map both derive from them. The 1 and 10 tables
are excluded: they are rules rather than facts to recall. The pad still needs its 0 key,
because zeros remain in the answers (`2 × 5 = 10`, `8 × 5 = 40`). Saved settings naming a
removed table are repaired by `sanitizeTables()` rather than emptying the pool.

## A round's score is not a measurement

`nextFact()` over-samples the facts you miss and the ones you answer slowly — that is its
job — so a round of 10 is a biased sample, and it gets *worse* as the adaptation gets
better. It measures the scheduler as much as the child.

`summarizeRound()` still reports a rate, a mean time and a per-table breakdown, because
they say something useful about the round that just happened. They are not a level. A table
may carry one or two facts in a given round, and the selection was never uniform.

There was once a second axis for this — an exhaustive quiz under a frozen clock, which
wrote nothing so it could not bias the scheduler it audited. It was removed; `score.ts`
and the result screen it produced are what remain, now serving the round.

The app keeps no history and shows no progress *over time*, only the map of what has been
answered right first time at least once.

## Practice drills until the fact is known

A missed fact is not recorded and forgotten. The answer is shown, and the **same fact comes
straight back** until it is answered correctly — `submitAnswer()` advances the round only on
a correct answer. Every attempt still counts against the fact's accuracy and resets its
streak, so drilling one out is not free.

A round is therefore ten facts *answered*, not ten questions asked. That makes
`correctCount` always reach ten, so the score the round reports is
`total - missed.length`: what went right **first time**, the only part of the round that was
recall rather than reading. The round ends on the list of facts that went wrong, with their
answers.

## Mastery is one tick

A fact is ticked when it has been answered right **first time**, at least once — meaning it
was not missed immediately before. A fact dragged out of a retry loop earns nothing: the
answer had just been shown, so typing it back is reading, not recall. Once earned the tick
never comes off, and it is the only state the map shows.

This saturates as the tables are learned, and that is accepted: the rule fits in one
sentence a child can repeat, and the mark is readable at a glance. Speed is still recorded
(`emaMs`) and still drives scheduling through `automaticMs` — it is simply not displayed.
