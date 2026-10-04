import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RECENT_WINDOW, practiceNext, tableProgress } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { useScaledStyles } from '../theme/scaledStyles.js';
import { Launch } from '../components/Launch.js';
import { BackIcon, ResetIcon } from '../components/icons.js';
import type { AppState } from '../state.js';

/** Long enough to be a deliberate second tap, short enough to forget about. */
const CONFIRM_MS = 3000;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * Port of the web `History`: last answers oldest first — black came, white did not, a bar
 * none yet. The bar is the same "—" TABLES shows for no data; a dashed outline on a 13px
 * square broke up into stray ticks on Android.
 */
function History({ recent, ink }: { recent: readonly boolean[]; ink: string }) {
  const styles = useScaledStyles(sheet);
  const slots = [...Array<null>(RECENT_WINDOW - recent.length).fill(null), ...recent];
  const label = `${recent.filter(Boolean).length} of last ${recent.length}`;
  return (
    <View style={styles.history} accessible accessibilityRole="image" accessibilityLabel={label}>
      {slots.map((slot, i) => (
        <View key={i} style={styles.slot}>
          {slot === null ? (
            <View style={[styles.empty, { backgroundColor: ink }]} />
          ) : (
            <View style={[styles.mark, { borderColor: ink }, slot && { backgroundColor: ink }]} />
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * Native port of apps/web/src/screens/Stats.tsx ("FACTS"). Everything the app remembers:
 * what is left to work on, where the child is fast, and the one thing that can undo it
 * all. TABLES keeps moving because speed keeps moving even once everything is known;
 * PRACTICE NEXT shows each fact with a recent miss as its last answers in squares; a
 * table nobody has started shows up in TABLES, not here.
 */
export function Stats({ app, onHome }: { app: AppState; onHome: () => void }) {
  const palette = usePalette();
  const { metrics, scale } = useBreakpoint();
  const styles = useScaledStyles(sheet);
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const erase = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), CONFIRM_MS);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
    app.reset();
  };

  const tables = tableProgress(app.stats);
  const practice = practiceNext(app.stats);
  const ink = palette.ink;
  const ruleStyle = { borderTopColor: ink, borderTopWidth: 2 * scale };

  return (
    <View style={[styles.screen, { paddingHorizontal: metrics.padX }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.main}>
        <Text style={[styles.pageTitle, { color: ink, fontFamily: FONTS.blackWider }]}>FACTS</Text>

        <View style={[styles.panel, { borderColor: ink, borderWidth: metrics.border }]}>
          <Text style={[styles.panelTitle, { color: ink, fontFamily: FONTS.black }]}>TABLES</Text>

          {tables.map((row) => (
            <View key={row.table} style={[styles.tableRow, ruleStyle]}>
              <Text style={[styles.colNum, styles.rowNum, { color: ink, fontFamily: FONTS.black }]}>
                <Text style={styles.times}>× </Text>
                {row.table}
              </Text>
              <View style={styles.masteredCell}>
                <View style={[styles.gauge, { borderColor: ink }]}>
                  <View style={[styles.gaugeFill, { backgroundColor: ink, width: `${(row.known / row.total) * 100}%` }]} />
                </View>
                <Text style={[styles.fraction, { color: ink, fontFamily: FONTS.extraBold }]}>
                  {row.known}/{row.total}
                </Text>
              </View>
              <Text style={[styles.colPct, styles.value, { color: ink, fontFamily: FONTS.extraBold }]}>
                {row.asked === 0 ? '—' : `${Math.round(row.accuracy * 100)}%`}
              </Text>
              <Text style={[styles.colTime, styles.value, { color: ink, fontFamily: FONTS.extraBold }]}>
                {row.meanMs === 0 ? '—' : seconds(row.meanMs)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.panel, { borderColor: ink, borderWidth: metrics.border }]}>
          <Text style={[styles.panelTitle, { color: ink, fontFamily: FONTS.black }]}>PRACTICE NEXT</Text>
          {practice.length === 0 ? (
            <Text style={[styles.nothing, { color: ink, fontFamily: FONTS.extraBold }]}>NOTHING YET</Text>
          ) : (
            <>
              {practice.map((entry) => (
                  <View key={entry.id} style={[styles.tableRow, ruleStyle]}>
                    <Text style={[styles.colFact, styles.rowFact, { color: ink, fontFamily: FONTS.black }]}>
                      {entry.id.replace('x', ' × ')}
                    </Text>
                    <View style={styles.colFlex}>
                      <History recent={entry.recent} ink={ink} />
                    </View>
                    <Text style={[styles.colPct, styles.value, { color: ink, fontFamily: FONTS.extraBold }]}>
                      {`${Math.round(entry.accuracy * 100)}%`}
                    </Text>
                    <Text style={[styles.colTime, styles.value, { color: ink, fontFamily: FONTS.extraBold }]}>
                      {entry.meanMs === 0 ? '—' : seconds(entry.meanMs)}
                    </Text>
                  </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Launch onPress={onHome} secondary accessibilityLabel="Home" icon={<BackIcon size={20 * scale} color={ink} />} />
      </View>

      <View style={[styles.footer, { height: metrics.footerTier }]}>
        <Pressable
          onPress={erase}
          accessibilityRole="button"
          accessibilityLabel="Reset"
          hitSlop={16}
          style={styles.resetButton}
        >
          <ResetIcon size={18 * scale} color={ink} />
          {armed && (
            <Text style={[styles.resetLabel, { color: palette.paper, backgroundColor: ink, fontFamily: FONTS.extraBold }]}>
              RESET · TAP AGAIN
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const sheet = StyleSheet.create({
  // Home's 420pt column plus its 16pt margins: a phone fills it, a tablet centres it.
  screen: { flex: 1, width: '100%', maxWidth: 452, alignSelf: 'center', paddingTop: 16, gap: 16 },
  scroll: { flex: 1 },
  main: { gap: 14, paddingBottom: 16 },
  // .page-title
  pageTitle: { fontSize: 44, lineHeight: 40, letterSpacing: -1 },
  // .panel { border: var(--border) solid ink; padding: 12px 14px }
  panel: { paddingVertical: 14, paddingHorizontal: 14 },
  // .panel-title { font-size: 1.05rem; letter-spacing: -0.01em }
  panelTitle: { fontSize: 17, letterSpacing: -0.2, marginBottom: 10 },
  // Column widths only — text size lives in the text styles.
  colNum: { width: 40, flexShrink: 0 },
  colFact: { width: 70, flexShrink: 0 },
  colFlex: { flex: 1 },
  colPct: { width: 62, flexShrink: 0, textAlign: 'right' },
  colTime: { width: 50, flexShrink: 0, textAlign: 'right' },
  // .tables th/td { border-top: 2px solid ink; padding: 5px 4px }
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  rowNum: { fontSize: 13.5 },
  // The home screen picker's lighter × (TableSelect), scaled to text size.
  times: { fontSize: 9.5, opacity: 0.7 },
  rowFact: { fontSize: 13.5, letterSpacing: 0.8 },
  value: { fontSize: 13.5 },
  masteredCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  // .gauge { height: 0.9em; border: 2px solid ink } — no radius.
  gauge: { flex: 1, height: 13, borderWidth: 2, overflow: 'hidden' },
  gaugeFill: { height: '100%' },
  fraction: { fontSize: 10.5 },
  // Same 2px ink border as the gauge, so history and the mastered gauge read as one black/white scale.
  mark: { width: 13, height: 13, borderWidth: 2 },
  slot: { width: 13, height: 13, justifyContent: 'center' },
  empty: { height: 2 },
  history: { flexDirection: 'row', gap: 3 },
  nothing: { fontSize: 13.5, letterSpacing: 1.4, opacity: 0.6 },
  actions: { alignItems: 'center' },
  footer: { alignItems: 'center', justifyContent: 'center' },
  resetButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resetLabel: { fontSize: 11.5, letterSpacing: 1.4, paddingVertical: 3, paddingHorizontal: 6 },
});
