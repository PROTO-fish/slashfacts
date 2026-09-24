import type { Score } from '@slash/core';

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/**
 * How a result is read: the two figures over the breakdown they came from, so the same
 * words mean the same thing wherever they appear.
 */
export function Result({ score }: { score: Score }) {
  return (
    <>
      <div className="panel score-panel score-summary">
        {/* Two figures, each said out loud: a bare "2.0s" does not say of what. */}
        <div className="couple">
          <span className="stat">
            <span className="figure">{Math.round(score.rate * 100)}%</span>
            <span className="label">CORRECT</span>
          </span>
          <span className="metric-divider" aria-hidden="true" />
          <span className="stat">
            <span className="figure">{seconds(score.meanMs)}</span>
            <span className="label">PER ANSWER</span>
          </span>
        </div>
      </div>

      <div className="panel score-panel score-tables">
        <h3 className="panel-title">TABLES</h3>
        {/*
         * Always shown, one table or eight: it is the only thing naming which tables were
         * sat, and a rate without its test means nothing. It also carries the exact counts
         * the percentage rounds away, so it never merely restates the headline.
         */}
        <table className="breakdown">
          <tbody>
            {score.byTable.map((row) => (
              <tr key={row.table}>
                <th>TABLE {row.table}</th>
                <td>
                  {row.correct}/{row.asked}
                </td>
                <td>{row.correct === 0 ? '—' : seconds(row.meanMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
