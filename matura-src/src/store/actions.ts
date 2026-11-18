import type { AppState, BankTask, DayPlan, ErrorType, MockResult, PlanItem } from '../types';
import { applyResult } from '../logic/srs';
import { newId } from './bank';

/** Zamraża dzień: od tej chwili plan tego dnia nie zmienia się przy przeliczeniu. */
export function freezeDay(s: AppState, day: DayPlan): AppState {
  if (s.dayLog[day.date]?.frozen) return s;
  return { ...s, dayLog: { ...s.dayLog, [day.date]: { date: day.date, items: day.items, done: s.dayLog[day.date]?.done ?? {}, frozen: true } } };
}

export interface TaskOutcome {
  result: number | null;
  minutes: number | null;
  note: string;
  errorType: ErrorType | null;
}

/** Zapis wyniku zadania z planu: bank, harmonogram powtórek, dziennik dnia i dziennik błędów. */
export function recordItem(s: AppState, day: DayPlan, item: PlanItem, out: TaskOutcome): AppState {
  let next = freezeDay(s, day);
  const log = next.dayLog[day.date];
  next = { ...next, dayLog: { ...next.dayLog, [day.date]: { ...log, done: { ...log.done, [item.key]: { result: out.result, minutes: out.minutes, note: out.note } } } } };
  if (item.taskId && out.result != null) {
    next = {
      ...next,
      bank: next.bank.map((t) => (t.id === item.taskId ? { ...applyResult(t, out.result!, day.date, out.minutes), note: out.note ? appendNote(t.note, day.date, out.note) : t.note } : t)),
      backlog: next.backlog.filter((id) => id !== item.taskId),
    };
  }
  if (out.errorType && item.subjectId) {
    next = {
      ...next,
      errors: [
        ...next.errors,
        { id: newId('b'), subjectId: item.subjectId, taskId: item.taskId, topicId: item.topicId, type: out.errorType, note: out.note, date: day.date },
      ],
    };
  }
  return next;
}

export function undoItem(s: AppState, date: string, key: string): AppState {
  const log = s.dayLog[date];
  if (!log) return s;
  const done = { ...log.done };
  delete done[key];
  return { ...s, dayLog: { ...s.dayLog, [date]: { ...log, done } } };
}

function appendNote(old: string, date: string, note: string): string {
  const line = `${date}: ${note}`;
  return old ? `${old}\n${line}` : line;
}

/** Pozycje z minionych dni, które miały zadanie i nie mają wyniku. */
export function missedItems(s: AppState, today: string): { date: string; item: PlanItem }[] {
  const out: { date: string; item: PlanItem }[] = [];
  for (const [date, log] of Object.entries(s.dayLog)) {
    if (date >= today) continue;
    for (const it of log.items) {
      if (!it.taskId || (it.kind !== 'zadanie' && it.kind !== 'powtórka')) continue;
      if (log.done[it.key]?.result != null) continue;
      const t = s.bank.find((b) => b.id === it.taskId);
      if (!t || t.lastSolved && t.lastSolved >= date) continue;
      out.push({ date, item: it });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Zapis arkusza próbnego: wynik, powtórki zadań CKE poniżej 50%, wpisy do dziennika błędów. */
export function recordMock(
  s: AppState,
  mock: MockResult,
  taskPct: Record<string, { bankId: string | null; pct: number | null; errorType: ErrorType | null; note: string; topicId: string | null }>,
): AppState {
  let bank = s.bank;
  const errors = [...s.errors];
  for (const [, v] of Object.entries(taskPct)) {
    if (v.bankId && v.pct != null) bank = bank.map((t) => (t.id === v.bankId ? applyResult(t, v.pct!, mock.date, null) : t));
    if (v.errorType) {
      errors.push({ id: newId('b'), subjectId: mock.subjectId, taskId: v.bankId, topicId: v.topicId, type: v.errorType, note: v.note, date: mock.date });
    }
  }
  return { ...s, bank, errors, mocks: [...s.mocks, mock] };
}

export function upsertTask(s: AppState, t: BankTask): AppState {
  const exists = s.bank.some((x) => x.id === t.id);
  return { ...s, bank: exists ? s.bank.map((x) => (x.id === t.id ? t : x)) : [...s.bank, t] };
}

export function removeTask(s: AppState, id: string): AppState {
  return { ...s, bank: s.bank.filter((x) => x.id !== id), backlog: s.backlog.filter((x) => x !== id) };
}
