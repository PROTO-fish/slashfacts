import Svg, { Path, Polyline } from 'react-native-svg';

/**
 * The handful of inline SVGs the web app draws rather than using glyphs for. Straight ports
 * of apps/web/src/components/*.tsx and the equivalent markup in Practice.tsx/Stats.tsx —
 * same path data, same stroke widths, and same `square`/`miter` cap and join (theme.css
 * never sets `round` on any of these; that belongs only to the ink stroke itself).
 */

/** .select .check — stroke-width 3, no cap/join override (defaults to butt/miter). */
export function CheckIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M 4 13 L 10 19 L 20 6" stroke={color} strokeWidth={3} fill="none" />
    </Svg>
  );
}

/** .launch.restart svg — stroke-width 3.2, square/miter. */
export function RestartIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      <Path d="M20.49 15A9 9 0 1 1 18.36 5.64L23 10" stroke={color} strokeWidth={3.2} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </Svg>
  );
}

/** .launch.back svg — stroke-width 2.6, square/miter. */
export function BackIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M20 12H4M4 12L11 5M4 12L11 19" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </Svg>
  );
}

/** .reset svg — stroke-width 2.2, square/miter. */
export function ResetIcon({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="23 4 23 10 17 10" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      <Polyline points="1 20 1 14 7 14" stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
      <Path
        d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </Svg>
  );
}

/**
 * .prompt .times — stroke-width 4.4, butt caps. The multiplication sign is drawn rather
 * than set from the font: a glyph hangs off a baseline inside a line box of its own, and
 * iOS and Android each derived that box differently, so the × sat at a different height on
 * each. A path has no baseline — centring its box centres the mark.
 */
export function TimesIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 5 L19 19 M19 5 L5 19" stroke={color} strokeWidth={4.4} fill="none" strokeLinecap="butt" />
    </Svg>
  );
}
