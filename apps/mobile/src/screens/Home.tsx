import { Pressable, StyleSheet, Text, View } from 'react-native';
import { sanitizeTables } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { useScaledStyles } from '../theme/scaledStyles.js';
import { Launch } from '../components/Launch.js';
import { Mark } from '../components/Mark.js';
import { TableSelect } from '../components/TableSelect.js';
import type { AppState } from '../state.js';

/**
 * Native port of apps/web/src/screens/Home.tsx. One question — which tables — and then
 * the only thing to do about it.
 */
export function Home({
  app,
  onStart,
  onStats,
  onAbout,
}: {
  app: AppState;
  onStart: () => void;
  onStats: () => void;
  onAbout: () => void;
}) {
  const palette = usePalette();
  const { metrics, scale } = useBreakpoint();
  const styles = useScaledStyles(sheet);
  const { settings, setSettings } = app;
  const tables = sanitizeTables(settings.tables);

  return (
    <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
      <View style={styles.main}>
        <Text style={[styles.pageTitle, { color: palette.ink, fontFamily: FONTS.blackWider }]}>TABLES</Text>
        <TableSelect selected={tables} onSelect={(next) => setSettings({ ...settings, tables: next })} />
      </View>

      <View style={styles.actions}>
        <Launch label="START" onPress={onStart} />
        <Launch label="FACTS" onPress={onStats} secondary />
      </View>

      <View style={[styles.footer, { height: metrics.footerTier }]}>
        {/* Who made it, and the way in to About. */}
        <Pressable onPress={onAbout} accessibilityRole="link" accessibilityLabel="About SlashFacts, by PROTO/fish" hitSlop={14}>
          <Mark height={14 * scale} color={palette.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const sheet = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingTop: 16, paddingBottom: 18 },
  main: { flex: 1, width: '100%', maxWidth: 420, justifyContent: 'center', gap: 14 },
  // .page-title { font-size: clamp(2.2rem, 12vw, 3.5rem); letter-spacing: -0.02em; line-height: 0.9 }
  pageTitle: { fontSize: 44, lineHeight: 40, letterSpacing: -1 },
  actions: { gap: 10, alignItems: 'center', width: '100%', marginTop: 18 },
  footer: { alignItems: 'center', justifyContent: 'center' },
});
