// Powtórki pytań z lektur: każda odpowiedź w quizie to zdarzenie „odhaczenia” z ref
// `lq:<lektura>:<nr pytania>:<1|0>:<los>`, więc synchronizuje się jak reszta. Z historii
// odpowiedzi liczę stan powtórki (te same odstępy co dla zadań: srs.ts).

import type { TickEvent } from '../model';
import { isDue, srsFromHistory, type SrsState } from './srs';

export const LQ = 'lq:';

export const lqKey = (book: string, i: number) => `${LQ}${book}:${i}`;

export function lqRef(book: string, i: number, ok: boolean): string {
  return `${lqKey(book, i)}:${ok ? 1 : 0}:${Math.random().toString(36).slice(2, 8)}`;
}

export function parseLq(key: string): { book: string; i: number } | null {
  const m = key.match(/^lq:([a-z0-9-]+):(\d+)/);
  return m ? { book: m[1], i: Number(m[2]) } : null;
}

/** Stan powtórki każdego pytania z lektury: klucz `lq:<lektura>:<nr>`. */
export function bookRecords(ticks: TickEvent[]): Map<string, SrsState> {
  const hist = new Map<string, { d: string; pct: number; at: number }[]>();
  for (const t of ticks) {
    const m = t.ref.match(/^(lq:[a-z0-9-]+:\d+):([01])/);
    if (!m) continue;
    (hist.get(m[1]) ?? hist.set(m[1], []).get(m[1])!).push({ d: t.d, pct: m[2] === '1' ? 100 : 0, at: t.at });
  }
  const out = new Map<string, SrsState>();
  for (const [k, h] of hist) out.set(k, srsFromHistory(h.sort((a, b) => a.at - b.at)));
  return out;
}

/** Pytania z lektur do powtórki dziś, najdłużej czekające najpierw. */
export function dueBookQuestions(recs: Map<string, SrsState>, today: string, skip?: Map<string, string>): string[] {
  return [...recs]
    .filter(([k, s]) => isDue(s, today) && !skip?.has(k))
    .sort((a, b) => (a[1].nextReview! < b[1].nextReview! ? -1 : a[1].nextReview! > b[1].nextReview! ? 1 : a[0].localeCompare(b[0])))
    .map(([k]) => k);
}

/** Wplata pytań z lektur co trzecią pozycję (po jednym na minutę) w ramach czasu sesji. */
export function mixBookQuestions(taskIds: string[], taskMinutes: number, bookIds: string[], minutes: number): string[] {
  const room = Math.max(0, minutes - taskMinutes);
  const take = bookIds.slice(0, Math.max(taskIds.length ? Math.min(room, bookIds.length) : Math.min(minutes, bookIds.length), 0));
  const out: string[] = [];
  let j = 0;
  for (let i = 0; i < taskIds.length; i++) {
    out.push(taskIds[i]);
    if (i % 2 === 1 && j < take.length) out.push(take[j++]);
  }
  while (j < take.length) out.push(take[j++]);
  return out;
}
