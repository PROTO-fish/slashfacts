import { useCallback, useRef, useState } from 'react';
import {
  createStroke,
  extendStroke,
  strokeDigits,
  strokeKind,
  type Cell,
  type StrokeKind,
  type StrokeState,
} from '@slash/core';

interface Options {
  /** Cell rects in pad-local coordinates, measured from the DOM. */
  getCells: () => readonly Cell[];
  /**
   * Called once on release, with the registered digits, how they were entered, and the
   * settled stroke itself — the table picker needs every cell the line crossed, which is
   * deliberately not what `strokeDigits` reports.
   */
  onRelease: (digits: number[], kind: StrokeKind, stroke: StrokeState) => void;
  /** False while feedback is playing, so a stroke cannot start mid-animation. */
  enabled: boolean;
}

export interface SlashHandle {
  stroke: StrokeState;
  digits: number[];
  drawing: boolean;
  handlers: {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
  };
  reset: () => void;
}

/** Pointer capture keeps the stroke alive when the finger strays off the pad. */
function capture(element: HTMLElement, pointerId: number): void {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    /* Some synthetic and stale pointers cannot be captured; drawing still works. */
  }
}

function release(element: HTMLElement, pointerId: number): void {
  try {
    if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
  } catch {
    /* ignore */
  }
}

/** Turns raw pointer events on the pad into a stroke, and the stroke into digits. */
export function useSlash({ getCells, onRelease, enabled }: Options): SlashHandle {
  const [stroke, setStroke] = useState<StrokeState>(createStroke);
  const [drawing, setDrawing] = useState(false);
  const pointerId = useRef<number | null>(null);
  // The authoritative stroke. State updaters must stay pure — React calls them twice in
  // development — so the current stroke is read from here, never from inside setStroke.
  const strokeRef = useRef<StrokeState>(stroke);

  const commit = useCallback((next: StrokeState) => {
    strokeRef.current = next;
    setStroke(next);
  }, []);

  const reset = useCallback(() => {
    commit(createStroke());
    setDrawing(false);
    pointerId.current = null;
  }, [commit]);

  const localPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top, t: Date.now() };
  };

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || pointerId.current !== null) return;
      event.preventDefault();
      pointerId.current = event.pointerId;
      capture(event.currentTarget, event.pointerId);
      setDrawing(true);
      commit(extendStroke(createStroke(), getCells(), localPoint(event)));
    },
    [commit, enabled, getCells],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== event.pointerId) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      const cells = getCells();
      // Coalesced events keep fast strokes accurate on high-rate touch screens.
      const native = event.nativeEvent;
      const raw =
        typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [];
      const moves = raw.length > 0 ? raw : [native];
      let next = strokeRef.current;
      for (const move of moves) {
        next = extendStroke(next, cells, {
          x: move.clientX - rect.left,
          y: move.clientY - rect.top,
          t: Date.now(),
        });
      }
      commit(next);
    },
    [commit, getCells],
  );

  const finish = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, submit: boolean) => {
      if (pointerId.current !== event.pointerId) return;
      pointerId.current = null;
      setDrawing(false);
      release(event.currentTarget, event.pointerId);
      if (!submit) {
        commit(createStroke());
        return;
      }
      const settled = strokeRef.current;
      const digits = strokeDigits(settled);
      if (digits.length === 0) return;
      const kind = strokeKind(settled);
      onRelease(digits, kind, settled);
      // A tap's own mark is momentary: the pad redraws the accumulated taps instead.
      // A slash keeps its mark, so a correct answer stays on screen for a beat.
      if (kind === 'tap') commit(createStroke());
    },
    [commit, onRelease],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => finish(event, true),
    [finish],
  );
  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => finish(event, false),
    [finish],
  );

  return { stroke, digits: strokeDigits(stroke), drawing, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }, reset };
}
