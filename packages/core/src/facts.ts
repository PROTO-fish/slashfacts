/** A multiplication fact. `a` and `b` are both within MIN_TABLE..MAX_TABLE. */
export interface Fact {
  readonly a: number;
  readonly b: number;
}

/** Stable identifier, e.g. "7x8". Not commutative: 7x8 and 8x7 are distinct facts. */
export type FactId = string;

/**
 * Tables 2 to 9. The 1 and 10 tables are left out on purpose: they are rules rather than
 * facts to recall, so drilling them costs repetitions that the hard middle of the grid
 * needs. Zeros still occur in the answers (2 x 5 = 10, 8 x 5 = 40), so the pad keeps its
 * 0 key.
 */
export const MIN_TABLE = 2;
export const MAX_TABLE = 9;

/** Every table available for practice, in order. */
export const ALL_TABLES: readonly number[] = Array.from(
  { length: MAX_TABLE - MIN_TABLE + 1 },
  (_, i) => i + MIN_TABLE,
);

export function factId(a: number, b: number): FactId {
  return `${a}x${b}`;
}

export function parseFactId(id: FactId): Fact {
  const [a, b] = id.split('x');
  return { a: Number(a), b: Number(b) };
}

export function product(fact: Fact): number {
  return fact.a * fact.b;
}

/** The answer as the ordered digits the child must slash through: 56 -> [5, 6]. */
export function answerDigits(fact: Fact): number[] {
  return String(product(fact))
    .split('')
    .map((d) => Number(d));
}

/** Every fact, in a stable row-major order (2x2, 2x3, ... 9x9). */
export const ALL_FACTS: readonly Fact[] = (() => {
  const facts: Fact[] = [];
  for (let a = MIN_TABLE; a <= MAX_TABLE; a++) {
    for (let b = MIN_TABLE; b <= MAX_TABLE; b++) facts.push({ a, b });
  }
  return facts;
})();

export const ALL_FACT_IDS: readonly FactId[] = ALL_FACTS.map((f) => factId(f.a, f.b));

/**
 * Keep only tables that still exist. Saved settings can name a table that has since been
 * removed, and an empty selection must never leave the scheduler with nothing to ask.
 */
export function sanitizeTables(tables: readonly number[]): number[] {
  const kept = [...new Set(tables)]
    .filter((t) => Number.isInteger(t) && t >= MIN_TABLE && t <= MAX_TABLE)
    .sort((a, b) => a - b);
  return kept.length > 0 ? kept : [...ALL_TABLES];
}

/** The facts belonging to the selected tables, as fact ids. */
export function poolForTables(tables: readonly number[]): FactId[] {
  const selected = new Set(sanitizeTables(tables));
  return ALL_FACTS.filter((f) => selected.has(f.a)).map((f) => factId(f.a, f.b));
}
