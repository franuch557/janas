// Tryb „5 minut”: 3 krótkie zadania zamknięte z najsłabszych tematów (nie z ostatnich
// 3 dni) i 3 fiszki do powtórki.

import type { Flashcard } from '../model';
import type { CkeTask } from './cke';
import type { SrsState } from './srs';
import { diffDays } from './dates';
import { dueCards } from './flashcards';

export function pickQuickTasks<T extends CkeTask>(
  tasks: T[],
  srs: Map<string, SrsState>,
  mastery: (subj: string, topic: string) => number | null,
  today: string,
  n = 3,
): T[] {
  const ok = tasks.filter((t) => {
    if (!t.auto || t.essay || t.minutes > 5 || t.audio || !t.topics.length) return false;
    const s = srs.get(t.id);
    return !s?.lastDate || diffDays(today, s.lastDate) >= 3;
  });
  const score = (t: T) => mastery(t.subjectId, t.topics[0]) ?? 0.5;
  const sorted = [...ok].sort((a, b) => score(a) - score(b) || a.minutes - b.minutes || a.id.localeCompare(b.id));
  // różne tematy, jeśli się da
  const out: T[] = [];
  const topics = new Set<string>();
  for (const t of sorted) {
    if (out.length >= n) break;
    if (topics.has(t.topics[0])) continue;
    out.push(t);
    topics.add(t.topics[0]);
  }
  for (const t of sorted) if (out.length < n && !out.includes(t)) out.push(t);
  return out;
}

export function pickQuickCards(cards: Flashcard[], today: string, n = 3): Flashcard[] {
  const due = dueCards(cards, today);
  if (due.length >= n) return due.slice(0, n);
  const rest = cards.filter((c) => !c.deleted && !due.includes(c)).sort((a, b) => a.due.localeCompare(b.due));
  return [...due, ...rest].slice(0, n);
}
