import { describe, expect, it } from 'vitest';
import { buildPlan, MIN_GAP, mockKey, phaseFor, suggestTasks, type PlanExam, type PlannerInput, type PlanTask } from '../src/logic/planner';
import { defaultStan, type SubjectId } from '../src/model';
import { diffDays, weekStart } from '../src/logic/dates';
import { planTask } from './helpers';

const TOPICS: Record<SubjectId, string[]> = {
  'mat-p': ['logarytmy', 'ciagi', 'planimetria'],
  'mat-r': ['logarytmy', 'pochodne', 'stereometria', 'ciagi'],
  'pol-p': ['pol-rozumienie', 'pol-jezyk', 'pol-historycznoliteracki'],
  'ang-p': ['ang-sluchanie', 'ang-czytanie', 'ang-srodki'],
};

function bank(perTopic = 6): PlanTask[] {
  return (Object.keys(TOPICS) as SubjectId[]).flatMap((s) => TOPICS[s].flatMap((t) => Array.from({ length: perTopic }, (_, i) => planTask(`${s}-${t}-${i}`, s, t))));
}

function prio(): PlannerInput['priorities'] {
  const out: PlannerInput['priorities'] = {};
  for (const s of Object.keys(TOPICS) as SubjectId[]) out[s] = Object.fromEntries(TOPICS[s].map((t, i) => [t, 1 / (i + 1)]));
  return out;
}

function exams(): PlanExam[] {
  const out: PlanExam[] = [];
  for (const y of [2023, 2024, 2025, 2026]) {
    out.push({ id: `MP-${y}`, subjectId: 'mat-p', year: y, parts: [{ id: null, minutes: 180 }] });
    out.push({ id: `MR-${y}`, subjectId: 'mat-r', year: y, parts: [{ id: null, minutes: 180 }] });
    out.push({ id: `PL-${y}`, subjectId: 'pol-p', year: y, parts: [{ id: 'A1', minutes: 100 }, { id: 'A2', minutes: 140 }] });
    out.push({ id: `EN-${y}`, subjectId: 'ang-p', year: y, parts: [{ id: null, minutes: 120 }] });
  }
  return out;
}

function input(over: Partial<PlannerInput> = {}): PlannerInput {
  const st = defaultStan('2026-11-23');
  return {
    today: '2026-11-23',
    until: '2026-12-31',
    enabled: st.enabled,
    dayMinutes: st.dayMinutes,
    tutoring: st.tutoring,
    overrides: {},
    tasks: bank(),
    exams: exams(),
    srs: new Map(),
    mocksDone: new Set(),
    diagnosed: new Set(['mat-p', 'mat-r', 'pol-p', 'ang-p']),
    diagnosisMinutes: { 'mat-p': 30, 'mat-r': 30, 'pol-p': 30, 'ang-p': 30 },
    priorities: prio(),
    ...over,
  };
}

const taskItems = (days: ReturnType<typeof buildPlan>['days']) => days.flatMap((d) => d.items.filter((i) => i.taskId).map((i) => ({ date: d.date, id: i.taskId!, subj: i.subjectId })));

describe('fazy liczone od dat egzaminów', () => {
  it('kolejne fazy matematyki rozszerzonej (egzamin 11 maja)', () => {
    expect(phaseFor('2027-05-11', '2027-02-28')).toBe('nowe tematy');
    expect(phaseFor('2027-05-11', '2027-03-02')).toBe('powtórka');
    expect(phaseFor('2027-05-11', '2027-04-20')).toBe('arkusze');
    expect(phaseFor('2027-05-11', '2027-05-10')).toBe('przegląd');
    expect(phaseFor('2027-05-11', '2027-05-11')).toBe('po egzaminie');
  });
});

describe('plan', () => {
  it('domyślnie 45 min w dni powszednie i 90 min w weekend; korepetycje w sobotę osobno', () => {
    const { days } = buildPlan(input({ until: '2026-11-29' }));
    expect(days.find((d) => d.date === '2026-11-24')!.available).toBe(45);
    const sat = days.find((d) => d.date === '2026-11-28')!;
    expect(sat.available).toBe(90);
    expect(sat.items.some((i) => i.kind === 'korepetycje')).toBe(true);
  });

  it('suma minut mieści się w czasie dnia (poza dniami arkusza)', () => {
    const { days } = buildPlan(input({ until: '2027-05-11' }));
    for (const d of days) if (!d.items.some((i) => i.kind === 'arkusz')) expect(d.used).toBeLessThanOrEqual(d.available);
  });

  it('każdy włączony przedmiot z zadaniami dostaje czas w każdym tygodniu', () => {
    const { days } = buildPlan(input({ tasks: bank(20) }));
    const weeks = new Map<string, Set<string>>();
    for (const d of days) for (const i of d.items) if (i.taskId && i.subjectId) {
      const w = weekStart(d.date);
      if (!weeks.has(w)) weeks.set(w, new Set());
      weeks.get(w)!.add(i.subjectId);
    }
    for (const [w, subs] of weeks) if (w >= '2026-11-30') expect([...subs].sort()).toEqual(['ang-p', 'mat-p', 'mat-r', 'pol-p']);
  });

  it('przedmiot bez zadań jest zgłaszany wprost, a pozostałe dostają czas', () => {
    const r = buildPlan(input({ tasks: bank().filter((t) => t.subjectId !== 'pol-p') }));
    expect(r.skipped).toEqual(['pol-p']);
    expect(taskItems(r.days).some((t) => t.subj === 'mat-p')).toBe(true);
  });

  it(`to samo zadanie najwyżej raz na ${MIN_GAP} dni`, () => {
    const { days } = buildPlan(input({ until: '2027-05-11', tasks: bank(2) }));
    const last = new Map<string, string>();
    for (const t of taskItems(days)) {
      const prev = last.get(t.id);
      if (prev) expect(diffDays(t.date, prev)).toBeGreaterThanOrEqual(MIN_GAP);
      last.set(t.id, t.date);
    }
  });

  it('po słabym wyniku planuje inne zadanie z tego samego tematu', () => {
    const srs = new Map([['mat-r-pochodne-0', { status: 'do powtórki' as const, step: 0, nextReview: '2026-11-23', lastDate: '2026-11-19', lastPct: 20, attempts: 1 }]]);
    const { days } = buildPlan(input({ srs, until: '2026-11-23', tasks: bank().filter((t) => t.subjectId === 'mat-r'), enabled: { 'mat-p': false, 'mat-r': true, 'pol-p': false, 'ang-p': false } }));
    const ids = days[0].items.map((i) => i.taskId);
    expect(ids).not.toContain('mat-r-pochodne-0');
    expect(ids.some((x) => x?.startsWith('mat-r-pochodne-'))).toBe(true);
  });

  it('nie planuje zadań bez obrazu', () => {
    const tasks = bank().map((t, i) => (i % 2 ? { ...t, image: false } : t));
    const noImg = new Set(tasks.filter((t) => !t.image).map((t) => t.id));
    const { days } = buildPlan(input({ tasks, until: '2027-02-28' }));
    for (const t of taskItems(days)) expect(noImg.has(t.id)).toBe(false);
  });

  it('arkusz próbny się nie powtarza, dopóki są nierozwiązane', () => {
    const { days } = buildPlan(input({ today: '2027-02-01', until: '2027-05-11' }));
    const mocks = days.flatMap((d) => d.items.filter((i) => i.kind === 'arkusz').map((i) => ({ key: mockKey(i.examId!, i.partId), subj: i.subjectId! })));
    expect(mocks.length).toBeGreaterThan(4);
    // powtórka arkusza dopiero wtedy, gdy wszystkie arkusze przedmiotu (4 lata) już były
    const seen = new Map<string, Set<string>>();
    for (const m of mocks) {
      const set = seen.get(m.subj) ?? new Set<string>();
      if (set.has(m.key)) expect(set.size).toBeGreaterThanOrEqual(m.subj === 'pol-p' ? 8 : 4);
      set.add(m.key);
      seen.set(m.subj, set);
    }
  });

  it('arkusz już rozwiązany nie wraca do planu, dopóki są nierozwiązane', () => {
    const done = new Set(['MR-2023', 'MR-2024'].map((id) => mockKey(id, null)));
    const { days } = buildPlan(input({ today: '2027-02-01', until: '2027-05-11', mocksDone: done }));
    const mr = days.flatMap((d) => d.items.filter((i) => i.kind === 'arkusz' && i.subjectId === 'mat-r').map((i) => i.examId));
    expect(mr.slice(0, 2).sort()).toEqual(['MR-2025', 'MR-2026']);
  });

  it('pula zadań wyczerpana: wracają zadania zrobione dawno temu', () => {
    const tasks = bank(1).filter((t) => t.subjectId === 'mat-r');
    const srs = new Map(tasks.map((t) => [t.id, { status: 'zrobione' as const, step: 3, nextReview: null, lastDate: '2026-11-01', lastPct: 95, attempts: 3 }]));
    const { days } = buildPlan(input({ tasks, srs, until: '2026-11-23', enabled: { 'mat-p': false, 'mat-r': true, 'pol-p': false, 'ang-p': false } }));
    expect(days[0].items.some((i) => i.taskId && i.subjectId === 'mat-r')).toBe(true);
  });

  it('arkusz nie w sobotę z korepetycjami, gdy niedziela ma tyle samo czasu', () => {
    const { days } = buildPlan(input({ today: '2027-03-08', until: '2027-04-04' }));
    for (const d of days) if (d.items.some((i) => i.kind === 'arkusz') && d.weekday === 6) expect(d.items.some((i) => i.kind === 'korepetycje')).toBe(false);
  });

  it('polski: arkusz dzielony na dwie części w osobnych dniach', () => {
    const { days } = buildPlan(input({ today: '2027-02-01', until: '2027-05-04' }));
    const pol = days.flatMap((d) => d.items.filter((i) => i.kind === 'arkusz' && i.subjectId === 'pol-p').map((i) => ({ date: d.date, part: i.partId, exam: i.examId })));
    expect(pol.length).toBeGreaterThanOrEqual(2);
    const first = pol.filter((p) => p.exam === pol[0].exam);
    expect(first.map((p) => p.part)).toEqual(['A1', 'A2']);
    expect(first[0].date).not.toBe(first[1].date);
  });

  it('dzień przed egzaminem blokuje tylko ten przedmiot', () => {
    const { days } = buildPlan(input({ today: '2027-05-03', until: '2027-05-10' }));
    const before = days.find((d) => d.date === '2027-05-10')!;
    expect(before.items.some((i) => i.kind === 'przegląd' && i.subjectId === 'mat-r')).toBe(true);
    expect(before.items.some((i) => i.subjectId === 'mat-r' && i.taskId)).toBe(false);
    // 3 maja (dzień przed polskim): przegląd polskiego, a inne przedmioty dalej mają naukę
    const prevPol = days.find((d) => d.date === '2027-05-03')!;
    expect(prevPol.items.some((i) => i.kind === 'przegląd' && i.subjectId === 'pol-p')).toBe(true);
    expect(prevPol.items.some((i) => i.subjectId !== 'pol-p' && (i.taskId || i.kind === 'arkusz'))).toBe(true);
    expect(prevPol.items.some((i) => i.subjectId === 'pol-p' && i.taskId)).toBe(false);
  });

  it('diagnozy po jednej dziennie, tylko gdy da się je złożyć', () => {
    const { days } = buildPlan(input({ diagnosed: new Set(), diagnosisMinutes: { 'mat-r': 30, 'mat-p': 30, 'ang-p': 30 }, until: '2026-11-30' }));
    const diag = days.map((d) => d.items.filter((i) => i.kind === 'diagnoza').map((i) => i.subjectId));
    expect(diag.slice(0, 3).every((x) => x.length === 1)).toBe(true);
    expect(diag.flat()).not.toContain('pol-p');
    expect(new Set(diag.flat()).size).toBe(3);
  });
});

describe('ręczne zmiany planu', () => {
  it('zamiana zmienia tylko jedną pozycję, reszta dnia zostaje ta sama', () => {
    const first = buildPlan(input({ until: '2026-11-23' })).days[0];
    const tasks = first.items.filter((i) => i.taskId);
    const old = tasks[0];
    const by = { ...old, ref: 't:mat-r-stereometria-5', taskId: 'mat-r-stereometria-5', topicId: 'stereometria', manual: true };
    const order = first.items.map((i) => (i.ref === old.ref ? by.ref : i.ref));
    const again = buildPlan(input({ until: '2026-11-23', overrides: { '2026-11-23': { remove: [old.ref], add: [by], order } } })).days[0];
    expect(again.items.map((i) => i.ref)).toEqual(order);
  });

  it('usunięcie nie dokłada innej pozycji w to miejsce', () => {
    const first = buildPlan(input({ until: '2026-11-23' })).days[0];
    const del = first.items.find((i) => i.taskId)!;
    const again = buildPlan(input({ until: '2026-11-23', overrides: { '2026-11-23': { remove: [del.ref], add: [] } } })).days[0];
    expect(again.items.map((i) => i.ref)).toEqual(first.items.map((i) => i.ref).filter((r) => r !== del.ref));
  });

  it('usunięta pozycja nie wraca, dodana jest w planie, kolejność jest zachowana', () => {
    const first = buildPlan(input({ until: '2026-11-23' })).days[0];
    const removed = first.items.find((i) => i.taskId)!;
    const added = { ...removed, ref: 't:mat-r-ciagi-5', taskId: 'mat-r-ciagi-5', manual: true };
    const again = buildPlan(input({ until: '2026-11-23', overrides: { '2026-11-23': { remove: [removed.ref], add: [added], order: [added.ref] } } })).days[0];
    expect(again.items.map((i) => i.ref)).not.toContain(removed.ref);
    expect(again.items[0].ref).toBe(added.ref);
    expect(again.items[0].manual).toBe(true);
  });

  it('zadanie przeniesione na jutro nie pojawia się dziś', () => {
    const first = buildPlan(input({ until: '2026-11-24' })).days;
    const moved = first[0].items.find((i) => i.taskId)!;
    const r = buildPlan(input({ until: '2026-11-24', overrides: { '2026-11-23': { remove: [moved.ref], add: [] }, '2026-11-24': { remove: [], add: [{ ...moved, manual: true }] } } })).days;
    expect(r[0].items.map((i) => i.ref)).not.toContain(moved.ref);
    expect(r[1].items.map((i) => i.ref)).toContain(moved.ref);
  });

  it('propozycje zamiany: z tego samego tematu, bez zadań z planu', () => {
    const s = suggestTasks(bank(), new Map(), 'mat-p', 'ciagi', new Set(['mat-p-ciagi-0']), '2026-11-23', 3);
    expect(s).toHaveLength(3);
    for (const t of s) {
      expect(t.topics[0]).toBe('ciagi');
      expect(t.id).not.toBe('mat-p-ciagi-0');
    }
  });
});
