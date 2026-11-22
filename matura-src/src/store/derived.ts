// Wszystko, co wynika ze stanu ucznia i katalogu: historia zadań, seria,
// biegłość, prognoza, diagnozy i plan. Liczone w jednym miejscu (useMemo).

import { SUBJECTS, type DayPlan, type LocalData, type PlanItem, type ResultEvent, type SessionEvent, type SubjectId, type UserTask } from '../model';
import { examMinutes, examPartIds, taskLabel, type CkeExam, type CkeTask } from '../logic/cke';
import { activeEvents, streak, studyDays, studySeconds, taskRecords, type ActiveEvents, type TaskRecord } from '../logic/events';
import { forecast, isDiagnosed, masteryMap, weakBoost, type Forecast, type TopicMastery } from '../logic/mastery';
import { memoryBoost } from '../logic/memory';
import { computeWeights, topicPriority, topicStats } from '../logic/weights';
import { buildPlan, mockKey, type PlanExam, type PlanResult, type PlanTask } from '../logic/planner';
import { selectDiagnosis, DIAGNOSIS_MINUTES, type DiagnosisSelection } from '../logic/diagnosis';
import { topicsFor } from '../data/taxonomy';
import type { SrsState } from '../logic/srs';
import type { PackState } from './catalog';

export interface AppTask extends CkeTask {
  label: string;
  user?: UserTask;
}

export interface DoneInfo {
  pts: number | null;
  max: number | null;
  at: number;
  eventId: string;
}

export interface Derived {
  today: string;
  exams: CkeExam[];
  examById: Map<string, CkeExam>;
  tasks: Map<string, AppTask>;
  packs: Record<string, PackState>;
  packsLoading: boolean;
  packsError: boolean;
  active: ActiveEvents;
  records: Map<string, TaskRecord>;
  days: Set<string>;
  streak: number;
  studySec: number;
  mastery: Record<SubjectId, Record<string, TopicMastery>>;
  weights: Record<SubjectId, Record<string, number>>;
  priorities: Record<SubjectId, Record<string, number>>;
  forecast: Record<SubjectId, Forecast>;
  diagnosed: Set<SubjectId>;
  diagnosis: Record<SubjectId, DiagnosisSelection>;
  plannable: PlanTask[];
  srsBefore: Map<string, SrsState>;
  plan: PlanResult;
  todayPlan: DayPlan | null;
  /** Zadania dostępne do rozwiązania (z obrazem) w przedmiocie. */
  available: Record<SubjectId, AppTask[]>;
  /** Wykonanie pozycji planu danego dnia. */
  doneOf: (date: string, item: PlanItem) => DoneInfo | null;
  inProgress: (item: PlanItem) => boolean;
}

export function userTaskToApp(u: UserTask): AppTask {
  return {
    id: u.id,
    examId: '',
    subjectId: u.subjectId,
    nr: '',
    maxPoints: u.maxPoints,
    type: 'otwarte',
    auto: false,
    answer: null,
    topics: [u.topicId],
    summary: u.text ? u.text.slice(0, 120) : null,
    context: null,
    audio: null,
    alternative: null,
    essay: null,
    partId: null,
    minutes: Math.max(5, u.maxPoints * 4),
    year: 0,
    session: '',
    label: u.source === 'zadania.info' ? `zadania.info ${u.ref}`.trim() : u.ref || 'Zadanie dodane',
    user: u,
  };
}

/** Wszystko poza stanem sesji (sesje zmieniają się przy każdym kliknięciu odpowiedzi). */
export function derive(data: Pick<LocalData, 'stan' | 'events' | 'memory' | 'cards'>, exams: CkeExam[], packs: Record<string, PackState>, today: string): Omit<Derived, 'inProgress'> {
  const stan = data.stan;
  const examById = new Map(exams.map((e) => [e.id, e]));
  const tasks = new Map<string, AppTask>();
  for (const e of exams) for (const t of e.tasks) tasks.set(t.id, { ...t, label: taskLabel(t) });
  for (const u of stan.userTasks) tasks.set(u.id, userTaskToApp(u));

  const withTasks = exams.filter((e) => e.tasks.length > 0);
  const packsLoading = withTasks.some((e) => (packs[e.id] ?? 'ladowanie') === 'ladowanie');
  const packsError = !packsLoading && withTasks.length > 0 && withTasks.every((e) => packs[e.id] === 'blad');
  const reported = new Set(stan.reported);
  const hasImage = (t: AppTask) => (t.user ? !!t.user.imageId || !!t.user.text : packs[t.examId] === 'jest');

  const active = activeEvents(data.events);
  const records = taskRecords(active.results);
  const before = taskRecords(active.results, today);
  const srsBefore = new Map<string, SrsState>([...before].map(([k, v]) => [k, v.srs]));
  const days = studyDays(active);

  const mastery = {} as Derived['mastery'];
  const weights = {} as Derived['weights'];
  const priorities = {} as Derived['priorities'];
  const fc = {} as Derived['forecast'];
  const diagnosed = new Set<SubjectId>();
  const diagnosis = {} as Derived['diagnosis'];
  const available = {} as Derived['available'];
  for (const s of SUBJECTS) {
    const topics = topicsFor(s.family, s.level);
    const ex = exams.filter((e) => e.subjectId === s.id);
    const w = computeWeights(topicStats(ex, topics), 'bazowo');
    weights[s.id] = w;
    const m = masteryMap(active.results, s.id, topics.map((t) => t.id));
    mastery[s.id] = m;
    const p: Record<string, number> = {};
    for (const t of topics) p[t.id] = topicPriority(w[t.id] ?? 0, m[t.id]?.value ?? null, weakBoost(active.results, s.id, t.id, today) + memoryBoost(data.memory, s.id, t.id), undefined);
    priorities[s.id] = p;
    if (isDiagnosed(active.sessions, s.id)) diagnosed.add(s.id);
    fc[s.id] = forecast(w, m, diagnosed.has(s.id));
    const avail = [...tasks.values()].filter((t) => t.subjectId === s.id && hasImage(t) && !reported.has(t.id));
    available[s.id] = avail;
    const order = Object.entries(p).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    diagnosis[s.id] = selectDiagnosis(avail.filter((t) => !t.user), order);
  }

  const plannable: PlanTask[] = SUBJECTS.flatMap((s) =>
    available[s.id].filter((t) => t.topics.length > 0 && (!t.user || !!t.user.imageId)).map((t) => ({ id: t.id, subjectId: t.subjectId, topics: t.topics, minutes: t.minutes, essay: !!t.essay, image: true })),
  );
  const planExams: PlanExam[] = exams
    .filter((e) => e.complete && packs[e.id] === 'jest')
    .map((e) => ({ id: e.id, subjectId: e.subjectId, year: e.year, parts: examPartIds(e).map((id) => ({ id, minutes: examMinutes(e, id) })) }));

  const mocksDone = new Set<string>();
  const diagnosedBefore = new Set<SubjectId>();
  const doneToday = { tasks: [] as string[], mocks: [] as string[], diagnosed: [] as SubjectId[] };
  for (const s of active.sessions) {
    if (s.mode === 'arkusz' && s.exam) {
      if (s.d < today) mocksDone.add(mockKey(s.exam, s.part));
      else doneToday.mocks.push(mockKey(s.exam, s.part));
    }
    if (s.mode === 'diagnoza') {
      if (s.d < today) diagnosedBefore.add(s.subj);
      else doneToday.diagnosed.push(s.subj);
    }
  }
  for (const r of active.results) if (r.d >= today) doneToday.tasks.push(r.task);
  const lastStudied: Partial<Record<SubjectId, string>> = {};
  for (const r of active.results) if (r.d < today && (!lastStudied[r.subj] || lastStudied[r.subj]! < r.d)) lastStudied[r.subj] = r.d;

  const diagnosisMinutes: Partial<Record<SubjectId, number>> = {};
  for (const s of SUBJECTS) if (diagnosis[s.id].enough) diagnosisMinutes[s.id] = Math.max(DIAGNOSIS_MINUTES, diagnosis[s.id].minutes);

  const plan = buildPlan({
    today,
    enabled: stan.enabled,
    dayMinutes: stan.dayMinutes,
    tutoring: stan.tutoring,
    overrides: stan.overrides,
    tasks: plannable,
    exams: planExams,
    srs: srsBefore,
    mocksDone,
    diagnosed: diagnosedBefore,
    diagnosisMinutes,
    doneToday,
    priorities,
    lastStudied,
    cardsDue: (date) => data.cards.filter((c) => !c.deleted && (date === today ? c.due <= date || c.reviewedOn === date : c.due === date)).length,
  });

  const resultsByDay = new Map<string, ResultEvent[]>();
  for (const r of active.results) {
    const l = resultsByDay.get(r.d) ?? [];
    l.push(r);
    resultsByDay.set(r.d, l);
  }
  const sessionsByDay = new Map<string, SessionEvent[]>();
  for (const s of active.sessions) {
    const l = sessionsByDay.get(s.d) ?? [];
    l.push(s);
    sessionsByDay.set(s.d, l);
  }
  const doneOf = (date: string, it: PlanItem): DoneInfo | null => {
    if (it.taskId) {
      const t = tasks.get(it.taskId);
      const ids = new Set([it.taskId]);
      if (t?.alternative) for (const o of tasks.values()) if (o.examId === t.examId && o.alternative === t.alternative) ids.add(o.id);
      const r = (resultsByDay.get(date) ?? []).filter((x) => ids.has(x.task)).slice(-1)[0];
      return r ? { pts: r.pts, max: r.max, at: r.at, eventId: r.id } : null;
    }
    if (it.kind === 'arkusz') {
      const s = (sessionsByDay.get(date) ?? []).filter((x) => x.mode === 'arkusz' && x.exam === it.examId && (x.part ?? null) === (it.partId ?? null)).slice(-1)[0];
      return s ? { pts: s.pts, max: s.max, at: s.at, eventId: s.id } : null;
    }
    if (it.kind === 'diagnoza') {
      const s = (sessionsByDay.get(date) ?? []).filter((x) => x.mode === 'diagnoza' && x.subj === it.subjectId).slice(-1)[0];
      return s ? { pts: s.pts, max: s.max, at: s.at, eventId: s.id } : null;
    }
    const t = active.ticks.filter((x) => x.d === date && x.ref === it.ref).slice(-1)[0];
    return t ? { pts: null, max: null, at: t.at, eventId: t.id } : null;
  };
  return {
    today,
    exams,
    examById,
    tasks,
    packs,
    packsLoading,
    packsError,
    active,
    records,
    days,
    streak: streak(days, today),
    studySec: studySeconds(active),
    mastery,
    weights,
    priorities,
    forecast: fc,
    diagnosed,
    diagnosis,
    plannable,
    srsBefore,
    plan,
    todayPlan: plan.days.find((d) => d.date === today) ?? null,
    available,
    doneOf,
  };
}

/** Czy pozycja planu ma trwającą sesję (arkusz, diagnoza, wypracowanie). */
export function makeInProgress(sessions: LocalData['sessions']): (it: PlanItem) => boolean {
  const running = Object.values(sessions).filter((s) => s.status !== 'koniec');
  return (it: PlanItem) =>
    running.some((s) =>
      it.kind === 'arkusz'
        ? s.mode === 'arkusz' && s.examId === it.examId && (s.partId ?? null) === (it.partId ?? null)
        : it.kind === 'diagnoza'
          ? s.mode === 'diagnoza' && s.subjectId === it.subjectId
          : it.kind === 'wypracowanie'
            ? s.mode === 'wypracowanie' && s.taskIds.includes(it.taskId ?? '')
            : false,
    );
}
