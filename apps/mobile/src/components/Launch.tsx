import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { useScaledStyles } from '../theme/scaledStyles.js';

/**
 * Native port of theme.css's `.launch` / `.launch.second` — the one button vocabulary in
 * the app, used identically everywhere: filled ink is the act to take now (START, AGAIN),
 * outlined is the way out of it (HOME). No rounded corners anywhere in theme.css — this
 * app is sharp rectangles and thick borders throughout, never a radius.
 */
export function Launch({
  label,
  onPress,
  secondary = false,
  icon,
  accessibilityLabel,
  style,
}: {
  label?: string;
  onPress: () => void;
  secondary?: boolean;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const { metrics, scale } = useBreakpoint();
  const styles = useScaledStyles(sheet);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        { borderColor: palette.ink, borderWidth: metrics.border },
        secondary
          ? { backgroundColor: palette.paper, paddingVertical: 13 * scale }
          : { backgroundColor: palette.ink, paddingVertical: 20 * scale },
        icon ? styles.iconOnly : null,
        style,
      ]}
    >
      {icon}
      {label && (
        <Text
          style={[
            secondary ? styles.labelSecondary : styles.label,
            { color: secondary ? palette.ink : palette.paper, fontFamily: FONTS.black },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const sheet = StyleSheet.create({
  base: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOnly: {
    paddingVertical: 14,
  },
  // .launch { font-size: clamp(1.3rem, 6.5vw, 1.9rem); letter-spacing: 0.1em }
  label: {
    fontSize: 26,
    letterSpacing: 2.6,
  },
  // .launch.second { font-size: clamp(0.86rem, 3.6vw, 1.05rem) }
  labelSecondary: {
    fontSize: 15,
    letterSpacing: 1.5,
  },
});
