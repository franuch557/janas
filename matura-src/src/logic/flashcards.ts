// Fiszki z prostymi powtórkami: „Umiem” przesuwa o 1, 3, 7, 14 dni, „Nie umiem” na jutro.

import type { Flashcard } from '../model';
import { addDays } from './dates';
import { INTERVALS } from './srs';

export function reviewCard(c: Flashcard, know: boolean, date: string, now: number): Flashcard {
  if (!know) return { ...c, step: 0, due: addDays(date, 1), reviews: c.reviews + 1, reviewedOn: date, at: now };
  const step = c.reviews === 0 && c.step === 0 ? 0 : Math.min(INTERVALS.length - 1, c.step + 1);
  return { ...c, step, due: addDays(date, INTERVALS[step]), reviews: c.reviews + 1, reviewedOn: date, at: now };
}

export function dueCards(cards: Flashcard[], date: string): Flashcard[] {
  return cards.filter((c) => !c.deleted && c.due <= date).sort((a, b) => a.due.localeCompare(b.due) || a.at - b.at);
}

export function mergeCards(a: Flashcard[], b: Flashcard[]): Flashcard[] {
  const m = new Map<string, Flashcard>();
  for (const c of [...a, ...b]) {
    const cur = m.get(c.id);
    if (!cur || c.at > cur.at) m.set(c.id, c);
  }
  return [...m.values()].sort((x, y) => (x.id < y.id ? -1 : 1));
}

/** Czas pozycji „Fiszki” w planie: 5–10 min zależnie od liczby kart. */
export function cardsMinutes(n: number): number {
  return Math.max(5, Math.min(10, Math.ceil(n / 3)));
}
