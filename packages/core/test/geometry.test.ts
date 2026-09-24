import { describe, expect, it } from 'vitest';
import {
  ALL_FACTS,
  answerDigits,
  createStroke,
  extendStroke,
  hitTest,
  pathThroughCells,
  strokeKind,
  strokeDigits,
  strokePath,
  type Cell,
  type Point,
  type StrokeState,
} from '../src/index.js';

/**
 * A realistic pad: 3x3 of 100px cells with 8px gaps, plus the full-width 0 bar below.
 * Centres: 1 (50,50) 2 (158,50) 3 (266,50) / 4 (50,158) ... 9 (266,266) / 0 (158,374).
 */
const CELLS: Cell[] = [
  { digit: 1, x: 0, y: 0, w: 100, h: 100 },
  { digit: 2, x: 108, y: 0, w: 100, h: 100 },
  { digit: 3, x: 216, y: 0, w: 100, h: 100 },
  { digit: 4, x: 0, y: 108, w: 100, h: 100 },
  { digit: 5, x: 108, y: 108, w: 100, h: 100 },
  { digit: 6, x: 216, y: 108, w: 100, h: 100 },
  { digit: 7, x: 0, y: 216, w: 100, h: 100 },
  { digit: 8, x: 108, y: 216, w: 100, h: 100 },
  { digit: 9, x: 216, y: 216, w: 100, h: 100 },
  { digit: 0, x: 0, y: 324, w: 316, h: 100 },
];

const centre = (digit: number) => {
  const c = CELLS.find((cell) => cell.digit === digit)!;
  return { x: c.x + c.w / 2, y: c.y + c.h / 2 };
};

/** Drag through the centres of the given digits, one pointermove every 16ms. */
function draw(path: number[], opts: { steps?: number; t0?: number } = {}): StrokeState {
  const { steps = 12, t0 = 0 } = opts;
  let state = createStroke();
  let t = t0;
  let previous = centre(path[0]!);
  state = extendStroke(state, CELLS, { ...previous, t });
  for (const digit of path.slice(1)) {
    const target = centre(digit);
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      t += 16;
      state = extendStroke(state, CELLS, {
        x: previous.x + (target.x - previous.x) * f,
        y: previous.y + (target.y - previous.y) * f,
        t,
      });
    }
    previous = target;
  }
  return state;
}

const digitsOf = (path: number[], opts?: { steps?: number }) => strokeDigits(draw(path, opts));

describe('hit zones', () => {
  it('registers the centre of a cell', () => {
    expect(hitTest(CELLS, centre(5), 0.18)).toBe(5);
  });

  it('ignores the gap between cells', () => {
    expect(hitTest(CELLS, { x: 104, y: 50 }, 0.18)).toBeNull();
  });

  it('ignores the outer edge of a cell, so a graze does not count', () => {
    expect(hitTest(CELLS, { x: 5, y: 5 }, 0.18)).toBeNull();
  });
});

describe('the ordinary slash', () => {
  it('reads 5 then 6 for 7x8 = 56', () => {
    expect(digitsOf([5, 6])).toEqual([5, 6]);
  });

  it('reads the reverse stroke as 6 then 5, which is a different answer', () => {
    expect(digitsOf([6, 5])).toEqual([6, 5]);
  });

  it('reads a single digit for a single-digit answer', () => {
    expect(digitsOf([9])).toEqual([9]);
  });

  it('does not repeat a digit while the pointer wanders inside it', () => {
    let state = createStroke();
    const c = centre(5);
    for (let i = 0; i < 30; i++) {
      state = extendStroke(state, CELLS, { x: c.x + (i % 5), y: c.y + (i % 3), t: i * 16 });
    }
    expect(strokeDigits(state)).toEqual([5]);
  });

  it('survives a flick so fast that pointermove skips the middle of the pad', () => {
    let state = createStroke();
    state = extendStroke(state, CELLS, { ...centre(7), t: 0 });
    state = extendStroke(state, CELLS, { ...centre(3), t: 16 });
    expect(strokeDigits(state)).toEqual([7, 3]);
  });
});

describe('cells crossed in passing are not part of the answer', () => {
  it('reads 6 then 4 for 8x8 = 64, though the line goes straight through 5', () => {
    expect(digitsOf([6, 4])).toEqual([6, 4]);
  });

  it('reads 1 then 0 for 2x5 = 10, though reaching the bar crosses two rows', () => {
    expect(digitsOf([1, 0])).toEqual([1, 0]);
  });

  it('reads 3 then 0 for 6x5 = 30, from the middle of the grid', () => {
    expect(digitsOf([3, 0])).toEqual([3, 0]);
  });

  it('reads 8 then 1 for 9x9 = 81', () => {
    expect(digitsOf([8, 1])).toEqual([8, 1]);
  });

  it('reads 7 then 2 for 8x9 = 72', () => {
    expect(digitsOf([7, 2])).toEqual([7, 2]);
  });

  it('reads every answer in the tables correctly as a straight slash', () => {
    for (const fact of ALL_FACTS) {
      const expected = answerDigits(fact);
      const label = `${fact.a}x${fact.b}`;
      expect({ fact: label, digits: digitsOf(expected) }).toEqual({
        fact: label,
        digits: expected,
      });
    }
  });
});

describe('turning inside a cell registers it', () => {
  it('reads an L-shaped stroke as three digits', () => {
    expect(digitsOf([5, 8, 9])).toEqual([5, 8, 9]);
  });

  it('reads a reversal back over the starting cell', () => {
    expect(digitsOf([5, 6, 5])).toEqual([5, 6, 5]);
  });

  it('treats a gentle curve as a straight pass, not a turn', () => {
    // A bowed 6 -> 4 stroke that sags through 5: still just two digits.
    let state = createStroke();
    const from = centre(6);
    const to = centre(4);
    for (let i = 0; i <= 24; i++) {
      const f = i / 24;
      state = extendStroke(state, CELLS, {
        x: from.x + (to.x - from.x) * f,
        y: from.y + (to.y - from.y) * f + Math.sin(f * Math.PI) * 12,
        t: i * 16,
      });
    }
    expect(strokeDigits(state)).toEqual([6, 4]);
  });
});

describe('tap versus slash', () => {
  const press = (digit: number, jitter: { dx: number; dy: number }[] = []) => {
    const p = centre(digit);
    let state = extendStroke(createStroke(), CELLS, { ...p, t: 0 });
    jitter.forEach((j, i) => {
      state = extendStroke(state, CELLS, { x: p.x + j.dx, y: p.y + j.dy, t: (i + 1) * 16 });
    });
    return state;
  };

  it('calls a press that never moves a tap on one digit', () => {
    const state = press(5);
    expect(strokeKind(state)).toBe('tap');
    expect(strokeDigits(state)).toEqual([5]);
  });

  it('tolerates a shaky finger, which is still a tap', () => {
    const state = press(5, [
      { dx: 2, dy: 1 },
      { dx: 4, dy: -2 },
      { dx: 1, dy: 3 },
    ]);
    expect(strokeKind(state)).toBe('tap');
    expect(strokeDigits(state)).toEqual([5]);
  });

  it('calls a deliberate drag across one cell a slash, not a tap, but still one digit', () => {
    const p = centre(5);
    let state = extendStroke(createStroke(), CELLS, { ...p, t: 0 });
    for (let i = 1; i <= 6; i++) {
      state = extendStroke(state, CELLS, { x: p.x + i * 6, y: p.y, t: i * 16 });
    }
    expect(strokeKind(state)).toBe('slash');
    // A finger that drifts past tapSlop while resting on one digit reads as a "slash" here,
    // but it is still one digit — the pad routes any single-digit release through onTap
    // regardless of kind, so a smudged tap is never graded as if a full answer had arrived.
    expect(strokeDigits(state)).toEqual([5]);
  });

  it('calls a two-digit stroke a slash', () => {
    expect(strokeKind(draw([5, 6]))).toBe('slash');
  });
});

describe('tapped answers draw the same mark as a slash', () => {
  it('joins the tapped cells centre to centre', () => {
    expect(pathThroughCells(CELLS, [5, 6])).toBe('M 158 158 L 266 158');
  });

  it('marks a single tapped digit', () => {
    expect(pathThroughCells(CELLS, [9])).toContain('M 266 266');
  });

  it('is empty with nothing tapped', () => {
    expect(pathThroughCells(CELLS, [])).toBe('');
  });
});

/**
 * There is no more dwell/hold: it existed only for a 10 table that is never coming back,
 * and while live it fired off a plain 50ms clock with no gate on how long a finger can sit
 * still before lifting — a child pausing mid-answer to think silently doubled the digit
 * they were resting on. Resting anywhere in a stroke, for any length of time, must now
 * change nothing about the digits read from it.
 */
describe('resting mid-stroke', () => {
  it('a long pause on the final digit before lifting changes nothing', () => {
    // 8x8 = 64: slash 6 then 4, then just sit there before releasing.
    let state = draw([6, 4]);
    const last = state.points[state.points.length - 1]!;
    // A second and a half of stillness — far past the old 400ms dwell window.
    state = extendStroke(state, CELLS, { ...last, t: last.t + 1500 });
    expect(strokeDigits(state)).toEqual([6, 4]);
  });

  it('a long pause passing straight through the middle changes nothing', () => {
    // Slash 1 -> 5, sit still in 5 for a while, then carry straight on to 9. The pause does
    // not turn the stroke, so 5 stays a pass-through and drops, same as it would without
    // the pause — the old dwell would instead have injected a spurious extra 5 here.
    let state = draw([1, 5]);
    const paused = state.points[state.points.length - 1]!;
    state = extendStroke(state, CELLS, { ...paused, t: paused.t + 1500 });
    const target = centre(9);
    for (let i = 1; i <= 12; i++) {
      const f = i / 12;
      state = extendStroke(state, CELLS, {
        x: paused.x + (target.x - paused.x) * f,
        y: paused.y + (target.y - paused.y) * f,
        t: paused.t + 1500 + i * 16,
      });
    }
    expect(strokeDigits(state)).toEqual([1, 9]);
  });
});

describe('stroke path', () => {
  it('is empty before the first point', () => {
    expect(strokePath([])).toBe('');
  });

  it('draws a visible mark for a single tap', () => {
    expect(strokePath([{ x: 10, y: 20, t: 0 }])).toContain('M 10 20');
  });

  it('drops sub-pixel jitter', () => {
    const points: Point[] = [
      { x: 0, y: 0, t: 0 },
      { x: 0.5, y: 0, t: 1 },
      { x: 50, y: 0, t: 2 },
    ];
    expect(strokePath(points)).toBe('M 0 0 L 50 0');
  });
});
