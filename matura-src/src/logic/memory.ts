// Pamięć: krótkie notatki o trudnościach ucznia według tematu. Trafiają do
// promptów (wyjaśnienia, ocena) i podnoszą priorytet tematu w planie.

import type { MemoryNote, MistakeType, SubjectId } from '../model';

export const MEMORY_PER_SUBJECT = 40;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '').trim();

/**
 * Dopisuje notatki: ta sama treść w tym samym temacie zwiększa licznik zamiast
 * dublować wpis. Na przedmiot zostaje najwyżej 40 wpisów – odpadają najrzadsze
 * i najstarsze.
 */
export function addNotes(notes: MemoryNote[], add: Omit<MemoryNote, 'id' | 'count' | 'at'>[], now: number, mkId: () => string): MemoryNote[] {
  const out = notes.map((n) => ({ ...n }));
  for (const a of add) {
    const text = a.note.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!text) continue;
    const same = out.find((n) => !n.deleted && n.subj === a.subj && n.topic === a.topic && n.type === a.type && norm(n.note) === norm(text));
    if (same) {
      same.count += 1;
      same.at = now;
    } else out.push({ ...a, note: text, id: mkId(), count: 1, at: now });
  }
  return capNotes(out);
}

export function capNotes(notes: MemoryNote[]): MemoryNote[] {
  const bySubj = new Map<SubjectId, MemoryNote[]>();
  for (const n of notes) {
    if (n.deleted) continue;
    const l = bySubj.get(n.subj) ?? [];
    l.push(n);
    bySubj.set(n.subj, l);
  }
  const drop = new Set<string>();
  for (const list of bySubj.values()) {
    if (list.length <= MEMORY_PER_SUBJECT) continue;
    const sorted = [...list].sort((a, b) => a.count - b.count || a.at - b.at);
    for (const n of sorted.slice(0, list.length - MEMORY_PER_SUBJECT)) drop.add(n.id);
  }
  return notes.filter((n) => !drop.has(n.id));
}

export function activeNotes(notes: MemoryNote[], subj?: SubjectId): MemoryNote[] {
  return notes.filter((n) => !n.deleted && (!subj || n.subj === subj)).sort((a, b) => b.count - a.count || b.at - a.at);
}

/** Zdanie do promptu: „Uczeń często: …”. */
export function memoryHint(notes: MemoryNote[], subj: SubjectId, topic: string | null, max = 8): string {
  const mine = activeNotes(notes, subj);
  const first = [...mine.filter((n) => n.topic === topic), ...mine.filter((n) => n.topic !== topic)].slice(0, max);
  if (!first.length) return '';
  return `Uczeń często: ${first.map((n) => `${n.note}${n.count > 1 ? ` (${n.count}×)` : ''}`).join('; ')}.`;
}

/** Premia priorytetu tematu za powtarzające się błędy koncepcyjne z pamięci. */
export function memoryBoost(notes: MemoryNote[], subj: SubjectId, topic: string): number {
  const n = notes.filter((x) => !x.deleted && x.subj === subj && x.topic === topic && x.type === 'koncepcyjny').reduce((a, x) => a + x.count, 0);
  return Math.min(0.6, 0.15 * n);
}

export function mergeNotes(a: MemoryNote[], b: MemoryNote[]): MemoryNote[] {
  const m = new Map<string, MemoryNote>();
  for (const n of [...a, ...b]) {
    const cur = m.get(n.id);
    if (!cur || n.at > cur.at || (n.at === cur.at && n.deleted && !cur.deleted)) m.set(n.id, n);
  }
  return [...m.values()].sort((x, y) => (x.id < y.id ? -1 : 1));
}

export const MISTAKE_TYPES: MistakeType[] = ['rachunkowy', 'koncepcyjny', 'zapis', 'brak kroku', 'inne'];
