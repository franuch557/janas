// Sesja powtórek zadań: krótka sesja (5–30 min) z powtórek i nowych zadań, po każdym
// zadaniu ocena trudności (nie umiem / trudne / dobrze / łatwe), która ustala następną
// powtórkę (srs.ts). Zadanie można odłożyć na później (zdarzenie „odhaczenia” z ref `odloz:<id>`).
// Mapa pamięci: stan zadań w każdym dziale (nowe, w nauce, do powtórki, utrwalone).

import type { TickEvent } from '../model';
import { addDays, diffDays } from './dates';
import { effectivePct, isDue, nextSrs, NEW_SRS, type SrsState } from './srs';

export type Rate = 1 | 2 | 3 | 4;
export type ReviewMode = 'mieszane' | 'powtorki' | 'nowe';

export const RATES: { rate: Rate; label: string; key: string }[] = [
  { rate: 1, label: 'Nie umiem', key: '1' },
  { rate: 2, label: 'Trudne', key: '2' },
  { rate: 3, label: 'Dobrze', key: '3' },
  { rate: 4, label: 'Łatwe', key: '4' },
];

/** Minimalny opis zadania potrzebny do ułożenia sesji. */
export interface ReviewTask {
  id: string;
  subjectId: string;
  topics: string[];
  minutes: number;
  essay?: unknown;
  maxPoints: number;
}

export const POSTPONE = 'odloz:';

/** Zadania odłożone: id → dzień, do którego (włącznie) zadanie nie wraca. */
export function postponed(ticks: TickEvent[], today: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of ticks) {
    if (!t.ref.startsWith(POSTPONE)) continue;
    const [id, days] = t.ref.slice(POSTPONE.length).split('@');
    const until = addDays(t.d, Math.max(0, Number(days) || 1) - 1);
    if (until >= today && (!out.has(id) || out.get(id)! < until)) out.set(id, until);
  }
  return out;
}

export const postponeRef = (taskId: string, days = 1) => `${POSTPONE}${taskId}@${days}`;

/** Ocena trudności, gdy uczeń jej nie wybrał: z wyniku. */
export function rateFromPct(pct: number): Rate {
  return pct >= 90 ? 4 : pct >= 70 ? 3 : pct >= 40 ? 2 : 1;
}

/** Punkty z oceny trudności, gdy zadania otwartego nie oceniono punktami. */
export function ptsFromRate(rate: Rate, max: number): number {
  return Math.round(({ 1: 0, 2: 0.35, 3: 0.7, 4: 1 } as const)[rate] * max);
}

/** Następna powtórka po ocenie (podgląd na przyciskach oceny). */
export function previewNext(prev: SrsState | undefined, pct: number, rate: Rate, today: string): string | null {
  return nextSrs(prev ?? NEW_SRS, effectivePct(pct, rate), today).nextReview;
}

export function whenLabel(date: string | null, today: string): string {
  if (!date) return 'utrwalone';
  const n = diffDays(date, today);
  if (n <= 0) return 'dziś';
  if (n === 1) return 'jutro';
  if (n < 5) return `za ${n} dni`;
  if (n < 7) return `za ${n} dni`;
  if (n % 7 === 0) return n === 7 ? 'za tydzień' : `za ${n / 7} tyg.`;
  return `za ${n} dni`;
}

export interface BuildOpts {
  minutes: number;
  mode: ReviewMode;
  subjects: string[];
  topic?: string | null;
  today: string;
  /** Priorytet działu (wyższy = ważniejszy do nauki). */
  priority: (subj: string, topic: string) => number;
}

/** Status zadania na mapie pamięci. */
export type MemStatus = 'nowe' | 'nauka' | 'powtorka' | 'utrwalone';

export function memStatus(s: SrsState | undefined, today: string): MemStatus {
  if (!s || s.attempts === 0) return 'nowe';
  if (s.status === 'zrobione') return 'utrwalone';
  if (isDue(s, today)) return 'powtorka';
  return s.step >= 2 ? 'utrwalone' : 'nauka';
}

/**
 * Zestaw zadań na sesję: najpierw zaległe powtórki (najdłużej czekające), potem nowe
 * z najważniejszych działów (różne działy po kolei), w ramach czasu. Co najmniej jedno zadanie.
 */
export function buildSession<T extends ReviewTask>(pool: T[], srs: Map<string, SrsState>, skip: Map<string, string>, o: BuildOpts): T[] {
  const ok = pool.filter((t) => !t.essay && t.topics.length > 0 && o.subjects.includes(t.subjectId) && !skip.has(t.id) && (!o.topic || t.topics.includes(o.topic)));
  const due = ok
    .filter((t) => {
      const s = srs.get(t.id);
      return !!s && isDue(s, o.today);
    })
    .sort((a, b) => (srs.get(a.id)!.nextReview! < srs.get(b.id)!.nextReview! ? -1 : srs.get(a.id)!.nextReview! > srs.get(b.id)!.nextReview! ? 1 : a.id.localeCompare(b.id)));
  const fresh = ok.filter((t) => !srs.get(t.id)?.attempts);
  // nowe: działy według priorytetu, w dziale krótsze zadania najpierw, działy na zmianę
  const byTopic = new Map<string, T[]>();
  for (const t of fresh) {
    const k = `${t.subjectId}|${t.topics[0]}`;
    (byTopic.get(k) ?? byTopic.set(k, []).get(k)!).push(t);
  }
  const topics = [...byTopic.keys()].sort((a, b) => {
    const [sa, ta] = a.split('|');
    const [sb, tb] = b.split('|');
    return o.priority(sb, tb) - o.priority(sa, ta) || a.localeCompare(b);
  });
  for (const k of topics) byTopic.get(k)!.sort((a, b) => a.minutes - b.minutes || a.id.localeCompare(b.id));
  const newOrder: T[] = [];
  for (let round = 0; newOrder.length < fresh.length; round++) {
    let added = false;
    for (const k of topics) {
      const x = byTopic.get(k)![round];
      if (x) {
        newOrder.push(x);
        added = true;
      }
    }
    if (!added) break;
  }
  const queue: T[] =
    o.mode === 'powtorki' ? due : o.mode === 'nowe' ? newOrder : interleave(due, newOrder);
  const out: T[] = [];
  let used = 0;
  for (const t of queue) {
    const m = Math.max(1, t.minutes);
    if (out.length && used + m > o.minutes) continue;
    out.push(t);
    used += m;
    if (used >= o.minutes) break;
  }
  return out;
}

/** Dwie powtórki, jedno nowe – dopóki starczy obu. */
function interleave<T>(due: T[], fresh: T[]): T[] {
  const out: T[] = [];
  let i = 0;
  let j = 0;
  while (i < due.length || j < fresh.length) {
    for (let k = 0; k < 2 && i < due.length; k++) out.push(due[i++]);
    if (j < fresh.length) out.push(fresh[j++]);
  }
  return out;
}

export interface TopicMemory {
  subj: string;
  topic: string;
  counts: Record<MemStatus, number>;
  total: number;
  /** Najbliższa zaplanowana powtórka w dziale. */
  next: string | null;
}

export function memoryMap(pool: ReviewTask[], srs: Map<string, SrsState>, today: string): TopicMemory[] {
  const m = new Map<string, TopicMemory>();
  for (const t of pool) {
    if (t.essay || !t.topics.length) continue;
    const k = `${t.subjectId}|${t.topics[0]}`;
    const row = m.get(k) ?? { subj: t.subjectId, topic: t.topics[0], counts: { nowe: 0, nauka: 0, powtorka: 0, utrwalone: 0 }, total: 0, next: null };
    const s = srs.get(t.id);
    const st = memStatus(s, today);
    row.counts[st]++;
    row.total++;
    if (s?.nextReview && st !== 'powtorka' && (!row.next || s.nextReview < row.next)) row.next = s.nextReview;
    m.set(k, row);
  }
  return [...m.values()];
}

/** Ile powtórek czeka dziś (bez odłożonych). */
export function dueCount(pool: ReviewTask[], srs: Map<string, SrsState>, skip: Map<string, string>, subjects: string[], today: string): number {
  return pool.filter((t) => !t.essay && subjects.includes(t.subjectId) && !skip.has(t.id) && (() => {
    const s = srs.get(t.id);
    return !!s && isDue(s, today);
  })()).length;
}
