const DB_NAME = 'armamods-cache';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const persistentCache = {
  async get<T>(key: string): Promise<{ data: T; timestamp: number } | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result ?? null);
          db.close();
        };
        request.onerror = () => {
          reject(request.error);
          db.close();
        };
      });
    } catch {
      return null;
    }
  },

  async set<T>(key: string, data: T, timestamp: number): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ key, data, timestamp });
        tx.oncomplete = () => {
          resolve();
          db.close();
        };
        tx.onerror = () => {
          reject(tx.error);
          db.close();
        };
      });
    } catch {
      // silent — cache is best-effort
    }
  },

  /** Remove entries older than `maxAge` ms. */
  async prune(maxAge: number): Promise<void> {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();
      const cutoff = Date.now() - maxAge;
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoff) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          db.close();
        }
      };
    } catch {
      // silent
    }
  },
};

/** Run once on load: clear entries older than 7 days. */
persistentCache.prune(7 * 24 * 60 * 60 * 1000);
