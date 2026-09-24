import type { FactId } from './facts.js';
import { accuracy, emptyStat, type FactStat, type MasteryConfig, DEFAULT_MASTERY } from './mastery.js';

export interface SchedulerOptions {
  /** Facts eligible for selection (from the chosen tables). */
  readonly pool: readonly FactId[];
  /** Recently asked facts, most recent first. Used to avoid immediate repeats. */
  readonly recent: readonly FactId[];
  /** When false, pick uniformly at random — plain drill, no adaptation. */
  readonly adaptive: boolean;
  readonly now: number;
}

/** Injectable so scheduling is deterministic under test. */
export type Rng = () => number;

const UNSEEN_WEIGHT = 4;
const MASTERED_FLOOR = 0.25;
/** A fact missed within its last `RECENT_WINDOW` answers is twice as likely to be asked. */
export const RECENT_MISS_BOOST = 2;

/**
 * How badly this fact needs practice. Higher = more likely to be asked.
 * Errors dominate, then slowness, then staleness.
 */
export function factWeight(
  stat: FactStat,
  now: number,
  config: MasteryConfig = DEFAULT_MASTERY,
): number {
  if (stat.attempts === 0) return UNSEEN_WEIGHT;

  // Recall at automaticMs needs no more repetitions; the same threshold that paints a cell
  // black is the one that stops asking for it, so the map and the scheduler cannot disagree.
  const errorFactor = 1 + 3 * (1 - accuracy(stat));
  const slowFactor = stat.emaMs === 0 ? 1 : clamp(stat.emaMs / config.automaticMs, 0.5, 3);

  // Staleness: a fact untouched for a day is worth revisiting.
  const hoursSince = (now - stat.lastSeenAt) / 3_600_000;
  const staleFactor = clamp(1 + hoursSince / 24, 1, 2.5);

  const weight = errorFactor * slowFactor * staleFactor;
  // A ticked fact keeps a small weight so it still interleaves, but stops crowding out the
  // ones that have never been answered right first time.
  const base = stat.mastered ? Math.max(MASTERED_FLOOR, weight * MASTERED_FLOOR) : weight;
  // A miss in the recent window doubles the odds outright, applied last so a ticked fact
  // that has started going wrong again is lifted just as much as one still being learned.
  return stat.recent.some((r) => !r.correct) ? base * RECENT_MISS_BOOST : base;
}

/**
 * Pick the next fact. Pure: same stats + same rng sequence => same fact.
 * Never returns the previous fact, and avoids the last 3 when the pool is big enough.
 */
export function nextFact(
  stats: ReadonlyMap<FactId, FactStat>,
  opts: SchedulerOptions,
  rng: Rng = Math.random,
): FactId {
  const { pool, recent } = opts;
  if (pool.length === 0) throw new Error('nextFact: empty pool');
  if (pool.length === 1) return pool[0]!;

  const avoidCount = pool.length >= 6 ? 3 : 1;
  const avoid = new Set(recent.slice(0, avoidCount));
  let candidates = pool.filter((id) => !avoid.has(id));
  if (candidates.length === 0) candidates = pool.filter((id) => id !== recent[0]);
  if (candidates.length === 0) candidates = [...pool];

  if (!opts.adaptive) {
    return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))]!;
  }

  const weights = candidates.map((id) => factWeight(stats.get(id) ?? emptyStat(id), opts.now));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let ticket = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    ticket -= weights[i]!;
    if (ticket <= 0) return candidates[i]!;
  }
  return candidates[candidates.length - 1]!;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
