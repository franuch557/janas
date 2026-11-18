import type { BankTask } from '../types';
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

/**
 * Zapis wyniku zadania. Zadanie z wynikiem od 90% po powtórce z odstępem
 * 14 dni uznaję za zrobione i nie planuję go dalej.
 */
export function applyResult(task: BankTask, result: number, date: string, minutes: number | null): BankTask {
  const r = Math.max(0, Math.min(100, Math.round(result)));
  const wasLongReview = task.reviewStep === 3 && task.history.length > 0;
  const finished = r >= 90 && wasLongReview;
  const step = stepFor(r);
  return {
    ...task,
    result: r,
    lastSolved: date,
    status: finished ? 'zrobione' : 'do powtórki',
    reviewStep: step,
    nextReview: finished ? null : addDays(date, INTERVALS[step]),
    history: [...task.history, { date, result: r, minutes }],
  };
}

export function isDue(task: BankTask, date: string): boolean {
  return task.status === 'do powtórki' && task.nextReview != null && task.nextReview <= date;
}
