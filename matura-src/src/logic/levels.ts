// Poziomy opanowania tematu (jak w Khan Academy): nowy → poznany → ćwiczony → opanowany.
// „Opanowany” wymaga dobrego wyniku w sprawdzianie mieszanym (zadania z różnych działów naraz),
// bo dopiero tam widać, czy uczeń sam rozpoznaje metodę. Błąd w sprawdzianie cofa poziom.

import type { ResultEvent, SubjectId } from '../model';
import { diffDays } from './dates';

export type Level = 'nowy' | 'poznany' | 'ćwiczony' | 'opanowany';
export const LEVELS: Level[] = ['nowy', 'poznany', 'ćwiczony', 'opanowany'];

export function topicLevel(results: ResultEvent[], subj: SubjectId, topic: string, mastery: number | null, today: string): Level {
  const mine = results.filter((r) => r.subj === subj && r.topics.includes(topic) && r.max > 0);
  if (!mine.length) return 'nowy';
  const quiz = mine.filter((r) => r.src === 'sprawdzian' && diffDays(today, r.d) <= 45).sort((a, b) => a.at - b.at);
  const lastQuiz = quiz[quiz.length - 1];
  const practiced = mastery != null && mastery >= 0.5 && mine.length >= 3;
  if (lastQuiz && lastQuiz.pts === lastQuiz.max && mastery != null && mastery >= 0.7) return 'opanowany';
  if (lastQuiz && lastQuiz.pts < lastQuiz.max) return 'poznany';
  return practiced ? 'ćwiczony' : 'poznany';
}

/** Czy w tym tygodniu był już sprawdzian mieszany. */
export function quizThisWeek(results: ResultEvent[], weekStartDate: string): boolean {
  return results.some((r) => r.src === 'sprawdzian' && r.d >= weekStartDate);
}

/** Zeszyt błędów: ostatni wynik każdego zadania poniżej maksimum, którego potem nie poprawiono. */
export function mistakes(results: ResultEvent[]): ResultEvent[] {
  const last = new Map<string, ResultEvent>();
  for (const r of [...results].sort((a, b) => a.at - b.at)) {
    if (r.max <= 0) continue;
    const key = r.task.startsWith('gen-') ? `gen:${r.subj}:${r.topics[0]}` : r.task;
    last.set(key, r);
  }
  return [...last.values()].filter((r) => r.pts < r.max).sort((a, b) => b.at - a.at);
}
