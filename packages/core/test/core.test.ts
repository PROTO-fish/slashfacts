import { describe, expect, it } from 'vitest';
import {
  ALL_FACTS,
  ALL_TABLES,
  ANSWER_LIMIT_MS,
  armQuestion,
  MAX_TABLE,
  MIN_TABLE,
  sanitizeTables,
  answerDigits,
  DEFAULT_SETTINGS,
  emptyStat,
  factId,
  factWeight,
  practiceNext,
  masteryLevel,
  parseFactId,
  nextFact,
  poolForTables,
  recordAttempt,
  RECENT_MISS_BOOST,
  tableProgress,
  startSession,
  summarize,
  summarizeRound,
  submitAnswer,
  type FactStat,
} from '../src/index.js';

/** Deterministic rng for tests: cycles a fixed list. */
function seeded(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

const T0 = 1_700_000_000_000;

describe('facts', () => {
  it('covers tables 2 to 9 only — the 1 and 10 tables are not practised', () => {
    expect([MIN_TABLE, MAX_TABLE]).toEqual([2, 9]);
    expect(ALL_TABLES).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(ALL_FACTS).toHaveLength(64);
    expect(ALL_FACTS.some((f) => f.a === 1 || f.b === 1)).toBe(false);
    expect(ALL_FACTS.some((f) => f.a === 10 || f.b === 10)).toBe(false);
  });

  it('still produces answers containing a zero, so the pad needs its 0 key', () => {
    const withZero = ALL_FACTS.filter((f) => String(f.a * f.b).includes('0'));
    expect(withZero.length).toBeGreaterThan(0);
    expect(answerDigits({ a: 2, b: 5 })).toEqual([1, 0]);
    expect(answerDigits({ a: 8, b: 5 })).toEqual([4, 0]);
  });

  it('splits answers into ordered digits', () => {
    expect(answerDigits({ a: 7, b: 8 })).toEqual([5, 6]);
    expect(answerDigits({ a: 3, b: 3 })).toEqual([9]);
    expect(answerDigits({ a: 6, b: 5 })).toEqual([3, 0]);
  });

  it('no answer repeats a digit, so no answer needs the dwell hold', () => {
    const repeats = ALL_FACTS.map(answerDigits)
      .filter((d) => d.some((digit, i) => i > 0 && digit === d[i - 1]))
      .map((d) => d.join(''));
    expect(repeats).toEqual([]);
  });

  it('builds a pool from selected tables', () => {
    expect(poolForTables([7])).toHaveLength(8);
    expect(poolForTables([7])).toContain('7x8');
    expect(poolForTables([3, 4])).toHaveLength(16);
  });

  it('drops tables that no longer exist rather than emptying the pool', () => {
    expect(sanitizeTables([1, 7, 10])).toEqual([7]);
    expect(sanitizeTables([1, 10])).toEqual([...ALL_TABLES]);
    expect(sanitizeTables([])).toEqual([...ALL_TABLES]);
    expect(poolForTables([1, 10])).toHaveLength(64);
  });
});

describe('mastery', () => {
  const attempt = (correct: boolean, ms: number, session = 'a', at = T0) => ({
    factId: '7x8',
    correct,
    ms,
    at,
    sessionId: session,
  });

  it('ticks a fact answered right first time', () => {
    let s: FactStat = emptyStat('7x8');
    expect(masteryLevel(s)).toBe(0);
    s = recordAttempt(s, attempt(true, 2400));
    expect(s.mastered).toBe(true);
    expect(masteryLevel(s)).toBe(1);
  });

  it('gives no tick for a fact dragged out of a retry loop', () => {
    let s: FactStat = emptyStat('7x8');
    s = recordAttempt(s, attempt(false, 6000));
    // The answer was shown, then typed back. That is reading, not recall.
    s = recordAttempt(s, attempt(true, 700));
    expect(s.mastered).toBe(false);
    expect(masteryLevel(s)).toBe(0);
    // Asked again later and known straight away: now it counts.
    s = recordAttempt(s, attempt(true, 900));
    expect(s.mastered).toBe(true);
  });

  it('keeps the tick once earned, however badly it goes afterwards', () => {
    let s: FactStat = emptyStat('7x8');
    s = recordAttempt(s, attempt(true, 900));
    s = recordAttempt(s, attempt(false, 6000));
    expect(s.streak).toBe(0);
    expect(s.mastered).toBe(true);
    expect(masteryLevel(s)).toBe(1);
  });

  it('a miss keeps the timing average, which only correct answers feed', () => {
    let s: FactStat = emptyStat('7x8');
    s = recordAttempt(s, attempt(true, 1000));
    const ema = s.emaMs;
    s = recordAttempt(s, attempt(false, 3000));
    expect(s.emaMs).toBe(ema);
    expect(s.attempts).toBe(2);
  });

  it('records a timeout as a miss and remembers it was one', () => {
    const s = recordAttempt(emptyStat('7x8'), { ...attempt(false, 3000), timedOut: true });
    expect(s.timedOut).toBe(true);
    expect(s.streak).toBe(0);
    expect(masteryLevel(s)).toBe(0);
  });
});

describe('scheduler', () => {
  it('keeps a ticked fact in the pool but well behind an untouched one', () => {
    let ticked: FactStat = emptyStat('2x2');
    ticked = recordAttempt(ticked, { factId: '2x2', correct: true, ms: 800, at: T0, sessionId: 'a' });
    expect(ticked.mastered).toBe(true);
    expect(factWeight(ticked, T0)).toBeGreaterThan(0);
    expect(factWeight(emptyStat('9x7'), T0)).toBeGreaterThan(factWeight(ticked, T0) * 3);
  });

  it('weights unseen facts above mastered ones', () => {
    let mastered: FactStat = emptyStat('2x2');
    for (let i = 0; i < 2; i++) {
      mastered = recordAttempt(mastered, {
        factId: '2x2',
        correct: true,
        ms: 800,
        at: T0,
        sessionId: 'a',
      });
    }
    expect(factWeight(emptyStat('9x7'), T0)).toBeGreaterThan(factWeight(mastered, T0));
  });

  it('weights an error-prone fact above a reliable one', () => {
    let weak: FactStat = emptyStat('7x8');
    let strong: FactStat = emptyStat('2x3');
    for (let i = 0; i < 4; i++) {
      weak = recordAttempt(weak, { factId: '7x8', correct: i === 0, ms: 3000, at: T0, sessionId: 'a' });
      strong = recordAttempt(strong, { factId: '2x3', correct: true, ms: 1500, at: T0, sessionId: 'a' });
    }
    expect(factWeight(weak, T0)).toBeGreaterThan(factWeight(strong, T0));
  });

  it('doubles the weight of a fact with a miss in its recent window, until it ages out', () => {
    const stat: FactStat = { ...emptyStat('6x7'), attempts: 5, correct: 4, mastered: true, lastSeenAt: T0 };
    const clean = { ...stat, recent: [true, true, true].map((correct) => ({ correct, ms: 1500 })) };
    const missed = { ...stat, recent: [false, true, true].map((correct) => ({ correct, ms: 1500 })) };
    expect(factWeight(missed, T0)).toBeCloseTo(factWeight(clean, T0) * RECENT_MISS_BOOST);
  });

  it('never repeats the immediately previous fact', () => {
    const pool = poolForTables([7]);
    for (let i = 0; i < 50; i++) {
      const picked = nextFact(new Map(), { pool, recent: ['7x8'], adaptive: true, now: T0 }, seeded([i / 50]));
      expect(picked).not.toBe('7x8');
    }
  });

  it('is deterministic for a given rng', () => {
    const pool = poolForTables([3, 4]);
    const opts = { pool, recent: [], adaptive: true, now: T0 } as const;
    const a = nextFact(new Map(), opts, seeded([0.42]));
    const b = nextFact(new Map(), opts, seeded([0.42]));
    expect(a).toBe(b);
  });

  it('handles a single-fact pool', () => {
    expect(nextFact(new Map(), { pool: ['1x1'], recent: ['1x1'], adaptive: true, now: T0 })).toBe('1x1');
  });
});

describe('session', () => {
  const settings = { ...DEFAULT_SETTINGS, tables: [7] };

  it('asks the same fact again after a miss, with a fresh clock', () => {
    const rng = seeded([0.1, 0.3, 0.7, 0.2]);
    const session = startSession(new Map(), settings, T0, rng);

    const miss = submitAnswer(session, new Map(), settings, [1], T0 + 1000, rng);
    expect(miss.correct).toBe(false);
    expect(miss.session.index).toBe(0);
    expect(miss.session.current).toBe(session.current);
    expect(miss.session.askedAt).toBe(T0 + 1000);
    expect(miss.session.missed).toContain(session.current);
    expect(miss.session.correctCount).toBe(0);
    // The attempt still counts against the fact: drilling it out is not free.
    expect(miss.stats.get(session.current)!.attempts).toBe(1);
    expect(miss.stats.get(session.current)!.mastered).toBe(false);
  });

  it('advances only once the fact is answered correctly', () => {
    const rng = seeded([0.1, 0.3, 0.7, 0.2]);
    const session = startSession(new Map(), settings, T0, rng);
    const fact = parseFactId(session.current);

    let result = submitAnswer(session, new Map(), settings, [1], T0 + 1000, rng);
    result = submitAnswer(result.session, result.stats, settings, [1], T0 + 2000, rng);
    expect(result.session.index).toBe(0);

    result = submitAnswer(
      result.session,
      result.stats,
      settings,
      answerDigits(fact),
      T0 + 3000,
      rng,
    );
    expect(result.correct).toBe(true);
    expect(result.session.index).toBe(1);
    expect(result.session.current).not.toBe(session.current);
    // Missed once, listed once, however many tries it took.
    expect(result.session.missed).toEqual([session.current]);
  });

  it('treats an empty answer as the clock running out', () => {
    const session = { ...startSession(new Map(), settings, T0), current: factId(7, 8) };
    const result = submitAnswer(session, new Map(), settings, [], T0 + 3000, seeded([0.5]));
    expect(result.timedOut).toBe(true);
    expect(result.correct).toBe(false);
    expect(result.expected).toEqual([5, 6]);
    expect(result.stats.get('7x8')!.timedOut).toBe(true);
    // A clock that ran out is a miss like any other: the same fact comes straight back.
    expect(result.session.index).toBe(0);
    expect(result.session.current).toBe(factId(7, 8));
  });

  it('times the answer from when the question went up, not when it was chosen', () => {
    const rng = seeded([0.3, 0.6]);
    const first = startSession(new Map(), settings, T0, rng);
    const answered = submitAnswer(first, new Map(), settings, [], T0 + 1000, rng);
    // The next fact was chosen at T0+1000, but feedback keeps it hidden for a while.
    const shown = armQuestion(answered.session, T0 + 2500);
    expect(shown.askedAt).toBe(T0 + 2500);
    const second = submitAnswer(
      shown,
      answered.stats,
      settings,
      answerDigits({ a: 7, b: Number(shown.current.split('x')[1]) }),
      T0 + 3700,
      rng,
    );
    expect(second.stats.get(shown.current)!.emaMs).toBe(1200);
  });

  it('caps a recorded answer time at the limit', () => {
    const session = { ...startSession(new Map(), settings, T0), current: factId(7, 8) };
    const result = submitAnswer(session, new Map(), settings, [5, 6], T0 + 99_000, seeded([0.5]));
    expect(result.stats.get('7x8')!.emaMs).toBe(ANSWER_LIMIT_MS);
  });

  it('rejects the right digits in the wrong order', () => {
    const session = { ...startSession(new Map(), settings, T0), current: factId(7, 8) };
    const result = submitAnswer(session, new Map(), settings, [6, 5], T0 + 900, seeded([0.5]));
    expect(result.correct).toBe(false);
    expect(result.expected).toEqual([5, 6]);
  });

  it('finishes after ten facts answered right, however many tries that took', () => {
    const rng = seeded([0.11, 0.37, 0.62, 0.85, 0.23]);
    let session = startSession(new Map(), settings, T0, rng);
    let stats = new Map();
    let tries = 0;
    // Miss the third fact twice before getting it: the round still ends on ten facts.
    let missesLeft = 2;
    while (!session.done && tries < 50) {
      const fact = { a: 7, b: Number(session.current.split('x')[1]) };
      const flub = session.index === 2 && missesLeft-- > 0;
      const digits = flub ? [] : answerDigits(fact);
      const result = submitAnswer(session, stats, settings, digits, T0 + ++tries * 1000, rng);
      session = result.session;
      stats = new Map(result.stats);
    }
    expect(session.done).toBe(true);
    expect(session.index).toBe(10);
    expect(tries).toBe(12);
    expect(session.correctCount).toBe(10);
    // The score the round reports is what went right first time.
    expect(session.missed).toHaveLength(1);
  });

  it('records response time from when the fact appeared', () => {
    const session = { ...startSession(new Map(), settings, T0), current: factId(7, 8) };
    const result = submitAnswer(session, new Map(), settings, [5, 6], T0 + 1234, seeded([0.5]));
    expect(result.stats.get('7x8')!.emaMs).toBe(1234);
  });
});

describe('score', () => {
  const row = (id: string, correct: boolean, ms: number, timedOut = false) =>
    ({ factId: id as never, correct, ms, timedOut });

  it('leaves timeouts out of the mean but counts them against the rate', () => {
    const score = summarize([
      row('7x2', true, 1000),
      row('7x3', true, 2000),
      row('7x4', false, 6000, true),
      row('7x5', false, 6000, true),
    ]);
    expect(score.rate).toBe(0.5);
    // Not 3750: the two 6 s penalties would only re-encode the rate a second time.
    expect(score.meanMs).toBe(1500);
  });

  it('derives the tables from the answers when none are given', () => {
    const score = summarize([row('3x4', true, 900), row('7x2', true, 1100)]);
    expect(score.tables).toEqual([3, 7]);
    expect(score.byTable.map((t) => t.table)).toEqual([3, 7]);
  });

  it('breaks the mean down per table', () => {
    const score = summarize([
      row('3x4', true, 1000),
      row('3x5', true, 3000),
      row('7x2', true, 500),
      row('7x3', false, 6000, true),
    ]);
    expect(score.byTable).toEqual([
      { table: 3, asked: 2, correct: 2, meanMs: 2000 },
      { table: 7, asked: 2, correct: 1, meanMs: 500 },
    ]);
  });

  it('reports a table with nothing right rather than dropping it', () => {
    const score = summarize([row('9x7', false, 6000, true)]);
    expect(score.byTable).toEqual([{ table: 9, asked: 1, correct: 0, meanMs: 0 }]);
  });
});

describe('tableProgress', () => {
  it('reports all eight tables even with nothing recorded', () => {
    const rows = tableProgress(new Map());
    expect(rows.map((r) => r.table)).toEqual(ALL_TABLES);
    expect(
      rows.every(
        (r) => r.known === 0 && r.asked === 0 && r.accuracy === 0 && r.meanMs === 0 && r.total === 8,
      ),
    ).toBe(true);
  });

  it('counts only mastered facts as known, and averages windowed timed facts per table', () => {
    const stats = new Map<string, FactStat>([
      ['3x4', { ...emptyStat('3x4' as never), mastered: true, recent: [{ correct: true, ms: 1000 }] }],
      ['3x5', { ...emptyStat('3x5' as never), mastered: true, recent: [{ correct: true, ms: 3000 }] }],
      // Attempted but not mastered: contributes no known tick, but its time still counts.
      ['3x6', { ...emptyStat('3x6' as never), mastered: false, recent: [{ correct: true, ms: 2000 }] }],
      // Never timed: excluded from the mean rather than dragging it toward 0.
      ['3x7', { ...emptyStat('3x7' as never), mastered: false }],
    ]);
    const row = tableProgress(stats).find((r) => r.table === 3)!;
    expect(row.known).toBe(2);
    expect(row.meanMs).toBe(2000);
  });

  it('pools windowed attempts across the table for accuracy, unlike the per-fact meanMs', () => {
    const stats = new Map<string, FactStat>([
      // Right first time: 1/1 within the window.
      ['3x4', { ...emptyStat('3x4' as never), mastered: true, recent: [{ correct: true, ms: 1000 }] }],
      // Mastered too, but it took four retries first: 1/5 on this fact within the window.
      [
        '3x5',
        {
          ...emptyStat('3x5' as never),
          mastered: true,
          recent: [
            { correct: false, ms: 1000 },
            { correct: false, ms: 1000 },
            { correct: false, ms: 1000 },
            { correct: false, ms: 1000 },
            { correct: true, ms: 1000 },
          ],
        },
      ],
    ]);
    const row = tableProgress(stats).find((r) => r.table === 3)!;
    // Pooled: 2 correct over 6 attempts. A mean of per-fact accuracies (100% and 20%) would
    // give 60% instead, hiding how much the second fact actually cost.
    expect(row.accuracy).toBeCloseTo(2 / 6);
  });
});

describe('practiceNext', () => {
  /** One answered fact per table, none with a miss — background that should never be listed. */
  function allTablesStarted(): Map<string, FactStat> {
    return new Map(
      ALL_TABLES.map((table) => {
        const id = factId(table, MIN_TABLE);
        return [id, { ...emptyStat(id), attempts: 1, mastered: true }];
      }),
    );
  }

  it('lists no tables — a table nobody has started has no answers to draw', () => {
    expect(practiceNext(new Map())).toEqual([]);
  });

  it('leaves out facts never attempted and facts with no miss in their recent answers', () => {
    const stats = allTablesStarted();
    stats.set('3x4', {
      ...emptyStat('3x4' as never),
      attempts: 1,
      mastered: true,
      recent: [{ correct: true, ms: 4000 }],
    });
    // '3x5' stays untouched (0 attempts): no answers, so nothing to draw.
    const facts = practiceNext(stats, 20).map((e) => e.id);
    expect(facts).not.toContain('3x4');
    expect(facts).not.toContain('3x5');
  });

  it('lists facts with a recent miss, least accurate then slowest', () => {
    const stats = allTablesStarted();
    stats.set('3x4', {
      ...emptyStat('3x4' as never),
      attempts: 2,
      mastered: true,
      recent: [
        { correct: false, ms: 3000 },
        { correct: true, ms: 1800 },
      ],
    });
    stats.set('3x5', {
      ...emptyStat('3x5' as never),
      attempts: 2,
      mastered: true,
      recent: [
        { correct: false, ms: 3000 },
        { correct: true, ms: 3200 },
      ],
    });
    stats.set('3x6', {
      ...emptyStat('3x6' as never),
      attempts: 3,
      mastered: true,
      recent: [
        { correct: false, ms: 3000 },
        { correct: true, ms: 1400 },
        { correct: true, ms: 1600 },
      ],
    });

    const facts = practiceNext(stats, 20);
    expect(facts.map((entry) => entry.id)).toEqual(['3x5', '3x4', '3x6']);
    expect(facts[0]).toEqual({
      id: '3x5',
      recent: [false, true],
      accuracy: 0.5,
      meanMs: 3200,
    });
  });

  it('among equally missed facts, ranks the most attempted first', () => {
    const stats = allTablesStarted();
    const missed = [{ correct: false, ms: 6000 }];
    stats.set('3x4', { ...emptyStat('3x4' as never), attempts: 2, recent: missed });
    stats.set('3x5', { ...emptyStat('3x5' as never), attempts: 5, recent: missed });
    const facts = practiceNext(stats, 20).map((e) => e.id);
    expect(facts.slice(0, 2)).toEqual(['3x5', '3x4']);
  });

  it('is empty once no fact has a recent miss', () => {
    expect(practiceNext(allTablesStarted())).toEqual([]);
  });

  it('respects the limit', () => {
    const missed = [{ correct: false, ms: 6000 }];
    const stats = new Map(ALL_FACTS.slice(0, 5).map((f) => {
      const id = factId(f.a, f.b);
      return [id, { ...emptyStat(id), attempts: 1, recent: missed }] as const;
    }));
    expect(practiceNext(stats, 3)).toHaveLength(3);
  });
});

describe('summarizeRound', () => {
  const settings = { ...DEFAULT_SETTINGS, tables: [7] };

  it('counts first tries only, so a fact drilled out does not inflate the round', () => {
    const rng = seeded([0.1, 0.3, 0.7, 0.2, 0.4, 0.6]);
    const session = startSession(new Map(), settings, T0, rng);
    const right = answerDigits(parseFactId(session.current));

    // Miss it, then get it after the answer has been shown.
    let result = submitAnswer(session, new Map(), settings, [1], T0 + 1000, rng);
    result = submitAnswer(result.session, result.stats, settings, right, T0 + 1400, rng);

    const score = summarizeRound(result.session);
    expect(score.asked).toBe(1);
    expect(score.correct).toBe(0);
    expect(score.rate).toBe(0);
    // The 400 ms retry was reading, not recall, so it is nowhere in the timings.
    expect(score.meanMs).toBe(0);
    expect(score.misses).toEqual([session.current]);
  });

  it('keeps a fact answered right the first time', () => {
    const rng = seeded([0.1, 0.3, 0.7, 0.2]);
    const session = startSession(new Map(), settings, T0, rng);
    const right = answerDigits(parseFactId(session.current));

    const result = submitAnswer(session, new Map(), settings, right, T0 + 1200, rng);
    const score = summarizeRound(result.session);
    expect(score).toMatchObject({ asked: 1, correct: 1, rate: 1, meanMs: 1200, misses: [] });
  });
});
