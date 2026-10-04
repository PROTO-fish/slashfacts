import { COMPACT_METRICS, WIDE_METRICS, type Metrics } from './tokens.js';
import { useViewport } from './viewport.js';

/**
 * Mirrors theme.css's media queries as booleans, not layout — each screen still decides
 * what to do with them (theme.css's rules are per-screen padding/gap formulas, not shared
 * tokens, and get ported alongside each screen in Phase 3).
 */
export interface Breakpoint {
  readonly metrics: Metrics;
  /** theme.css: `min-width: 900px` — the tablet-width metrics step. */
  readonly isWide: boolean;
  /** theme.css: `min-width: 700px and min-height: 700px` — enough room to centre the
   *  screen as one unit instead of bottom-pinning the actions. */
  readonly isRoomy: boolean;
  /** theme.css: `orientation: landscape and max-height: 650px` — a wide, short screen
   *  needs a denser vertical rhythm and a shorter footer tier. */
  readonly isLandscapeShort: boolean;
  /** theme.css: `max-aspect-ratio: 2/5` — a screen taller than 400:1000 needs the extra
   *  height above the content absorbed rather than left as a growing gap. */
  readonly isTallNarrow: boolean;
  /** theme.css `.wordmark { font-size: clamp(2rem, 7vw, 3.25rem) }`, floored at the 36 the
   *  phone layout was tuned to, so only windows wider than a phone see the header grow. */
  readonly wordmarkSize: number;
  /** The tablet zoom (see useUiScale). The breakpoints above are judged in layout points;
   *  metrics and wordmarkSize are already multiplied by it, ready to draw. */
  readonly scale: number;
}

/** The wordmark size a phone gets; screens that budget their height count growth past it. */
export const PHONE_WORDMARK_SIZE = 36;

function scaleMetrics(metrics: Metrics, scale: number): Metrics {
  if (scale === 1) return metrics;
  return {
    border: metrics.border * scale,
    gap: metrics.gap * scale,
    padX: metrics.padX * scale,
    footerTier: metrics.footerTier * scale,
  };
}

export function useBreakpoint(): Breakpoint {
  const { width, height, scale } = useViewport();
  const isWide = width >= 900;
  return {
    metrics: scaleMetrics(isWide ? WIDE_METRICS : COMPACT_METRICS, scale),
    isWide,
    isRoomy: width >= 700 && height >= 700,
    isLandscapeShort: width > height && height <= 650,
    isTallNarrow: width / height <= 2 / 5,
    wordmarkSize: Math.min(52, Math.max(PHONE_WORDMARK_SIZE, width * 0.07)) * scale,
    scale,
  };
}
