import type {
  BankTask,
  DayLogEntry,
  DayPlan,
  Exam,
  FixedEvent,
  LessonNote,
  MockResult,
  Phase,
  PlanItem,
  Settings,
  SubjectConfig,
  DiagnosisResult,
} from '../types';
import { addDays, dateRange, diffDays, hm, weekStart, weekday } from './dates';
import { INTERVALS, stepFor } from './srs';
import { filterExams } from './exams';
import { topicName } from '../data/taxonomy';

export interface PlannerInput {
  settings: Settings;
  bank: BankTask[];
  exams: Exam[];
  diagnoses: DiagnosisResult[];
  mocks: MockResult[];
  lessonNotes: LessonNote[];
  dayLog: Record<string, DayLogEntry>;
  /** Priorytet tematów: subjectId → topicId → priorytet. */
  priorities: Record<string, Record<string, number>>;
  /** Biegłość tematów 0..1 do symulacji wyników przyszłych dni. */
  mastery: Record<string, Record<string, number | null>>;
  today: string;
  until?: string;
  /** Zadania na liście zaległych, których planer nie rusza. */
  excludeTaskIds?: string[];
}

// ---------- Czas dnia ----------

export function eventsOn(date: string, events: FixedEvent[]): FixedEvent[] {
  const wd = weekday(date);
  return events.filter((e) => {
    if (e.skipDates.includes(date)) return false;
    if (e.date) return e.date === date;
    return e.weekday === wd;
  });
}

function overlap(a1: number, a2: number, b1: number, b2: number): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

/**
 * Dostępne minuty nauki: okna dnia tygodnia przycięte do godzin dozwolonych,
 * minus zajęcia. Korepetycje (countsAsStudy) zabierają pełny czas trwania,
 * bo są nauką przedmiotu i obciążają dzień. Pozostałe zajęcia zabierają tylko
 * część wspólną z oknami nauki.
 */
export function availableMinutes(date: string, s: Settings): { minutes: number; events: FixedEvent[] } {
  const windows = s.weekWindows[weekday(date)] ?? [];
  const lo = hm(s.blockedBefore || '00:00');
  const hi = hm(s.blockedAfter || '24:00');
  const clipped = windows
    .map((w) => [Math.max(hm(w.start), lo), Math.min(hm(w.end), hi)] as const)
    .filter(([a, b]) => b > a);
  let total = clipped.reduce((sum, [a, b]) => sum + (b - a), 0);
  const evs = eventsOn(date, s.events);
  for (const e of evs) {
    const st = hm(e.start);
    const en = st + e.minutes;
    if (e.countsAsStudy) total -= e.minutes;
    else total -= clipped.reduce((sum, [a, b]) => sum + overlap(a, b, st, en), 0);
  }
  return { minutes: Math.max(0, total), events: evs };
}

// ---------- Fazy ----------

export function phaseFor(sub: SubjectConfig, date: string, s: Settings): Phase {
  if (date >= sub.examDate) return 'po egzaminie';
  if (addDays(date, 1) === sub.examDate) return 'przegląd';
  if (date >= s.mockPhaseStart) return 'arkusze';
  if (date >= s.newTopicsEnd) return 'powtórka';
  return 'nowe tematy';
}

// ---------- Symulacja ----------

interface SimTask {
  task: BankTask;
  status: BankTask['status'];
  nextReview: string | null;
  reviewStep: number;
  lastTouched: string | null;
}

const MOCK_TEMPLATE_KEY = 'arkusz';

function simApply(t: SimTask, date: string, result: number): void {
  const step = stepFor(result);
  const finished = result >= 90 && t.reviewStep === 3 && t.lastTouched != null;
  t.status = finished ? 'zrobione' : 'do powtórki';
  t.reviewStep = step;
  t.nextReview = finished ? null : addDays(date, INTERVALS[step]);
  t.lastTouched = date;
}

function itemKey(date: string, kind: string, id: string): string {
  return `${date}|${kind}|${id}`;
}

/**
 * Plan od dziś do ostatniego egzaminu. Dni przed dziś nie są planowane;
 * dzień zamrożony w dzienniku (rozpoczęty) zostaje taki, jak zapisano.
 */
export function buildPlan(input: PlannerInput): DayPlan[] {
  const s = input.settings;
  const subjects = s.subjects.filter((x) => x.enabled);
  if (!subjects.length) return [];
  const lastExam = subjects.map((x) => x.examDate).sort().slice(-1)[0];
  const until = input.until ?? lastExam;
  const excluded = new Set(input.excludeTaskIds ?? []);

  const sim = new Map<string, SimTask>();
  for (const t of input.bank) {
    sim.set(t.id, { task: t, status: t.status, nextReview: t.nextReview, reviewStep: t.reviewStep, lastTouched: t.lastSolved });
  }

  const lastStudied: Record<string, string | null> = {};
  for (const sub of subjects) lastStudied[sub.id] = null;
  for (const [date, log] of Object.entries(input.dayLog)) {
    if (date >= input.today) continue;
    for (const it of log.items) if (it.subjectId && (lastStudied[it.subjectId] ?? '') < date) lastStudied[it.subjectId] = date;
  }

  const usedExamIds = new Set(input.mocks.map((m) => m.examId).filter(Boolean) as string[]);
  const diagnosed = new Set(input.diagnoses.map((d) => d.subjectId));
  const pendingDiag = subjects
    .filter((x) => !diagnosed.has(x.id))
    .sort((a, b) => b.priority - a.priority)
    .map((x) => x.id);
  let mockRotation = 0;
  const mockDayOfWeek = new Map<string, string>(); // weekStart → wybrany dzień
  const weekTopicCount = new Map<string, Map<string, number>>(); // weekStart → `${sub}:${topic}` → liczba
  const missingShown = new Set<string>(); // brak zadań: jeden komunikat na temat w tygodniu

  const plans: DayPlan[] = [];

  for (const date of dateRange(input.today, until)) {
    const { minutes: available, events } = availableMinutes(date, s);
    const phase: Record<string, Phase> = {};
    for (const sub of subjects) phase[sub.id] = phaseFor(sub, date, s);
    const day: DayPlan = { date, weekday: weekday(date), available, used: 0, phase, items: [], shifted: [], notes: [] };

    for (const e of events) {
      day.items.push({
        key: itemKey(date, 'event', e.id),
        kind: e.countsAsStudy ? 'korepetycje' : 'zajęcia',
        subjectId: e.subjectId,
        topicId: null,
        taskId: null,
        examId: null,
        minutes: e.minutes,
        label: `${e.name}, ${e.start}`,
        reason: e.countsAsStudy ? 'Stały blok; czas odjęty od nauki tego dnia.' : 'Zajęcia stałe.',
      });
      if (e.subjectId && e.countsAsStudy) lastStudied[e.subjectId] = date;
    }

    // Dzień zamrożony: zostaje jak zapisano.
    const log = input.dayLog[date];
    if (log?.frozen) {
      day.items = log.items;
      day.used = log.items.filter(countsInBudget).reduce((a, b) => a + b.minutes, 0);
      for (const it of log.items) {
        if (it.subjectId) lastStudied[it.subjectId] = date;
        if (it.taskId && sim.has(it.taskId)) {
          const done = log.done[it.key];
          const st = sim.get(it.taskId)!;
          if (done?.result != null) simApply(st, date, done.result);
          else st.lastTouched = date; // zaplanowane: nie planuj ponownie tego samego dnia
        }
      }
      plans.push(day);
      continue;
    }

    const add = (item: PlanItem, mustFit = true): boolean => {
      if (countsInBudget(item) && day.used + item.minutes > day.available) {
        if (mustFit) day.shifted.push({ item, reason: `Brak czasu: zostało ${day.available - day.used} min, potrzeba ${item.minutes} min.` });
        return false;
      }
      day.items.push(item);
      if (countsInBudget(item)) day.used += item.minutes;
      if (item.subjectId) lastStudied[item.subjectId] = date;
      return true;
    };

    // Dzień egzaminu i dzień przed egzaminem.
    const examToday = subjects.filter((x) => x.examDate === date);
    for (const x of examToday) day.notes.push(`Egzamin: ${x.name}.`);
    const reviewDay = subjects.filter((x) => phase[x.id] === 'przegląd');
    if (reviewDay.length || examToday.length) {
      for (const x of reviewDay) {
        add({
          key: itemKey(date, 'przegląd', x.id),
          kind: 'przegląd',
          subjectId: x.id,
          topicId: null,
          taskId: null,
          examId: null,
          minutes: Math.min(45, Math.max(0, day.available - day.used)),
          label: `${x.name}: przegląd dziennika błędów, wzorów i schematów`,
          reason: 'Dzień przed egzaminem: bez nowych zadań.',
        });
      }
      if (!reviewDay.length) day.notes.push('Dzień egzaminu: bez zadań z innych przedmiotów.');
      plans.push(day);
      continue;
    }

    const active = subjects.filter((x) => ['nowe tematy', 'powtórka', 'arkusze'].includes(phase[x.id]));
    if (!active.length) {
      plans.push(day);
      continue;
    }

    // Diagnozy na starcie.
    if (pendingDiag.length) {
      const todayDiag = s.diagnosisOnePerDay ? pendingDiag.splice(0, 1) : pendingDiag.splice(0);
      for (const id of todayDiag) {
        const sub = subjects.find((x) => x.id === id)!;
        const ok = add({
          key: itemKey(date, 'diagnoza', id),
          kind: 'diagnoza',
          subjectId: id,
          topicId: null,
          taskId: null,
          examId: null,
          minutes: sub.diagnosisMinutes,
          label: `Diagnoza: ${sub.name}`,
          reason: 'Przed startem planu: sprawdzenie wiedzy z przedmiotu.',
        });
        if (!ok) pendingDiag.unshift(id);
      }
    }

    // Niedziela: podsumowanie tygodnia.
    if (day.weekday === 0) {
      add({
        key: itemKey(date, 'podsumowanie', 'tydzień'),
        kind: 'podsumowanie',
        subjectId: null,
        topicId: null,
        taskId: null,
        examId: null,
        minutes: 10,
        label: 'Podsumowanie tygodnia i propozycje zmian wag',
        reason: 'Niedziela.',
      });
    }

    // Arkusze próbne.
    const mockCandidates = active.filter((x) => x.mockMinutes != null);
    const inMockPhase = active.filter((x) => phase[x.id] === 'arkusze' && x.mockMinutes != null);
    let mockToday = false;
    if (inMockPhase.length) {
      mockToday = diffDays(date, s.mockPhaseStart) % 2 === 0;
    } else if (mockCandidates.length) {
      const ws = weekStart(date);
      if (!mockDayOfWeek.has(ws)) {
        let best = date;
        let bestMin = -1;
        for (let i = 0; i < 7; i++) {
          const d = addDays(ws, i);
          if (d < input.today) continue;
          const m = availableMinutes(d, s).minutes;
          if (m >= bestMin) {
            best = d;
            bestMin = m;
          }
        }
        mockDayOfWeek.set(ws, best);
      }
      mockToday = mockDayOfWeek.get(ws) === date && pendingDiag.length === 0 && !day.items.some((i) => i.kind === 'diagnoza');
    }
    if (mockToday) {
      const pool = inMockPhase.length ? inMockPhase : mockCandidates;
      let placed = false;
      for (let k = 0; k < pool.length && !placed; k++) {
        const sub = pool[(mockRotation + k) % pool.length];
        const free = day.available - day.used;
        if ((sub.mockMinutes ?? 0) > free) {
          day.notes.push(`Arkusz ${sub.name} (${sub.mockMinutes} min) nie mieści się w ${free} min tego dnia.`);
          continue;
        }
        const exam = pickExam(input.exams, s, sub, usedExamIds);
        if (exam) usedExamIds.add(exam.id);
        add({
          key: itemKey(date, MOCK_TEMPLATE_KEY, sub.id),
          kind: 'arkusz',
          subjectId: sub.id,
          topicId: null,
          taskId: null,
          examId: exam?.id ?? null,
          minutes: sub.mockMinutes ?? 0,
          label: exam ? `Arkusz próbny: ${sub.name}, CKE ${exam.year}` : `Arkusz próbny: ${sub.name}, zestaw z banku`,
          reason: inMockPhase.length ? 'Faza 3: arkusz co dwa dni.' : 'Arkusz próbny w tym tygodniu, w warunkach egzaminacyjnych.',
        });
        mockRotation = (mockRotation + k + 1) % Math.max(1, pool.length);
        placed = true;
      }
    }

    // Wybór przedmiotów dnia.
    const lessonDates = new Set(input.lessonNotes.map((n) => n.date));
    const scored = active
      .filter((x) => !day.items.some((i) => i.subjectId === x.id && (i.kind === 'diagnoza' || i.kind === 'arkusz')))
      .map((x) => {
        const last = lastStudied[x.id];
        const gap = last ? Math.max(0, diffDays(date, last)) : 7;
        let score = x.priority * (1 + gap);
        // przedmiot bez otwartych zadań w banku wybieram na końcu
        const open = [...sim.values()].some((t) => t.task.subjectId === x.id && t.status !== 'zrobione' && !excluded.has(t.task.id));
        if (!open) score *= 0.01;
        // Notatka z korepetycji w tej części tygodnia zmniejsza ilość zadań z tego przedmiotu.
        const nearLesson = [-1, 0, 1].some((d) => lessonDates.has(addDays(date, d)) && input.lessonNotes.some((n) => n.date === addDays(date, d) && n.subjectId === x.id));
        if (nearLesson) score *= 0.5;
        return { sub: x, score, nearLesson };
      })
      .sort((a, b) => b.score - a.score);
    const slots = Math.max(0, s.maxSubjectsPerDay - day.items.filter((i) => i.kind === 'diagnoza' || i.kind === 'arkusz').length);
    const chosen = scored.slice(0, slots);
    const free = day.available - day.used;
    const prioSum = chosen.reduce((a, c) => a + c.sub.priority * (c.nearLesson ? 0.5 : 1), 0) || 1;
    let taskCount = day.items.filter((i) => i.kind === 'zadanie' || i.kind === 'powtórka').length;

    const ws = weekStart(date);
    if (!weekTopicCount.has(ws)) weekTopicCount.set(ws, new Map());
    const wtc = weekTopicCount.get(ws)!;

    for (const { sub, nearLesson } of chosen) {
      const budget = Math.floor((free * sub.priority * (nearLesson ? 0.5 : 1)) / prioSum);
      let spent = 0;
      const ph = phase[sub.id];
      const tasks = [...sim.values()].filter(
        (t) => t.task.subjectId === sub.id && !excluded.has(t.task.id) && t.lastTouched !== date,
      );
      const fits = (m: number) => spent + m <= budget && day.used + m <= day.available && taskCount < s.maxTasksPerDay;

      // 1. Powtórki, które przypadają na dziś.
      const due = tasks
        .filter((t) => t.status === 'do powtórki' && t.nextReview != null && t.nextReview <= date)
        .sort((a, b) => (a.nextReview! < b.nextReview! ? -1 : 1));
      for (const t of due) {
        const item = taskItem(date, t.task, 'powtórka', `Powtórka po ${INTERVALS[t.reviewStep] ?? 1} dn., ostatni wynik ${t.task.result ?? '–'}%.`);
        if (!fits(item.minutes)) {
          day.shifted.push({ item, reason: 'Brak czasu w tym dniu; powtórka wróci w kolejnym dniu z wolnym czasem.' });
          continue;
        }
        add(item);
        spent += item.minutes;
        taskCount++;
        t.lastTouched = date;
        simApply(t, date, simResult(input, sub.id, t.task.topicId));
      }

      // 2. Nowe zadania albo zadania do powtórki całości, według priorytetu tematów.
      const prio = input.priorities[sub.id] ?? {};
      const topicOrder = Object.keys(prio)
        .map((topicId) => {
          const key = `${sub.id}:${topicId}`;
          const seen = wtc.get(key) ?? 0;
          let p = prio[topicId] / (1 + seen);
          if (ph === 'powtórka') {
            const touched = tasks.some((t) => t.task.topicId === topicId && t.lastTouched && diffDays(date, t.lastTouched) < 7);
            if (!touched) p *= 3; // każdy temat co najmniej raz w tygodniu
          }
          return { topicId, p };
        })
        .sort((a, b) => b.p - a.p);

      let missing = 0;
      for (const { topicId } of topicOrder) {
        if (!fits(1)) break;
        const pool = tasks.filter((t) => t.task.topicId === topicId && t.lastTouched !== date);
        let cand: SimTask | undefined;
        if (ph === 'nowe tematy') {
          cand = pool.find((t) => t.status === 'nowe' || t.status === 'w trakcie');
        } else {
          // powtórka całości i faza arkuszy: najpierw zadania z najsłabszym wynikiem
          cand =
            pool.filter((t) => t.status === 'do powtórki').sort((a, b) => (a.task.result ?? 0) - (b.task.result ?? 0))[0] ??
            pool.find((t) => t.status === 'nowe' || t.status === 'w trakcie');
        }
        if (!cand) {
          const mk = `${weekStart(date)}:${sub.id}:${topicId}`;
          if (missing < 2 && !missingShown.has(mk) && !pool.some((t) => t.status !== 'zrobione')) {
            missingShown.add(mk);
            day.items.push({
              key: itemKey(date, 'brak', `${sub.id}:${topicId}`),
              kind: 'brak-zadań',
              subjectId: sub.id,
              topicId,
              taskId: null,
              examId: null,
              minutes: 0,
              label: `Brak zadań w banku z tematu „${topicName(topicId)}”`,
              reason: 'Dodaj zadania z tego tematu w widoku „Zadania z tematu”.',
            });
            missing++;
          }
          continue;
        }
        const reason =
          ph === 'nowe tematy'
            ? `Faza 1: temat o priorytecie ${prio[topicId].toFixed(3)}.`
            : ph === 'powtórka'
              ? 'Faza 2: powtórka całości, najsłabsze wyniki najpierw.'
              : 'Faza 3: przegląd błędów i słabych wyników.';
        const item = taskItem(date, cand.task, cand.status === 'do powtórki' ? 'powtórka' : 'zadanie', reason);
        if (!fits(item.minutes)) continue;
        add(item);
        spent += item.minutes;
        taskCount++;
        cand.lastTouched = date;
        wtc.set(`${sub.id}:${topicId}`, (wtc.get(`${sub.id}:${topicId}`) ?? 0) + 1);
        simApply(cand, date, simResult(input, sub.id, topicId));
      }

      // 3. Faza 3: wzory i schematy co drugi dzień.
      if (ph === 'arkusze' && diffDays(date, s.mockPhaseStart) % 2 === 1) {
        const what = sub.family === 'matematyka' ? 'wzory z karty CKE' : sub.family === 'polski' ? 'schemat wypracowania' : 'schemat wypowiedzi pisemnej';
        add(
          {
            key: itemKey(date, 'przegląd', `${sub.id}:schematy`),
            kind: 'przegląd',
            subjectId: sub.id,
            topicId: null,
            taskId: null,
            examId: null,
            minutes: 15,
            label: `${sub.name}: ${what}`,
            reason: 'Faza 3: wzory i schematy zapisów.',
          },
          false,
        );
      }
    }

    plans.push(day);
  }
  return plans;
}

function countsInBudget(i: PlanItem): boolean {
  return i.kind !== 'korepetycje' && i.kind !== 'zajęcia' && i.kind !== 'brak-zadań';
}

function taskItem(date: string, t: BankTask, kind: 'zadanie' | 'powtórka', reason: string): PlanItem {
  return {
    key: itemKey(date, kind, t.id),
    kind,
    subjectId: t.subjectId,
    topicId: t.topicId,
    taskId: t.id,
    examId: t.examId,
    minutes: Math.max(1, t.minutes),
    label: taskLabel(t),
    reason,
  };
}

export function taskLabel(t: BankTask): string {
  if (t.source === 'CKE') return `CKE ${t.ref}`;
  if (t.source === 'książka') return `Książka s. ${t.page ?? '?'}${t.ref ? `, zad. ${t.ref}` : ''}`;
  if (t.source === 'zadania.info') return `zadania.info ${t.ref || ''}`.trim();
  return t.ref || 'Zadanie własne';
}

function simResult(input: PlannerInput, subjectId: string, topicId: string): number {
  const m = input.mastery[subjectId]?.[topicId];
  return m == null ? 70 : Math.round(m * 100);
}

function pickExam(exams: Exam[], s: Settings, sub: SubjectConfig, used: Set<string>): Exam | null {
  const { current } = filterExams(exams, {
    family: sub.family,
    level: sub.level,
    yearFrom: s.yearFrom,
    yearTo: s.yearTo,
    includeOldFormula: false,
    excluded: s.excludedExams,
  });
  // najpierw arkusze z listą zadań (da się je rozwiązać w aplikacji), potem nierozwiązane, potem najnowsze
  const score = (e: Exam) => (e.tasks.length ? 2 : 0) + (used.has(e.id) ? 0 : 1);
  return [...current].sort((a, b) => score(b) - score(a) || b.year - a.year)[0] ?? null;
}

// ---------- Podsumowanie tygodnia ----------

export interface WeightSuggestion {
  id: string;
  subjectId: string;
  topicId: string;
  reason: string;
}

/**
 * Propozycje zmiany wag w niedzielę: temat bez rozwiązanego zadania od 14 dni
 * (licząc od pierwszego dnia nauki) albo ze spadkiem wyniku.
 */
export function weeklySuggestions(
  date: string,
  startedAt: string,
  subjects: SubjectConfig[],
  bank: BankTask[],
  topicIds: Record<string, string[]>,
  dropped: (subjectId: string, topicId: string) => boolean,
): WeightSuggestion[] {
  const out: WeightSuggestion[] = [];
  if (diffDays(date, startedAt) < 14) return out;
  for (const sub of subjects) {
    if (!sub.enabled) continue;
    for (const topicId of topicIds[sub.id] ?? []) {
      const solved = bank
        .filter((t) => t.subjectId === sub.id && t.topicId === topicId)
        .flatMap((t) => t.history.map((h) => h.date))
        .filter((d) => d <= date)
        .sort();
      const last = solved[solved.length - 1];
      if (!last || diffDays(date, last) >= 14) {
        out.push({
          id: `${date}:${sub.id}:${topicId}:brak`,
          subjectId: sub.id,
          topicId,
          reason: last ? `Ostatnie rozwiązane zadanie: ${last}.` : 'Brak rozwiązanych zadań z tego tematu.',
        });
      } else if (dropped(sub.id, topicId)) {
        out.push({ id: `${date}:${sub.id}:${topicId}:spadek`, subjectId: sub.id, topicId, reason: 'Wynik spadł w ostatnich zadaniach.' });
      }
    }
  }
  return out;
}
