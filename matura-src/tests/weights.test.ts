import { describe, expect, it } from 'vitest';
import { computeWeights, topicPriority, topicStats } from '../src/logic/weights';
import { MATH_TOPICS } from '../src/data/taxonomy';
import { exam, examTask } from './helpers';

const topics = MATH_TOPICS.filter((t) => ['logarytmy', 'ciagi', 'pochodne'].includes(t.id));

const exams = [
  exam({ id: 'E23', year: 2023, maxPoints: 10, tasks: [examTask('1', 6, ['logarytmy']), examTask('2', 4, ['ciagi'], 'zamknięte')] }),
  exam({ id: 'E24', year: 2024, maxPoints: 10, tasks: [examTask('1', 6, ['logarytmy']), examTask('2', 4, ['ciagi'])] }),
  exam({ id: 'E25', year: 2025, maxPoints: 10, tasks: [examTask('1', 2, ['logarytmy']), examTask('2', 8, ['pochodne'])] }),
  exam({ id: 'E26', year: 2026, maxPoints: 10, tasks: [examTask('1', 2, ['logarytmy']), examTask('2', 4, ['pochodne', 'ciagi']), examTask('3', 4, ['pochodne'])] }),
];

describe('statystyki tematów', () => {
  const stats = Object.fromEntries(topicStats(exams, topics).map((s) => [s.topicId, s]));

  it('łączne punkty i udział', () => {
    expect(stats.logarytmy.points).toBe(16);
    expect(stats.ciagi.points).toBe(10); // 4 + 4 + 2 (połowa zadania z dwoma tematami)
    expect(stats.pochodne.points).toBe(14);
    expect(stats.logarytmy.share + stats.ciagi.share + stats.pochodne.share).toBeCloseTo(1);
  });

  it('liczba arkuszy z tematem', () => {
    expect(stats.logarytmy.examCount).toBe(4);
    expect(stats.pochodne.examCount).toBe(2);
  });

  it('trend: dwa ostatnie lata względem reszty', () => {
    expect(stats.logarytmy.recentAvg).toBe(2);
    expect(stats.logarytmy.restAvg).toBe(6);
    expect(stats.logarytmy.trend).toBeCloseTo(0.33, 2);
    expect(stats.pochodne.trend).toBe(2); // brak w starszych latach
  });

  it('średnia punktów na zadanie według typu', () => {
    expect(stats.ciagi.avgByType.zamknięte).toBe(4);
    expect(stats.ciagi.avgByType.otwarte).toBe(3); // (4 + 2) / 2
  });

  it('jeden rok w zakresie: brak trendu', () => {
    const one = topicStats([exams[0]], topics);
    expect(one.every((s) => s.trend === null)).toBe(true);
  });
});

describe('wagi', () => {
  const stats = topicStats(exams, topics);

  it('sumują się do 1 w każdym trybie', () => {
    for (const mode of ['bazowo', 'trend', 'mocno trend'] as const) {
      const w = computeWeights(stats, mode);
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    }
  });

  it('tryb trendu podnosi temat rosnący', () => {
    const b = computeWeights(stats, 'bazowo');
    const t = computeWeights(stats, 'trend');
    const m = computeWeights(stats, 'mocno trend');
    expect(t.pochodne).toBeGreaterThan(b.pochodne);
    expect(m.pochodne).toBeGreaterThan(t.pochodne);
    expect(m.logarytmy).toBeLessThan(b.logarytmy);
  });

  it('bez danych wszystkie tematy mają równą wagę', () => {
    const w = computeWeights(topicStats([], topics), 'bazowo');
    expect(w.logarytmy).toBeCloseTo(1 / 3);
    expect(w.pochodne).toBeCloseTo(1 / 3);
  });

  it('temat bez punktów nie znika z planu', () => {
    const w = computeWeights(topicStats([exams[0]], topics), 'bazowo');
    expect(w.pochodne).toBeGreaterThan(0);
  });
});

describe('priorytet tematu', () => {
  it('słaby wynik diagnozy podnosi priorytet', () => {
    expect(topicPriority(0.2, 0.1, 0, undefined)).toBeGreaterThan(topicPriority(0.2, 0.9, 0, undefined));
  });
  it('nieznana biegłość nie zmienia wagi', () => {
    expect(topicPriority(0.2, null, 0, undefined)).toBeCloseTo(0.2);
  });
  it('ręczna waga zastępuje wyliczoną', () => {
    expect(topicPriority(0.2, null, 0, 0.5)).toBeCloseTo(0.5);
  });
  it('błędy koncepcyjne podnoszą priorytet', () => {
    expect(topicPriority(0.2, null, 0.4, undefined)).toBeCloseTo(0.28);
  });
});

describe('arkusze bez danych zadań', () => {
  it('nie wpływają na trend ani średnie', () => {
    const withEmpty = [...exams.slice(2), exam({ id: 'EMPTY', year: 2023 }), exam({ id: 'EMPTY2', year: 2024 })];
    const st = Object.fromEntries(topicStats(withEmpty, topics).map((s) => [s.topicId, s]));
    expect(st.logarytmy.trend).toBeNull();
    expect(st.logarytmy.recentAvg).toBe(2);
  });
});
