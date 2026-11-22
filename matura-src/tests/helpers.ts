// Dane testowe. Zadania mają sztuczne identyfikatory i nie udają prawdziwych zadań.
import type { Exam, ExamTask } from '../src/types';
import type { PlanTask } from '../src/logic/planner';
import type { CkeTask } from '../src/logic/cke';
import type { SubjectId } from '../src/model';

/** Zadanie do planera (z obrazem, chyba że podano inaczej). */
export function planTask(id: string, subjectId: SubjectId, topic: string, over: Partial<PlanTask> = {}): PlanTask {
  return { id, subjectId, topics: [topic], minutes: 10, essay: false, image: true, ...over };
}

/** Zadanie z katalogu CKE w postaci aplikacji. */
export function ckeTask(id: string, over: Partial<CkeTask> = {}): CkeTask {
  return {
    id,
    examId: 'E',
    subjectId: 'mat-p',
    nr: id,
    maxPoints: 1,
    type: 'otwarte',
    auto: false,
    answer: null,
    topics: ['logarytmy'],
    summary: null,
    context: null,
    audio: null,
    alternative: null,
    essay: null,
    rubric: null,
    partId: null,
    minutes: 4,
    year: 2024,
    session: 'maj',
    ...over,
  };
}

export function examTask(nr: string, maxPoints: number | null, topics: string[], type: ExamTask['type'] = 'otwarte'): ExamTask {
  return { nr, maxPoints, type, topics, summary: null, proof: null, cases: null, page: null, source: 'test' };
}

export function exam(over: Partial<Exam> & { id: string; year: number }): Exam {
  return {
    family: 'matematyka',
    level: 'rozszerzony',
    session: 'maj',
    formula: '2023',
    maxPoints: 10,
    minutes: 180,
    urls: { arkusz: [], zasady: [] },
    status: 'pełny',
    tasks: [],
    groups: [],
    sources: ['test'],
    ...over,
  };
}
