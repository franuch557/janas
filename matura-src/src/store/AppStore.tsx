import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppEvent, DayOverride, Essay, LocalData, PlanItem, ResultEvent, Session, Stan } from '../model';
import { addDays, todayISO } from '../logic/dates';
import { mergeEvents } from '../logic/events';
import { EXAMS, PACK_MANIFEST, probePack, type PackState } from './catalog';
import { derive, makeInProgress, type Derived } from './derived';
import { emptyData, loadLocal, lsGet, lsKeys, lsRemove, lsSet, LS_IMG, LS_KEY, saveLocal } from './local';
import { mergeData, stampStan } from './merge';
import { idbClear, idbGet, idbSet } from './idb';
import { Sync, type SyncStatus } from './sync';

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Dzisiejsza data; parametr ?dzis=RRRR-MM-DD pozwala obejrzeć plan na inny dzień. */
function currentToday(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('dzis');
    if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
  } catch {
    /* brak dostępu do adresu */
  }
  return todayISO();
}

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export interface Flow {
  date: string;
  refs: string[];
}

interface Store {
  /** Pierwsza odpowiedź zapisu w chmurze przyszła (albo chmury nie ma). */
  ready: boolean;
  /** Pamięć przeglądarki odmówiła zapisu. */
  storageFull: boolean;
  data: LocalData;
  d: Derived;
  today: string;
  sync: SyncStatus;
  cloud: boolean;
  retrySync: () => void;
  retryPacks: () => void;
  updateStan: (fn: (s: Stan) => Stan) => void;
  addEvents: (evs: AppEvent[]) => void;
  saveResult: (r: Omit<ResultEvent, 'id' | 'k' | 'at' | 'd'>, opts?: { toast?: string | false }) => string;
  undo: (eventId: string, toast?: string) => void;
  tick: (ref: string) => void;
  putSession: (s: Session) => void;
  /** Dowolna zmiana danych (wyjaśnienia, pamięć, fiszki, raporty, ustny). */
  updateData: (fn: (d: LocalData) => LocalData) => void;
  /** Zmiana sesji na aktualnym stanie (bez nadpisywania nowszej wersji). */
  updateSession: (id: string, fn: (s: Session) => Session) => void;
  /** Zmiana stanu zapisana od razu w localStorage (zamykanie karty). */
  commitNow: (fn: (d: LocalData) => LocalData) => void;
  putEssay: (e: Essay) => void;
  editDay: (date: string, fn: (o: DayOverride, items: PlanItem[]) => DayOverride) => void;
  toast: (text: string, action?: Toast['action']) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  flow: Flow | null;
  setFlow: (f: Flow | null) => void;
  saveImage: (id: string, data: string) => Promise<void>;
  loadImage: (id: string) => Promise<string | null>;
  resetAll: () => Promise<void>;
  importData: (d: LocalData) => void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('Brak kontekstu aplikacji');
  return s;
}

export function AppStore({ children }: { children: ReactNode }) {
  const [today, setToday] = useState(currentToday);
  const [data, setData] = useState<LocalData>(() => loadLocal(currentToday()));
  const [packs, setPacks] = useState<Record<string, PackState>>({});
  const [sync, setSync] = useState<SyncStatus>({ state: 'laczenie', lastSavedAt: null, message: null });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flow, setFlow] = useState<Flow | null>(null);
  const [ready, setReady] = useState(false);
  const [storageFull, setStorageFull] = useState(false);
  const syncRef = useRef<Sync | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Zmiana dnia o północy.
  useEffect(() => {
    const t = setInterval(() => {
      const n = currentToday();
      setToday((p) => (p === n ? p : n));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Synchronizacja: jedna subskrypcja na czas życia aplikacji.
  useEffect(() => {
    const s = new Sync(currentToday, (remote) => setData((cur) => mergeData(cur, remote)), (st) => setSync({ ...st }), () => setReady(true));
    syncRef.current = s;
    void s.start();
    return () => s.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Zapis lokalny (zawsze) i do chmury (gdy dostępna), tylko po zmianie.
  const lastLocal = useRef('');
  useEffect(() => {
    const t = setTimeout(() => {
      const json = JSON.stringify(data);
      if (json !== lastLocal.current) {
        lastLocal.current = json;
        setStorageFull(!saveLocal(data));
      }
    }, 300);
    syncRef.current?.push(data);
    return () => clearTimeout(t);
  }, [data]);

  // Pakiety obrazów: sprawdzam, które arkusze mają obrazy.
  const probe = useCallback((useManifest = false) => {
    const ids = EXAMS.filter((e) => e.tasks.length > 0).map((e) => e.id);
    if (useManifest && PACK_MANIFEST) {
      const have = new Set(PACK_MANIFEST);
      setPacks(Object.fromEntries(ids.map((id) => [id, have.has(id) ? 'jest' : 'brak'])) as Record<string, PackState>);
      return;
    }
    setPacks((p) => Object.fromEntries(ids.map((id) => [id, p[id] === 'jest' ? 'jest' : 'ladowanie'])) as Record<string, PackState>);
    for (const id of ids) void probePack(id).then((st) => setPacks((p) => ({ ...p, [id]: st })));
  }, []);
  useEffect(() => probe(true), [probe]);

  const base = useMemo(() => derive({ stan: data.stan, events: data.events, memory: data.memory, cards: data.cards }, EXAMS, packs, today), [data.stan, data.events, data.memory, data.cards, packs, today]);
  const d = useMemo<Derived>(() => ({ ...base, inProgress: makeInProgress(data.sessions) }), [base, data.sessions]);

  const toastId = useRef(1);
  const toast = useCallback((text: string, action?: Toast['action']) => {
    const id = toastId.current++;
    setToasts((t) => [...t.slice(-2), { id, text, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const updateStan = useCallback((fn: (s: Stan) => Stan) => {
    setData((cur) => ({ ...cur, stan: stampStan(cur.stan, fn(cur.stan), Date.now()) }));
  }, []);

  const addEvents = useCallback((evs: AppEvent[]) => {
    setData((cur) => ({ ...cur, events: mergeEvents(cur.events, evs) }));
  }, []);

  const undo = useCallback(
    (eventId: string, text?: string) => {
      const now = Date.now();
      addEvents([{ id: newId('c'), k: 'c', at: now, d: currentToday(), target: eventId }]);
      if (text) toast(text);
    },
    [addEvents, today, toast],
  );

  const saveResult = useCallback<Store['saveResult']>(
    (r, opts) => {
      const id = newId('w');
      addEvents([{ ...r, id, k: 'w', at: Date.now(), d: currentToday() }]);
      if (opts?.toast !== false) {
        toast(opts?.toast ?? `Zapisano wynik: ${r.pts} z ${r.max} pkt.`, { label: 'Cofnij', run: () => undo(id, 'Cofnięto wynik.') });
      }
      return id;
    },
    [addEvents, today, toast, undo],
  );

  const tick = useCallback(
    (ref: string) => {
      const day = currentToday();
      const existing = d.active.ticks.find((t) => t.ref === ref && t.d === day);
      if (existing) undo(existing.id);
      else addEvents([{ id: newId('o'), k: 'o', at: Date.now(), d: day, ref }]);
    },
    [addEvents, d.active.ticks, today, undo],
  );

  const putSession = useCallback((s: Session) => {
    setData((cur) => ({ ...cur, sessions: { ...cur.sessions, [s.id]: s } }));
  }, []);

  const updateData = useCallback((fn: (d: LocalData) => LocalData) => setData(fn), []);

  const updateSession = useCallback((id: string, fn: (s: Session) => Session) => {
    setData((cur) => {
      const s = cur.sessions[id];
      if (!s) return cur;
      const next = fn(s);
      return next === s ? cur : { ...cur, sessions: { ...cur.sessions, [id]: next } };
    });
  }, []);

  const commitNow = useCallback((fn: (d: LocalData) => LocalData) => {
    const prev = dataRef.current;
    const next = fn(prev);
    if (next === prev) return;
    dataRef.current = next;
    saveLocal(next);
    setData((cur) => (cur === prev ? next : fn(cur)));
  }, []);

  // Zamykanie karty: zapis od razu, bez czekania na opóźniony zapis.
  useEffect(() => {
    const flush = () => {
      saveLocal(dataRef.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const putEssay = useCallback((e: Essay) => {
    setData((cur) => ({ ...cur, essays: [...cur.essays.filter((x) => x.id !== e.id), e] }));
  }, []);

  const editDay = useCallback<Store['editDay']>(
    (date, fn) => {
      const items = d.plan.days.find((x) => x.date === date)?.items ?? [];
      updateStan((s) => {
        const cur = s.overrides[date] ?? { add: [], remove: [] };
        return { ...s, overrides: { ...s.overrides, [date]: fn(cur, items) } };
      });
    },
    [d.plan.days, updateStan],
  );

  const imgCache = useRef(new Map<string, string>());
  const saveImage = useCallback(async (id: string, img: string) => {
    imgCache.current.set(id, img);
    // localStorage, a gdy pełny: IndexedDB
    if (!lsSet(LS_IMG + id, img)) await idbSet(LS_IMG + id, img);
    await syncRef.current?.saveImage(id, img);
  }, []);
  const loadImage = useCallback(async (id: string) => {
    const hit = imgCache.current.get(id) ?? lsGet(LS_IMG + id) ?? (await idbGet(LS_IMG + id));
    if (hit) {
      imgCache.current.set(id, hit);
      return hit;
    }
    const remote = (await syncRef.current?.loadImage(id)) ?? null;
    if (remote) {
      imgCache.current.set(id, remote);
      if (!lsSet(LS_IMG + id, remote)) await idbSet(LS_IMG + id, remote);
    }
    return remote;
  }, []);

  const resetAll = useCallback(async () => {
    const s = syncRef.current;
    const imageIds = dataRef.current.stan.userTasks.map((u) => u.imageId).filter(Boolean) as string[];
    if (s?.cloud) await s.deleteAll([...s.knownDocIds().filter((x) => x !== 'stan'), ...imageIds.map((i) => `obraz-${i}`)]);
    for (const k of lsKeys()) if (k.startsWith(LS_IMG)) lsRemove(k);
    await idbClear();
    imgCache.current.clear();
    lsRemove(LS_KEY);
    const fresh = emptyData(currentToday());
    const now = Date.now();
    fresh.stan.resetAt = now;
    fresh.stan.updatedAt = now;
    setData(fresh);
    setFlow(null);
  }, [today]);

  const importData = useCallback((imp: LocalData) => {
    setData((cur) => {
      return mergeData(cur, imp);
    });
  }, []);

  const store: Store = {
    ready,
    storageFull,
    data,
    d,
    today,
    sync,
    cloud: syncRef.current?.cloud ?? false,
    retrySync: () => syncRef.current?.retry(),
    retryPacks: () => probe(false),
    updateStan,
    addEvents,
    saveResult,
    undo,
    tick,
    putSession,
    updateData,
    updateSession,
    commitNow,
    putEssay,
    editDay,
    toast,
    toasts,
    dismissToast,
    flow,
    setFlow,
    saveImage,
    loadImage,
    resetAll,
    importData,
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function tomorrowOf(date: string): string {
  return addDays(date, 1);
}
