// Zdarzenia wyników: scalanie po id, cofanie, historia zadań, seria dni.

import type { AppEvent, ResultEvent, SessionEvent, TickEvent } from '../model';
import { addDays } from './dates';
import { srsFromHistory, type SrsState } from './srs';

/** Suma zbiorów zdarzeń po id, posortowana po czasie. */
export function mergeEvents(...lists: AppEvent[][]): AppEvent[] {
  const byId = new Map<string, AppEvent>();
  for (const list of lists) for (const e of list) if (e && typeof e.id === 'string' && !byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export interface ActiveEvents {
  results: ResultEvent[];
  sessions: SessionEvent[];
  ticks: TickEvent[];
}

/**
 * Zdarzenia, które nie zostały cofnięte. Cofnięcie wyniku arkusza cofa też
 * wyniki jego zadań (to samo pole `session`).
 */
export function activeEvents(events: AppEvent[]): ActiveEvents {
  const undone = new Set<string>();
  for (const e of events) if (e.k === 'c') undone.add(e.target);
  // cofnięte zdarzenia wyników arkusza: id → czas i sesja
  const undoneSes = new Map<string, { at: number; session: string }>();
  for (const e of events) if (e.k === 's' && undone.has(e.id)) undoneSes.set(e.id, { at: e.at, session: e.session });
  const out: ActiveEvents = { results: [], sessions: [], ticks: [] };
  for (const e of events) {
    if (undone.has(e.id)) continue;
    if (e.k === 'w') {
      // kaskada tylko dla wyników należących do cofniętego zakończenia arkusza
      if (e.sev) {
        if (undoneSes.has(e.sev)) continue;
      } else if (e.session && [...undoneSes.values()].some((u) => u.session === e.session && e.at <= u.at)) continue;
      out.results.push(e);
    } else if (e.k === 's') out.sessions.push(e);
    else if (e.k === 'o') out.ticks.push(e);
  }
  return out;
}

export interface TaskRecord {
  history: { d: string; pts: number; max: number; pct: number; at: number; id: string; note?: string }[];
  srs: SrsState;
}

export function taskRecords(results: ResultEvent[], before?: string): Map<string, TaskRecord> {
  const hist = new Map<string, TaskRecord['history']>();
  for (const r of results) {
    if (before && r.d >= before) continue;
    const list = hist.get(r.task) ?? [];
    list.push({ d: r.d, pts: r.pts, max: r.max, pct: r.max > 0 ? Math.round((r.pts / r.max) * 100) : 0, at: r.at, id: r.id, note: r.note });
    hist.set(r.task, list);
  }
  const out = new Map<string, TaskRecord>();
  for (const [k, h] of hist) {
    h.sort((a, b) => a.at - b.at);
    out.set(k, { history: h, srs: srsFromHistory(h) });
  }
  return out;
}

/** Dni z nauką: zapisany wynik, zakończony arkusz albo odhaczona pozycja. */
export function studyDays(a: ActiveEvents): Set<string> {
  const s = new Set<string>();
  for (const e of a.results) s.add(e.d);
  for (const e of a.sessions) s.add(e.d);
  for (const e of a.ticks) s.add(e.d);
  return s;
}

/** Seria: kolejne dni z nauką kończące się dziś (albo wczoraj, jeśli dziś jeszcze nic). */
export function streak(days: Set<string>, today: string): number {
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Czas nauki w sekundach. Zadania z arkusza liczą się w czasie arkusza. */
export function studySeconds(a: ActiveEvents): number {
  let s = 0;
  for (const e of a.results) if (!e.session) s += e.sec;
  for (const e of a.sessions) s += e.sec;
  return s;
}

/** Podział zdarzeń na dokumenty `wyniki-RRRR-MM` (każdy poniżej limitu rozmiaru). */
export function chunkEvents(events: AppEvent[], limitBytes = 200_000): Record<string, AppEvent[]> {
  const byMonth = new Map<string, AppEvent[]>();
  for (const e of events) {
    const m = (e.d ?? '').slice(0, 7) || '0000-00';
    const list = byMonth.get(m) ?? [];
    list.push(e);
    byMonth.set(m, list);
  }
  const out: Record<string, AppEvent[]> = {};
  for (const [m, list] of byMonth) {
    let part = 1;
    let size = 0;
    for (const e of list) {
      const n = JSON.stringify(e).length + 1;
      if (size + n > limitBytes && size > 0) {
        part++;
        size = 0;
      }
      const key = part === 1 ? `wyniki-${m}` : `wyniki-${m}-${part}`;
      (out[key] ??= []).push(e);
      size += n;
    }
  }
  return out;
}
