import type { Exam, Family, Level } from '../types';

export interface ExamFilter {
  family: Family;
  level: Level;
  yearFrom: number;
  yearTo: number;
  includeOldFormula: boolean;
  excluded: string[];
}

/**
 * Arkusze w wybranym zakresie lat. Arkusze poprzedniej formuły są zwracane
 * tylko po włączeniu i zawsze z flagą `oldFormula`, żeby widok mógł je
 * oznaczyć i liczyć osobno.
 */
export function filterExams(exams: Exam[], f: ExamFilter): { current: Exam[]; old: Exam[] } {
  const inRange = exams.filter(
    (e) =>
      e.family === f.family &&
      e.level === f.level &&
      e.year >= f.yearFrom &&
      e.year <= f.yearTo &&
      !f.excluded.includes(e.id),
  );
  return {
    current: inRange.filter((e) => e.formula === '2023'),
    old: f.includeOldFormula ? inRange.filter((e) => e.formula !== '2023') : [],
  };
}

/** Lata dostępne w bazie dla przedmiotu i poziomu. */
export function availableYears(exams: Exam[], family: Family, level: Level): number[] {
  return [...new Set(exams.filter((e) => e.family === family && e.level === level && e.session !== 'zbiór').map((e) => e.year))].sort();
}

export interface ExamIssue {
  examId: string;
  kind: 'suma' | 'brak punktów' | 'brak zadań' | 'brak maksimum' | 'brak tematu' | 'duplikat' | 'brak odpowiedzi' | 'zła odpowiedź';
  message: string;
}

/**
 * Suma punktów zadań i grup o znanej punktacji. Zadania z tym samym `alternative`
 * (np. dwa tematy wypracowania) liczę raz.
 */
export function examPointSum(e: Exam): { known: number; unknownTasks: string[] } {
  const groups = e.groups ?? [];
  const grouped = new Set(groups.flatMap((g) => g.tasks));
  let known = groups.reduce((s, g) => s + g.points, 0);
  const unknownTasks: string[] = [];
  const alt = new Set<string>();
  for (const t of e.tasks) {
    if (grouped.has(t.nr)) continue;
    if (t.alternative) {
      if (alt.has(t.alternative)) continue;
      alt.add(t.alternative);
    }
    if (t.maxPoints == null) unknownTasks.push(t.nr);
    else known += t.maxPoints;
  }
  return { known, unknownTasks };
}

export function validateExam(e: Exam): ExamIssue[] {
  const issues: ExamIssue[] = [];
  if (e.maxPoints == null) {
    issues.push({ examId: e.id, kind: 'brak maksimum', message: 'Brak maksymalnej liczby punktów w sprawdzonych źródłach.' });
  }
  if (e.tasks.length === 0 && (e.groups ?? []).length === 0) {
    issues.push({ examId: e.id, kind: 'brak zadań', message: 'Brak listy zadań. Potrzebny PDF arkusza do importu.' });
    return issues;
  }
  const seen = new Set<string>();
  for (const t of e.tasks) {
    if (seen.has(t.nr)) issues.push({ examId: e.id, kind: 'duplikat', message: `Zadanie ${t.nr} występuje dwa razy.` });
    seen.add(t.nr);
    if (t.topics.length === 0) issues.push({ examId: e.id, kind: 'brak tematu', message: `Zadanie ${t.nr} nie ma przypisanego tematu.` });
    if (t.type === 'zamknięte' && t.answer === null) {
      issues.push({ examId: e.id, kind: 'brak odpowiedzi', message: `Zadanie ${t.nr}: brak odpowiedzi z zasad oceniania.` });
    }
    for (const i of t.answer?.items ?? []) {
      if (i.correct != null && !i.options.includes(i.correct)) {
        issues.push({ examId: e.id, kind: 'zła odpowiedź', message: `Zadanie ${t.nr}: odpowiedź ${i.correct} spoza opcji.` });
      }
    }
  }
  const { known, unknownTasks } = examPointSum(e);
  if (unknownTasks.length > 0) {
    issues.push({
      examId: e.id,
      kind: 'brak punktów',
      message: `Nieznana punktacja zadań: ${unknownTasks.join(', ')}.`,
    });
  }
  if (e.maxPoints != null && unknownTasks.length === 0 && known !== e.maxPoints) {
    issues.push({
      examId: e.id,
      kind: 'suma',
      message: `Suma punktów zadań to ${known}, a maksimum arkusza to ${e.maxPoints}.`,
    });
  }
  if (e.maxPoints != null && unknownTasks.length > 0 && known > e.maxPoints) {
    issues.push({
      examId: e.id,
      kind: 'suma',
      message: `Znane punkty (${known}) przekraczają maksimum arkusza (${e.maxPoints}).`,
    });
  }
  return issues;
}

export function validateAll(exams: Exam[]): ExamIssue[] {
  return exams.flatMap(validateExam);
}

export function examLabel(e: Exam): string {
  const lvl = e.level === 'rozszerzony' ? 'rozsz.' : 'podst.';
  const f = e.formula === '2023' ? '' : ' (poprzednia formuła)';
  return `${e.year} ${e.session}, ${lvl}${f}`;
}
