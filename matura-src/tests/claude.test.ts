import { describe, expect, it } from 'vitest';
import { errorText, hidesFeature, parseCards, parseEssayGrade, parseGrade, parseOralPlan, snapValue, trimToBytes } from '../src/logic/ai';
import { dueCards, reviewCard } from '../src/logic/flashcards';
import { addNotes, memoryBoost, memoryHint, mergeNotes, MEMORY_PER_SUBJECT } from '../src/logic/memory';
import { pickQuickTasks } from '../src/logic/quick';
import { reportWeekFor, weeklyReport } from '../src/logic/weekly';
import { explanationDoc, toDocs, docSize, DOC_LIMIT } from '../src/store/merge';
import { emptyData } from '../src/store/local';
import type { Flashcard, ResultEvent } from '../src/model';
import { ckeTask } from './helpers';

describe('odpowiedź sample.json: ocena zadania otwartego', () => {
  it('punkty przycięte do 0..max i zaokrąglone, werdykt z punktów, gdy brak', () => {
    expect(parseGrade({ points: 7, feedback: 'ok' }, 3)).toMatchObject({ points: 3, verdict: 'dobrze' });
    expect(parseGrade({ points: -2 }, 3)).toMatchObject({ points: 0, verdict: 'źle' });
    expect(parseGrade({ points: 1.6, verdict: 'częściowo' }, 3)?.points).toBe(2);
  });
  it('nieznany typ błędu → „inne”, brak liczby → null', () => {
    const r = parseGrade({ points: 1, mistakes: [{ type: 'literówka', note: 'zły znak' }, { type: 'koncepcyjny', note: '' }] }, 2)!;
    expect(r.mistakes).toEqual([{ type: 'inne', note: 'zły znak' }]);
    expect(parseGrade({ points: 'dużo' }, 2)).toBeNull();
    expect(parseGrade('tekst', 2)).toBeNull();
  });
});

describe('odpowiedź sample.json: wypracowanie', () => {
  const criteria = [
    { id: 'a', name: 'A', max: 2, values: [0, 1, 2], description: '' },
    { id: 'b', name: 'B', max: 16, values: [0, 2, 4, 6, 8, 12, 16], description: '' },
  ];
  it('wartości dopasowane do dozwolonych, uzasadnienia i 3 wskazówki', () => {
    const r = parseEssayGrade({ criteria: { a: { value: 5, reason: 'r' }, b: { value: 10, reason: 'x' } }, tips: ['1', '2', '3', '4'] }, criteria)!;
    expect(r.values).toEqual({ a: 2, b: 8 });
    expect(r.reasons.a).toBe('r');
    expect(r.tips).toHaveLength(3);
    expect(snapValue(11, [0, 8, 12])).toBe(12);
  });
  it('bez żadnej wartości → null', () => {
    expect(parseEssayGrade({ criteria: {} }, criteria)).toBeNull();
  });
});

describe('fiszki i plan odpowiedzi', () => {
  it('fiszki bez pustych i powtórek, z limitem', () => {
    const r = parseCards([{ front: 'cat', back: 'kot' }, { front: 'Cat', back: 'x' }, { front: '', back: 'y' }, { front: 'dog', back: 'pies', example: 'A dog.' }]);
    expect(r).toEqual([{ front: 'cat', back: 'kot', example: null }, { front: 'dog', back: 'pies', example: 'A dog.' }]);
    expect(parseCards({ fiszki: Array.from({ length: 30 }, (_, i) => ({ front: `f${i}`, back: 'b' })) }, 15)).toHaveLength(15);
  });
  it('plan odpowiedzi wymaga tezy i argumentu', () => {
    expect(parseOralPlan({ teza: 'T', argumenty: ['a', 'b', 'c', 'd'] })?.argumenty).toHaveLength(3);
    expect(parseOralPlan({ teza: '', argumenty: ['a'] })).toBeNull();
  });
  it('kody błędów po polsku; brak zgody ukrywa funkcję', () => {
    expect(errorText('cancelled')).toBeNull();
    expect(errorText('rate_limited')).toMatch(/Spróbuj za chwilę/);
    expect(hidesFeature('not_granted')).toBe(true);
    expect(hidesFeature('rate_limited')).toBe(false);
  });
});

describe('powtórki fiszek', () => {
  const card = (over: Partial<Flashcard> = {}): Flashcard => ({ id: 'c', subj: 'ang-p', deck: 'd', deckName: 'D', front: 'f', back: 'b', example: null, step: 0, due: '2026-11-22', reviews: 0, at: 0, ...over });
  it('„Umiem” 1 → 3 → 7 → 14 dni, „Nie umiem” na jutro', () => {
    let c = reviewCard(card(), true, '2026-11-22', 1);
    expect(c.due).toBe('2026-11-23');
    c = reviewCard(c, true, '2026-11-23', 2);
    expect(c.due).toBe('2026-11-26');
    c = reviewCard(c, true, '2026-11-26', 3);
    expect(c.due).toBe('2026-12-03');
    c = reviewCard(c, true, '2026-12-03', 4);
    expect(c.due).toBe('2026-12-17');
    c = reviewCard(c, true, '2026-12-17', 5);
    expect(c.due).toBe('2026-12-31');
    c = reviewCard(c, false, '2026-12-31', 6);
    expect(c.due).toBe('2027-01-01');
    expect(c.step).toBe(0);
  });
  it('do powtórki tylko karty z terminem, bez usuniętych', () => {
    expect(dueCards([card({ id: 'a' }), card({ id: 'b', due: '2026-12-01' }), card({ id: 'c', deleted: true })], '2026-11-22').map((c) => c.id)).toEqual(['a']);
  });
});

describe('tryb 5 minut', () => {
  const abcd = { items: [{ id: '1', label: null, options: ['A', 'B'], correct: 'A' }], scoring: 'each' as const };
  const tasks = [
    ckeTask('a', { auto: true, answer: abcd, topics: ['logarytmy'], minutes: 4 }),
    ckeTask('b', { auto: true, answer: abcd, topics: ['ciagi'], minutes: 4 }),
    ckeTask('c', { auto: true, answer: abcd, topics: ['logarytmy'], minutes: 4 }),
    ckeTask('d', { auto: true, answer: abcd, topics: ['potegi'], minutes: 4 }),
    ckeTask('e', { auto: true, answer: abcd, topics: ['procenty'], minutes: 12 }),
    ckeTask('f', { auto: false, topics: ['planimetria'], minutes: 4 }),
  ];
  const mastery = (_s: string, t: string) => ({ logarytmy: 0.2, ciagi: 0.4, potegi: 0.9 } as Record<string, number>)[t] ?? null;
  it('najsłabsze tematy, krótkie, zamknięte, bez zadań z ostatnich 3 dni', () => {
    const srs = new Map([['a', { status: 'do powtórki' as const, step: 0, nextReview: null, lastDate: '2026-11-21', lastPct: 0, attempts: 1 }]]);
    const r = pickQuickTasks(tasks, srs, mastery, '2026-11-22');
    expect(r.map((t) => t.id)).toEqual(['c', 'b', 'd']);
  });
});

describe('raport tygodniowy', () => {
  const ev = (id: string, d: string, topic: string, pts: number, max = 2): ResultEvent => ({ id, k: 'w', at: Date.parse(d), d, task: id, subj: 'mat-p', topics: [topic], pts, max, sec: 300, src: 'zadanie' });
  it('liczy zadania, czas i porównanie z poprzednim tygodniem', () => {
    const results = [ev('1', '2026-11-10', 'ciagi', 2), ev('2', '2026-11-11', 'ciagi', 2), ev('3', '2026-11-17', 'ciagi', 0), ev('4', '2026-11-18', 'ciagi', 0), ev('5', '2026-11-19', 'potegi', 2)];
    const r = weeklyReport(results, [], '2026-11-16');
    expect(r.tasks).toBe(3);
    expect(r.sec).toBe(900);
    expect(r.prevPct).toBe(100);
    expect(r.pct).toBe(33);
    expect(r.worse.map((w) => w.topic)).toContain('ciagi');
    expect(r.changes[0]).toMatch(/ciagi/);
  });
  it('w niedzielę bieżący tydzień, od poniedziałku do środy poprzedni', () => {
    expect(reportWeekFor('2026-11-22')).toBe('2026-11-16');
    expect(reportWeekFor('2026-11-24')).toBe('2026-11-16');
    expect(reportWeekFor('2026-11-27')).toBeNull();
  });
});

describe('pamięć', () => {
  let n = 0;
  const id = () => `m${++n}`;
  it('ta sama notatka zwiększa licznik, limit 40 na przedmiot', () => {
    let notes = addNotes([], [{ subj: 'mat-p', topic: 'ciagi', type: 'koncepcyjny', note: 'Myli wzór na sumę.' }], 1, id);
    notes = addNotes(notes, [{ subj: 'mat-p', topic: 'ciagi', type: 'koncepcyjny', note: 'myli wzór na sumę' }], 2, id);
    expect(notes).toHaveLength(1);
    expect(notes[0].count).toBe(2);
    expect(memoryBoost(notes, 'mat-p', 'ciagi')).toBeCloseTo(0.3);
    expect(memoryHint(notes, 'mat-p', 'ciagi')).toMatch(/Uczeń często: Myli wzór na sumę\. \(2×\)/);
    const many = Array.from({ length: 50 }, (_, i) => ({ subj: 'mat-p' as const, topic: 'x', type: 'inne' as const, note: `n${i}` }));
    const capped = addNotes(notes, many, 3, id);
    expect(capped.filter((x) => x.subj === 'mat-p')).toHaveLength(MEMORY_PER_SUBJECT);
    expect(capped.some((x) => x.count === 2)).toBe(true);
  });
  it('usunięcie wpisu wygrywa przy scalaniu', () => {
    const a = [{ id: 'x', subj: 'mat-p' as const, topic: null, type: 'inne' as const, note: 'a', count: 1, at: 1 }];
    const b = [{ ...a[0], deleted: true, at: 2 }];
    expect(mergeNotes(a, b)[0].deleted).toBe(true);
  });
});

describe('dokumenty ≤ 256 KiB', () => {
  it('przycinanie zostawia najnowsze elementy', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ at: i, text: 'x'.repeat(1000) }));
    const kept = trimToBytes(items, 20_000);
    expect(JSON.stringify(kept).length).toBeLessThanOrEqual(20_000);
    expect(kept.every((x) => x.at >= 100 - kept.length)).toBe(true);
  });
  it('wyjaśnienia w dokumencie na arkusz, każdy poniżej limitu', () => {
    expect(explanationDoc('MMAP-R0-100-2505-n6-1')).toBe('wyjasnienia-MMAP-R0-100-2505');
    expect(explanationDoc('u-abc-def')).toBe('wyjasnienia-wlasne');
    const data = emptyData('2026-11-22');
    for (let i = 0; i < 80; i++) data.explanations[`E-n${i}`] = { taskId: `E-n${i}`, hint: 'h', full: 'p'.repeat(5000), chat: [], at: i };
    const docs = toDocs(data, '2026-11-22');
    expect(docSize(docs['wyjasnienia-E'])).toBeLessThanOrEqual(DOC_LIMIT);
  });
});
