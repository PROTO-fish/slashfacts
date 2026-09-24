import { useWindowDimensions } from 'react-native';
import { COMPACT_METRICS, WIDE_METRICS, type Metrics } from './tokens.js';

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
}

export function useBreakpoint(): Breakpoint {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 900;
  return {
    metrics: isWide ? WIDE_METRICS : COMPACT_METRICS,
    isWide,
    isRoomy: width >= 700 && height >= 700,
    isLandscapeShort: width > height && height <= 650,
    isTallNarrow: width / height <= 2 / 5,
  };
}
