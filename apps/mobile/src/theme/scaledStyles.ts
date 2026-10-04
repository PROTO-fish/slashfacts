import { useMemo } from 'react';
import { useUiScale } from './viewport.js';

/** Style properties that are lengths, and so grow with the tablet zoom. */
const LENGTHS = new Set([
  'fontSize', 'lineHeight', 'letterSpacing',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'top', 'right', 'bottom', 'left',
  'gap', 'rowGap', 'columnGap',
  'padding', 'paddingVertical', 'paddingHorizontal', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'margin', 'marginVertical', 'marginHorizontal', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRadius',
]);

function scaleStyle(style: object, scale: number): object {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    out[key] = typeof value === 'number' && LENGTHS.has(key) ? value * scale : value;
  }
  return out;
}

/**
 * A StyleSheet's numbers are phone points. On a tablet (see useUiScale) this returns the
 * same sheet with every length multiplied by the zoom; on a phone, the sheet itself.
 * Percentages, flex and opacity are left alone.
 */
export function useScaledStyles<T extends Record<string, object>>(styles: T): T {
  const scale = useUiScale();
  return useMemo(() => {
    if (scale === 1) return styles;
    const scaled: Record<string, object> = {};
    for (const [name, style] of Object.entries(styles)) scaled[name] = scaleStyle(style, scale);
    return scaled as T;
  }, [styles, scale]);
}
