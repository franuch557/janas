import { describe, expect, it } from 'vitest';
import { availableMinutes, buildPlan, phaseFor, weeklySuggestions, type PlannerInput } from '../src/logic/planner';
import { defaultSettings } from '../src/store/defaults';
import { addDays, weekStart } from '../src/logic/dates';
import type { BankTask, Settings } from '../src/types';
import { task } from './helpers';

function settings(over: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(), ...over };
}

function bankFor(subjectId: string, topics: string[], perTopic: number, minutes = 15): BankTask[] {
  return topics.flatMap((topicId) =>
    Array.from({ length: perTopic }, (_, i) => task({ id: `${subjectId}-${topicId}-${i}`, subjectId, topicId, minutes })),
  );
}

const MATH = ['logarytmy', 'ciagi', 'pochodne', 'stereometria'];

function input(over: Partial<PlannerInput> = {}): PlannerInput {
  const s = over.settings ?? settings();
  const prio: Record<string, Record<string, number>> = {
    'mat-r': { logarytmy: 0.4, ciagi: 0.3, pochodne: 0.2, stereometria: 0.1 },
    'mat-p': { logarytmy: 0.5, ciagi: 0.5 },
    'pol-p': { 'pol-rozumienie': 0.5, 'pol-jezyk': 0.5 },
    'ang-p': { 'ang-czytanie': 0.5, 'ang-srodki': 0.5 },
  };
  return {
    settings: s,
    bank: [
      ...bankFor('mat-r', MATH, 30),
      ...bankFor('mat-p', ['logarytmy', 'ciagi'], 30),
      ...bankFor('pol-p', ['pol-rozumienie', 'pol-jezyk'], 30),
      ...bankFor('ang-p', ['ang-czytanie', 'ang-srodki'], 30),
    ],
    exams: [],
    diagnoses: ['mat-r', 'mat-p', 'pol-p', 'ang-p'].map((id) => ({ id, subjectId: id, date: '2026-11-01', kind: 'samoocena' as const, perTopic: {}, items: [], minutes: null })),
    mocks: [],
    lessonNotes: [],
    dayLog: {},
    priorities: prio,
    mastery: {},
    today: '2026-11-23',
    until: '2026-12-31',
    ...over,
  };
}

describe('czas dnia', () => {
  it('dzień szkolny: 90 minut', () => {
    expect(availableMinutes('2026-11-23', settings()).minutes).toBe(90);
  });

  it('sobota: korepetycje z angielskiego odejmują 60 minut', () => {
    const r = availableMinutes('2026-11-28', settings());
    expect(r.minutes).toBe(180 - 60);
    expect(r.events.map((e) => e.id)).toEqual(['korepetycje-ang']);
  });

  it('pominięta data korepetycji nie odejmuje czasu', () => {
    const s = settings();
    s.events[0].skipDates = ['2026-11-28'];
    expect(availableMinutes('2026-11-28', s).minutes).toBe(180);
  });

  it('godziny po 22:00 są zablokowane', () => {
    const s = settings({ weekWindows: { ...defaultSettings().weekWindows, 1: [{ start: '21:00', end: '23:30' }] } });
    expect(availableMinutes('2026-11-23', s).minutes).toBe(60);
  });

  it('zajęcia bez nauki odejmują tylko część wspólną z oknem', () => {
    const s = settings();
    s.events.push({ id: 'trening', name: 'Trening', weekday: 1, date: null, start: '18:00', minutes: 120, subjectId: null, countsAsStudy: false, skipDates: [] });
    expect(availableMinutes('2026-11-23', s).minutes).toBe(60);
  });
});

describe('fazy', () => {
  const s = settings();
  const matR = s.subjects.find((x) => x.id === 'mat-r')!;
  it('kolejne fazy', () => {
    expect(phaseFor(matR, '2027-03-31', s)).toBe('nowe tematy');
    expect(phaseFor(matR, '2027-04-01', s)).toBe('powtórka');
    expect(phaseFor(matR, '2027-04-30', s)).toBe('powtórka');
    expect(phaseFor(matR, '2027-05-01', s)).toBe('arkusze');
    expect(phaseFor(matR, '2027-05-10', s)).toBe('przegląd');
    expect(phaseFor(matR, '2027-05-11', s)).toBe('po egzaminie');
  });
});

describe('plan', () => {
  it('suma minut nigdy nie przekracza czasu dnia', () => {
    const plan = buildPlan(input({ until: '2027-05-12' }));
    for (const d of plan) expect(d.used).toBeLessThanOrEqual(d.available);
  });

  it('każdy dzień ma konkretne zadania z banku', () => {
    const plan = buildPlan(input());
    const weekdays = plan.filter((d) => d.weekday >= 1 && d.weekday <= 5);
    for (const d of weekdays) {
      const tasks = d.items.filter((i) => i.kind === 'zadanie' || i.kind === 'powtórka');
      expect(tasks.length).toBeGreaterThan(0);
      for (const t of tasks) expect(t.taskId).toBeTruthy();
    }
  });

  it('limit przedmiotów i zadań dziennie', () => {
    const plan = buildPlan(input());
    for (const d of plan) {
      const subs = new Set(d.items.filter((i) => i.kind === 'zadanie' || i.kind === 'powtórka').map((i) => i.subjectId));
      expect(subs.size).toBeLessThanOrEqual(2);
      expect(d.items.filter((i) => i.kind === 'zadanie' || i.kind === 'powtórka').length).toBeLessThanOrEqual(5);
    }
  });

  it('diagnozy po jednej dziennie przed startem planu', () => {
    const plan = buildPlan(input({ diagnoses: [] }));
    const diag = plan.slice(0, 6).map((d) => d.items.filter((i) => i.kind === 'diagnoza').map((i) => i.subjectId));
    expect(diag.slice(0, 4).every((x) => x.length === 1)).toBe(true);
    expect(new Set(diag.slice(0, 4).flat()).size).toBe(4);
    expect(diag[0]).toEqual(['mat-r']); // najwyższy priorytet przedmiotu
  });

  it('za mało czasu: planer pokazuje przesunięte pozycje', () => {
    const s = settings({ weekWindows: { 0: [], 1: [{ start: '17:00', end: '17:20' }], 2: [], 3: [], 4: [], 5: [], 6: [] } });
    const plan = buildPlan(input({ settings: s, diagnoses: [], until: '2026-11-23' }));
    expect(plan[0].used).toBeLessThanOrEqual(20);
    expect(plan[0].shifted.length).toBeGreaterThan(0);
    expect(plan[0].shifted[0].reason).toMatch(/Brak czasu/);
  });

  it('sobota: korepetycje w planie i bez przekroczenia czasu', () => {
    const plan = buildPlan(input());
    const sat = plan.find((d) => d.date === '2026-11-28')!;
    expect(sat.items.some((i) => i.kind === 'korepetycje')).toBe(true);
    expect(sat.available).toBe(120);
    expect(sat.used).toBeLessThanOrEqual(120);
  });

  it('notatka z korepetycji zmniejsza ilość angielskiego w tej części tygodnia', () => {
    const count = (p: ReturnType<typeof buildPlan>) =>
      p.filter((d) => ['2026-11-27', '2026-11-28', '2026-11-29'].includes(d.date))
        .flatMap((d) => d.items)
        .filter((i) => i.subjectId === 'ang-p' && i.kind === 'zadanie')
        .reduce((a, i) => a + i.minutes, 0);
    const s = settings({ maxSubjectsPerDay: 4 });
    s.subjects = s.subjects.map((x) => ({ ...x, priority: 1 }));
    const without = count(buildPlan(input({ settings: s })));
    const withNote = count(buildPlan(input({ settings: s, lessonNotes: [{ id: 'n', date: '2026-11-28', subjectId: 'ang-p', topicId: 'ang-srodki', text: 'czasy przeszłe' }] })));
    expect(without).toBeGreaterThan(0);
    expect(withNote).toBeLessThan(without);
  });

  it('powtórka przypada w zaplanowanym dniu', () => {
    const t = task({ id: 'rev', subjectId: 'mat-r', topicId: 'stereometria', status: 'do powtórki', nextReview: '2026-11-23', reviewStep: 0, result: 30 });
    const plan = buildPlan(input({ bank: [t, ...bankFor('mat-r', MATH, 5)], until: '2026-11-23' }));
    expect(plan[0].items.find((i) => i.taskId === 'rev')?.kind).toBe('powtórka');
  });

  it('brak zadań w banku: wyraźna pozycja zamiast wymyślonego zadania', () => {
    const plan = buildPlan(input({ bank: [], until: '2026-11-23' }));
    const missing = plan[0].items.filter((i) => i.kind === 'brak-zadań');
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.every((i) => i.taskId === null && i.minutes === 0)).toBe(true);
  });

  it('faza 1: najwyżej jeden arkusz próbny w tygodniu', () => {
    const plan = buildPlan(input({ until: '2027-01-31' }));
    const perWeek = new Map<string, number>();
    for (const d of plan) for (const i of d.items) if (i.kind === 'arkusz') perWeek.set(weekStart(d.date), (perWeek.get(weekStart(d.date)) ?? 0) + 1);
    expect(perWeek.size).toBeGreaterThan(0);
    for (const n of perWeek.values()) expect(n).toBe(1);
  });

  it('faza 3: arkusz co dwa dni, a dzień przed egzaminem tylko przegląd', () => {
    const plan = buildPlan(input({ today: '2027-05-01', until: '2027-05-12' }));
    const mockDays = plan.filter((d) => d.items.some((i) => i.kind === 'arkusz')).map((d) => d.date);
    for (let k = 1; k < mockDays.length; k++) expect(mockDays[k] > mockDays[k - 1]).toBe(true);
    expect(mockDays).not.toContain('2027-05-02');
    const before = plan.find((d) => d.date === '2027-05-10')!;
    expect(before.items.every((i) => i.kind === 'przegląd' || i.kind === 'korepetycje' || i.kind === 'zajęcia')).toBe(true);
  });

  it('po egzaminie przedmiot znika z planu', () => {
    const plan = buildPlan(input({ today: '2027-05-06', until: '2027-05-09' }));
    for (const d of plan.filter((x) => x.date > '2027-05-05')) {
      expect(d.items.some((i) => i.subjectId === 'mat-p' && i.kind !== 'korepetycje')).toBe(false);
    }
  });

  it('faza 2: każdy temat wraca co najmniej raz w tygodniu', () => {
    const s = settings({ maxTasksPerDay: 8, weekWindows: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, [{ start: '14:00', end: '18:00' }]])) });
    const plan = buildPlan(input({ settings: s, today: '2027-04-05', until: '2027-04-11' }));
    const topics = new Set(plan.flatMap((d) => d.items).filter((i) => i.subjectId === 'mat-r' && i.topicId).map((i) => i.topicId));
    for (const t of MATH) expect(topics).toContain(t);
  });

  it('dzień zamrożony zostaje bez zmian po zmianie ustawień', () => {
    const first = buildPlan(input({ until: '2026-11-23' }))[0];
    const log = { [first.date]: { date: first.date, items: first.items, done: {}, frozen: true } };
    const s = settings({ maxTasksPerDay: 1 });
    const again = buildPlan(input({ settings: s, dayLog: log, until: '2026-11-24' }));
    expect(again[0].items.map((i) => i.key)).toEqual(first.items.map((i) => i.key));
    expect(again[1].items.filter((i) => i.kind === 'zadanie' || i.kind === 'powtórka').length).toBeLessThanOrEqual(1);
  });

  it('zaległe zadania wyłączone z automatycznego planowania', () => {
    const plan = buildPlan(input({ until: '2026-11-23' }));
    const ids = plan[0].items.map((i) => i.taskId).filter(Boolean) as string[];
    const again = buildPlan(input({ until: '2026-11-23', excludeTaskIds: ids }));
    for (const i of again[0].items) if (i.taskId) expect(ids).not.toContain(i.taskId);
  });
});

describe('podsumowanie niedzielne', () => {
  it('temat bez rozwiązanych zadań od 14 dni trafia do propozycji', () => {
    const subs = defaultSettings().subjects.filter((s) => s.id === 'mat-r');
    const bank = [
      task({ id: 'a', subjectId: 'mat-r', topicId: 'ciagi', history: [{ date: addDays('2027-01-10', -3), result: 80, minutes: null }] }),
      task({ id: 'b', subjectId: 'mat-r', topicId: 'logarytmy', history: [{ date: '2026-12-01', result: 80, minutes: null }] }),
    ];
    const s = weeklySuggestions('2027-01-10', '2026-11-20', subs, bank, { 'mat-r': ['ciagi', 'logarytmy'] }, () => false);
    expect(s.map((x) => x.topicId)).toEqual(['logarytmy']);
  });
});
