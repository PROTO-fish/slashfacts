import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { activeDigits, pathThroughCells, strokePath, type Cell } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { useScaledStyles } from '../theme/scaledStyles.js';
import { useSlashNative } from './useSlashNative.js';

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export type PadStatus = 'idle' | 'correct' | 'reveal';

interface Props {
  status: PadStatus;
  /** One continuous stroke, released. The whole answer at once. */
  onSlash: (digits: number[]) => void;
  /** One digit, tapped. The caller decides when enough digits have arrived. */
  onTap: (digit: number) => void;
  /** Digits tapped so far, drawn exactly as a slash through the same cells. */
  pending: readonly number[];
  /** Changing this clears the stroke — a new fact, or a rejected attempt. */
  resetKey: string;
}

/**
 * Native counterpart of apps/web/src/slash/SlashPad.tsx. Not buttons: the whole pad is one
 * gesture surface, and the cells only report where they are (via measureLayout against the
 * pad itself — RN's onLayout is parent-relative, not pad-relative, so each cell resolves
 * its own position the same way the web version subtracts getBoundingClientRect()s) so the
 * geometry can decide what was drawn.
 */
export function SlashPad({ status, onSlash, onTap, pending, resetKey }: Props) {
  const palette = usePalette();
  const { metrics, scale } = useBreakpoint();
  const styles = useScaledStyles(sheet);
  const padRef = useRef<View>(null);
  const cellRefs = useRef(new Map<number, View>());
  const cells = useRef<Cell[]>([]);
  const measured = useRef(new Map<number, Cell>());
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measureCell = useCallback((digit: number) => {
    const pad = padRef.current;
    const cell = cellRefs.current.get(digit);
    if (!pad || !cell) return;
    cell.measureLayout(
      pad,
      (x, y, w, h) => {
        measured.current.set(digit, { digit, x, y, w, h });
        cells.current = [...measured.current.values()];
      },
      () => {
        /* Not yet mounted on this frame; the next onLayout retries. */
      },
    );
  }, []);

  const onCellLayout = useCallback(
    (digit: number) => () => measureCell(digit),
    [measureCell],
  );

  const onPadLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setSize({ w: width, h: height });
      // The pad's own size settling can shift every cell's position relative to it.
      for (const digit of [...KEYS, 0]) measureCell(digit);
    },
    [measureCell],
  );

  const getCells = useCallback(() => cells.current, []);
  const onRelease = useCallback(
    (digits: number[]) => {
      // One digit is one digit, however cleanly it was drawn: a smudged tap still travels
      // past tapSlop and reads as a one-cell "slash", but it must not be graded as if the
      // whole (longer) answer had arrived.
      if (digits.length === 1) onTap(digits[0]!);
      else onSlash(digits);
    },
    [onSlash, onTap],
  );
  const { stroke, drawing, gesture, reset } = useSlashNative({
    getCells,
    onRelease,
    enabled: status === 'idle',
  });

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  // While drawing, the live stroke wins; otherwise the tapped digits are shown as a mark
  // through the same cells, so both ways of answering look the same.
  const drawn = drawing || stroke.points.length > 0;
  const lit = status === 'reveal' ? new Set<number>() : drawn ? activeDigits(stroke) : new Set(pending);
  const path = drawn ? strokePath(stroke.points) : pathThroughCells(cells.current, pending);
  // While the answer is on display the pad goes quiet: the number is the message.
  const showStroke = status !== 'reveal' && (drawing || status === 'correct' || pending.length > 0 || drawn);

  const registerCell = (digit: number) => (el: View | null) => {
    if (el) cellRefs.current.set(digit, el);
    else cellRefs.current.delete(digit);
  };

  // theme.css: .cell.zero's height is clamp(64px, 24cqw, 140px) of the PAD's own width, not
  // the viewport's, so it scales with the digit keys beside it. size.w is that measured
  // pad width (from onLayout, the RN equivalent of the container query).
  const zeroHeight = size.w > 0 ? Math.min(140 * scale, Math.max(64 * scale, size.w * 0.24)) : 100 * scale;
  // .cell font-size: clamp(2rem, 11vw, 4rem) — approximated here off the measured cell
  // width (each of the 3 columns), which tracks the same "grows with the pad" intent.
  // Floored: three exact thirds sum to the full width, and a browser's sub-pixel rounding
  // then wraps the third key onto its own row. A tablet's fractional zoom (1.116 on a 9.7"
  // iPad) can measure the pad a hair over its real width too — 446.5 read as 447 — so there
  // a point is left spare, and `space-between` on the grid gives it to the gaps (see
  // TableSelect, which does the same).
  const spare = scale === 1 ? 0 : 1;
  const cellWidth = size.w > 0 ? Math.floor((size.w - metrics.gap * 2 - spare) / 3) : 100 * scale;
  const digitFontSize = Math.min(64 * scale, Math.max(32 * scale, cellWidth * 0.42));

  const cellStyle = (digit: number) => [
    styles.cell,
    { borderColor: palette.ink, borderWidth: metrics.border, width: cellWidth, height: cellWidth },
    lit.has(digit) && { backgroundColor: palette.ink },
  ];
  const cellTextStyle = (digit: number) => [
    { fontSize: digitFontSize, color: lit.has(digit) ? palette.paper : palette.ink, fontFamily: FONTS.black },
  ];

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={padRef}
        style={styles.pad}
        onLayout={onPadLayout}
        accessible
        accessibilityLabel="Answer pad: draw one stroke through the digits"
        // No touch responder to hand VoiceOver/TalkBack's double-tap, since the digits are
        // read off a gesture geometry rather than ten separate touchables. One named action
        // per digit reaches the same onTap accumulation the pointer path already uses.
        accessibilityActions={KEYS.concat(0).map((digit) => ({
          name: `digit-${digit}`,
          label: String(digit),
        }))}
        onAccessibilityAction={(event) => {
          if (status !== 'idle') return;
          const match = /^digit-(\d)$/.exec(event.nativeEvent.actionName);
          if (match) onTap(Number(match[1]));
        }}
      >
        <View style={[styles.grid, { gap: metrics.gap }]}>
          {KEYS.map((digit) => (
            <View
              key={digit}
              ref={registerCell(digit)}
              style={cellStyle(digit)}
              onLayout={onCellLayout(digit)}
            >
              <Text style={cellTextStyle(digit)}>{digit}</Text>
            </View>
          ))}
        </View>
        <View
          ref={registerCell(0)}
          style={[
            styles.zero,
            { borderColor: palette.ink, borderWidth: metrics.border, height: zeroHeight, marginTop: metrics.gap },
            lit.has(0) && { backgroundColor: palette.ink },
          ]}
          onLayout={onCellLayout(0)}
        >
          <Text style={cellTextStyle(0)}>0</Text>
        </View>
        {/* A white line inside a black casing reads on both the paper and the lit cells. */}
        {showStroke && path && size.w > 0 && (
          <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h} pointerEvents="none">
            <Path d={path} stroke={palette.ink} strokeWidth={22 * scale} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <Path d={path} stroke={palette.paper} strokeWidth={12 * scale} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        )}
      </View>
    </GestureDetector>
  );
}

const sheet = StyleSheet.create({
  pad: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
