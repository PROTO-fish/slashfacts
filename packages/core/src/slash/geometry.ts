/**
 * The gesture engine, with no DOM and no React in sight.
 *
 * A stroke is a list of points; this module turns it into the ordered digit sequence the
 * child intended. All of the feel lives in here, so all of the feel is testable.
 *
 * The central rule: counting every cell the line touches does not work, because a straight
 * slash from 6 to 4 unavoidably crosses 5 (8x8 = 64 would read as 645), and reaching the 0
 * bar from the top row crosses two other rows. So a cell counts only when the stroke
 * STARTS in it, ENDS in it, or TURNS inside it. Cells the line merely passes straight
 * through are ignored.
 */

export interface Cell {
  readonly digit: number;
  /** Rect in pad-local coordinates. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
  /** Epoch ms. */
  readonly t: number;
}

export interface StrokeConfig {
  /**
   * Each cell's hit zone is its rect shrunk by this fraction on every side, so a stroke
   * that clips a neighbour's corner on its way past does not open a visit there.
   */
  readonly insetRatio: number;
  /** Pointer moves are interpolated at this spacing (px) so a fast flick skips nothing. */
  readonly sampleStep: number;
  /** Direction is measured over this travel distance (px); shorter is noisier. */
  readonly cornerWindow: number;
  /** A heading change beyond this angle (degrees) inside a cell counts as a turn. */
  readonly cornerAngle: number;
  /** Total travel (px) below which a press is a tap rather than a slash. */
  readonly tapSlop: number;
}

export const DEFAULT_STROKE_CONFIG: StrokeConfig = {
  insetRatio: 0.18,
  sampleStep: 6,
  cornerWindow: 14,
  cornerAngle: 60,
  tapSlop: 14,
};

/** One continuous stay inside one cell. */
export interface Visit {
  readonly digit: number;
  /** Index into `points` where the stroke entered. */
  readonly startIndex: number;
  /** The stroke changed heading sharply while inside. */
  readonly turned: boolean;
}

export interface StrokeState {
  readonly points: readonly Point[];
  /** Total distance travelled, used to tell a tap from a slash. */
  readonly travel: number;
  readonly visits: readonly Visit[];
  /** Digit of the visit in progress, or null when the pointer is between cells. */
  readonly active: number | null;
  /** Heading when the current visit began, used to detect a turn. */
  readonly entryDir: Vec | null;
}

interface Vec {
  readonly x: number;
  readonly y: number;
}

export function createStroke(): StrokeState {
  return {
    points: [],
    travel: 0,
    visits: [],
    active: null,
    entryDir: null,
  };
}

/** Which digit's hit zone contains this point, if any. */
export function hitTest(
  cells: readonly Cell[],
  p: { x: number; y: number },
  insetRatio: number,
): number | null {
  for (const cell of cells) {
    const ix = cell.w * insetRatio;
    const iy = cell.h * insetRatio;
    if (
      p.x >= cell.x + ix &&
      p.x <= cell.x + cell.w - ix &&
      p.y >= cell.y + iy &&
      p.y <= cell.y + cell.h - iy
    ) {
      return cell.digit;
    }
  }
  return null;
}

/** A press that never moved is a tap on one digit; anything else is a slash. */
export type StrokeKind = 'tap' | 'slash';

export function strokeKind(
  state: StrokeState,
  config: StrokeConfig = DEFAULT_STROKE_CONFIG,
): StrokeKind {
  return state.travel <= config.tapSlop && strokeDigits(state).length === 1 ? 'tap' : 'slash';
}

/**
 * The answer as it stands. Also what the pad highlights: a cell lights up exactly when it
 * has earned a place in this sequence.
 */
export function strokeDigits(state: StrokeState): number[] {
  const digits: number[] = [];
  state.visits.forEach((visit, index) => {
    const isFirst = index === 0;
    const isLast = index === state.visits.length - 1;
    if (!isFirst && !isLast && !visit.turned) return;
    digits.push(visit.digit);
  });
  return digits;
}

/** The digits currently lit, for cell highlighting. */
export function activeDigits(state: StrokeState): Set<number> {
  return new Set(strokeDigits(state));
}

/**
 * Feed one pointer position into the stroke. Handles interpolation, entering and leaving
 * cells, turn detection, and suppressing duplicates while the pointer stays put.
 */
export function extendStroke(
  state: StrokeState,
  cells: readonly Cell[],
  point: Point,
  config: StrokeConfig = DEFAULT_STROKE_CONFIG,
): StrokeState {
  const previous = state.points[state.points.length - 1];
  const samples = previous ? interpolate(previous, point, config.sampleStep) : [point];
  let next = state;
  for (const sample of samples) next = pushSample(next, cells, sample, config);
  return next;
}

function pushSample(
  state: StrokeState,
  cells: readonly Cell[],
  sample: Point,
  config: StrokeConfig,
): StrokeState {
  const last = state.points[state.points.length - 1];
  const points = [...state.points, sample];
  const travel = state.travel + (last ? distance(last, sample) : 0);
  const index = points.length - 1;
  const digit = hitTest(cells, sample, config.insetRatio);

  // Between cells: the visit ends, so re-entering the same digit opens a new one.
  if (digit === null) {
    return { ...state, points, travel, active: null, entryDir: null };
  }

  // Entering a new cell.
  if (digit !== state.active) {
    const visit: Visit = { digit, startIndex: index, turned: false };
    return {
      ...state,
      points,
      travel,
      visits: [...state.visits, visit],
      active: digit,
      entryDir: headingAt(points, index, config.cornerWindow),
    };
  }

  // Still inside the same cell: look for a turn.
  let visits = state.visits;
  let entryDir = state.entryDir;
  const current = visits[visits.length - 1];
  if (current && !current.turned) {
    const heading = headingAt(points, index, config.cornerWindow);
    if (heading) {
      if (!entryDir) {
        // The stroke began inside this cell; its first heading is the reference.
        entryDir = heading;
      } else if (angleBetween(entryDir, heading) > config.cornerAngle) {
        visits = [...visits.slice(0, -1), { ...current, turned: true }];
      }
    }
  }

  return { ...state, points, travel, visits, entryDir };
}

/**
 * Path through a sequence of cell centres. Tapped answers draw the same mark a slash
 * would, so both input styles read identically.
 */
export function pathThroughCells(cells: readonly Cell[], digits: readonly number[]): string {
  const centres = digits
    .map((digit) => cells.find((cell) => cell.digit === digit))
    .filter((cell): cell is Cell => cell !== undefined)
    .map((cell) => ({ x: cell.x + cell.w / 2, y: cell.y + cell.h / 2, t: 0 }));
  return strokePath(centres);
}

/** SVG path for the visible slash. Points closer than 2px apart are dropped as noise. */
export function strokePath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  const kept: Point[] = [points[0]!];
  for (const p of points) {
    if (distance(kept[kept.length - 1]!, p) >= 2) kept.push(p);
  }
  if (kept.length === 1) {
    const p = kept[0]!;
    return `M ${round(p.x)} ${round(p.y)} L ${round(p.x + 0.01)} ${round(p.y)}`;
  }
  return kept.map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(p.x)} ${round(p.y)}`).join(' ');
}

/** Unit heading arriving at `index`, measured back over at least `window` px. */
function headingAt(points: readonly Point[], index: number, window: number): Vec | null {
  const head = points[index];
  if (!head) return null;
  for (let i = index - 1; i >= 0; i--) {
    const tail = points[i]!;
    const d = distance(tail, head);
    if (d >= window) return { x: (head.x - tail.x) / d, y: (head.y - tail.y) / d };
  }
  return null;
}

function angleBetween(a: Vec, b: Vec): number {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y));
  return (Math.acos(dot) * 180) / Math.PI;
}

function interpolate(from: Point, to: Point, step: number): Point[] {
  const d = distance(from, to);
  const steps = Math.max(1, Math.ceil(d / step));
  const points: Point[] = [];
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    points.push({ x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, t: to.t });
  }
  return points;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
