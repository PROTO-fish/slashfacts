# SlashFacts

Multiplication tables 2–9, answered by drawing one continuous stroke through the digits.
No buttons, no rewards, no screens between attempts: **see → remember → slash → next**.

Pick your tables, **START**, and the round adapts to what you keep missing. **STATS** holds
the map of what is known — one tick per fact answered right first time — and the only way
to erase it.

```
npm install
npm run dev      # http://localhost:5173
npm test         # engine + gesture tests
npm run build    # apps/web/dist
npm start        # serve the build on $PORT
```

## How the gesture is read

Counting every cell the line touches does not work. A straight slash from **6** to **4**
crosses **5**, so `8 × 8 = 64` would read as `645`; reaching the `0` bar from the top row
crosses two whole rows. So a cell counts only when the stroke:

- **starts** in it, or
- **ends** in it, or
- **turns** inside it (a heading change over 60°).

Cells passed straight through are ignored. `apps/web/test/geometry.test.ts` checks every
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

## Layout

```
packages/core     pure TypeScript, zero dependencies, no DOM
  facts.ts        the 64 facts, answers as digit sequences
  mastery.ts      FactStat + recordAttempt() + masteryLevel()
  scheduler.ts    nextFact(), weighted adaptive selection
  session.ts      rounds of 10
  score.ts        rate, mean time and the per-table breakdown, counted once
  storage.ts      the Storage interface only — no implementation
  slash/geometry.ts   the gesture engine: pure, no React, fully tested

apps/web          Vite + React
  slash/useSlash.ts   pointer events -> geometry
  slash/SlashPad.tsx  the pad and the live stroke
  game/useQuestionLoop.ts  the question loop: grade, hold, reveal, re-arm
  game/QuestionView.tsx    one question on screen
  components/TableSelect.tsx  the picker: tap or slash across the tables
  components/Matrix.tsx       the map, read-only
  storage/idb.ts      IndexedDB, implementing the core Storage interface
  server.js           dependency-free static server for Railway
```

The engine is pure and injects its own RNG, so scheduling is deterministic under test and
the adaptive algorithm can be replaced without touching a single component.

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

## Data

Everything is stored locally (IndexedDB) — no accounts, no backend, nothing to leak. A
`Storage` implementation is the only thing a sync backend would need to replace.

## Railway

Live at **https://slashfacts.proto.fish**. `railpack.json` installs only the web and core
workspaces and runs `npm run -w apps/web build`; `railway.json` starts
`node apps/web/server.js`, which binds `$PORT`, serves `apps/web/dist`, falls back to
`index.html` for client routes, and marks hashed assets immutable.

## iOS / Android

An Expo app goes in `apps/mobile` and depends on `@slash/core` unchanged, including
`geometry.ts`, which lives there precisely so web and native read a stroke through one
implementation. Three things get platform implementations: the `Storage` interface
(expo-sqlite), the gesture source (react-native-gesture-handler feeding the same
`extendStroke`), and haptics (expo-haptics). See `docs/plans/mobile-port-plan.md` for the
full port plan.

## Contributing

Contributions are welcome — see [`CONTRIBUTING.md`](CONTRIBUTING.md). Every commit needs a
`Signed-off-by` line (`git commit -s`), certifying the
[Developer Certificate of Origin](https://developercertificate.org/).

## License

SlashFacts is published by PROTO/fish under the
[GNU General Public License v3.0](LICENSE). The app icon and brand mark are covered by the
same license.

The Archivo typeface (`apps/web/public/fonts`, `apps/mobile/assets/fonts`) is © The Archivo
Project Authors and licensed under the [SIL Open Font License 1.1](apps/mobile/assets/fonts/OFL.txt).
