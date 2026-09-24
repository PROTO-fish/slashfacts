import { useCallback, useLayoutEffect, useRef } from 'react';
import {
  ALL_TABLES,
  strokePath,
  type Cell,
  type StrokeKind,
  type StrokeState,
} from '@slash/core';
import { useSlash } from '../slash/useSlash.js';

interface Props {
  /** The tables currently being worked on. Never empty. */
  selected: readonly number[];
  onSelect: (tables: number[]) => void;
}

/**
 * What am I practising? — the only question the home screen asks.
 *
 * It used to be the row labels of the mastery map, which made the map do two jobs at once
 * and answered a question nobody had asked yet on opening the app. Here the tables are the
 * whole screen: tap one to toggle it, or slash down several at once — the same gesture as
 * answering, drawn with the same ink, so there is still only one interaction to learn.
 */
export function TableSelect({ selected, onSelect }: Props) {
  const chosen = new Set(selected);
  const hostRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<number, HTMLDivElement>());
  const cells = useRef<Cell[]>([]);

  const measure = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const box = host.getBoundingClientRect();
    cells.current = [...rowRefs.current].map(([digit, el]) => {
      const r = el.getBoundingClientRect();
      return { digit, x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height };
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [measure]);

  const getCells = useCallback(() => cells.current, []);

  // Shared by the tap gesture and the keyboard: toggle one table, never leaving nothing
  // to practise.
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

  const slash = useSlash({ getCells, onRelease, enabled: true });
  const ink = slash.drawing ? strokePath(slash.stroke.points) : '';

  // Two columns, four rows: 2 3 / 4 5 / 6 7 / 8 9. Wide enough for a thumb, short enough
  // that all eight tables are on screen at once with room left for the buttons.
  return (
    <div className="select" ref={hostRef} {...slash.handlers}>
      {ALL_TABLES.map((table) => (
        <div
          key={table}
          className={`row${chosen.has(table) ? ' on' : ''}`}
          role="checkbox"
          tabIndex={0}
          aria-checked={chosen.has(table)}
          aria-label={`Table of ${table}`}
          onKeyDown={(event) => {
            // The gesture toggles one table on a tap; Space/Enter is the keyboard's tap.
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault();
              toggle(table);
            }
          }}
          ref={(el) => {
            if (el) rowRefs.current.set(table, el);
            else rowRefs.current.delete(table);
          }}
        >
          <span className="times">×</span>
          <span className="n">{table}</span>
          {/* Drawn, not a glyph, to match the night toggle: a check mark is the one thing
              that still reads at a glance once the cell has gone all black. */}
          {chosen.has(table) && (
            <svg className="check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M 4 13 L 10 19 L 20 6" />
            </svg>
          )}
        </div>
      ))}
      {ink && (
        <svg className="ink-layer" aria-hidden="true">
          <path className="casing" d={ink} />
          <path className="core" d={ink} />
        </svg>
      )}
    </div>
  );
}
