import {
  ALL_TABLES,
  answerDigits,
  parseFactId,
  poolForTables,
  sanitizeTables,
  type FactId,
} from './facts.js';
import { emptyStat, recordAttempt, type Attempt, type FactStat } from './mastery.js';
import { nextFact, type Rng } from './scheduler.js';
import { summarize, type Score, type Timed } from './score.js';

export interface Settings {
  /** Which tables are being practised. An empty or stale selection falls back to all. */
  readonly tables: readonly number[];
  readonly adaptive: boolean;
  readonly haptics: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  tables: [...ALL_TABLES],
  adaptive: true,
  haptics: true,
};

export const ROUND_LENGTH = 10;

/**
 * You know it or you do not. The limit has to be short enough to rule out counting on
 * fingers, but long enough to read the fact and draw two digits — three seconds turned
 * out to be brutal in practice, most of it spent on the gesture rather than the recall.
 */
export const ANSWER_LIMIT_MS = 6000;

/**
 * One graded attempt in a round. `firstTry` is the whole point of keeping these: practice
 * re-asks a missed fact until it is answered, and a retry comes seconds after the answer
 * was shown on screen. Counting those would report reading speed, not recall.
 */
export interface RoundAnswer extends Timed {
  readonly firstTry: boolean;
}

export interface Session {
  readonly id: string;
  /** 0-based index of the question being asked. */
  readonly index: number;
  readonly total: number;
  readonly current: FactId;
  /** Epoch ms when the current fact appeared — the clock for response time. */
  readonly askedAt: number;
  readonly recent: readonly FactId[];
  readonly correctCount: number;
  /** Facts missed at least once this round, in the order they first went wrong. */
  readonly missed: readonly FactId[];
  /** Every attempt, in order, retries included. */
  readonly answers: readonly RoundAnswer[];
  readonly done: boolean;
}

export type Stats = ReadonlyMap<FactId, FactStat>;

function pool(settings: Settings): FactId[] {
  return poolForTables(sanitizeTables(settings.tables));
}

export function startSession(
  stats: Stats,
  settings: Settings,
  now: number,
  rng: Rng = Math.random,
): Session {
  const id = `s${now.toString(36)}${Math.floor(rng() * 1e6).toString(36)}`;
  const first = nextFact(stats, { pool: pool(settings), recent: [], adaptive: settings.adaptive, now }, rng);
  return {
    id,
    index: 0,
    total: ROUND_LENGTH,
    current: first,
    askedAt: now,
    recent: [first],
    correctCount: 0,
    missed: [],
    answers: [],
    done: false,
  };
}

/**
 * Start this question's clock. The engine picks the next fact the moment an answer is
 * graded, but the child does not see it until the feedback is over — so the UI says when
 * the question actually went up. Without this the clock is short by the feedback, and
 * every response time is inflated by it.
 */
export function armQuestion(session: Session, now: number): Session {
  return session.done ? session : { ...session, askedAt: now };
}

export interface SubmitResult {
  readonly correct: boolean;
  readonly timedOut: boolean;
  /** The right answer, so the caller can show it when the child missed it. */
  readonly expected: readonly number[];
  readonly stats: Stats;
  /** Advanced only on a correct answer; otherwise the same fact is asked again. */
  readonly session: Session;
}

/**
 * Grade one answer. The round only moves on once the fact is answered correctly.
 *
 * A miss is not a failure to be recorded and forgotten: the answer is shown and the same
 * fact comes straight back, as many times as it takes. The attempt still counts against
 * the fact's accuracy and resets its streak, so drilling it out is not free.
 *
 * An empty digit list means the clock ran out. Pure: no timers, no storage, no UI.
 */
export function submitAnswer(
  session: Session,
  stats: Stats,
  settings: Settings,
  digits: readonly number[],
  now: number,
  rng: Rng = Math.random,
): SubmitResult {
  const fact = parseFactId(session.current);
  const expected = answerDigits(fact);
  const timedOut = digits.length === 0;
  const correct =
    !timedOut && digits.length === expected.length && digits.every((d, i) => d === expected[i]);

  const attempt: Attempt = {
    factId: session.current,
    correct,
    ms: Math.min(ANSWER_LIMIT_MS, Math.max(0, now - session.askedAt)),
    at: now,
    sessionId: session.id,
    timedOut,
  };
  const prev = stats.get(session.current) ?? emptyStat(session.current);
  const nextStats = new Map(stats);
  nextStats.set(session.current, recordAttempt(prev, attempt));

  const missed = correct || session.missed.includes(session.current)
    ? session.missed
    : [...session.missed, session.current];

  // Retries of a missed fact come back immediately, so the previous answer being for this
  // same fact is exactly what marks this one as a retry.
  const last = session.answers[session.answers.length - 1];
  const answers: readonly RoundAnswer[] = [
    ...session.answers,
    {
      factId: session.current,
      correct,
      ms: attempt.ms,
      timedOut,
      firstTry: last === undefined || last.factId !== session.current,
    },
  ];

  if (!correct) {
    // Same question, fresh clock. The child has just been shown the answer.
    return {
      correct,
      timedOut,
      expected,
      stats: nextStats,
      session: { ...session, askedAt: now, missed, answers },
    };
  }

  const correctCount = session.correctCount + 1;
  const index = session.index + 1;

  if (index >= session.total) {
    return {
      correct,
      timedOut,
      expected,
      stats: nextStats,
      session: { ...session, index, correctCount, missed, answers, done: true },
    };
  }

  const following = nextFact(
    nextStats,
    { pool: pool(settings), recent: session.recent, adaptive: settings.adaptive, now },
    rng,
  );
  return {
    correct,
    timedOut,
    expected,
    stats: nextStats,
    session: {
      ...session,
      index,
      current: following,
      askedAt: now,
      recent: [following, ...session.recent].slice(0, 8),
      correctCount,
      missed,
      answers,
    },
  };
}

export type RoundResult = Score;

/**
 * The round's result — rate, mean time, per-table breakdown — over first tries only.
 *
 * It is still not a measurement, and must not be read as one: the scheduler picks what is
 * missed or slow more often, so the sample is biased by design and a table may carry one
 * or two facts. It says how the round went, which is not the same as how the child is.
 */
export function summarizeRound(session: Session): RoundResult {
  return summarize(session.answers.filter((a) => a.firstTry));
}
