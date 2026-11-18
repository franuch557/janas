import type { BankTask, DiagnosisItem, DiagnosisResult, Family, SubjectConfig } from '../types';
import { scoreDiagnosis } from './mastery';

/**
 * Wymagane części diagnozy według założeń: matematyka – zadania z tematów;
 * polski – tekst z pytaniami, zadanie językowe i plan rozprawki; angielski –
 * rozumienie tekstu, środki językowe i krótka wypowiedź pisemna.
 * Plan rozprawki i wypowiedź pisemna są oceniane według kryteriów, poza bankiem.
 */
export const REQUIRED_PARTS: Record<Family, { topicId: string; count: number; label: string }[]> = {
  matematyka: [],
  polski: [
    { topicId: 'pol-rozumienie', count: 2, label: 'Fragment tekstu z pytaniami do interpretacji' },
    { topicId: 'pol-jezyk', count: 1, label: 'Zadanie językowe (ortografia, interpunkcja, poprawność)' },
  ],
  angielski: [
    { topicId: 'ang-czytanie', count: 1, label: 'Rozumienie tekstu' },
    { topicId: 'ang-srodki', count: 2, label: 'Użycie języka: gramatyka i słownictwo' },
  ],
};

export interface DiagnosisSelection {
  tasks: BankTask[];
  minutes: number;
  missingParts: { topicId: string; label: string; need: number; have: number }[];
  uncoveredTopics: string[];
}

/**
 * Wybór zadań do diagnozy z banku. Biorę wyłącznie zadania z banku (CKE,
 * zadania.info, książka, własne), nigdy nie tworzę treści. Kolejność:
 * wymagane części, potem po jednym zadaniu z każdego tematu według priorytetu,
 * krótsze zadania najpierw, aż do limitu liczby zadań i czasu diagnozy.
 */
export function selectDiagnosisTasks(
  bank: BankTask[],
  subject: SubjectConfig,
  topicOrder: string[],
): DiagnosisSelection {
  const mine = bank.filter((t) => t.subjectId === subject.id);
  const chosen: BankTask[] = [];
  const used = new Set<string>();
  let minutes = 0;
  const pick = (topicId: string, required = false) => {
    const cand = mine
      .filter((t) => t.topicId === topicId && !used.has(t.id))
      .sort((a, b) => sourceRank(a) - sourceRank(b) || a.minutes - b.minutes)[0];
    // limit czasu diagnozy; części wymagane wchodzą zawsze
    if (cand && !required && chosen.length > 0 && minutes + cand.minutes > subject.diagnosisMinutes) return false;
    if (cand) {
      minutes += cand.minutes;
      chosen.push(cand);
      used.add(cand.id);
      return true;
    }
    return false;
  };
  const missingParts: DiagnosisSelection['missingParts'] = [];
  for (const part of REQUIRED_PARTS[subject.family]) {
    let have = 0;
    for (let i = 0; i < part.count; i++) if (pick(part.topicId, true)) have++;
    if (have < part.count) missingParts.push({ topicId: part.topicId, label: part.label, need: part.count, have });
  }
  const uncovered: string[] = [];
  for (const topicId of topicOrder) {
    if (chosen.length >= subject.diagnosisTasks) break;
    if (chosen.some((t) => t.topicId === topicId)) continue;
    if (!pick(topicId) && !mine.some((t) => t.topicId === topicId)) uncovered.push(topicId);
  }
  // dopełnienie do limitu kolejnymi zadaniami z tematów o najwyższym priorytecie
  for (const topicId of topicOrder) {
    while (chosen.length < subject.diagnosisTasks && pick(topicId)) {
      /* dobieraj */
    }
  }
  return {
    tasks: chosen.slice(0, Math.max(subject.diagnosisTasks, chosen.length)),
    minutes: chosen.reduce((s, t) => s + t.minutes, 0),
    missingParts,
    uncoveredTopics: uncovered,
  };
}

function sourceRank(t: BankTask): number {
  return t.source === 'CKE' ? 0 : t.source === 'zadania.info' ? 1 : t.source === 'książka' ? 2 : 3;
}

/**
 * Zapis diagnozy testowej. Kryteria oceny (wypracowanie, wypowiedź pisemna)
 * przychodzą jako dodatkowe pozycje z tematem i maksimum.
 */
export function buildDiagnosisResult(
  id: string,
  subjectId: string,
  date: string,
  items: DiagnosisItem[],
  minutes: number | null,
): DiagnosisResult {
  return { id, subjectId, date, kind: 'test', perTopic: scoreDiagnosis(items), items, minutes };
}

export function buildSelfAssessment(id: string, subjectId: string, date: string, levels: Record<string, number>): DiagnosisResult {
  const perTopic: Record<string, number> = {};
  for (const [k, v] of Object.entries(levels)) if (v >= 1 && v <= 5) perTopic[k] = Math.round(v);
  return { id, subjectId, date, kind: 'samoocena', perTopic, items: [], minutes: null };
}
