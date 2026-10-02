import type { PersistedState, Storage } from '@slash/core';

// The same database, store and key as apps/web/src/storage/idb.ts. On the same origin this
// build opens the progress the previous web app saved, so switching builds loses nothing.
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
 * Web build of storage/native.ts. expo-sqlite's web backend needs a wasm worker and
 * cross-origin isolation headers; IndexedDB needs neither. Same Storage contract, same
 * discipline that a storage failure degrades to "no saved progress".
 */
export const deviceStorage: Storage = {
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
