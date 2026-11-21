import { addDays } from './dates';

/** Odstępy powtórek w dniach. */
export const INTERVALS = [1, 3, 7, 14] as const;

/**
 * Odstęp do następnej powtórki zależny od ostatniego wyniku:
 * poniżej 50% – 1 dzień, 50–69% – 3 dni, 70–89% – 7 dni, od 90% – 14 dni.
 */
export function intervalFor(result: number): number {
  if (result < 50) return 1;
  if (result < 70) return 3;
  if (result < 90) return 7;
  return 14;
}

export function stepFor(result: number): number {
  return INTERVALS.indexOf(intervalFor(result) as (typeof INTERVALS)[number]);
}

export type SrsStatus = 'nowe' | 'do powtórki' | 'zrobione';

export interface SrsState {
  status: SrsStatus;
  step: number;
  nextReview: string | null;
  lastDate: string | null;
  lastPct: number | null;
  attempts: number;
}

export const NEW_SRS: SrsState = { status: 'nowe', step: 0, nextReview: null, lastDate: null, lastPct: null, attempts: 0 };

/**
 * Stan powtórki po kolejnym wyniku. Wynik od 90% po powtórce z odstępem
 * 14 dni kończy zadanie: nie wraca już do planu.
 */
export function nextSrs(prev: SrsState, pct: number, date: string): SrsState {
  const r = Math.max(0, Math.min(100, Math.round(pct)));
  const finished = r >= 90 && prev.step === 3 && prev.attempts > 0;
  const step = stepFor(r);
  return {
    status: finished ? 'zrobione' : 'do powtórki',
    step,
    nextReview: finished ? null : addDays(date, INTERVALS[step]),
    lastDate: date,
    lastPct: r,
    attempts: prev.attempts + 1,
  };
}

export function srsFromHistory(history: { d: string; pct: number }[]): SrsState {
  let s = NEW_SRS;
  for (const h of history) s = nextSrs(s, h.pct, h.d);
  return s;
}

export function isDue(s: SrsState, date: string): boolean {
  return s.status === 'do powtórki' && s.nextReview != null && s.nextReview <= date;
}
