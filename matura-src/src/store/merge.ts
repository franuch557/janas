// Podział stanu na dokumenty bazy i scalanie danych z dwóch urządzeń.
// Zdarzenia łączę po id; stan, sesje i wypracowania według updatedAt.

import type { AppEvent, DayOverride, Essay, LocalData, Session, Stan, UserTask } from '../model';
import { chunkEvents, mergeEvents } from '../logic/events';
import { newerSession, parseSession } from '../logic/session';
import { addDays } from '../logic/dates';
import { fixStan } from './local';

export const DOC_LIMIT = 256 * 1024;

export type Docs = Record<string, Record<string, unknown>>;

/** Dokumenty `data/users/<id>/…` z lokalnego stanu. */
export function toDocs(data: LocalData, today: string): Docs {
  const docs: Docs = {};
  // stare nadpisania planu nie są potrzebne: zostawiam dwa tygodnie wstecz
  const keepFrom = addDays(today, -14);
  const overrides = Object.fromEntries(Object.entries(data.stan.overrides).filter(([d]) => d >= keepFrom));
  docs.stan = { ...data.stan, overrides };
  for (const [key, events] of Object.entries(chunkEvents(data.events))) docs[key] = { typ: 'wyniki', events };
  for (const s of Object.values(data.sessions)) docs[`sesja-${s.id}`] = { ...s };
  const essays = [...data.essays].sort((a, b) => (a.id < b.id ? -1 : 1));
  let part = 1;
  let size = 0;
  for (const e of essays) {
    const n = JSON.stringify(e).length;
    if (size + n > 200_000 && size > 0) {
      part++;
      size = 0;
    }
    const key = part === 1 ? 'wypracowania' : `wypracowania-${part}`;
    const doc = (docs[key] ??= { typ: 'wypracowania', items: [] as Essay[] });
    (doc.items as Essay[]).push(e);
    size += n;
  }
  return docs;
}

/** Odczyt dokumentów z bazy do postaci stanu (pola mogą być niepełne). */
export function fromDocs(docs: Docs, today: string): Partial<LocalData> {
  const out: Partial<LocalData> = {};
  const events: AppEvent[] = [];
  const sessions: Record<string, Session> = {};
  const essays: Essay[] = [];
  for (const [id, body] of Object.entries(docs)) {
    if (id === 'stan') out.stan = fixStan(body, today);
    else if (id.startsWith('wyniki-') && Array.isArray(body.events)) events.push(...(body.events as AppEvent[]));
    else if (id.startsWith('sesja-')) {
      const s = parseSession(body);
      if (s) sessions[s.id] = s;
    } else if (id.startsWith('wypracowania') && Array.isArray(body.items)) essays.push(...(body.items as Essay[]));
  }
  out.events = events;
  out.sessions = sessions;
  out.essays = essays;
  return out;
}

export function mergeEssays(a: Essay[], b: Essay[]): Essay[] {
  const m = new Map<string, Essay>();
  for (const e of [...a, ...b]) {
    const cur = m.get(e.id);
    if (!cur || (e.updatedAt ?? 0) > (cur.updatedAt ?? 0)) m.set(e.id, e);
  }
  return [...m.values()];
}

/** Pola ustawień scalane osobno: wygrywa nowsza zmiana danego pola. */
export const STAN_FIELDS = ['onboarded', 'startedAt', 'enabled', 'dayMinutes', 'tutoring', 'reminder', 'theme', 'textSize', 'reported', 'notifiedOn'] as const;
type Field = (typeof STAN_FIELDS)[number];

/** JSON z posortowanymi kluczami (porównania niezależne od kolejności pól). */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as Record<string, unknown>)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v);
}

const fAt = (s: Stan, f: string) => (s.fieldAt ? s.fieldAt[f] ?? 0 : s.updatedAt ?? 0);

/**
 * Scalanie stanu po polach: ustawienia według czasu zmiany każdego pola,
 * nadpisania planu według dnia, zadania własne jako suma po id, `resetAt`
 * jako maksimum. Wynik nie zależy od kolejności argumentów.
 */
export function mergeStan(a: Stan, b: Stan): Stan {
  const resetAt = Math.max(a.resetAt || 0, b.resetAt || 0);
  const pick = <K extends Field>(f: K): { v: Stan[K]; at: number } => {
    const ta = fAt(a, f);
    const tb = fAt(b, f);
    if (ta !== tb) return ta > tb ? { v: a[f], at: ta } : { v: b[f], at: tb };
    const ja = stableStringify(a[f]);
    const jb = stableStringify(b[f]);
    return ja >= jb ? { v: a[f], at: ta } : { v: b[f], at: tb };
  };
  const fieldAt: Record<string, number> = {};
  const out: Partial<Stan> = {};
  for (const f of STAN_FIELDS) {
    const r = pick(f);
    (out as Record<string, unknown>)[f] = r.v;
    fieldAt[f] = r.at;
  }
  // ukończone powitanie na którymkolwiek urządzeniu (po ostatnim usunięciu danych)
  const onbA = a.onboarded && fAt(a, 'onboarded') >= resetAt;
  const onbB = b.onboarded && fAt(b, 'onboarded') >= resetAt;
  if (onbA || onbB) out.onboarded = true;
  const overrides: Record<string, DayOverride> = {};
  for (const d of [...new Set([...Object.keys(a.overrides ?? {}), ...Object.keys(b.overrides ?? {})])].sort()) {
    const x = a.overrides?.[d];
    const y = b.overrides?.[d];
    const at = (o: DayOverride | undefined, s: Stan) => (o ? o.at ?? s.updatedAt ?? 0 : -1);
    const ax = at(x, a);
    const by = at(y, b);
    const win = ax !== by ? (ax > by ? x : y) : stableStringify(x) >= stableStringify(y) ? x : y;
    if (win && (win.at ?? 0) >= resetAt) overrides[d] = win;
  }
  const tasks = new Map<string, UserTask>();
  for (const t of [...(a.userTasks ?? []), ...(b.userTasks ?? [])]) {
    if ((t.at ?? 0) < resetAt) continue;
    const cur = tasks.get(t.id);
    if (!cur || (t.at ?? 0) > (cur.at ?? 0)) tasks.set(t.id, t);
  }
  return {
    typ: 'stan',
    v: 3,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
    onboarded: out.onboarded!,
    startedAt: out.startedAt!,
    enabled: out.enabled!,
    dayMinutes: out.dayMinutes!,
    tutoring: out.tutoring!,
    reminder: out.reminder!,
    theme: out.theme!,
    textSize: out.textSize!,
    overrides,
    reported: out.reported!,
    userTasks: [...tasks.values()].sort((x, y) => (x.id < y.id ? -1 : 1)),
    notifiedOn: out.notifiedOn ?? null,
    resetAt,
    fieldAt,
  };
}

/** Oznacza czasem zmiany pola, dni nadpisań i zadania własne, które się zmieniły. */
export function stampStan(prev: Stan, next: Stan, now: number): Stan {
  const fieldAt: Record<string, number> = prev.fieldAt ? { ...prev.fieldAt } : Object.fromEntries(STAN_FIELDS.map((f) => [f, prev.updatedAt || 0]));
  for (const f of STAN_FIELDS) if (stableStringify(prev[f]) !== stableStringify(next[f])) fieldAt[f] = now;
  const overrides: Record<string, DayOverride> = {};
  for (const [d, o] of Object.entries(next.overrides)) {
    const old = prev.overrides[d];
    overrides[d] = !old || stableStringify({ ...old, at: 0 }) !== stableStringify({ ...o, at: 0 }) ? { ...o, at: now } : o;
  }
  // usunięty dzień zostaje jako pusty wpis z czasem, żeby nie wrócił z drugiego urządzenia
  for (const d of Object.keys(prev.overrides)) if (!(d in next.overrides)) overrides[d] = { add: [], remove: [], at: now };
  const userTasks = next.userTasks.map((t) => (t.at ? t : { ...t, at: now }));
  return { ...next, fieldAt, overrides, userTasks, updatedAt: Math.max(now, prev.updatedAt + 1) };
}

export function mergeData(local: LocalData, remote: Partial<LocalData>): LocalData {
  const stan = remote.stan ? mergeStan(local.stan, remote.stan) : local.stan;
  const sessions: Record<string, Session> = { ...local.sessions };
  for (const [id, s] of Object.entries(remote.sessions ?? {})) sessions[id] = newerSession(sessions[id], s)!;
  const r = stan.resetAt || 0;
  return {
    stan,
    events: mergeEvents(local.events, remote.events ?? []).filter((e) => e.at >= r),
    sessions: Object.fromEntries(Object.entries(sessions).filter(([, s]) => s.updatedAt >= r)),
    essays: mergeEssays(local.essays, remote.essays ?? []).filter((e) => (e.updatedAt ?? 0) >= r),
  };
}

export function docSize(body: Record<string, unknown>): number {
  return new TextEncoder().encode(JSON.stringify(body)).length;
}
