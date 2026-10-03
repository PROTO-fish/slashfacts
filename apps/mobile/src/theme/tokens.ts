/**
 * The app is two colours, and every style names them through these tokens — the same
 * discipline theme.css keeps with --ink/--paper. border/gap/padX/footerTier scale up at
 * the tablet breakpoint; see useBreakpoint().
 */
export interface Palette {
  readonly ink: string;
  readonly paper: string;
}

export const DAY: Palette = { ink: '#000', paper: '#fff' };

export interface Metrics {
  readonly border: number;
  readonly gap: number;
  readonly padX: number;
  /** Height of the home footer tier, reserved on every screen so the launch buttons land
   *  at exactly the same place whichever screen you are on. */
  readonly footerTier: number;
}

export const COMPACT_METRICS: Metrics = { border: 3, gap: 8, padX: 16, footerTier: 42 };
export const WIDE_METRICS: Metrics = { border: 4, gap: 10, padX: 32, footerTier: 42 };
