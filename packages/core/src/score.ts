import { parseFactId, type FactId } from './facts.js';

/** One graded answer, whatever produced it. */
export interface Timed {
  readonly factId: FactId;
  readonly correct: boolean;
  /** Time from the fact appearing to the answer being released, in ms. */
  readonly ms: number;
  readonly timedOut: boolean;
}

export interface TableScore {
  readonly table: number;
  readonly asked: number;
  readonly correct: number;
  /** Mean over this table's correct answers only. 0 when there were none. */
  readonly meanMs: number;
}

export interface Score {
  readonly tables: readonly number[];
  readonly asked: number;
  readonly correct: number;
  /** 0..1 */
  readonly rate: number;
  /** Mean over CORRECT answers only, in ms. */
  readonly meanMs: number;
  readonly medianMs: number;
  readonly misses: readonly FactId[];
  readonly byTable: readonly TableScore[];
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * The two numbers, plus where they came from. One implementation, so every screen that
 * reports a rate and a mean time counts them the same way.
 *
 * Timeouts count fully against the rate but are left out of the timings: a 6 s penalty in
 * the average would just re-encode the rate a second time, and drown the real signal.
 *
 * What the caller decides is which answers to hand over. A round submits only first tries,
 * since a retry follows the answer being shown.
 */
export function summarize(answers: readonly Timed[], tables?: readonly number[]): Score {
  const correctMs = answers.filter((a) => a.correct).map((a) => a.ms);
  const correct = correctMs.length;

  const scope =
    tables ?? [...new Set(answers.map((a) => parseFactId(a.factId).a))].sort((x, y) => x - y);

  const byTable = scope
    .map((table) => {
      const rows = answers.filter((a) => parseFactId(a.factId).a === table);
      const ok = rows.filter((a) => a.correct);
      return {
        table,
        asked: rows.length,
        correct: ok.length,
        meanMs: Math.round(mean(ok.map((a) => a.ms))),
      };
    })
    .filter((row) => row.asked > 0);

  return {
    tables: scope,
    asked: answers.length,
    correct,
    rate: answers.length === 0 ? 0 : correct / answers.length,
    meanMs: Math.round(mean(correctMs)),
    medianMs: Math.round(median(correctMs)),
    misses: [...new Set(answers.filter((a) => !a.correct).map((a) => a.factId))],
    byTable,
  };
}
