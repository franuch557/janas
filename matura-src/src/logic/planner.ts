// Planer: plan dzienny od dziś do ostatniego egzaminu.
//
// Zasady (z audytu wersji 2):
// - planuje tylko to, co da się zrobić w aplikacji: zadania z obrazem,
//   pełne arkusze z pakietem obrazów, diagnozę z wystarczającej liczby zadań;
// - każdy włączony przedmiot z zadaniami dostaje czas; przedmiot bez zadań
//   jest zwracany w `skipped`, żeby widok mógł to powiedzieć wprost;
// - to samo zadanie najwyżej raz na MIN_GAP dni; po nieudanej powtórce
//   bierze inne zadanie z tego samego tematu;
// - arkusz próbny nie powtarza się, dopóki są nierozwiązane;
// - fazy liczone od daty egzaminu każdego przedmiotu; dzień przed egzaminem
//   blokuje tylko ten przedmiot; arkusz za długi na jeden dzień jest dzielony
//   na części (polski: arkusz 1 i arkusz 2);
// - ręczne zmiany (nadpisania dnia) są stosowane przy każdym przeliczeniu.

import { SUBJECTS, type DayOverride, type DayPlan, type PlanItem, type SubjectDef, type SubjectId } from '../model';
import { addDays, dateRange, diffDays, weekStart, weekday } from './dates';
import { isDue, nextSrs, NEW_SRS, type SrsState } from './srs';
import { cardsMinutes } from './flashcards';

export const MIN_GAP = 3;
export const MAX_SUBJECTS_PER_DAY = 2;
export const MAX_TASKS_PER_DAY = 6;
const SIM_PCT = 75;
const ESSAY_EVERY = 10;

export type Phase = 'nowe tematy' | 'powtórka' | 'arkusze' | 'przegląd' | 'po egzaminie';

export function phaseFor(examDate: string, date: string): Phase {
  if (date >= examDate) return 'po egzaminie';
  const left = diffDays(examDate, date);
  if (left === 1) return 'przegląd';
  if (left <= 21) return 'arkusze';
  if (left <= 70) return 'powtórka';
  return 'nowe tematy';
}

export interface PlanTask {
  id: string;
  subjectId: SubjectId;
  topics: string[];
  minutes: number;
  essay: boolean;
  /** Ma obraz treści (CKE z pakietem albo zrzut ekranu). */
  image: boolean;
}

export interface PlanExam {
  id: string;
  subjectId: SubjectId;
  year: number;
  /** Części do zaplanowania; [null] = cały arkusz naraz. */
  parts: { id: string | null; minutes: number }[];
}

export interface PlannerInput {
  today: string;
  until?: string;
  enabled: Record<SubjectId, boolean>;
  dayMinutes: number[];
  tutoring: { enabled: boolean; weekday: number; start: string; minutes: number };
  overrides: Record<string, DayOverride>;
  tasks: PlanTask[];
  exams: PlanExam[];
  /** Stan powtórek zadań z wyników sprzed dziś. */
  srs: Map<string, SrsState>;
  /** Arkusze (`examId|partId`) zakończone przed dziś. */
  mocksDone: Set<string>;
  /** Przedmioty z diagnozą zakończoną przed dziś. */
  diagnosed: Set<SubjectId>;
  /** Przedmioty, dla których da się złożyć diagnozę, i jej czas. */
  diagnosisMinutes: Partial<Record<SubjectId, number>>;
  /** Co zrobiono dziś (wpływa na kolejne dni, nie zmienia dzisiejszej listy). */
  doneToday?: { tasks: string[]; mocks: string[]; diagnosed: SubjectId[] };
  /** Priorytety tematów: przedmiot → temat → priorytet. */
  priorities: Partial<Record<SubjectId, Record<string, number>>>;
  /** Ostatni dzień nauki przedmiotu przed dziś. */
  lastStudied?: Partial<Record<SubjectId, string>>;
  /** Liczba fiszek do powtórki danego dnia (pozycja „Fiszki”, 5–10 min). */
  cardsDue?: (date: string) => number;
}

export interface PlanResult {
  days: DayPlan[];
  /** Włączone przedmioty bez żadnego zadania do zaplanowania. */
  skipped: SubjectId[];
}

interface SimTask {
  task: PlanTask;
  srs: SrsState;
  lastTouched: string | null;
}

export function taskRef(id: string): string {
  return `t:${id}`;
}
export function mockRef(examId: string, partId: string | null): string {
  return partId ? `a:${examId}:${partId}` : `a:${examId}`;
}
export function mockKey(examId: string, partId: string | null): string {
  return `${examId}|${partId ?? ''}`;
}

export function buildPlan(input: PlannerInput): PlanResult {
  const subjects = SUBJECTS.filter((s) => input.enabled[s.id]);
  const lastExam = subjects.map((s) => s.examDate).sort().slice(-1)[0];
  if (!subjects.length) return { days: [], skipped: [] };
  const until = input.until ?? lastExam;

  const sim = new Map<string, SimTask>();
  for (const t of input.tasks) {
    if (!t.image || !input.enabled[t.subjectId]) continue;
    const srs = input.srs.get(t.id) ?? NEW_SRS;
    sim.set(t.id, { task: t, srs, lastTouched: srs.lastDate });
  }
  const bySubject = new Map<SubjectId, SimTask[]>();
  for (const st of sim.values()) {
    const list = bySubject.get(st.task.subjectId) ?? [];
    list.push(st);
    bySubject.set(st.task.subjectId, list);
  }
  const skipped = subjects.filter((s) => !(bySubject.get(s.id) ?? []).length).map((s) => s.id);

  const mocksUsed = new Set(input.mocksDone);
  const diagnosed = new Set(input.diagnosed);
  const lastStudied: Partial<Record<SubjectId, string>> = { ...(input.lastStudied ?? {}) };
  const lastMockOf: Partial<Record<SubjectId, string>> = {};
  const lastMockOfExam = new Map<string, string>();
  let lastMockDate: string | null = null;
  let pendingPart: { examId: string; subjectId: SubjectId; partId: string | null; minutes: number } | null = null;
  const lastEssay: Partial<Record<SubjectId, string>> = {};
  for (const st of sim.values()) {
    if (st.task.essay && st.lastTouched) {
      const s = st.task.subjectId;
      if (!lastEssay[s] || lastEssay[s]! < st.lastTouched) lastEssay[s] = st.lastTouched;
    }
  }
  const mockDayOfWeek = new Map<string, string>();
  const weekTopic = new Map<string, number>();

  const days: DayPlan[] = [];

  // stan zadań sprzed dotknięcia w bieżącym dniu (żeby usunięta ręcznie pozycja nie liczyła się jako zrobiona)
  let daySnap = new Map<SimTask, { srs: SrsState; lastTouched: string | null }>();
  const touch = (st: SimTask, date: string) => {
    if (!daySnap.has(st)) daySnap.set(st, { srs: st.srs, lastTouched: st.lastTouched });
    // symulacja zakłada poprawę: pierwsze podejście 75%, kolejne 95%,
    // więc zadanie wraca najwyżej dwa razy (po 7 i 14 dniach) i znika z planu
    st.srs = nextSrs(st.srs, st.srs.attempts === 0 ? SIM_PCT : 95, date);
    st.lastTouched = date;
    if (st.task.essay) lastEssay[st.task.subjectId] = date;
  };
  const gapOk = (st: SimTask, date: string) => !st.lastTouched || diffDays(date, st.lastTouched) >= MIN_GAP;

  for (const date of dateRange(input.today, until)) {
    const wd = weekday(date);
    const available = Math.max(0, input.dayMinutes[wd] ?? 0);
    const day: DayPlan = { date, weekday: wd, available, used: 0, items: [], notes: [] };
    const ov = input.overrides[date];
    daySnap = new Map();
    const has = (ref: string) => day.items.some((i) => i.ref === ref);
    // Pozycje automatyczne liczę bez ręcznych zmian tego dnia: zamiana, usunięcie
    // albo dodanie zmienia tylko tę jedną pozycję, reszta dnia zostaje ta sama.
    const push = (item: PlanItem): boolean => {
      if (has(item.ref)) return false;
      day.items.push(item);
      if (item.kind !== 'korepetycje') {
        day.used += item.minutes;
        if (item.subjectId) lastStudied[item.subjectId] = date;
      }
      return true;
    };
    const finalizeDay = () => {
      const removed = new Set(ov?.remove ?? []);
      for (const it of day.items.filter((i) => removed.has(i.ref))) {
        const st = it.taskId ? sim.get(it.taskId) : undefined;
        const prev = st ? daySnap.get(st) : undefined;
        if (st && prev) {
          st.srs = prev.srs;
          st.lastTouched = prev.lastTouched;
        }
        if (it.kind === 'arkusz' && it.examId) {
          mocksUsed.delete(mockKey(it.examId, it.partId));
          if (pendingPart?.examId === it.examId) pendingPart = null;
        }
        if (it.kind === 'diagnoza' && it.subjectId && !input.diagnosed.has(it.subjectId)) diagnosed.delete(it.subjectId);
      }
      day.items = day.items.filter((i) => !removed.has(i.ref));
      for (const a of ov?.add ?? []) {
        const same = day.items.find((i) => i.ref === a.ref);
        if (same) {
          same.manual = true;
          continue;
        }
        day.items.push({ ...a, manual: true });
        const st = a.taskId ? sim.get(a.taskId) : undefined;
        if (st && st.lastTouched !== date) touch(st, date);
        if (a.kind === 'arkusz' && a.examId) mocksUsed.add(mockKey(a.examId, a.partId));
        if (a.kind === 'diagnoza' && a.subjectId) diagnosed.add(a.subjectId);
      }
      day.used = day.items.filter((i) => i.kind !== 'korepetycje').reduce((x, i) => x + i.minutes, 0);
      finish(day, ov);
    };
    const free = () => day.available - day.used;

    // Korepetycje (stałe zajęcia, poza czasem nauki).
    const ang = subjects.find((s) => s.id === 'ang-p');
    if (input.tutoring.enabled && ang && wd === input.tutoring.weekday && date < ang.examDate) {
      push(item({ ref: `k:${date}`, kind: 'korepetycje', subjectId: 'ang-p', minutes: input.tutoring.minutes, reason: `Korepetycje z angielskiego, ${input.tutoring.start}.` }));
    }

    // Fiszki do powtórki: krótka pozycja na początku dnia.
    const nCards = input.cardsDue?.(date) ?? 0;
    if (nCards > 0 && available > 0) push(item({ ref: `f:${date}`, kind: 'fiszki', minutes: cardsMinutes(nCards), reason: `Fiszki do powtórki: ${nCards}.` }));

    const phase = new Map<SubjectId, Phase>(subjects.map((s) => [s.id, phaseFor(s.examDate, date)]));
    const examToday = subjects.filter((s) => s.examDate === date);
    for (const s of examToday) day.notes.push(`Egzamin: ${s.name.toLowerCase()}.`);

    // Dzień przed egzaminem: przegląd tylko tego przedmiotu.
    for (const s of subjects) {
      if (phase.get(s.id) !== 'przegląd') continue;
      push(item({ ref: `p:${s.id}:${date}`, kind: 'przegląd', subjectId: s.id, minutes: Math.min(30, Math.max(15, free())), reason: 'Dzień przed egzaminem: przegląd błędów, bez nowych zadań.' }));
    }

    if (examToday.length) {
      finalizeDay();
      days.push(day);
      continue;
    }

    const active = subjects.filter((s) => {
      const p = phase.get(s.id)!;
      return (p === 'nowe tematy' || p === 'powtórka' || p === 'arkusze') && (bySubject.get(s.id) ?? []).length > 0;
    });
    const busy = new Set<SubjectId>(day.items.filter((i) => i.kind === 'arkusz' || i.kind === 'diagnoza').map((i) => i.subjectId!) as SubjectId[]);

    // Diagnoza: jedna dziennie, od przedmiotu o największej ważności.
    if (available > 0 && !day.items.some((i) => i.kind === 'diagnoza')) {
      const pend = active
        .filter((s) => !diagnosed.has(s.id) && input.diagnosisMinutes[s.id] != null)
        .sort((a, b) => b.priority - a.priority)[0];
      if (pend) {
        const ok = push(item({ ref: `d:${pend.id}`, kind: 'diagnoza', subjectId: pend.id, minutes: input.diagnosisMinutes[pend.id]!, reason: 'Diagnoza na start: na jej podstawie plan wie, od czego zacząć.' }));
        if (ok) {
          diagnosed.add(pend.id);
          busy.add(pend.id);
        }
      }
    }

    // Arkusz próbny.
    if (available > 0 && !day.items.some((i) => i.kind === 'arkusz' || i.kind === 'diagnoza')) {
      let placed: PlanItem | null = null;
      if (pendingPart && !['powtórka', 'arkusze'].includes(phase.get(pendingPart.subjectId) ?? '')) pendingPart = null;
      if (pendingPart) {
        placed = item({
          ref: mockRef(pendingPart.examId, pendingPart.partId),
          kind: 'arkusz',
          subjectId: pendingPart.subjectId,
          examId: pendingPart.examId,
          partId: pendingPart.partId,
          minutes: pendingPart.minutes,
          reason: 'Druga część arkusza próbnego.',
        });
        if (push(placed)) {
          mocksUsed.add(mockKey(pendingPart.examId, pendingPart.partId));
          busy.add(pendingPart.subjectId);
          lastMockDate = date;
          pendingPart = null;
        }
      } else {
        const ws = weekStart(date);
        if (!mockDayOfWeek.has(ws)) {
          let best = date;
          let bestMin = -1;
          for (let i = 0; i < 7; i++) {
            const d = addDays(ws, i);
            if (d < input.today) continue;
            // dzień z korepetycjami ma mniej siły na arkusz: przy remisie wygrywa inny dzień
            const m = (input.dayMinutes[weekday(d)] ?? 0) - (input.tutoring.enabled && weekday(d) === input.tutoring.weekday ? 0.5 : 0);
            if (m > bestMin) {
              best = d;
              bestMin = m;
            }
          }
          mockDayOfWeek.set(ws, best);
        }
        const cands = active
          .filter((s) => {
            const p = phase.get(s.id);
            if (p === 'arkusze') return !lastMockDate || diffDays(date, lastMockDate) >= 2;
            if (p === 'powtórka') return mockDayOfWeek.get(ws) === date;
            return false;
          })
          .map((s) => ({ s, exam: pickExam(input.exams, s.id, mocksUsed) ?? (phase.get(s.id) === 'arkusze' ? oldestExam(input.exams, s.id, lastMockOfExam) : null) }))
          .filter((x) => x.exam)
          .sort((a, b) => (lastMockOf[a.s.id] ?? '') .localeCompare(lastMockOf[b.s.id] ?? '') || b.s.priority - a.s.priority);
        const c = cands[0];
        if (c && c.exam) {
          const unused = c.exam.parts.filter((p) => !mocksUsed.has(mockKey(c.exam!.id, p.id)));
          // wszystkie arkusze rozwiązane: w ostatnich tygodniach wraca najdawniej robiony
          const parts = unused.length ? unused : c.exam.parts;
          lastMockOfExam.set(c.exam.id, date);
          const first = parts[0];
          placed = item({
            ref: mockRef(c.exam.id, first.id),
            kind: 'arkusz',
            subjectId: c.s.id,
            examId: c.exam.id,
            partId: first.id,
            minutes: first.minutes,
            reason: phase.get(c.s.id) === 'arkusze' ? 'Ostatnie tygodnie: arkusz co kilka dni.' : 'Arkusz próbny w tym tygodniu, w warunkach egzaminu.',
          });
          if (push(placed)) {
            mocksUsed.add(mockKey(c.exam.id, first.id));
            busy.add(c.s.id);
            lastMockDate = date;
            lastMockOf[c.s.id] = date;
            const next = parts[1];
            if (next) pendingPart = { examId: c.exam.id, subjectId: c.s.id, partId: next.id, minutes: next.minutes };
            if (first.minutes > available) day.notes.push(`Arkusz trwa ${first.minutes} min, dłużej niż zwykły czas nauki tego dnia.`);
          }
        }
      }
    }

    // Wybór przedmiotów dnia: priorytet × przerwa od ostatniej nauki.
    const slots = Math.max(0, MAX_SUBJECTS_PER_DAY - busy.size);
    const chosen = active
      .filter((s) => !busy.has(s.id))
      .map((s) => {
        const last = lastStudied[s.id];
        const gap = last ? Math.max(0, diffDays(date, last)) : 7;
        return { s, score: s.priority * (1 + gap) };
      })
      .sort((a, b) => b.score - a.score || b.s.priority - a.s.priority)
      .slice(0, slots)
      .map((x) => x.s);
    const freeStart = free();
    const prioSum = chosen.reduce((a, s) => a + s.priority, 0) || 1;
    const countTasks = () => day.items.filter((i) => i.taskId).length;

    for (const s of chosen) {
      if (free() <= 0) break;
      const budget = Math.max(Math.min(free(), 10), Math.floor((freeStart * s.priority) / prioSum));
      let spent = 0;
      const pool = (bySubject.get(s.id) ?? []).filter((st) => !has(taskRef(st.task.id)));
      const fits = (m: number) => spent + m <= budget && day.used + m <= day.available && countTasks() < MAX_TASKS_PER_DAY;
      const place = (st: SimTask, kind: 'zadanie' | 'powtórka' | 'wypracowanie', reason: string) => {
        const it = item({ ref: taskRef(st.task.id), kind, subjectId: s.id, topicId: st.task.topics[0] ?? null, taskId: st.task.id, minutes: st.task.minutes, reason });
        if (!push(it)) return false;
        spent += st.task.minutes;
        touch(st, date);
        const wk = `${weekStart(date)}:${s.id}:${st.task.topics[0]}`;
        weekTopic.set(wk, (weekTopic.get(wk) ?? 0) + 1);
        return true;
      };
      const ph = phase.get(s.id)!;

      // 1. Wypracowanie co ESSAY_EVERY dni (polski i angielski).
      if (s.family !== 'matematyka') {
        const last = lastEssay[s.id];
        if (!last || diffDays(date, last) >= ESSAY_EVERY) {
          const essay = pool
            .filter((st) => st.task.essay && gapOk(st, date))
            .sort((a, b) => (a.lastTouched ?? '').localeCompare(b.lastTouched ?? ''))[0];
          if (essay && essay.task.minutes <= free() && countTasks() < MAX_TASKS_PER_DAY) {
            place(essay, 'wypracowanie', s.family === 'polski' ? 'Wypracowanie co półtora tygodnia.' : 'Wypowiedź pisemna co półtora tygodnia.');
          }
        }
      }

      // 2. Powtórki z terminem na dziś.
      const due = pool.filter((st) => !st.task.essay && isDue(st.srs, date)).sort((a, b) => (a.srs.nextReview! < b.srs.nextReview! ? -1 : 1));
      for (const st of due) {
        if (!fits(st.task.minutes)) continue;
        if ((st.srs.lastPct ?? 0) < 50) {
          // nieudana powtórka: inne zadanie z tego samego tematu
          const alt = pool.find((o) => o !== st && !o.task.essay && o.srs.status === 'nowe' && o.task.topics[0] === st.task.topics[0] && gapOk(o, date) && fits(o.task.minutes));
          if (alt) {
            if (place(alt, 'powtórka', 'Powtórka tematu innym zadaniem, bo ostatnio poszło słabo.')) {
              st.srs = { ...st.srs, nextReview: addDays(date, MIN_GAP) };
              continue;
            }
          }
        }
        if (!gapOk(st, date)) continue;
        place(st, 'powtórka', `Powtórka zadania, ostatni wynik ${st.srs.lastPct ?? 0}%.`);
      }

      // 3. Zadania według priorytetu tematów.
      const prio = input.priorities[s.id] ?? {};
      const topicOrder = Object.keys(prio)
        .map((topicId) => {
          const seen = weekTopic.get(`${weekStart(date)}:${s.id}:${topicId}`) ?? 0;
          let p = prio[topicId] / (1 + seen);
          if (ph === 'powtórka') {
            const recent = pool.some((st) => st.task.topics[0] === topicId && st.lastTouched && diffDays(date, st.lastTouched) < 7);
            if (!recent) p *= 3; // każdy temat co najmniej raz w tygodniu
          }
          return { topicId, p };
        })
        .sort((a, b) => b.p - a.p);
      const extraTopics = [...new Set(pool.map((st) => st.task.topics[0]).filter((t) => t && !(t in prio)))];
      for (const t of extraTopics) topicOrder.push({ topicId: t, p: 0 });
      for (let round = 0; round < 2; round++) {
        for (const { topicId } of topicOrder) {
          if (!fits(2)) break;
          const inTopic = pool.filter((st) => !st.task.essay && st.task.topics[0] === topicId && !has(taskRef(st.task.id)) && gapOk(st, date) && st.srs.status !== 'zrobione');
          const cand =
            ph === 'nowe tematy'
              ? inTopic.find((st) => st.srs.status === 'nowe' && fits(st.task.minutes))
              : inTopic.filter((st) => st.srs.status === 'do powtórki' && fits(st.task.minutes)).sort((a, b) => (a.srs.lastPct ?? 0) - (b.srs.lastPct ?? 0))[0] ??
                inTopic.find((st) => st.srs.status === 'nowe' && fits(st.task.minutes));
          if (!cand) continue;
          const reason =
            ph === 'nowe tematy'
              ? 'Temat, który daje dużo punktów na maturze albo słabo poszedł.'
              : ph === 'powtórka'
                ? 'Powtórka całości: najpierw tematy z najsłabszym wynikiem.'
                : 'Ostatnie tygodnie: zadania z tematów do poprawy.';
          place(cand, cand.srs.status === 'do powtórki' ? 'powtórka' : 'zadanie', reason);
        }
      }

      // 4. Pula przedmiotu wyczerpana: wracają zadania zrobione najdawniej (najpierw słabsze).
      if (spent === 0) {
        const done = pool
          .filter((st) => !st.task.essay && st.srs.status === 'zrobione' && gapOk(st, date) && !has(taskRef(st.task.id)))
          .sort((x, y) => (x.lastTouched ?? '').localeCompare(y.lastTouched ?? '') || (x.srs.lastPct ?? 0) - (y.srs.lastPct ?? 0));
        for (const st of done) {
          if (!fits(st.task.minutes)) continue;
          place(st, 'powtórka', 'Powtórka zadania zrobionego dawno temu.');
        }
      }
    }

    finalizeDay();
    days.push(day);

    // Dzisiejsze wykonania wpływają na kolejne dni.
    if (date === input.today && input.doneToday) {
      for (const id of input.doneToday.tasks) {
        const st = sim.get(id);
        if (st && st.lastTouched !== date) touch(st, date);
      }
      for (const m of input.doneToday.mocks) mocksUsed.add(m);
      for (const s of input.doneToday.diagnosed) diagnosed.add(s);
    }
  }
  return { days, skipped };
}

function finish(day: DayPlan, ov: DayOverride | undefined) {
  if (ov?.order?.length) {
    const pos = new Map(ov.order.map((r, i) => [r, i]));
    day.items.sort((a, b) => (pos.get(a.ref) ?? 999) - (pos.get(b.ref) ?? 999));
  }
}

function item(p: Partial<PlanItem> & Pick<PlanItem, 'ref' | 'kind' | 'minutes' | 'reason'>): PlanItem {
  return { subjectId: null, topicId: null, taskId: null, examId: null, partId: null, manual: false, ...p };
}

/** Arkusz robiony najdawniej (gdy wszystkie są już rozwiązane). */
function oldestExam(exams: PlanExam[], subjectId: SubjectId, last: Map<string, string>): PlanExam | null {
  return exams.filter((e) => e.subjectId === subjectId).sort((a, b) => (last.get(a.id) ?? '').localeCompare(last.get(b.id) ?? '') || a.year - b.year)[0] ?? null;
}

/** Nierozwiązany arkusz przedmiotu: najpierw starsze (najnowsze zostają na koniec). */
export function pickExam(exams: PlanExam[], subjectId: SubjectId, used: Set<string>): PlanExam | null {
  const open = exams.filter((e) => e.subjectId === subjectId && e.parts.some((p) => !used.has(mockKey(e.id, p.id))));
  return open.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))[0] ?? null;
}

/**
 * Propozycje zamiany: zadania z tego samego tematu (albo z innych tematów
 * przedmiotu), których nie ma w planie dnia i które nie były robione przez
 * ostatnie MIN_GAP dni. Kolejność: nowe, potem najsłabszy wynik.
 */
export function suggestTasks(
  tasks: PlanTask[],
  srs: Map<string, SrsState>,
  subjectId: SubjectId,
  topicId: string | null,
  exclude: Set<string>,
  date: string,
  n = 3,
): PlanTask[] {
  const ok = tasks.filter((t) => {
    if (!t.image || t.subjectId !== subjectId || exclude.has(t.id) || t.essay) return false;
    if (topicId && t.topics[0] !== topicId) return false;
    const s = srs.get(t.id);
    if (s?.status === 'zrobione') return false;
    return !s?.lastDate || diffDays(date, s.lastDate) >= MIN_GAP;
  });
  const rank = (t: PlanTask) => {
    const s = srs.get(t.id);
    return s ? 1 + (s.lastPct ?? 0) / 100 : 0;
  };
  return ok.sort((a, b) => rank(a) - rank(b) || a.minutes - b.minutes || a.id.localeCompare(b.id)).slice(0, n);
}

export function subjectsWithPhase(date: string, enabled: Record<SubjectId, boolean>): { s: SubjectDef; phase: Phase }[] {
  return SUBJECTS.filter((s) => enabled[s.id]).map((s) => ({ s, phase: phaseFor(s.examDate, date) }));
}
