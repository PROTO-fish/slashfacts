import { StyleSheet, Text, View } from 'react-native';
import type { Score } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * Native port of apps/web/src/components/Result.tsx. Same two headline figures over the
 * per-table breakdown they came from — .couple's huge digits top-aligned with a small
 * caption underneath each, a thin rule dividing them, and .breakdown's single ruled row
 * per table beneath the panel title.
 */
export function Result({ score }: { score: Score }) {
  const palette = usePalette();
  const { metrics } = useBreakpoint();
  const border = { borderColor: palette.ink, borderWidth: metrics.border };
  return (
    <View style={styles.container}>
      <View style={[styles.panel, border, styles.scorePanel]}>
        <View style={styles.couple}>
          <View style={styles.stat}>
            <Text style={[styles.figure, { color: palette.ink, fontFamily: FONTS.black }]}>
              {Math.round(score.rate * 100)}%
            </Text>
            <Text style={[styles.label, { color: palette.ink, fontFamily: FONTS.extraBold }]}>CORRECT</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: palette.ink }]} />
          <View style={styles.stat}>
            <Text style={[styles.figure, { color: palette.ink, fontFamily: FONTS.black }]}>
              {seconds(score.meanMs)}
            </Text>
            <Text style={[styles.label, { color: palette.ink, fontFamily: FONTS.extraBold }]}>PER ANSWER</Text>
          </View>
        </View>
      </View>

      <View style={[styles.panel, border]}>
        <Text style={[styles.panelTitle, { color: palette.ink, fontFamily: FONTS.black }]}>TABLES</Text>
        <View style={[styles.rule, { borderTopColor: palette.ink }]}>
          {score.byTable.map((row) => (
            <View key={row.table} style={styles.row}>
              <Text style={[styles.rowLabel, { color: palette.ink, fontFamily: FONTS.extraBold }]}>
                TABLE {row.table}
              </Text>
              <Text style={[styles.rowValue, { color: palette.ink, fontFamily: FONTS.extraBold }]}>
                {row.correct}/{row.asked}
              </Text>
              <Text style={[styles.rowValue, styles.rowValueEnd, { color: palette.ink, fontFamily: FONTS.extraBold }]}>
                {row.correct === 0 ? '—' : seconds(row.meanMs)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, width: '100%' },
  panel: { padding: 14 },
  scorePanel: { paddingVertical: 20 },
  panelTitle: { fontSize: 17, letterSpacing: -0.2, marginBottom: 6 },
  couple: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 10 },
  stat: { alignItems: 'center', gap: 6 },
  // .couple { font-size: clamp(2.2rem, 12vw, 4.2rem) }
  figure: { fontSize: 50, lineHeight: 45, letterSpacing: -1.5 },
  // .stat .label { font-size: 0.2em of the couple size, so tiny relative to the figure }
  label: { fontSize: 11, letterSpacing: 1.5 },
  divider: { width: 2, height: 28, marginHorizontal: 4, marginTop: 6 },
  rule: { borderTopWidth: 2, paddingTop: 6, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13.5, letterSpacing: 0.6 },
  rowValue: { fontSize: 13.5, flex: 1, textAlign: 'right' },
  rowValueEnd: { marginLeft: 12 },
});
