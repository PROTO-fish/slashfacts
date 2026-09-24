import { openDatabaseSync } from 'expo-sqlite';
import type { PersistedState, Storage } from '@slash/core';

const DB_NAME = 'slashfacts.db';
const db = openDatabaseSync(DB_NAME);

// Awaited by every call below before touching the table, so the first load()/save() on a
// fresh install can never race the table's own creation.
const ready = db.execAsync(
  'CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);',
);

/**
 * All progress lives on the device. No accounts, no network, nothing to leak. Mirrors
 * apps/web/src/storage/idb.ts one for one: same Storage contract, same discipline that a
 * storage failure degrades to "no saved progress" rather than breaking the practice loop.
 */
export const nativeStorage: Storage = {
  async load() {
    try {
      await ready;
      const row = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM state WHERE key = ?',
        ['current'],
      );
      return row ? (JSON.parse(row.value) as PersistedState) : null;
    } catch {
      return null;
    }
  },
  async save(state) {
    try {
      await ready;
      await db.runAsync(
        'INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
        ['current', JSON.stringify(state)],
      );
    } catch {
      /* A full or blocked database must never interrupt a round. */
    }
  },
  async clear() {
    try {
      await ready;
      await db.runAsync('DELETE FROM state WHERE key = ?', ['current']);
    } catch {
      /* ignore */
    }
  },
};
