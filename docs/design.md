# Design rules

Read before changing gameplay. SlashFacts trains recall of multiplication facts.
Discuss changes to these rules in an issue first.

## Tables and timing

The tables run from 2 to 9, giving 64 facts. `MIN_TABLE` and `MAX_TABLE` in
`packages/core/src/facts.ts` define both the question pool and table map.
The 1 and 10 tables are excluded because they teach rules rather than facts to
recall. The pad still needs 0 for answers such as 10 and 40.
`sanitizeTables()` repairs empty or stale saved selections.

Each attempt allows 6 seconds (`ANSWER_LIMIT_MS` in
`packages/core/src/session.ts`). This leaves time to read and draw while
discouraging calculation. A previous 3-second limit left too little time for
the gesture.

## Reading answers

`packages/core/src/slash/geometry.ts` reads the first and last visited cells,
plus any intermediate cell where the stroke turns more than 60°.
Cells crossed straight through are ignored: a stroke from 6 to 4 must answer
64 even though it crosses 5. `packages/core/test/geometry.test.ts` checks
straight strokes for every answer in the tables.

The geometry settings are:

- Core hit zones inset each cell by 18% on every side. The app's shared
  `useSlashNative.ts` adapter overrides this to 8%, including on the web,
  to accommodate fingers.
- Moves are interpolated at intervals no greater than 6 coordinate units.
- Heading is measured over a 14-unit distance; a change greater than 60°
  counts as a turn.
- A stroke travelling at most 14 units and containing exactly one digit is
  a tap. Other strokes are slashes. These are pad-local coordinates,
  corresponding to layout points in the app.

Holding still never repeats a digit. Dwell-based repetition was removed
because an ordinary pause could silently duplicate the answer.

`SlashPad.tsx` sends every one-digit release through `onTap`, regardless of
stroke kind. This lets a smudged tap contribute one digit without prematurely
submitting a two-digit answer. Taps accumulate until the expected answer
length is reached; multi-digit strokes submit together. Stroke kind controls
the ink's lifetime, not grading.

Table selection deliberately uses different interpretation: every crossed row
counts. `TableSelect.tsx` must read `stroke.visits`, not `strokeDigits()`.

## Rounds and scoring

A round advances through 10 correctly answered questions. After a wrong answer
or timeout, the answer is revealed and the same fact returns until answered
correctly. Every attempt updates the fact's statistics; a miss resets its
streak.

`summarizeRound()` scores only the first attempt at each question, excluding
immediate retries because the answer has just been shown. It reports accuracy,
correct-answer timings and a per-table breakdown. Timeouts count against
accuracy but are excluded from timings. The round summary also lists missed
facts with their answers.

`nextFact()` favours facts answered incorrectly or slowly. A round is therefore
a biased sample, sometimes with very few questions from a table; its score
describes that round and must not be presented as a proficiency level.

## Mastery and progress

A fact earns a permanent tick when answered correctly without its previous
recorded attempt being a miss. A correct answer immediately following a miss
earns no tick. Speed does not determine mastery.

The FACTS screen shows known-fact gauges, accuracy and correct-answer response
times. Accuracy and displayed timings use each fact's last five attempts
(`RECENT_WINDOW`). PRACTICE NEXT lists facts with recent misses and shows their
recent answers as squares. The app retains these recent attempts and aggregate
statistics, rather than a chronological archive of rounds.

The scheduler separately uses the moving average of correct response times
(`emaMs`) and `automaticMs`; these do not control the tick.

## Visual constraints

Use black ink on white paper, heavy Archivo type and no night mode.
[ADR 0002](adr/0002-day-only.md) records the night-mode decision.
Answers receive no partial credit. Changes introducing colour-coded feedback,
cartoon rewards or a softer grading scale require discussion first.
