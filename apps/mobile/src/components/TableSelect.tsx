import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { ALL_TABLES, strokePath, type Cell, type StrokeKind, type StrokeState } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { useScaledStyles } from '../theme/scaledStyles.js';
import { useSlashNative } from '../slash/useSlashNative.js';
import { CheckIcon } from './icons.js';

interface Props {
  /** The tables currently being worked on. Never empty. */
  selected: readonly number[];
  onSelect: (tables: number[]) => void;
}

/**
 * Native port of apps/web/src/components/TableSelect.tsx. What am I practising? — the only
 * question the home screen asks. Tap a row to toggle it, or slash down several at once —
 * the same gesture as answering, so there is still only one interaction to learn.
 *
 * Reads `stroke.visits` directly, the opposite of how an answer is read (every row the
 * line crosses counts, pass-throughs included) — this must never be switched to
 * `strokeDigits()`.
 */
export function TableSelect({ selected, onSelect }: Props) {
  const palette = usePalette();
  const { metrics, scale } = useBreakpoint();
  const styles = useScaledStyles(sheet);
  const chosen = new Set(selected);
  const hostRef = useRef<View>(null);
  const rowRefs = useRef(new Map<number, View>());
  const cells = useRef<Cell[]>([]);
  const measured = useRef(new Map<number, Cell>());
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measureRow = useCallback((table: number) => {
    const host = hostRef.current;
    const row = rowRefs.current.get(table);
    if (!host || !row) return;
    row.measureLayout(
      host,
      (x, y, w, h) => {
        measured.current.set(table, { digit: table, x, y, w, h });
        cells.current = [...measured.current.values()];
      },
      () => {
        /* retried on the next layout pass */
      },
    );
  }, []);

  const onHostLayout = useCallback(
    (event: LayoutChangeEvent) => {
      setSize({ w: event.nativeEvent.layout.width, h: event.nativeEvent.layout.height });
      for (const table of ALL_TABLES) measureRow(table);
    },
    [measureRow],
  );
  const onRowLayout = useCallback((table: number) => () => measureRow(table), [measureRow]);

  const getCells = useCallback(() => cells.current, []);

  // Shared by the tap gesture and VoiceOver/TalkBack's "activate" action: toggle one
  // table, never leaving nothing to practise.
  const toggle = useCallback(
    (table: number) => {
      const next = new Set(chosen);
      if (next.has(table)) next.delete(table);
      else next.add(table);
      if (next.size > 0) onSelect([...next].sort((a, b) => a - b));
    },
    [chosen, onSelect],
  );

  const onRelease = useCallback(
    (_digits: number[], kind: StrokeKind, stroke: StrokeState) => {
      // Every row the line crossed, pass-throughs included — the opposite of how an answer
      // is read, where crossing a cell on the way past must never register.
      const crossed = [...new Set(stroke.visits.map((visit) => visit.digit))];
      if (crossed.length === 0) return;
      if (kind === 'tap') {
        toggle(crossed[0]!);
        return;
      }
      onSelect(crossed.sort((a, b) => a - b));
    },
    [onSelect, toggle],
  );

  const slash = useSlashNative({ getCells, onRelease, enabled: true });
  const ink = slash.drawing ? strokePath(slash.stroke.points) : '';

  const registerRow = (table: number) => (el: View | null) => {
    if (el) rowRefs.current.set(table, el);
    else rowRefs.current.delete(table);
  };

  // theme.css: .select is a real 2-column CSS grid, where `gap` is subtracted before the
  // columns divide the space. RN's flexbox `gap` doesn't do that for percentage widths, so
  // the column width is computed explicitly the same way SlashPad sizes its cells. At a
  // fractional tablet zoom (1.125, 1.21) the row's width can be measured a hair over its real
  // width (react-native-web reports 508.5 as 509), and two halves of it plus the gap then
  // wrap every table into one column — so a tablet leaves a point spare, floored, and
  // `space-between` on the row gives it to the gap rather than to the right-hand edge.
  // A phone's widths are whole points and stay exact.
  const spare = scale === 1 ? 0 : 1;
  const colWidth = size.w > 0 ? Math.floor((size.w - metrics.gap - spare) / 2) : 150 * scale;
  // .select .row { aspect-ratio: 2/1 }
  const rowHeight = colWidth / 2;
  // .select .row { font-size: clamp(1.8rem, 9vw, 3.2rem) } — scaled off the row's own size.
  const digitFontSize = Math.min(48 * scale, Math.max(28 * scale, rowHeight * 0.55));

  return (
    <GestureDetector gesture={slash.gesture}>
      <View ref={hostRef} style={[styles.select, { gap: metrics.gap }]} onLayout={onHostLayout}>
        {ALL_TABLES.map((table) => {
          const on = chosen.has(table);
          return (
            <View
              key={table}
              ref={registerRow(table)}
              onLayout={onRowLayout(table)}
              style={[
                styles.row,
                {
                  width: colWidth,
                  height: rowHeight,
                  borderColor: palette.ink,
                  borderWidth: metrics.border,
                },
                on && { backgroundColor: palette.ink },
              ]}
              accessible
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`Table of ${table}`}
              // The row itself carries no touch responder — the slash gesture lives on the
              // parent GestureDetector — so VoiceOver/TalkBack's double-tap has nothing to
              // trigger without this: 'activate' is the name both platforms dispatch on
              // their default double-tap for an element with no onPress of its own.
              accessibilityActions={[{ name: 'activate', label: 'Toggle' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'activate') toggle(table);
              }}
            >
              <Text
                style={[
                  styles.times,
                  { fontSize: digitFontSize * 0.52, color: on ? palette.paper : palette.ink, fontFamily: FONTS.black },
                ]}
              >
                ×
              </Text>
              <Text
                style={[
                  styles.n,
                  { fontSize: digitFontSize, color: on ? palette.paper : palette.ink, fontFamily: FONTS.black },
                ]}
              >
                {table}
              </Text>
              {/* .select .check: absolute top-right, ~0.16em inset of the row's font size. */}
              {on && (
                <View style={[styles.check, { top: digitFontSize * 0.16, right: digitFontSize * 0.16 }]}>
                  <CheckIcon size={digitFontSize * 0.42} color={palette.paper} />
                </View>
              )}
            </View>
          );
        })}
        {/* A white line inside a black casing reads on both the paper and the filled rows. */}
        {ink && size.w > 0 && (
          <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h} pointerEvents="none">
            <Path d={ink} stroke={palette.ink} strokeWidth={22 * scale} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={ink} stroke={palette.paper} strokeWidth={12 * scale} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </View>
    </GestureDetector>
  );
}

// Two columns, four rows: 2 3 / 4 5 / 6 7 / 8 9 — wide enough for a thumb, short enough
// that all eight tables are on screen with room left for the launch buttons.
const sheet = StyleSheet.create({
  select: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  times: { opacity: 0.7, marginRight: 4 },
  n: {},
  check: { position: 'absolute' },
});
