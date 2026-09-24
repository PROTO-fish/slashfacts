import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { product, type Fact } from '@slash/core';
import { usePalette } from '../theme/ThemeContext.js';
import { FONTS } from '../theme/fonts.js';
import { useBreakpoint } from '../theme/useBreakpoint.js';
import { SlashPad, type PadStatus } from '../slash/SlashPad.js';
import { TimesIcon } from '../components/icons.js';

/** Above this many questions the ticks become a grey smear, so only the counter shows. */
const TICK_LIMIT = 12;

/** .prompt's font-size on a phone. The × and the gap beside it are both ratios of it. */
const PROMPT_SIZE = 84;

/**
 * theme.css `.pad-slot { max-width: min(440px, 94vw, calc((100dvh - 300px) / 1.24)) }`.
 * The pad is square-ish, so its width sets its height — about 1.24 times it once the three
 * cell rows and the 0 bar are counted. The third term is the one this file never had: with
 * only a width cap, a short screen has no way to keep the 0 key above the fold.
 * The 300 is the chrome above the pad — bar, meta row, clock and the prompt's own band.
 */
function padWidthFor(windowWidth: number, windowHeight: number) {
  return Math.min(400, windowWidth * 0.94, (windowHeight - 300) / 1.24);
}

interface Props {
  fact: Fact;
  status: PadStatus;
  pending: readonly number[];
  attempt: number;
  /** 0-based position in the run, and its length. */
  index: number;
  total: number;
  /** This mode's answer limit, which drives the clock animation. */
  limitMs: number;
  /** Restamped every time a question goes up, so the clock animation restarts. */
  askedAt: number;
  onSlash: (digits: number[]) => void;
  onTap: (digit: number) => void;
}

/**
 * Native port of apps/web/src/game/QuestionView.tsx. Same one-view-for-both-modes shape;
 * the CSS `@keyframes drain` (a width animation, paused while feedback plays) becomes a
 * Reanimated scaleX driven the same way — restarted by the index:attempt:askedAt key,
 * frozen wherever it stood the moment status leaves 'idle'.
 */
export function QuestionView({
  fact,
  status,
  pending,
  attempt,
  index,
  total,
  limitMs,
  askedAt,
  onSlash,
  onTap,
}: Props) {
  const palette = usePalette();
  const { metrics } = useBreakpoint();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const revealing = status === 'reveal';
  const progress = useSharedValue(1);
  const runningKey = useRef<string | null>(null);
  const [padSlotWidth, setPadSlotWidth] = useState(0);

  useEffect(() => {
    const key = `${index}:${attempt}:${askedAt}`;
    if (status === 'idle') {
      if (runningKey.current !== key) {
        runningKey.current = key;
        progress.value = 1;
        progress.value = withTiming(0, { duration: limitMs, easing: Easing.linear });
      }
    } else {
      cancelAnimation(progress);
    }
  }, [status, index, attempt, askedAt, limitMs, progress]);

  const clockStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  const onPadSlotLayout = (event: LayoutChangeEvent) => setPadSlotWidth(event.nativeEvent.layout.width);
  // .reveal-number { font-size: 72cqw } — 72% of the pad-slot's own measured width.
  const revealFontSize = padSlotWidth > 0 ? padSlotWidth * 0.72 : 72;

  /*
   * The pad is the one thing on this screen whose size is the same on every phone of this
   * class: it is width-driven, and two phones of the same width get the same pad however
   * tall they are. Deriving the vertical rhythm from it is what keeps iOS and Android
   * matching — `justifyContent: 'center'` used to split `stageHeight - content` evenly
   * above and below, so a taller phone silently grew the gap under the clock and nothing
   * about the text or the font could correct it.
   */
  const padWidth = padWidthFor(windowWidth, windowHeight);
  const rhythm = Math.round(padWidth * 0.1);

  return (
    <View style={styles.container}>
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: palette.ink, fontFamily: FONTS.extraBold }]}>
          Q {index + 1} / {total}
        </Text>
        {total <= TICK_LIMIT && (
          <View style={styles.ticks}>
            {Array.from({ length: total }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.tick,
                  { borderColor: palette.ink, borderWidth: metrics.border },
                  i < index && { backgroundColor: palette.ink },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* .clock: height 10px, border var(--border) solid ink. */}
      <View style={[styles.clockTrack, { borderColor: palette.ink, borderWidth: metrics.border }]}>
        <Animated.View style={[styles.clockFill, { backgroundColor: palette.ink }, clockStyle]} />
      </View>

      <View style={styles.stage}>
        <View style={[styles.prompt, { marginTop: rhythm, marginBottom: rhythm }]}>
          <Text style={[styles.promptText, { color: palette.ink, fontFamily: FONTS.blackWide }]}>
            {fact.a}
          </Text>
          <View style={styles.promptTimes}>
            <TimesIcon size={PROMPT_SIZE * 0.42} color={palette.ink} />
          </View>
          <Text style={[styles.promptText, { color: palette.ink, fontFamily: FONTS.blackWide }]}>
            {fact.b}
          </Text>
        </View>

        <View style={[styles.padSlot, { maxWidth: padWidth }]} onLayout={onPadSlotLayout}>
          {/* .pad-slot.revealing .pad { visibility: hidden } — hidden, not unmounted, so
              the pad keeps reserving its own footprint and nothing shifts under the number. */}
          <View style={revealing ? styles.hidden : undefined}>
            <SlashPad
              status={status}
              onSlash={onSlash}
              onTap={onTap}
              pending={pending}
              resetKey={String(attempt)}
            />
          </View>
          {revealing && (
            <Text
              style={[
                styles.revealNumber,
                { color: palette.ink, fontFamily: FONTS.black, fontSize: revealFontSize },
              ]}
            >
              {product(fact)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    gap: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 14,
    letterSpacing: 1.4,
  },
  ticks: {
    flexDirection: 'row',
    gap: 4,
  },
  tick: {
    width: 14,
    height: 14,
  },
  clockTrack: {
    height: 10,
    overflow: 'hidden',
  },
  clockFill: {
    height: '100%',
    width: '100%',
    transformOrigin: 'left',
  },
  // No justifyContent and no gap: both are set from the pad's width on the elements below,
  // so the clock-to-prompt-to-pad rhythm is identical on every device and whatever height
  // is left over collects under the pad — where a keypad wants to be anyway.
  stage: {
    flex: 1,
    alignItems: 'center',
    minHeight: 0,
  },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // .prompt { gap: 0.07em } at the prompt size. One spacing knob, like the web rule:
    // a gap and padding on the × used to compound into roughly twice this.
    gap: Math.round(PROMPT_SIZE * 0.07),
  },
  promptText: {
    fontSize: PROMPT_SIZE,
    lineHeight: PROMPT_SIZE,
    letterSpacing: -3,
    // Android reserves room for accents above and below every glyph; iOS does not. Left on,
    // the same 84px prompt measures taller here, opening a gap under the clock that iOS
    // never shows. No digit in a prompt carries an accent, so there is nothing to reserve.
    includeFontPadding: false,
  },
  // .prompt .times { margin-left: 0.04em }: the tracking above is applied after each digit
  // but not after the drawn ×, which would otherwise sit closer to its left neighbour.
  promptTimes: {
    marginLeft: 3,
  },
  padSlot: {
    width: '100%',
  },
  hidden: {
    opacity: 0,
  },
  revealNumber: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
