import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { activeDigits, pathThroughCells, strokePath, type Cell } from '@slash/core';
import { useSlash } from './useSlash.js';

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
 * The keypad. Not buttons: the whole pad is one gesture surface, and the cells only
 * report where they are so the geometry can decide what was drawn. A press that never
 * moves is a tap on a single digit; anything else is a slash carrying the whole answer.
 */
export function SlashPad({ status, onSlash, onTap, pending, resetKey }: Props) {
  const padRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<number, HTMLDivElement>());
  const cells = useRef<Cell[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const pad = padRef.current;
    if (!pad) return;
    const padRect = pad.getBoundingClientRect();
    const measured: Cell[] = [];
    for (const [digit, el] of cellRefs.current) {
      const r = el.getBoundingClientRect();
      measured.push({
        digit,
        x: r.left - padRect.left,
        y: r.top - padRect.top,
        w: r.width,
        h: r.height,
      });
    }
    cells.current = measured;
    setSize({ w: padRect.width, h: padRect.height });
  }, []);

  useLayoutEffect(() => {
    measure();
    const pad = padRef.current;
    if (!pad || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(pad);
    return () => observer.disconnect();
  }, [measure]);

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
  const { stroke, drawing, handlers, reset } = useSlash({
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

  const register = (digit: number) => (el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(digit, el);
    else cellRefs.current.delete(digit);
  };

  return (
    <div
      ref={padRef}
      className="pad"
      role="group"
      tabIndex={0}
      aria-label="Answer pad. Draw one stroke through the digits, or type the answer's digits on the keyboard."
      onKeyDown={(event) => {
        if (status !== 'idle') return;
        // The number keys are the keyboard's version of a tap: one digit at a time, same
        // accumulation the pointer path already does in useQuestionLoop's onTap.
        if (event.key >= '0' && event.key <= '9') {
          event.preventDefault();
          onTap(Number(event.key));
        }
      }}
      {...handlers}
    >
      <div className="pad-grid">
        {KEYS.map((digit) => (
          <div
            key={digit}
            ref={register(digit)}
            className={`cell${lit.has(digit) ? ' lit' : ''}`}
            aria-hidden="true"
          >
            {digit}
          </div>
        ))}
      </div>
      <div
        ref={register(0)}
        className={`cell zero${lit.has(0) ? ' lit' : ''}`}
        aria-hidden="true"
      >
        0
      </div>
      {showStroke && path && size.w > 0 && (
        <svg className="ink-layer" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
          <path className="casing" d={path} />
          <path className="core" d={path} />
        </svg>
      )}
    </div>
  );
}
