// Obrazy zadań (zrzuty ekranu, wycinki arkuszy CKE) w IndexedDB.
// localStorage ma za mały limit na obrazy.

const DB = 'matura2027-obrazy';
const STORE = 'obrazy';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function putImage(key: string, blob: Blob): Promise<IDBValidKey> {
  return tx('readwrite', (s) => s.put(blob, key));
}

export function getImage(key: string): Promise<Blob | undefined> {
  return tx('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>);
}

export function deleteImage(key: string): Promise<undefined> {
  return tx('readwrite', (s) => s.delete(key) as IDBRequest<undefined>);
}

export function allImageKeys(): Promise<IDBValidKey[]> {
  return tx('readonly', (s) => s.getAllKeys());
}

export async function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

export async function dataUrlToBlob(d: string): Promise<Blob> {
  const res = await fetch(d);
  return res.blob();
}

/**
 * Import pliku ZIP z wycinkami arkuszy (tworzy go skrypt import-cke).
 * Nazwy plików: <kod arkusza>/<nr zadania>.png, np. MMAP-R0-100-2505/5.png.
 */
export async function importImageZip(file: File): Promise<number> {
  const { unzipSync } = await import('fflate');
  const data = unzipSync(new Uint8Array(await file.arrayBuffer()));
  let n = 0;
  for (const [name, bytes] of Object.entries(data)) {
    const m = /^(?:.*\/)?([A-Z0-9-]+)\/([\d.]+)\.png$/i.exec(name);
    if (!m) continue;
    await putImage(`cke/${m[1]}/${m[2]}`, new Blob([bytes], { type: 'image/png' }));
    n++;
  }
  return n;
}
