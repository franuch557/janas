import { describe, expect, it } from 'vitest';
import { activeEvents, chunkEvents, mergeEvents, streak, studyDays, taskRecords } from '../src/logic/events';
import { mergeData } from '../src/store/merge';
import { defaultStan, type AppEvent, type ResultEvent, type LocalData } from '../src/model';

function res(id: string, d: string, pts: number, max = 2, over: Partial<ResultEvent> = {}): ResultEvent {
  return { id, k: 'w', at: Date.parse(d) + Number(id.replace(/\D/g, '') || 0), d, task: 'T1', subj: 'mat-p', topics: ['logarytmy'], pts, max, sec: 60, src: 'zadanie', ...over };
}

describe('scalanie zdarzeń', () => {
  it('łączy po id bez duplikatów (telefon i komputer)', () => {
    const phone = [res('w1', '2026-11-20', 1), res('w2', '2026-11-21', 2)];
    const pc = [res('w1', '2026-11-20', 1), res('w3', '2026-11-21', 0)];
    const m = mergeEvents(phone, pc);
    expect(m.map((e) => e.id).sort()).toEqual(['w1', 'w2', 'w3']);
  });

  it('cofnięcie wyniku to zdarzenie: wynik znika z historii i powtórek', () => {
    const evs: AppEvent[] = [res('w1', '2026-11-20', 0), { id: 'c1', k: 'c', at: Date.parse('2026-11-20') + 5, d: '2026-11-20', target: 'w1' }];
    const a = activeEvents(evs);
    expect(a.results).toEqual([]);
    expect(taskRecords(a.results).has('T1')).toBe(false);
    expect(studyDays(a).size).toBe(0);
  });

  it('ponowny zapis po cofnięciu daje jeden wpis w historii', () => {
    const evs: AppEvent[] = [res('w1', '2026-11-20', 0), { id: 'c1', k: 'c', at: 1, d: '2026-11-20', target: 'w1' }, res('w2', '2026-11-20', 2)];
    const rec = taskRecords(activeEvents(evs).results).get('T1')!;
    expect(rec.history).toHaveLength(1);
    expect(rec.history[0].pct).toBe(100);
  });

  it('cofnięcie arkusza cofa wyniki jego zadań', () => {
    const evs: AppEvent[] = [
      res('w1', '2026-11-20', 1, 1, { session: 'S', sev: 's1' }),
      { id: 's1', k: 's', at: 10, d: '2026-11-20', mode: 'arkusz', exam: 'E', part: null, subj: 'mat-p', pts: 1, max: 1, graded: 1, total: 1, sec: 60, perTopic: {}, session: 'S' },
      { id: 'c1', k: 'c', at: 11, d: '2026-11-20', target: 's1' },
    ];
    const a = activeEvents(evs);
    expect(a.results).toEqual([]);
    expect(a.sessions).toEqual([]);
  });

  it('ponowne zakończenie arkusza: cofnięcie starego wyniku nie ukrywa nowych wyników zadań', () => {
    const ses = (id: string, at: number, pts: number) => ({ id, k: 's' as const, at, d: '2026-11-20', mode: 'arkusz' as const, exam: 'E', part: null, subj: 'mat-p' as const, pts, max: 2, graded: 1, total: 2, sec: 60, perTopic: {}, session: 'S' });
    const evs: AppEvent[] = [
      res('w1', '2026-11-20', 1, 1, { session: 'S', sev: 's1', task: 'A', at: 100 }),
      ses('s1', 101, 1),
      // „Oceń pozostałe”: cofnięcie s1 i komplet nowych wyników z nowym zdarzeniem s2
      { id: 'c1', k: 'c', at: 200, d: '2026-11-20', target: 's1' },
      res('w2', '2026-11-20', 1, 1, { session: 'S', sev: 's2', task: 'A', at: 201 }),
      res('w3', '2026-11-20', 1, 1, { session: 'S', sev: 's2', task: 'B', at: 201 }),
      ses('s2', 202, 2),
    ];
    const a = activeEvents(evs);
    expect(a.results.map((r) => r.id).sort()).toEqual(['w2', 'w3']);
    expect(a.sessions.map((x) => x.id)).toEqual(['s2']);
  });

  it('starsze wyniki bez pola sev: kaskada tylko dla wyników sprzed cofniętego zakończenia', () => {
    const evs: AppEvent[] = [
      res('w1', '2026-11-20', 1, 1, { session: 'S', at: 100 }),
      { id: 's1', k: 's', at: 101, d: '2026-11-20', mode: 'arkusz', exam: 'E', part: null, subj: 'mat-p', pts: 1, max: 1, graded: 1, total: 1, sec: 1, perTopic: {}, session: 'S' },
      { id: 'c1', k: 'c', at: 200, d: '2026-11-20', target: 's1' },
      res('w2', '2026-11-20', 1, 1, { session: 'S', at: 300 }),
    ];
    expect(activeEvents(evs).results.map((r) => r.id)).toEqual(['w2']);
  });

  it('powtórka: słaby wynik → za 1 dzień, dobry → za 7 dni', () => {
    expect(taskRecords([res('w1', '2026-11-20', 0)]).get('T1')!.srs.nextReview).toBe('2026-11-21');
    expect(taskRecords([res('w1', '2026-11-20', 3, 4)]).get('T1')!.srs.nextReview).toBe('2026-11-27');
  });

  it('dokumenty wyników dzielone na miesiące', () => {
    const c = chunkEvents([res('w1', '2026-11-20', 1), res('w2', '2026-12-01', 1)]);
    expect(Object.keys(c).sort()).toEqual(['wyniki-2026-11', 'wyniki-2026-12']);
    const big = Array.from({ length: 50 }, (_, i) => res(`w${i}`, '2026-11-20', 1));
    expect(Object.keys(chunkEvents(big, 1000)).length).toBeGreaterThan(1);
  });
});

describe('seria dni nauki', () => {
  const days = new Set(['2026-11-18', '2026-11-19', '2026-11-20']);
  it('liczy dni z rzędu do dziś', () => {
    expect(streak(new Set([...days, '2026-11-21']), '2026-11-21')).toBe(4);
  });
  it('dziś jeszcze nic: seria do wczoraj trwa', () => {
    expect(streak(days, '2026-11-21')).toBe(3);
  });
  it('przerwa zeruje serię', () => {
    expect(streak(days, '2026-11-23')).toBe(0);
  });
});

describe('scalanie stanu z dwóch urządzeń', () => {
  const mk = (updatedAt: number, events: AppEvent[]): LocalData => ({ stan: { ...defaultStan('2026-11-21'), updatedAt }, events, sessions: {}, essays: [] });
  it('stan według updatedAt, zdarzenia sumą', () => {
    const local = mk(5, [res('w1', '2026-11-20', 1)]);
    const remote = mk(9, [res('w2', '2026-11-21', 1)]);
    remote.stan.reminder.time = '19:30';
    const m = mergeData(local, remote);
    expect(m.stan.reminder.time).toBe('19:30');
    expect(m.events).toHaveLength(2);
  });
  it('usunięcie danych na jednym urządzeniu nie wraca z drugiego', () => {
    const local = mk(5, [res('w1', '2026-11-20', 1)]);
    const remote = mk(9, []);
    remote.stan.resetAt = Date.parse('2026-11-21');
    expect(mergeData(local, remote).events).toEqual([]);
  });
});
