// Sesje arkusza, diagnozy i wypracowania: czas, wstrzymanie, zapis i odczyt.

import type { Session, SessionAnswer, SubjectId } from '../model';

export function newSession(p: {
  id: string;
  mode: Session['mode'];
  subjectId: SubjectId;
  examId: string | null;
  partId: string | null;
  taskIds: string[];
  limitMs: number | null;
  planDate: string | null;
  now: number;
}): Session {
  return {
    typ: 'sesja',
    id: p.id,
    mode: p.mode,
    subjectId: p.subjectId,
    examId: p.examId,
    partId: p.partId,
    taskIds: p.taskIds,
    createdAt: p.now,
    updatedAt: p.now,
    elapsedMs: 0,
    runningSince: null,
    limitMs: p.limitMs,
    current: 0,
    answers: {},
    plays: {},
    status: 'trwa',
    gradeIndex: 0,
    planDate: p.planDate,
    finishedAt: null,
    essayTaskId: null,
    timerOn: true,
  };
}

export function elapsed(s: Session, now: number): number {
  return s.elapsedMs + (s.runningSince != null ? Math.max(0, now - s.runningSince) : 0);
}

export function remaining(s: Session, now: number): number | null {
  return s.limitMs == null ? null : Math.max(0, s.limitMs - elapsed(s, now));
}

export function pause(s: Session, now: number, lastSeen?: number): Session {
  if (s.runningSince == null) return s;
  const until = lastSeen != null ? Math.min(now, Math.max(s.runningSince, lastSeen)) : now;
  return { ...s, elapsedMs: s.elapsedMs + Math.max(0, until - s.runningSince), runningSince: null, updatedAt: now };
}

export function resume(s: Session, now: number): Session {
  if (s.runningSince != null || s.status !== 'trwa') return s;
  return { ...s, runningSince: now, updatedAt: now };
}

/**
 * Wznowienie po odświeżeniu strony: sesja zapisana jako trwająca liczy
 * czas tylko do ostatniego znaku życia strony (`lastSeen`), a potem
 * rusza od nowa. Przerwa nie zjada czasu arkusza.
 */
export function restoreAfterReload(s: Session, now: number, lastSeen: number | null): Session {
  if (s.runningSince == null) return s;
  return pause(s, now, lastSeen ?? s.updatedAt);
}

export function setAnswer(s: Session, taskId: string, patch: Partial<SessionAnswer>, now: number): Session {
  return { ...s, answers: { ...s.answers, [taskId]: { ...s.answers[taskId], ...patch } }, updatedAt: now };
}

export function serializeSession(s: Session): string {
  return JSON.stringify(s);
}

/** Odczyt sesji z zapisu; zwraca null dla uszkodzonych danych. */
export function parseSession(raw: unknown): Session | null {
  let o: unknown = raw;
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof o !== 'object' || o === null) return null;
  const s = o as Partial<Session>;
  if (s.typ !== 'sesja' || typeof s.id !== 'string' || !Array.isArray(s.taskIds) || typeof s.subjectId !== 'string') return null;
  if (s.mode !== 'arkusz' && s.mode !== 'diagnoza' && s.mode !== 'wypracowanie') return null;
  return {
    typ: 'sesja',
    id: s.id,
    mode: s.mode,
    subjectId: s.subjectId as SubjectId,
    examId: s.examId ?? null,
    partId: s.partId ?? null,
    taskIds: s.taskIds.filter((x) => typeof x === 'string'),
    createdAt: Number(s.createdAt) || 0,
    updatedAt: Number(s.updatedAt) || 0,
    elapsedMs: Number(s.elapsedMs) || 0,
    runningSince: typeof s.runningSince === 'number' ? s.runningSince : null,
    limitMs: typeof s.limitMs === 'number' ? s.limitMs : null,
    current: Math.max(0, Math.min((s.taskIds.length || 1) - 1, Number(s.current) || 0)),
    answers: typeof s.answers === 'object' && s.answers ? s.answers : {},
    plays: typeof s.plays === 'object' && s.plays ? s.plays : {},
    status: s.status === 'ocena' || s.status === 'koniec' ? s.status : 'trwa',
    gradeIndex: Number(s.gradeIndex) || 0,
    planDate: s.planDate ?? null,
    finishedAt: typeof s.finishedAt === 'number' ? s.finishedAt : null,
    essayTaskId: s.essayTaskId ?? null,
    timerOn: s.timerOn !== false,
  };
}

/** Nowsza wersja sesji wygrywa (pole updatedAt). */
export function newerSession(a: Session | undefined, b: Session | undefined): Session | undefined {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt > a.updatedAt ? b : a;
}

/** Wstrzymanie przy wyjściu: tylko sesja, która nadal trwa (zakończona zostaje zakończona). */
export function pauseIfRunning(s: Session, now: number): Session {
  return s.status === 'trwa' ? pause(s, now) : s;
}
