// Tiny promise-based IndexedDB wrapper — no external dependency (SURAHA_BUILD_PROMPT §1.1(2)).
// A single database with one "outbox" store holds writes made while offline (or that failed on a
// flaky connection) until Background Sync / the SyncProvider can flush them to the API.

const DB_NAME = 'suraha';
const DB_VERSION = 1;
export const OUTBOX_STORE = 'outbox';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    // SSR / private-mode guard: indexedDB can be absent.
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = db.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('status', 'status');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }),
  );
}

export const idbPut = <T>(store: string, value: T) => tx<IDBValidKey>(store, 'readwrite', (s) => s.put(value));
export const idbDelete = (store: string, key: IDBValidKey) => tx<undefined>(store, 'readwrite', (s) => s.delete(key));
export const idbGetAll = <T>(store: string) => tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
export const idbClear = (store: string) => tx<undefined>(store, 'readwrite', (s) => s.clear());
