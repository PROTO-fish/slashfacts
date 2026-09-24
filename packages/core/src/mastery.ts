import type { FactId } from './facts.js';
import { mean } from './score.js';

/**
 * Everything we know about one fact. Speed is not part of mastery because the clock
 * already enforces it: an answer that arrives at all arrived inside the time limit.
 */
export interface FactStat {
  readonly id: FactId;
  readonly attempts: number;
  readonly correct: number;
  /** Consecutive correct answers. Any miss resets it to 0. */
  readonly streak: number;
  /** Exponential moving average of CORRECT response times, in ms. 0 = never answered. */
  readonly emaMs: number;
  /** Epoch ms of the last attempt, or 0. */
  readonly lastSeenAt: number;
  /** The last attempt ran out of time rather than being answered. */
  readonly timedOut: boolean;
  /** Answered right first time, at least once. Never goes back to false. */
  readonly mastered: boolean;
  /** Last `RECENT_WINDOW` attempts, oldest first. Backs the windowed stats shown on the Facts screen. */
  readonly recent: readonly { readonly correct: boolean; readonly ms: number }[];
}

export interface MasteryConfig {
  /** Weight of the newest sample in the moving average of response times. */
  readonly emaAlpha: number;
  /** Recall at or under this average needs no more repetitions. Scheduling only. */
  readonly automaticMs: number;
}

export const DEFAULT_MASTERY: MasteryConfig = {
  emaAlpha: 0.4,
  automaticMs: 1500,
};

/** How many of the most recent attempts back the windowed stats on the Facts screen. */
export const RECENT_WINDOW = 5;

export function emptyStat(id: FactId): FactStat {
  return {
    id,
    attempts: 0,
    correct: 0,
    streak: 0,
    emaMs: 0,
    lastSeenAt: 0,
    timedOut: false,
    mastered: false,
    recent: [],
  };
}

export interface Attempt {
  readonly factId: FactId;
  readonly correct: boolean;
  /** Time from the fact appearing to the answer being released, in ms. */
  readonly ms: number;
  readonly at: number;
  readonly sessionId: string;
  /** No answer arrived before the clock ran out. Counts exactly like a wrong answer. */
  readonly timedOut?: boolean;
}

/** Pure reducer: fold one attempt into one fact's stats. */
export function recordAttempt(
  stat: FactStat,
  attempt: Attempt,
  config: MasteryConfig = DEFAULT_MASTERY,
): FactStat {
  const base = {
    ...stat,
    attempts: stat.attempts + 1,
    lastSeenAt: attempt.at,
    timedOut: attempt.timedOut === true,
    recent: [...stat.recent, { correct: attempt.correct, ms: attempt.ms }].slice(-RECENT_WINDOW),
  };
  // Knowing it or not is the whole judgement: a miss resets the run, nothing more.
  if (!attempt.correct) return { ...base, streak: 0 };
  // Right first time: nothing was missed immediately before this. A fact dragged out of a
  // retry loop is answered, not known, so it earns nothing.
  const firstTry = !(stat.attempts > 0 && stat.streak === 0);
  return {
    ...base,
    correct: stat.correct + 1,
    streak: stat.streak + 1,
    mastered: stat.mastered || firstTry,
    emaMs: stat.emaMs === 0 ? attempt.ms : stat.emaMs + config.emaAlpha * (attempt.ms - stat.emaMs),
  };
}

/**
 * Not known · known. One tick, earned by answering right first time, once.
 *
 * Deliberately binary: the map answers "what have I got?" and nothing else. It saturates
 * as the tables are learned, which is the accepted price of a mark a child can read at a
 * glance and a rule they can state in one sentence.
 */
export type MasteryLevel = 0 | 1;

export function masteryLevel(stat: FactStat): MasteryLevel {
  return stat.mastered ? 1 : 0;
}

export function accuracy(stat: FactStat): number {
  return stat.attempts === 0 ? 0 : stat.correct / stat.attempts;
}

/** Accuracy over just the last `RECENT_WINDOW` attempts. 0 when `recent` is empty. */
export function windowedAccuracy(stat: FactStat): number {
  return stat.recent.length === 0 ? 0 : stat.recent.filter((r) => r.correct).length / stat.recent.length;
}

/** Mean response time of the CORRECT attempts within `recent`, in ms. 0 when there are none. */
export function windowedMeanMs(stat: FactStat): number {
  const correct = stat.recent.filter((r) => r.correct).map((r) => r.ms);
  return correct.length === 0 ? 0 : Math.round(mean(correct));
}
