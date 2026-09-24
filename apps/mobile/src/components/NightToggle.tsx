import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePalette } from '../theme/ThemeContext.js';

/**
 * A disc, half inked — the whole idea of night mode in one shape. Native port of
 * apps/web/src/components/NightToggle.tsx; same path data, drawn rather than a glyph so no
 * font has to cooperate.
 */
export function NightToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Night mode"
      hitSlop={10}
    >
      <Svg width={28} height={28} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={9.5} stroke={palette.ink} strokeWidth={1.5} fill="none" />
        <Path d={on ? 'M 12 2.5 A 9.5 9.5 0 0 0 12 21.5 Z' : 'M 12 2.5 A 9.5 9.5 0 0 1 12 21.5 Z'} fill={palette.ink} />
      </Svg>
    </Pressable>
  );
}
