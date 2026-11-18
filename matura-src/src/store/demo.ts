import type { AppState, BankTask } from '../types';
import { BOOK_SECTIONS, BOOK_TITLE } from '../data/book';
import { blankTask } from './bank';
import { applyResult } from '../logic/srs';
import { addDays } from '../logic/dates';

/**
 * Przykładowe dane: odwołania do podrozdziałów z zadaniami w książce
 * (numer strony z przepisanego spisu treści, bez treści zadań).
 * Opcjonalnie przykładowe wyniki, wyraźnie oznaczone, do obejrzenia wykresów.
 * Wszystko ma identyfikator z przedrostkiem „demo-” i można to usunąć jednym przyciskiem.
 */
export function withDemo(s: AppState, today: string, withResults: boolean): AppState {
  const tasks: BankTask[] = BOOK_SECTIONS.filter((x) => x.kind === 'zadania' && x.topics.length).map((sec, i) => {
    const t = blankTask('mat-r', 'książka', sec.topics[0], 20);
    t.id = `demo-ksiazka-${i}`;
    t.page = sec.from;
    t.ref = '';
    t.note = `Przykład: ${BOOK_TITLE}, dział ${sec.chapter}, „${sec.title}”. Wybierz konkretne zadanie z tej strony.`;
    return t;
  });
  let bank = [...s.bank.filter((t) => !t.id.startsWith('demo-')), ...tasks];
  if (withResults) {
    const sample = [35, 60, 80, 45, 90, 70, 55, 30, 85, 65];
    let k = 0;
    bank = bank.map((t) => {
      if (!t.id.startsWith('demo-') || k >= 24) return t;
      const r = sample[k % sample.length];
      const d = addDays(today, -(24 - k));
      k++;
      return { ...applyResult(t, r, d, 20), note: `${t.note} Wynik przykładowy, nie Twój.` };
    });
  }
  return { ...s, bank };
}

export function withoutDemo(s: AppState): AppState {
  return { ...s, bank: s.bank.filter((t) => !t.id.startsWith('demo-')), backlog: s.backlog.filter((id) => !id.startsWith('demo-')) };
}
