import type { AppEvent, Session, SessionEvent } from '../model';
import type { CkeTask } from './cke';
import type { ExamScore } from './scoring';
import { elapsed } from './session';

/**
 * Zakończenie sesji: zdarzenia wyników zadań i wynik całości. Ponowne
 * zakończenie (np. „Oceń pozostałe”) cofa poprzedni wynik arkusza razem z jego
 * wynikami zadań i zapisuje komplet od nowa.
 */
export function finalizeEvents(
  s: Session,
  tasks: CkeTask[],
  score: ExamScore,
  today: string,
  existing: AppEvent[],
  now: number,
  newId: (prefix: string) => string,
): AppEvent[] {
  const src = s.mode === 'diagnoza' ? 'diagnoza' : 'arkusz';
  const undone = new Set(existing.filter((e) => e.k === 'c').map((e) => (e as { target: string }).target));
  const prevSession = existing.filter((e): e is SessionEvent => e.k === 's' && e.session === s.id && !undone.has(e.id));
  const sevId = newId('s');
  const out: AppEvent[] = [];
  for (const p of prevSession) out.push({ id: newId('c'), k: 'c', at: now, d: today, target: p.id });
  for (const t of tasks) {
    const r = score.perTask[t.id];
    if (!r || !r.counted || !r.graded) continue;
    const a = s.answers[t.id];
    out.push({ id: newId('w'), k: 'w', at: now + 1, d: today, task: t.id, subj: t.subjectId, topics: t.topics, pts: r.pts, max: r.max, sec: 0, src, choice: a?.choice, session: s.id, sev: sevId });
  }
  out.push({
    id: sevId,
    k: 's',
    at: now + 2,
    d: today,
    mode: s.mode === 'diagnoza' ? 'diagnoza' : 'arkusz',
    exam: s.examId,
    part: s.partId,
    subj: s.subjectId,
    pts: score.pts,
    max: score.max,
    graded: score.graded,
    total: score.total,
    sec: Math.round(elapsed(s, now) / 1000),
    perTopic: score.perTopic,
    session: s.id,
  });
  return out;
}

