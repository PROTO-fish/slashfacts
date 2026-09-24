import { useEffect, useRef, useState } from 'react';
import { RECENT_WINDOW, practiceNext, tableProgress } from '@slash/core';
import type { AppState } from '../state.js';

/** Long enough to be a deliberate second tap, short enough to forget about. */
const CONFIRM_MS = 3000;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * The last few answers as squares, oldest first: black where the answer came, white where it
 * did not, dashed where there is no answer yet. No words — the squares describe the fact's
 * recent history, not the child, and a row reads at a glance without a key.
 */
function History({ recent }: { recent: readonly boolean[] }) {
  const slots = [...Array<null>(RECENT_WINDOW - recent.length).fill(null), ...recent];
  const label = `${recent.filter(Boolean).length} of last ${recent.length}`;
  return (
    <span className="history" role="img" aria-label={label}>
      {slots.map((slot, i) => (
        <span key={i} className={`mark${slot === null ? ' mark-empty' : slot ? ' mark-on' : ''}`} />
      ))}
    </span>
  );
}

/**
 * Everything the app remembers, in one place: what is left to work on, where the child is
 * fast, and the one thing that can undo it all.
 *
 * The mastery map used to live here and saturated within a few sessions: a grid gone black
 * has nothing left to say. TABLES keeps moving because speed keeps moving even once
 * everything is known, and PRACTICE NEXT shows each fact with a recent miss as its last
 * answers in squares. A table nobody has started shows up in TABLES, not here.
 */
export function Stats({ app, onHome }: { app: AppState; onHome: () => void }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const erase = () => {
    if (!armed) {
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), CONFIRM_MS);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setArmed(false);
    app.reset();
  };

  const tables = tableProgress(app.stats);
  const practice = practiceNext(app.stats);

  return (
    <main>
      <div className="home">
        <div className="home-main">
          <h2 className="page-title">FACTS</h2>

          <div className="panel">
            <h3 className="panel-title">TABLES</h3>
            <table className="tables">
              <tbody>
                {tables.map((row) => (
                  <tr key={row.table}>
                    <th>
                      <span className="times">×</span>
                      {row.table}
                    </th>
                    <td>
                      <span className="mastered-cell">
                        <span className="gauge">
                          <span
                            className="gauge-fill"
                            style={{ width: `${(row.known / row.total) * 100}%` }}
                          />
                        </span>
                        <span className="fraction">
                          {row.known}/{row.total}
                        </span>
                      </span>
                    </td>
                    <td className="pct">{row.asked === 0 ? '—' : `${Math.round(row.accuracy * 100)}%`}</td>
                    <td className="time">{row.meanMs === 0 ? '—' : seconds(row.meanMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3 className="panel-title">PRACTICE NEXT</h3>
            {practice.length === 0 ? (
              <p className="nothing">NOTHING YET</p>
            ) : (
              <table className="breakdown">
                <tbody>
                  {practice.map((entry) => (
                    <tr key={entry.id}>
                      <th>{entry.id.replace('x', ' × ')}</th>
                      <td className="status">
                        <History recent={entry.recent} />
                      </td>
                      <td className="pct">{`${Math.round(entry.accuracy * 100)}%`}</td>
                      <td className="time">{entry.meanMs === 0 ? '—' : seconds(entry.meanMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="launch second back" onClick={onHome} aria-label="Home">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 12H4M4 12L11 5M4 12L11 19" />
            </svg>
          </button>
        </div>

        <div className="footer center">
          <button className={`plain reset${armed ? ' armed' : ''}`} onClick={erase} aria-label="Reset">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {armed && <span>RESET · TAP AGAIN</span>}
          </button>
        </div>
      </div>
    </main>
  );
}
