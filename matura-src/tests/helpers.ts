// Dane testowe. Zadania mają sztuczne identyfikatory i nie udają prawdziwych zadań.
import type { BankTask, Exam, ExamTask } from '../src/types';
import { blankTask } from '../src/store/bank';

export function task(over: Partial<BankTask> & { id: string; subjectId: string; topicId: string }): BankTask {
  return { ...blankTask(over.subjectId, 'własne', over.topicId, 15), ...over };
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
