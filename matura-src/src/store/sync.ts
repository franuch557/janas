// Synchronizacja telefon–komputer przez capability `db` artefaktu.
// Dokumenty prywatne ucznia: data/users/<id>/<dokument>. Lokalnie (poza
// artefaktem) `db` jest null i jedynym zapisem jest localStorage.
//
// Zasady z kontraktu capability:
// - jedna subskrypcja (zapytanie na kolekcję ucznia bez obrazów), w useEffect;
// - zapis tylko po zmianie, jeden naraz na dokument, zbijany w paczki;
// - przed pierwszą odpowiedzią serwera nic nie zapisuję, żeby nie nadpisać
//   wyników z innego urządzenia; po 10 s bez odpowiedzi pokazuję stan offline.

import type { LocalData } from '../model';
import { supaDb } from './supabase';
import { docSize, DOC_LIMIT, fromDocs, stableStringify, toDocs, type Docs } from './merge';

/* eslint-disable @typescript-eslint/no-explicit-any */
type DbErr = { code?: string; message?: string };
type DocSnap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined };
type QuerySnap = { docs: DocSnap[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } };
interface DocRef {
  get(): Promise<DocSnap>;
  set(d: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface Query {
  where(f: string, op: string, v: unknown): Query;
  onSnapshot(next: (s: QuerySnap) => void, err?: (e: DbErr) => void): () => void;
  get(): Promise<QuerySnap>;
}
interface Db {
  doc(path: string): DocRef;
  collection(path: string): Query;
}
interface UserCap {
  id(): Promise<string | null>;
}

export type SyncState = 'lokalnie' | 'laczenie' | 'zapisano' | 'zapisywanie' | 'offline' | 'blad';

export interface SyncStatus {
  state: SyncState;
  lastSavedAt: number | null;
  message: string | null;
}

async function use<T>(name: string): Promise<T | null> {
  try {
    const c = (window as any).claude;
    if (!c || typeof c.use !== 'function') return null;
    return ((await c.use(name)) as T) ?? null;
  } catch {
    return null;
  }
}

export class Sync {
  /** Identyfikator zalogowanego konta na stronie (ustawiany przed startem aplikacji). */
  static account: string | null = null;
  private db: Db | null = null;
  private uid: string | null = null;
  private unsub: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private serverSeen = false;
  private remoteJson: Record<string, string> = {};
  private written: Record<string, string> = {};
  private chains: Record<string, Promise<void>> = {};
  private pending: LocalData | null = null;
  private stopped = false;
  /** Dokumenty odrzucone przez serwer (za duże, limit): bez ponawiania do „Spróbuj ponownie”. */
  private blocked: Record<string, string> = {};
  private backoff = 0;
  private backoffTimer: ReturnType<typeof setTimeout> | null = null;
  /** Pierwsza odpowiedź serwera przyszła (albo wiadomo, że chmury nie ma). */
  ready = false;
  status: SyncStatus = { state: 'laczenie', lastSavedAt: null, message: null };

  constructor(
    private today: () => string,
    private onRemote: (d: Partial<LocalData>) => void,
    private onStatus: (s: SyncStatus) => void,
    private onReady: () => void = () => {},
  ) {}

  private markReady() {
    if (this.ready) return;
    this.ready = true;
    this.onReady();
  }

  get cloud(): boolean {
    return this.db != null && this.uid != null;
  }

  private setStatus(p: Partial<SyncStatus>) {
    this.status = { ...this.status, ...p };
    this.onStatus(this.status);
  }

  async start(): Promise<void> {
    let db = await use<Db>('db');
    const user = await use<UserCap>('user');
    let uid: string | null = null;
    try {
      uid = user ? await user.id() : null;
    } catch {
      uid = null;
    }
    // strona z logowaniem: dokumenty konta w Supabase (ten sam interfejs co `db` artefaktu)
    if ((!db || !uid) && Sync.account) {
      db = supaDb(Sync.account) as unknown as Db;
      uid = Sync.account;
    }
    if (this.stopped) return;
    if (!db || !uid) {
      this.setStatus({ state: 'lokalnie', message: null });
      this.markReady();
      return;
    }
    this.db = db;
    this.uid = uid;
    this.subscribe();
  }

  private col(): string {
    return `data/users/${this.uid}`;
  }

  private subscribe() {
    if (!this.db) return;
    this.setStatus({ state: 'laczenie', message: null });
    this.timer = setTimeout(() => {
      if (!this.serverSeen) this.setStatus({ state: 'offline', message: 'Brak połączenia z zapisem w chmurze. Wyniki są na tym urządzeniu.' });
      this.markReady();
    }, 10_000);
    try {
      const q = this.db.collection(this.col()).where('typ', '!=', 'obraz');
      this.unsub = q.onSnapshot(
        (snap) => this.onSnap(snap),
        (e) => {
          if (this.timer) clearTimeout(this.timer);
          this.unsub = null;
          this.markReady();
          if (isLifecycle(e)) this.disableCloud();
          else this.setStatus({ state: 'blad', message: errText(e) });
        },
      );
    } catch (e) {
      this.setStatus({ state: 'blad', message: errText(e as DbErr) });
    }
  }

  private onSnap(snap: QuerySnap) {
    const docs: Docs = {};
    for (const d of snap.docs) {
      if (!d.exists) continue;
      const body = d.data();
      if (!body) continue;
      docs[d.id] = body;
      const json = stableStringify(body);
      this.remoteJson[d.id] = json;
      // potwierdzona treść inna niż nasz ostatni zapis: ten zapis już nie obowiązuje
      if (!snap.metadata.hasPendingWrites && this.written[d.id] && this.written[d.id] !== json) delete this.written[d.id];
    }
    if (!snap.metadata.fromCache && !this.serverSeen) {
      this.serverSeen = true;
      if (this.timer) clearTimeout(this.timer);
      if (this.status.state === 'laczenie' || this.status.state === 'offline') this.setStatus({ state: 'zapisano', message: null, lastSavedAt: this.status.lastSavedAt ?? Date.now() });
    }
    this.onRemote(fromDocs(docs, this.today()));
    if (!snap.metadata.fromCache) this.markReady();
    if (this.serverSeen && this.pending) this.schedule();
  }

  /** Przyjmuje aktualny stan; zapisuje zmienione dokumenty po krótkiej przerwie. */
  push(data: LocalData) {
    this.pending = data;
    if (!this.cloud || !this.serverSeen) return;
    this.schedule();
  }

  private schedule() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), 900);
  }

  /** Ponowna próba po błędzie (przycisk „Spróbuj ponownie”). */
  retry() {
    if (!this.db) return;
    this.written = {};
    this.blocked = {};
    this.backoff = 0;
    if (!this.unsub) {
      this.serverSeen = false;
      this.subscribe();
    } else if (this.pending) this.flush();
  }

  private flush() {
    if (!this.db || !this.pending) return;
    if (this.backoffTimer) return;
    const docs = toDocs(this.pending, this.today());
    for (const [id, body] of Object.entries(docs)) {
      const json = stableStringify(body);
      if (json === this.remoteJson[id] || json === this.written[id] || json === this.blocked[id]) continue;
      if (docSize(body) > DOC_LIMIT) {
        this.blocked[id] = json;
        this.setStatus({ state: 'blad', message: 'Część danych jest za duża do zapisu w chmurze. Wyniki są na tym urządzeniu.' });
        continue;
      }
      this.written[id] = json;
      this.write(id, body, json);
    }
  }

  private write(id: string, body: Record<string, unknown>, json: string) {
    const db = this.db!;
    const path = `${this.col()}/${id}`;
    this.setStatus({ state: 'zapisywanie' });
    const prev = this.chains[id] ?? Promise.resolve();
    this.chains[id] = prev
      .then(async () => {
        if (this.written[id] !== json) return; // nowsza wersja czeka w kolejce
        try {
          await db.doc(path).set(body);
        } catch (e) {
          const err = e as DbErr;
          if (err?.code === 'unavailable') {
            await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));
            await db.doc(path).set(body);
          } else throw e;
        }
        this.remoteJson[id] = json;
        this.backoff = 0;
        this.setStatus({ state: 'zapisano', lastSavedAt: Date.now(), message: null });
      })
      .catch((e) => {
        const err = e as DbErr;
        delete this.written[id];
        if (isLifecycle(err)) return this.disableCloud();
        if (err?.code === 'invalid_argument' || err?.code === 'quota_exceeded' || err?.code === 'transform_error') {
          this.blocked[id] = json;
          return this.setStatus({ state: 'blad', message: errText(err) });
        }
        if (err?.code === 'resource_exhausted') {
          this.backoff = Math.min(60_000, this.backoff ? this.backoff * 2 : 2000);
          if (!this.backoffTimer)
            this.backoffTimer = setTimeout(() => {
              this.backoffTimer = null;
              this.flush();
            }, this.backoff);
          return this.setStatus({ state: 'zapisywanie' });
        }
        this.setStatus({ state: 'blad', message: errText(err) });
      });
  }

  async deleteAll(ids: string[]): Promise<void> {
    if (!this.db) return;
    for (const id of ids) {
      try {
        await this.db.doc(`${this.col()}/${id}`).delete();
      } catch {
        /* dokument mógł już nie istnieć */
      }
      delete this.remoteJson[id];
      delete this.written[id];
    }
  }

  knownDocIds(): string[] {
    return Object.keys(this.remoteJson);
  }

  async saveImage(id: string, data: string): Promise<boolean> {
    if (!this.db || !this.uid) return false;
    try {
      await this.db.doc(`${this.col()}/obraz-${id}`).set({ typ: 'obraz', data });
      return true;
    } catch {
      return false;
    }
  }

  async loadImage(id: string): Promise<string | null> {
    if (!this.db || !this.uid) return null;
    try {
      const s = await this.db.doc(`${this.col()}/obraz-${id}`).get();
      const d = s.exists ? s.data() : undefined;
      return typeof d?.data === 'string' ? d.data : null;
    } catch {
      return null;
    }
  }

  /** Chmura niedostępna do końca wizyty: zostaje zapis na tym urządzeniu. */
  private disableCloud() {
    this.unsub?.();
    this.unsub = null;
    this.db = null;
    this.markReady();
    this.setStatus({ state: 'lokalnie', message: 'Zapis w chmurze jest niedostępny. Wyniki są na tym urządzeniu.' });
  }

  stop() {
    this.stopped = true;
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.unsub?.();
    if (this.timer) clearTimeout(this.timer);
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }
}

function isLifecycle(e: DbErr | undefined): boolean {
  return ['revoked', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e?.code ?? '');
}

function errText(e: DbErr | undefined): string {
  if (e?.code === 'invalid_argument' || e?.code === 'transform_error') return 'Części danych nie da się zapisać w chmurze. Wyniki są na tym urządzeniu.';
  if (e?.code === 'quota_exceeded') return 'Zapis w chmurze jest pełny. Wyniki są na tym urządzeniu.';
  if (e?.code === 'revoked' || e?.code === 'not_granted') return 'Zapis w chmurze jest niedostępny. Wyniki są na tym urządzeniu.';
  return 'Nie udało się zapisać na serwerze. Wyniki są na tym urządzeniu.';
}
