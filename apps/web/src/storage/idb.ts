import type { PersistedState, Storage } from '@slash/core';

const DB_NAME = 'slashfacts';
const STORE = 'state';
const KEY = 'current';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

/**
 * All progress lives on the device. No accounts, no network, nothing to leak.
 * Every failure degrades to "no saved progress" rather than breaking the practice loop.
 */
export const webStorage: Storage = {
  async load() {
    try {
      const value = await run<PersistedState | undefined>('readonly', (store) => store.get(KEY));
      return value ?? null;
    } catch {
      return null;
    }
  },
  async save(state) {
    try {
      await run('readwrite', (store) => store.put(state, KEY));
    } catch {
      /* A full or blocked database must never interrupt a round. */
    }
  },
  async clear() {
    try {
      await run('readwrite', (store) => store.delete(KEY));
    } catch {
      /* ignore */
    }
  },
};
