import { describe, expect, it } from 'vitest';
import { applyResult, intervalFor, isDue } from '../src/logic/srs';
import { errorBoost, forecast, latestDiagnosis, observations, resultDropped, scoreDiagnosis, topicMastery } from '../src/logic/mastery';
import { buildDiagnosisResult, buildSelfAssessment, selectDiagnosisTasks } from '../src/logic/diagnosis';
import { DEFAULT_SUBJECTS } from '../src/store/defaults';
import type { ErrorEntry } from '../src/types';
import { task } from './helpers';

describe('powtórki 1, 3, 7, 14 dni', () => {
  it('odstęp zależy od wyniku', () => {
    expect(intervalFor(30)).toBe(1);
    expect(intervalFor(55)).toBe(3);
    expect(intervalFor(75)).toBe(7);
    expect(intervalFor(95)).toBe(14);
  });

  it('zapis wyniku ustawia datę powtórki i historię', () => {
    const t = applyResult(task({ id: 'a', subjectId: 'mat-r', topicId: 'logarytmy' }), 60, '2026-12-01', 20);
    expect(t.status).toBe('do powtórki');
    expect(t.nextReview).toBe('2026-12-04');
    expect(t.history).toEqual([{ date: '2026-12-01', result: 60, minutes: 20 }]);
    expect(isDue(t, '2026-12-03')).toBe(false);
    expect(isDue(t, '2026-12-04')).toBe(true);
  });

  it('wynik ≥ 90% po powtórce 14-dniowej kończy zadanie', () => {
    let t = task({ id: 'a', subjectId: 'mat-r', topicId: 'logarytmy' });
    t = applyResult(t, 95, '2026-12-01', null);
    expect(t.status).toBe('do powtórki');
    t = applyResult(t, 92, '2026-12-15', null);
    expect(t.status).toBe('zrobione');
    expect(t.nextReview).toBeNull();
  });

  it('wynik przycinany do 0–100', () => {
    expect(applyResult(task({ id: 'a', subjectId: 'x', topicId: 'y' }), 140, '2026-12-01', null).result).toBe(100);
  });
});

describe('diagnoza', () => {
  it('wynik na temat w procentach, bez zadań bez punktów', () => {
    const r = scoreDiagnosis([
      { taskId: '1', topicId: 'logarytmy', points: 1, maxPoints: 2 },
      { taskId: '2', topicId: 'logarytmy', points: 2, maxPoints: 2 },
      { taskId: '3', topicId: 'ciagi', points: 0, maxPoints: 3 },
      { taskId: '4', topicId: 'pochodne', points: null, maxPoints: 3 },
    ]);
    expect(r).toEqual({ logarytmy: 75, ciagi: 0 });
  });

  it('nowa diagnoza zastępuje wagi, starsza zostaje w historii', () => {
    const d1 = buildDiagnosisResult('d1', 'mat-r', '2026-11-20', [{ taskId: '1', topicId: 'logarytmy', points: 0, maxPoints: 2 }], 30);
    const d2 = buildDiagnosisResult('d2', 'mat-r', '2027-01-10', [{ taskId: '1', topicId: 'logarytmy', points: 2, maxPoints: 2 }], 30);
    const all = [d1, d2];
    expect(latestDiagnosis(all, 'mat-r')!.id).toBe('d2');
    expect(all).toHaveLength(2);
    const obs = observations('mat-r', 'logarytmy', [], [], [], all);
    expect(obs.map((o) => o.pct)).toEqual([0, 100]);
  });

  it('samoocena jest zapisana jako samoocena, nie jako wynik testu', () => {
    const s = buildSelfAssessment('s1', 'pol-p', '2026-11-20', { 'pol-jezyk': 2, 'pol-rozumienie': 9 });
    expect(s.kind).toBe('samoocena');
    expect(s.perTopic).toEqual({ 'pol-jezyk': 2 });
    const obs = observations('pol-p', 'pol-jezyk', [], [], [], [s]);
    expect(obs[0].source).toBe('samoocena');
    expect(obs[0].pct).toBe(25);
  });

  it('wynik testu ma pierwszeństwo przed samooceną', () => {
    const s = buildSelfAssessment('s1', 'mat-r', '2026-11-20', { logarytmy: 5 });
    const t = buildDiagnosisResult('d1', 'mat-r', '2026-11-21', [{ taskId: '1', topicId: 'logarytmy', points: 1, maxPoints: 4 }], 30);
    expect(topicMastery(observations('mat-r', 'logarytmy', [], [], [], [s, t]))).toBeCloseTo(0.25);
  });

  it('wybór zadań: tylko z banku, po jednym z tematu według priorytetu', () => {
    const sub = { ...DEFAULT_SUBJECTS[0], diagnosisTasks: 3 };
    const bank = [
      task({ id: 'a', subjectId: 'mat-r', topicId: 'logarytmy', minutes: 10 }),
      task({ id: 'b', subjectId: 'mat-r', topicId: 'logarytmy', minutes: 5 }),
      task({ id: 'c', subjectId: 'mat-r', topicId: 'ciagi' }),
      task({ id: 'd', subjectId: 'mat-p', topicId: 'pochodne' }),
    ];
    const sel = selectDiagnosisTasks(bank, sub, ['pochodne', 'logarytmy', 'ciagi']);
    expect(sel.tasks.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(sel.uncoveredTopics).toEqual(['pochodne']);
  });

  it('polski: brak tekstu i zadania językowego jest zgłaszany', () => {
    const sub = DEFAULT_SUBJECTS.find((s) => s.id === 'pol-p')!;
    const sel = selectDiagnosisTasks([], sub, ['pol-rozumienie']);
    expect(sel.tasks).toEqual([]);
    expect(sel.missingParts.map((p) => p.topicId)).toEqual(['pol-rozumienie', 'pol-jezyk']);
  });
});

describe('biegłość, błędy i prognoza', () => {
  it('biegłość to średnia trzech ostatnich wyników', () => {
    const t = task({
      id: 'a',
      subjectId: 'mat-r',
      topicId: 'ciagi',
      history: [
        { date: '2026-12-01', result: 0, minutes: null },
        { date: '2026-12-02', result: 60, minutes: null },
        { date: '2026-12-03', result: 80, minutes: null },
        { date: '2026-12-04', result: 100, minutes: null },
      ],
    });
    expect(topicMastery(observations('mat-r', 'ciagi', [t], [], [], []))).toBeCloseTo(0.8);
  });

  it('spadek wyniku', () => {
    const mk = (r: number[]) => r.map((x, i) => ({ date: `2026-12-0${i + 1}`, pct: x, source: 'zadanie' as const }));
    expect(resultDropped(mk([90, 90, 90, 60, 60, 60]))).toBe(true);
    expect(resultDropped(mk([60, 60, 60, 90, 90, 90]))).toBe(false);
  });

  it('powtarzający się błąd koncepcyjny zwiększa wagę', () => {
    const e = (id: string, date: string, type: ErrorEntry['type'] = 'koncepcyjny'): ErrorEntry => ({
      id, subjectId: 'mat-r', taskId: null, topicId: 'ciagi', type, note: '', date,
    });
    expect(errorBoost([e('1', '2026-12-01')], 'mat-r', 'ciagi', '2026-12-05')).toBe(0);
    expect(errorBoost([e('1', '2026-12-01'), e('2', '2026-12-03')], 'mat-r', 'ciagi', '2026-12-05')).toBeCloseTo(0.2);
    expect(errorBoost([e('1', '2026-12-01'), e('2', '2026-12-03', 'rachunkowy')], 'mat-r', 'ciagi', '2026-12-05')).toBe(0);
    expect(errorBoost([e('1', '2026-10-01'), e('2', '2026-12-03')], 'mat-r', 'ciagi', '2026-12-05')).toBe(0);
  });

  it('prognoza: brak danych daje szeroki zakres', () => {
    const none = forecast({ a: 0.5, b: 0.5 }, { a: null, b: null }, 0);
    const some = forecast({ a: 0.5, b: 0.5 }, { a: 0.8, b: 0.6 }, 30);
    expect(none.high - none.low).toBeGreaterThan(some.high - some.low);
    expect(some.pct).toBe(70);
    expect(some.low).toBeLessThan(70);
    expect(some.high).toBeGreaterThan(70);
  });
});

describe('limit czasu diagnozy', () => {
  it('nie przekracza czasu poza pierwszym zadaniem', () => {
    const sub = { ...DEFAULT_SUBJECTS[0], diagnosisTasks: 15, diagnosisMinutes: 30 };
    const bank = ['logarytmy', 'ciagi', 'pochodne', 'stereometria'].map((topicId, i) => task({ id: `t${i}`, subjectId: 'mat-r', topicId, minutes: 12 }));
    const sel = selectDiagnosisTasks(bank, sub, ['logarytmy', 'ciagi', 'pochodne', 'stereometria']);
    expect(sel.minutes).toBeLessThanOrEqual(30);
    expect(sel.tasks).toHaveLength(2);
    expect(sel.uncoveredTopics).toEqual([]);
  });
});
