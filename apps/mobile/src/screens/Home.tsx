import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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
  // `main` is flex: 1, so its height is what the header, actions and footer leave over,
  // whatever it holds. On a short window (iPhone Duo closed, a short browser) that is less
  // than the grid's width-driven height, and the grid has to give way rather than spill
  // over the title and START.
  const [mainHeight, setMainHeight] = useState(0);
  const onMainLayout = (event: LayoutChangeEvent) => setMainHeight(event.nativeEvent.layout.height);
  const gridHeight = mainHeight > 0 ? mainHeight - (TITLE_LINE_HEIGHT + MAIN_GAP) * scale : undefined;

  return (
    <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
      <View style={styles.main} onLayout={onMainLayout}>
        <Text style={[styles.pageTitle, { color: palette.ink, fontFamily: FONTS.blackWider }]}>TABLES</Text>
        <TableSelect
          selected={tables}
          maxHeight={gridHeight}
          onSelect={(next) => setSettings({ ...settings, tables: next })}
        />
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

/** The title's line and the gap under it: what `main` holds besides the grid. */
const TITLE_LINE_HEIGHT = 40;
const MAIN_GAP = 14;

const sheet = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', paddingTop: 16, paddingBottom: 18 },
  main: { flex: 1, width: '100%', maxWidth: 420, justifyContent: 'center', gap: MAIN_GAP },
  // .page-title { font-size: clamp(2.2rem, 12vw, 3.5rem); letter-spacing: -0.02em; line-height: 0.9 }
  pageTitle: { fontSize: 44, lineHeight: TITLE_LINE_HEIGHT, letterSpacing: -1 },
  actions: { gap: 10, alignItems: 'center', width: '100%', marginTop: 18 },
  footer: { alignItems: 'center', justifyContent: 'center' },
});
