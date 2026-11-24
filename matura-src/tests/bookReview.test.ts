import { describe, expect, it } from 'vitest';
import { bookRecords, dueBookQuestions, lqRef, mixBookQuestions, parseLq } from '../src/logic/bookReview';
import { postponed, postponeRef } from '../src/logic/review';
import { bookQuiz, BOOKS } from '../src/store/books';
import type { TickEvent } from '../src/model';

const tk = (ref: string, d: string, at: number): TickEvent => ({ id: ref, k: 'o', at, d, ref });

describe('powtórki pytań z lektur', () => {
  it('każda lektura ma pytania z kluczem', () => {
    for (const b of BOOKS) expect(bookQuiz(b.id).length, b.id).toBeGreaterThan(4);
  });
  it('błąd wraca jutro, dobra odpowiedź za dwa tygodnie', () => {
    const r = bookRecords([tk(lqRef('lalka', 0, false), '2026-11-23', 1), tk(lqRef('dzuma', 2, true), '2026-11-23', 2), tk('plan-x', '2026-11-23', 3)]);
    expect(r.get('lq:lalka:0')!.nextReview).toBe('2026-11-24');
    expect(r.get('lq:dzuma:2')!.nextReview).toBe('2026-12-07');
    expect(r.size).toBe(2);
    expect(dueBookQuestions(r, '2026-11-24')).toEqual(['lq:lalka:0']);
  });
  it('poprawka tego samego dnia daje najwyżej 3 dni; odłożenie pomija pytanie', () => {
    const r = bookRecords([tk(lqRef('lalka', 0, false), '2026-11-23', 1), tk(lqRef('lalka', 0, true), '2026-11-23', 2)]);
    expect(r.get('lq:lalka:0')!.nextReview).toBe('2026-11-26');
    const skip = postponed([tk(postponeRef('lq:lalka:0'), '2026-11-26', 3)], '2026-11-26');
    expect(dueBookQuestions(r, '2026-11-26', skip)).toEqual([]);
    expect(parseLq('lq:rok-1984:3')).toEqual({ book: 'rok-1984', i: 3 });
  });
  it('wplatanie pytań w sesję w ramach czasu', () => {
    expect(mixBookQuestions(['a', 'b', 'c', 'd'], 8, ['q1', 'q2', 'q3'], 10)).toEqual(['a', 'b', 'q1', 'c', 'd', 'q2']);
    expect(mixBookQuestions([], 0, ['q1', 'q2'], 5)).toEqual(['q1', 'q2']);
  });
});
