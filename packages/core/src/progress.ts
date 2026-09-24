import { ALL_FACT_IDS, ALL_TABLES, parseFactId, type FactId } from './facts.js';
import { emptyStat, windowedAccuracy, windowedMeanMs, type FactStat } from './mastery.js';
import { mean } from './score.js';

/**
 * What the store says about the child, as opposed to what just happened.
 *
 * `score.ts` reports a round: a handful of answers, gone when the screen changes.
 * This reads the accumulated `FactStat`s instead, and answers the two questions a stats
 * screen exists for — what is left to work on, and where am I fast.
 */

export interface TableProgress {
  readonly table: number;
  /** Facts of this table answered right first time at least once. */
  readonly known: number;
  readonly total: number;
  /**
   * Attempts within the last `RECENT_WINDOW` answers, pooled across the table's facts.
   * 0 means none of the table's facts have been answered recently (never touched, or every
   * recorded answer has aged out of the window).
   */
  readonly asked: number;
  /**
   * Correct answers over attempts, pooled across the table's facts, both windowed to each
   * fact's last `RECENT_WINDOW` answers. 0 when `asked` is 0 — callers must check `asked` to
   * tell "no recent data" apart from "answered wrong every time".
   */
  readonly accuracy: number;
  /** Mean recall time over this table's timed facts, windowed, in ms. 0 when there are none. */
  readonly meanMs: number;
}

/**
 * One row of the practice list: a fact with a miss among its last answers. Tables nobody has
 * started are not rows here — they have no answers to draw, and the TABLES panel already
 * shows them (an empty gauge, 0/8, no accuracy, no time).
 */
export interface PracticeEntry {
  readonly id: FactId;
  /**
   * The last `RECENT_WINDOW` answers, oldest first, as right (true) or not (false). This is
   * the whole status: the screen draws it as squares rather than naming a state, so there is
   * no label to compute and no verdict to pass on the child.
   */
  readonly recent: readonly boolean[];
  /** Share of `recent` answered right, 0-1. */
  readonly accuracy: number;
  /** Mean correct response time over `recent`. 0 when none of them were right. */
  readonly meanMs: number;
}

/** How many facts one table holds. */
const PER_TABLE = ALL_TABLES.length;

/**
 * One row per table, always all eight — a table missing from the list would read as a table
 * that does not exist rather than one never played.
 *
 * `meanMs` is a mean of per-fact means, deliberately: every fact of the table weighs the
 * same whatever the number of times it was asked. The alternative — pooling raw attempts —
 * would let one fact drilled twenty times speak for the whole table.
 *
 * `accuracy`, on the other hand, *is* pooled windowed attempts (correct / asked across every
 * fact of the table, each fact counting only its last `RECENT_WINDOW` answers). `known`
 * already says how many facts got there; accuracy says how it's going lately — a fact right
 * first time and one dragged out of five retries both count toward `known` the same, and this
 * is the number that tells them apart, without old history propping up a fact that's since
 * slipped.
 */
export function tableProgress(stats: ReadonlyMap<FactId, FactStat>): readonly TableProgress[] {
  return ALL_TABLES.map((table) => {
    const rows = ALL_FACT_IDS.filter((id) => parseFactId(id).a === table).map(
      (id) => stats.get(id) ?? emptyStat(id),
    );
    const timed = rows.map((stat) => windowedMeanMs(stat)).filter((ms) => ms > 0);
    const attempts = rows.reduce((sum, stat) => sum + stat.recent.length, 0);
    const correct = rows.reduce((sum, stat) => sum + stat.recent.filter((r) => r.correct).length, 0);
    return {
      table,
      known: rows.filter((stat) => stat.mastered).length,
      total: PER_TABLE,
      asked: attempts,
      accuracy: attempts === 0 ? 0 : correct / attempts,
      meanMs: Math.round(mean(timed)),
    };
  });
}

/**
 * The short list of what to work on next, most urgent first: facts with a miss among their
 * last `RECENT_WINDOW` answers — exactly the rows that draw a white square.
 *
 * Lowest recent accuracy comes first; equal accuracies are ordered slowest first, then by
 * attempts so the most-contested fact wins the final tie. A fact not yet ticked always
 * qualifies: its last miss is at most two answers back, since a right answer straight after
 * a miss is a retry and earns no tick.
 *
 * Empty until something has been missed, and again once no fact has a miss in its window.
 */
export function practiceNext(
  stats: ReadonlyMap<FactId, FactStat>,
  limit = 6,
): readonly PracticeEntry[] {
  return ALL_FACT_IDS.map((id) => stats.get(id) ?? emptyStat(id))
    .filter((stat) => stat.recent.some((r) => !r.correct))
    .map((stat) => ({ stat, accuracy: windowedAccuracy(stat), meanMs: windowedMeanMs(stat) }))
    .sort(
      (x, y) =>
        x.accuracy - y.accuracy ||
        y.meanMs - x.meanMs ||
        y.stat.attempts - x.stat.attempts ||
        x.stat.id.localeCompare(y.stat.id),
    )
    .slice(0, limit)
    .map(({ stat, accuracy, meanMs }) => ({
      id: stat.id,
      recent: stat.recent.map((r) => r.correct),
      accuracy,
      meanMs,
    }));
}
