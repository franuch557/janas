// Diagnoza na start: krótki zestaw prawdziwych zadań CKE z różnych tematów.

import type { CkeTask } from './cke';

export const DIAGNOSIS_MINUTES = 30;
export const DIAGNOSIS_MIN_TASKS = 6;
export const DIAGNOSIS_MAX_TASKS = 12;
const MAX_OPEN = 2;

export interface DiagnosisSelection {
  taskIds: string[];
  minutes: number;
  topics: string[];
  /** Zestaw ma co najmniej 6 zadań. */
  enough: boolean;
}

/**
 * Wybór zadań do diagnozy: po jednym zadaniu z kolejnych tematów (według
 * priorytetu), najpierw zamknięte sprawdzane automatycznie i krótkie, ze
 * starszych arkuszy (nowsze zostają na arkusze próbne). Suma czasu
 * do 30 minut, od 6 do 12 zadań, najwyżej 2 otwarte (chyba że przedmiot nie ma
 * dość zamkniętych z kluczem odpowiedzi; wtedy krótkie otwarte z samooceną).
 */
export function selectDiagnosis(tasks: CkeTask[], topicOrder: string[]): DiagnosisSelection {
  const cands = tasks
    .filter((t) => !t.essay && !t.alternative && t.maxPoints <= 3 && t.topics.length > 0)
    .sort((a, b) => Number(b.auto) - Number(a.auto) || a.year - b.year || a.minutes - b.minutes || a.id.localeCompare(b.id));
  // przedmiot bez zamkniętych z kluczem (np. matematyka rozszerzona): krótkie otwarte z samooceną
  const autoCount = cands.filter((t) => t.auto).length;
  if (autoCount < DIAGNOSIS_MIN_TASKS) cands.sort((a, b) => Number(b.auto) - Number(a.auto) || a.minutes - b.minutes || a.year - b.year || a.id.localeCompare(b.id));
  const maxOpen = autoCount >= DIAGNOSIS_MIN_TASKS ? MAX_OPEN : DIAGNOSIS_MAX_TASKS;
  let order = [...topicOrder, ...new Set(cands.flatMap((t) => t.topics))].filter((x, i, arr) => arr.indexOf(x) === i);
  if (autoCount < DIAGNOSIS_MIN_TASKS) {
    const minOf = (tp: string) => Math.min(...cands.filter((t) => t.topics.includes(tp)).map((t) => t.minutes), 999);
    order = [...order].sort((a, b) => minOf(a) - minOf(b));
  }
  const chosen: CkeTask[] = [];
  if (autoCount < DIAGNOSIS_MIN_TASKS) {
    // bez zamkniętych z kluczem: najkrótsze zadania, najpierw z różnych tematów
    let mins = 0;
    const byMin = [...cands].sort((a, b) => a.minutes - b.minutes || a.year - b.year || a.id.localeCompare(b.id));
    const seenTopics = new Set<string>();
    for (const pass of [0, 1]) {
      for (const t of byMin.filter((x) => pass === 1 || x.minutes <= byMin[0].minutes)) {
        if (chosen.length >= DIAGNOSIS_MAX_TASKS || chosen.includes(t) || mins + t.minutes > DIAGNOSIS_MINUTES + 15) continue;
        if (pass === 0 && seenTopics.has(t.topics[0])) continue;
        chosen.push(t);
        mins += t.minutes;
        seenTopics.add(t.topics[0]);
      }
    }
    return { taskIds: chosen.map((t) => t.id), minutes: mins, topics: [...new Set(chosen.flatMap((t) => t.topics))], enough: chosen.length >= DIAGNOSIS_MIN_TASKS };
  }
  const used = new Set<string>();
  let minutes = 0;
  let open = 0;
  let progress = true;
  while (chosen.length < DIAGNOSIS_MAX_TASKS && progress) {
    progress = false;
    for (const topic of order) {
      if (chosen.length >= DIAGNOSIS_MAX_TASKS) break;
      const limit = autoCount < DIAGNOSIS_MIN_TASKS ? DIAGNOSIS_MINUTES + 15 : chosen.length < DIAGNOSIS_MIN_TASKS ? DIAGNOSIS_MINUTES + 6 : DIAGNOSIS_MINUTES;
      const ok = (t: CkeTask) => !used.has(t.id) && (t.auto || open < maxOpen) && minutes + t.minutes <= limit;
      const cand = cands.find((t) => ok(t) && t.topics[0] === topic) ?? cands.find((t) => ok(t) && t.topics.includes(topic));
      if (!cand) continue;
      chosen.push(cand);
      used.add(cand.id);
      minutes += cand.minutes;
      if (!cand.auto) open++;
      progress = true;
    }
  }
  return {
    taskIds: chosen.map((t) => t.id),
    minutes,
    topics: [...new Set(chosen.flatMap((t) => t.topics))],
    enough: chosen.length >= DIAGNOSIS_MIN_TASKS,
  };
}
