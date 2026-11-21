// Zapasowe miejsce na zrzuty ekranu, gdy localStorage jest pełny.
// Każda operacja w try/catch: brak IndexedDB nie może wywrócić aplikacji.

const DB = 'matura2027-v3';
const STORE = 'obrazy';

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSet(key: string, value: string): Promise<boolean> {
  const db = await open();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGet(key: string): Promise<string | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
      r.onsuccess = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbClear(): Promise<void> {
  const db = await open();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
  } catch {
    /* brak dostępu */
  }
}
