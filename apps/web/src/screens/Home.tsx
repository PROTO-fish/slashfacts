import { sanitizeTables } from '@slash/core';
import { NightToggle } from '../components/NightToggle.js';
import { TableSelect } from '../components/TableSelect.js';
import type { AppState } from '../state.js';

/**
 * One question — which tables — and then the only thing to do about it.
 *
 * The mastery map used to live here and confused everyone who opened the app: it showed a
 * score before anything had been played. It now appears where it means something, at the
 * end of a round and in FACTS.
 */
export function Home({
  app,
  onStart,
  onStats,
}: {
  app: AppState;
  onStart: () => void;
  onStats: () => void;
}) {
  const { settings, setSettings } = app;
  const tables = sanitizeTables(settings.tables);

  return (
    <main>
      <div className="home">
        <div className="home-main">
          <h2 className="page-title">TABLES</h2>
          <TableSelect
            selected={tables}
            onSelect={(next) => setSettings({ ...settings, tables: next })}
          />
        </div>

        <div className="actions">
          <button className="launch" onClick={onStart}>
            START
          </button>
          <button className="launch second" onClick={onStats}>
            FACTS
          </button>
        </div>

        {/* One control, and nothing to balance it against: it sits on the centre line. */}
        <div className="footer center">
          <NightToggle
            on={settings.night}
            onToggle={() => setSettings({ ...settings, night: !settings.night })}
          />
        </div>
      </div>
    </main>
  );
}
