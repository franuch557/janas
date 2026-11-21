import { describe, expect, it } from 'vitest';
import { combineScores, countWords, scoreClosed, scoreExam } from '../src/logic/scoring';
import type { ClosedAnswer } from '../src/logic/cke';
import { ckeTask } from './helpers';

const abcd: ClosedAnswer = { items: [{ id: '1', label: null, options: ['A', 'B', 'C', 'D'], correct: 'B' }], scoring: 'each' };
const pf: ClosedAnswer = {
  items: [
    { id: 'a', label: '1', options: ['P', 'F'], correct: 'P' },
    { id: 'b', label: '2', options: ['P', 'F'], correct: 'F' },
  ],
  scoring: 'all',
};

describe('sprawdzanie zamkniętych', () => {
  it('A/B/C/D: poprawna i błędna odpowiedź', () => {
    expect(scoreClosed(abcd, { '1': 'B' }, 1).points).toBe(1);
    expect(scoreClosed(abcd, { '1': 'C' }, 1).points).toBe(0);
    expect(scoreClosed(abcd, {}, 1)).toMatchObject({ points: 0, allAnswered: false });
  });

  it('P/F, scoring all: punkt tylko za komplet', () => {
    expect(scoreClosed(pf, { a: 'P', b: 'F' }, 1).points).toBe(1);
    expect(scoreClosed(pf, { a: 'P', b: 'P' }, 1).points).toBe(0);
    expect(scoreClosed(pf, { a: 'P', b: 'P' }, 1).perItem).toEqual({ a: true, b: false });
  });

  it('scoring each: punkt za każdą pozycję, najwyżej maksimum', () => {
    const five: ClosedAnswer = { items: ['1', '2', '3', '4', '5'].map((id) => ({ id, label: id, options: ['A', 'B', 'C'], correct: 'A' })), scoring: 'each' };
    expect(scoreClosed(five, { '1': 'A', '2': 'A', '3': 'B' }, 5).points).toBe(2);
    expect(scoreClosed(five, { '1': 'A', '2': 'A', '3': 'A', '4': 'A', '5': 'A' }, 4).points).toBe(4);
  });

  it('progi: liczba poprawnych → punkty, brak klucza = 0', () => {
    const four: ClosedAnswer = { items: ['1', '2', '3', '4'].map((id) => ({ id, label: id, options: ['P', 'F'], correct: 'P' })), scoring: { '4': 2, '3': 1 } };
    expect(scoreClosed(four, { '1': 'P', '2': 'P', '3': 'P', '4': 'P' }, 2).points).toBe(2);
    expect(scoreClosed(four, { '1': 'P', '2': 'P', '3': 'P', '4': 'F' }, 2).points).toBe(1);
    expect(scoreClosed(four, { '1': 'P', '2': 'P', '3': 'F', '4': 'F' }, 2).points).toBe(0);
  });
});

describe('wybierz dwie odpowiedzi (zbiór bez kolejności)', () => {
  const two: ClosedAnswer = {
    items: [
      { id: '11.1', label: 'litera 1 (alfabetycznie)', options: ['A', 'B', 'C', 'D', 'E', 'F'], correct: 'C' },
      { id: '11.2', label: 'litera 2 (alfabetycznie)', options: ['A', 'B', 'C', 'D', 'E', 'F'], correct: 'E' },
    ],
    scoring: 'each',
    unordered: true,
  };
  it('kolejność nie ma znaczenia', () => {
    expect(scoreClosed(two, { '11.1': 'E', '11.2': 'C' }, 2).points).toBe(2);
    expect(scoreClosed(two, { '11.1': 'C', '11.2': 'F' }, 2).points).toBe(1);
    expect(scoreClosed(two, { '11.1': 'E', '11.2': 'E' }, 2).points).toBe(1);
  });
});

describe('licznik słów jak CKE', () => {
  it('liczy wyrazy rozdzielone odstępami, liczby jako słowa, bez samych znaków', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('Ala ma kota')).toBe(3);
    expect(countWords('W 1918 roku – po latach – Polska odzyskała niepodległość.')).toBe(8);
    expect(countWords('  biało-czerwona   flaga\n\nnad domem ')).toBe(4);
    expect(countWords('I am 18 , really !')).toBe(4);
  });
});

describe('wynik arkusza', () => {
  const closed = ckeTask('z1', { auto: true, type: 'zamknięte', answer: abcd, maxPoints: 1, topics: ['ciagi'] });
  const open3 = ckeTask('z2', { maxPoints: 3, topics: ['logarytmy'] });
  const open2 = ckeTask('z3', { maxPoints: 2, topics: ['logarytmy'] });

  it('liczy tylko ocenione zadania: „ocenione X z Y”', () => {
    const r = scoreExam([closed, open3, open2], { z1: { choice: { '1': 'B' } }, z2: { self: 2 } });
    expect(r.pts).toBe(3);
    expect(r.max).toBe(4);
    expect(r.totalMax).toBe(6);
    expect(r.graded).toBe(2);
    expect(r.total).toBe(3);
    expect(r.closedPts).toBe(1);
    expect(r.perTask.z3.graded).toBe(false);
  });

  it('zamknięte bez odpowiedzi są ocenione na 0', () => {
    const r = scoreExam([closed], {});
    expect(r).toMatchObject({ pts: 0, max: 1, graded: 1 });
  });

  it('zadania do wyboru (alternative) liczą się raz: to, które rozwiązano', () => {
    const t1 = ckeTask('w1', { maxPoints: 35, alternative: 'temat', essay: { minWords: 300, maxWords: null, criteria: 'pol' } });
    const t2 = ckeTask('w2', { maxPoints: 35, alternative: 'temat', essay: { minWords: 300, maxWords: null, criteria: 'pol' } });
    const r = scoreExam([t1, t2], { w2: { text: 'mój tekst', self: 20 } });
    expect(r.total).toBe(1);
    expect(r.totalMax).toBe(35);
    expect(r.pts).toBe(20);
    expect(r.perTask.w1.counted).toBe(false);
    expect(r.perTask.w2.counted).toBe(true);
  });

  it('polski: wynik dwóch części arkusza sumuje się', () => {
    const p1 = scoreExam([closed, open3], { z1: { choice: { '1': 'B' } }, z2: { self: 3 } });
    const w = ckeTask('w1', { maxPoints: 35, alternative: 't' });
    const w2 = ckeTask('w2', { maxPoints: 35, alternative: 't' });
    const p2 = scoreExam([w, w2], { w1: { text: 'x', self: 25 } });
    const all = combineScores([p1, p2]);
    expect(all.pts).toBe(29);
    expect(all.max).toBe(39);
    expect(all.total).toBe(3);
    expect(all.perTopic.logarytmy[1]).toBeGreaterThan(0);
  });
});
