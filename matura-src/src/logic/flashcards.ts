// Fiszki z powtórkami w odstępach jak w Anki (algorytm SM-2):
// każda karta ma współczynnik łatwości (ease) i odstęp w dniach (ivl).
// „Nie umiem” wraca jeszcze w tej samej sesji i obniża łatwość, więc trudne karty
// wracają częściej; „Dobrze” mnoży odstęp przez łatwość, „Łatwe” wydłuża go bardziej.

import type { Flashcard } from '../model';
import { addDays } from './dates';
import { INTERVALS } from './srs';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export const GRADES: { id: Grade; label: string }[] = [
  { id: 'again', label: 'Nie umiem' },
  { id: 'hard', label: 'Trudne' },
  { id: 'good', label: 'Dobrze' },
  { id: 'easy', label: 'Łatwe' },
];

const START_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_IVL = 180;
/** Po tylu pomyłkach karta jest oznaczona jako trudna (w Anki: „pijawka”). */
export const LEECH = 4;

/** Łatwość i odstęp karty, także dla kart zapisanych starszą wersją (pole step). */
export function cardState(c: Flashcard): { ease: number; ivl: number; lapses: number } {
  const ease = c.ease ?? START_EASE;
  const ivl = c.ivl ?? (c.reviews > 0 ? INTERVALS[Math.min(INTERVALS.length - 1, Math.max(0, c.step))] : 0);
  return { ease, ivl, lapses: c.lapses ?? 0 };
}

/** Nowy odstęp (dni) i łatwość po ocenie; odstęp 0 = karta wraca w tej sesji. */
export function schedule(c: Flashcard, g: Grade): { ivl: number; ease: number; lapses: number } {
  const { ease, ivl, lapses } = cardState(c);
  if (ivl === 0) {
    // karta nowa albo w trakcie nauki
    if (g === 'again') return { ivl: 0, ease, lapses };
    if (g === 'hard') return { ivl: 1, ease: Math.max(MIN_EASE, ease - 0.15), lapses };
    if (g === 'good') return { ivl: 1, ease, lapses };
    return { ivl: 4, ease: ease + 0.15, lapses };
  }
  if (g === 'again') return { ivl: 0, ease: Math.max(MIN_EASE, ease - 0.2), lapses: lapses + 1 };
  if (g === 'hard') return { ivl: Math.min(MAX_IVL, Math.max(ivl + 1, Math.round(ivl * 1.2))), ease: Math.max(MIN_EASE, ease - 0.15), lapses };
  if (g === 'good') return { ivl: Math.min(MAX_IVL, Math.max(ivl + 1, Math.round(ivl * ease))), ease, lapses };
  return { ivl: Math.min(MAX_IVL, Math.max(ivl + 2, Math.round(ivl * ease * 1.3))), ease: ease + 0.15, lapses };
}

/** Opis odstępu na przycisku: „teraz”, „1 d”, „2 tyg.”, „3 mies.”. */
export function ivlLabel(days: number): string {
  if (days <= 0) return 'teraz';
  if (days < 14) return `${days} d`;
  if (days < 60) return `${Math.round(days / 7)} tyg.`;
  return `${Math.round(days / 30)} mies.`;
}

export function gradeCard(c: Flashcard, g: Grade, date: string, now: number): Flashcard {
  const s = schedule(c, g);
  // po pomyłce karta wraca jeszcze dziś, a kolejny odstęp liczy się od 1 dnia
  return {
    ...c,
    ease: Math.round(s.ease * 100) / 100,
    ivl: s.ivl,
    lapses: s.lapses,
    step: s.ivl >= 14 ? 3 : s.ivl >= 7 ? 2 : s.ivl >= 3 ? 1 : 0,
    due: addDays(date, s.ivl),
    reviews: c.reviews + 1,
    reviewedOn: date,
    firstOn: c.firstOn ?? date,
    at: now,
  };
}

/** Zgodność ze starszym widokiem: „Umiem” = Dobrze, „Nie umiem” = Nie umiem (wraca jutro). */
export function reviewCard(c: Flashcard, know: boolean, date: string, now: number): Flashcard {
  const r = gradeCard(c, know ? 'good' : 'again', date, now);
  return know ? r : { ...r, ivl: 0, due: addDays(date, 1) };
}

export const isNew = (c: Flashcard) => c.reviews === 0;
export const isLeech = (c: Flashcard) => (c.lapses ?? 0) >= LEECH;

/** Karty na dziś: najpierw zaległe powtórki (najstarsze), potem nowe, najwyżej `newLimit` nowych. */
export function dueCards(cards: Flashcard[], date: string, newLimit = Infinity): Flashcard[] {
  const live = cards.filter((c) => !c.deleted && c.due <= date);
  const review = live.filter((c) => !isNew(c)).sort((a, b) => a.due.localeCompare(b.due) || cardState(a).ease - cardState(b).ease || a.at - b.at);
  const fresh = live.filter(isNew).sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  return [...review, ...fresh.slice(0, newLimit)];
}

/** Ile nowych kart wpuścić dziś: limit minus już poznane dzisiaj (jak „nowe karty/dzień” w Anki). */
export function newLeft(cards: Flashcard[], date: string, perDay: number): number {
  const seen = cards.filter((c) => !c.deleted && c.reviews > 0 && c.firstOn === date).length;
  return Math.max(0, perDay - seen);
}

/** Miejsce w kolejce sesji dla karty po „Nie umiem”: kilka kart dalej (albo na końcu). */
export function requeueAt(queueLen: number, pos: number): number {
  return Math.min(queueLen, pos + 4);
}

/** Statystyki talii: nowe, w nauce (odstęp < 21 dni), opanowane (≥ 21 dni), trudne. */
export function deckStats(cards: Flashcard[], date: string) {
  const live = cards.filter((c) => !c.deleted);
  let fresh = 0, learning = 0, mature = 0, leech = 0, due = 0;
  for (const c of live) {
    const { ivl } = cardState(c);
    if (isNew(c)) fresh++;
    else if (ivl >= 21) mature++;
    else learning++;
    if (isLeech(c)) leech++;
    if (c.due <= date) due++;
  }
  return { total: live.length, fresh, learning, mature, leech, due };
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
