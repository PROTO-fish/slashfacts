import { useCallback, useMemo, useRef, useState } from 'react';
import { Gesture, type ComposedGesture } from 'react-native-gesture-handler';
import {
  createStroke,
  DEFAULT_STROKE_CONFIG,
  extendStroke,
  strokeDigits,
  strokeKind,
  type Cell,
  type StrokeConfig,
  type StrokeKind,
  type StrokeState,
} from '@slash/core';

/**
 * The web inset (0.18) assumes a mouse. A finger lands wide, and the gap between cells
 * already keeps a stroke from clipping its neighbour, so a band that deep only makes
 * strokes that visibly cross a cell register nothing.
 */
const NATIVE_STROKE_CONFIG: StrokeConfig = { ...DEFAULT_STROKE_CONFIG, insetRatio: 0.08 };

interface Options {
  /** Cell rects in pad-local coordinates, measured from onLayout. */
  getCells: () => readonly Cell[];
  /**
   * Called once on release, with the registered digits, how they were entered, and the
   * settled stroke itself — the table picker needs every cell the line crossed, which is
   * deliberately not what `strokeDigits` reports. Mirrors apps/web/src/slash/useSlash.ts.
   */
  onRelease: (digits: number[], kind: StrokeKind, stroke: StrokeState) => void;
  /** False while feedback is playing, so a stroke cannot start mid-animation. */
  enabled: boolean;
}

export interface SlashHandle {
  stroke: StrokeState;
  digits: number[];
  drawing: boolean;
  gesture: ComposedGesture;
  reset: () => void;
}

/**
 * Native counterpart of useSlash.ts: turns a react-native-gesture-handler pan into a
 * stroke through the same `extendStroke`. Gets simpler than the web version rather than
 * harder — event.x/event.y already arrive in the pad's local coordinate space, so there is
 * no getBoundingClientRect, and RNGH keeps tracking a finger that strays off the pad on its
 * own, so there is no setPointerCapture either.
 */
export function useSlashNative({ getCells, onRelease, enabled }: Options): SlashHandle {
  const [stroke, setStroke] = useState<StrokeState>(createStroke);
  const [drawing, setDrawing] = useState(false);
  // The authoritative stroke, same discipline as the web hook: state updaters stay pure,
  // and the gesture callbacks (which run once per frame, not through React's render cycle)
  // read and write this ref instead of relying on a stale closure over `stroke`.
  const strokeRef = useRef<StrokeState>(stroke);
  const getCellsRef = useRef(getCells);
  getCellsRef.current = getCells;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const commit = useCallback((next: StrokeState) => {
    strokeRef.current = next;
    setStroke(next);
  }, []);

  const reset = useCallback(() => {
    commit(createStroke());
    setDrawing(false);
  }, [commit]);

  const gesture = useMemo(() => {
    const release = (settled: StrokeState) => {
      const digits = strokeDigits(settled);
      if (digits.length === 0) return;
      const kind = strokeKind(settled, NATIVE_STROKE_CONFIG);
      onReleaseRef.current(digits, kind, settled);
      // A tap's own mark is momentary: the pad redraws the accumulated taps instead.
      // A slash keeps its mark, so a correct answer stays on screen for a beat.
      if (kind === 'tap') commit(createStroke());
    };

    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(enabled)
      .minDistance(0)
      .shouldCancelWhenOutside(false)
      .onBegin((event) => {
        setDrawing(true);
        commit(
          extendStroke(
            createStroke(),
            getCellsRef.current(),
            { x: event.x, y: event.y, t: Date.now() },
            NATIVE_STROKE_CONFIG,
          ),
        );
      })
      .onUpdate((event) => {
        commit(
          extendStroke(
            strokeRef.current,
            getCellsRef.current(),
            { x: event.x, y: event.y, t: Date.now() },
            NATIVE_STROKE_CONFIG,
          ),
        );
      })
      .onEnd(() => {
        setDrawing(false);
        release(strokeRef.current);
      })
      .onFinalize((_event, success) => {
        // A cancelled gesture (interrupted by the OS, or a second finger landing) must
        // not submit a partial answer — mirrors onPointerCancel on the web.
        if (!success) {
          commit(createStroke());
          setDrawing(false);
        }
      });

    // A finger that lands and lifts without travelling never activates the pan, so its
    // onEnd never runs. The tap covers exactly that case, and loses the race the moment
    // the finger moves far enough for the pan to take over.
    const tap = Gesture.Tap()
      .runOnJS(true)
      .enabled(enabled)
      .maxDistance(NATIVE_STROKE_CONFIG.tapSlop)
      .onEnd((event, success) => {
        if (!success) return;
        setDrawing(false);
        release(
          extendStroke(
            createStroke(),
            getCellsRef.current(),
            { x: event.x, y: event.y, t: Date.now() },
            NATIVE_STROKE_CONFIG,
          ),
        );
      });

    return Gesture.Race(pan, tap);
    // enabled is read fresh on every render via .enabled(enabled); commit is stable.
  }, [commit, enabled]);

  return { stroke, digits: strokeDigits(stroke), drawing, gesture, reset };
}
