import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState, DayPlan, Exam, ExamsFile } from '../types';
import examsFile from '../../data/exams.json';
import { loadState, saveState } from './persist';
import { syncCkeTasks } from './bank';
import { allPriorities, type SubjectPriorities } from '../logic/priorities';
import { buildPlan } from '../logic/planner';
import { todayISO } from '../logic/dates';

export const EXAMS: Exam[] = (examsFile as ExamsFile).exams;

interface Ctx {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  today: string;
  exams: Exam[];
  priorities: Record<string, SubjectPriorities>;
  plan: DayPlan[];
  error: string | null;
  setError: (e: string | null) => void;
  notice: string | null;
  setNotice: (e: string | null) => void;
}

const AppCtx = createContext<Ctx | null>(null);

/** Data „dziś”; do sprawdzania planu można ją nadpisać parametrem ?dzis=RRRR-MM-DD. */
function resolveToday(): string {
  const p = new URLSearchParams(window.location.search).get('dzis');
  return p && /^\d{4}-\d{2}-\d{2}$/.test(p) ? p : todayISO();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const initial = useRef(loadState());
  const [state, setState] = useState<AppState>(() => {
    const s = initial.current.state;
    return { ...s, bank: syncCkeTasks(s.bank, EXAMS, s.settings.subjects, s.settings.defaultTaskMinutes) };
  });
  const [error, setError] = useState<string | null>(initial.current.error);
  const [notice, setNotice] = useState<string | null>(null);
  const today = useMemo(resolveToday, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((prev) => {
      const next = fn(prev);
      const err = saveState(next);
      if (err) setError(err);
      return next;
    });
  }, []);

  useEffect(() => {
    const err = saveState(state);
    if (err) setError(err);
    // zapis stanu początkowego po synchronizacji zadań CKE
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = state.settings.theme;
    document.documentElement.dataset.theme = t;
  }, [state.settings.theme]);

  const priorities = useMemo(() => allPriorities(state, EXAMS, today), [state, today]);

  const plan = useMemo(() => {
    const prio: Record<string, Record<string, number>> = {};
    const mastery: Record<string, Record<string, number | null>> = {};
    for (const [id, sp] of Object.entries(priorities)) {
      prio[id] = Object.fromEntries(sp.topics.map((t) => [t.topicId, t.priority]));
      mastery[id] = Object.fromEntries(sp.topics.map((t) => [t.topicId, t.mastery]));
    }
    return buildPlan({
      settings: state.settings,
      bank: state.bank,
      exams: EXAMS,
      diagnoses: state.diagnoses,
      mocks: state.mocks,
      lessonNotes: state.lessonNotes,
      dayLog: state.dayLog,
      priorities: prio,
      mastery,
      today,
      excludeTaskIds: state.backlog,
    });
  }, [state, priorities, today]);

  const value = { state, update, today, exams: EXAMS, priorities, plan, error, setError, notice, setNotice };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('Brak kontekstu aplikacji');
  return c;
}

export function subjectName(state: AppState, id: string | null): string {
  if (!id) return '';
  return state.settings.subjects.find((s) => s.id === id)?.name ?? id;
}
