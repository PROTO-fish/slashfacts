import type { FactId } from './facts.js';
import { RECENT_WINDOW, type FactStat } from './mastery.js';
import type { Settings } from './session.js';

/** What gets persisted. Platform-agnostic on purpose: web uses IndexedDB, native SQLite. */
export interface PersistedState {
  readonly version: 1;
  readonly stats: Record<FactId, FactStat>;
  readonly settings: Settings;
}

/** The only thing core knows about the outside world. */
export interface Storage {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
  clear(): Promise<void>;
}

export function toPersisted(
  stats: ReadonlyMap<FactId, FactStat>,
  settings: Settings,
): PersistedState {
  return { version: 1, stats: Object.fromEntries(stats), settings };
}

export function fromPersisted(state: PersistedState | null): {
  stats: Map<FactId, FactStat>;
  settings: Settings | null;
} {
  if (!state || state.version !== 1) return { stats: new Map(), settings: null };
  // Progress saved before the tick existed carries no `mastered` flag. A fact standing on a
  // correct answer is the closest honest reading of it, so those keep their tick.
  // `recent` is trimmed to the current window: progress saved under a wider window would
  // otherwise report stale answers until enough new ones pushed them out.
  const stats = new Map(
    Object.entries(state.stats).map(([id, stat]) => [
      id,
      {
        ...stat,
        mastered: stat.mastered ?? stat.streak > 0,
        recent: (stat.recent ?? []).slice(-RECENT_WINDOW),
      },
    ]),
  );
  return { stats, settings: state.settings };
}
