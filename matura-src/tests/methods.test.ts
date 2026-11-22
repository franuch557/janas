// Metody nauki: zamrożenie serii, poziomy opanowania, zeszyt błędów, tryb „Ucz się”,
// cel procentowy, ćwiczenia w planie.
import { describe, expect, it } from 'vitest';
import { streakInfo } from '../src/logic/events';
import { mistakes, topicLevel } from '../src/logic/levels';
import { compareTyped, distractors } from '../src/logic/learn';
import { targetFactor, targetTopics } from '../src/logic/tiers';
import { sameBlank, stepText } from '../src/views/Practice';
import type { Flashcard, ResultEvent } from '../src/model';

const res = (over: Partial<ResultEvent>): ResultEvent => ({ id: Math.random().toString(36), k: 'w', at: 1, d: '2026-11-20', task: 't1', subj: 'mat-p', topics: ['logarytmy'], pts: 1, max: 1, sec: 60, src: 'zadanie', ...over });

describe('seria z zamrożeniem', () => {
  it('jeden opuszczony dzień w środku nie przerywa serii', () => {
    const days = new Set(['2026-11-22', '2026-11-21', '2026-11-19', '2026-11-18']);
    expect(streakInfo(days, '2026-11-22')).toEqual({ days: 4, frozen: ['2026-11-20'] });
  });
  it('dwa opuszczone dni przerywają serię; drugie zamrożenie dopiero po 7 dniach nauki', () => {
    expect(streakInfo(new Set(['2026-11-22', '2026-11-19']), '2026-11-22').days).toBe(1);
    const days = new Set(['2026-11-22', '2026-11-20', '2026-11-18']);
    expect(streakInfo(days, '2026-11-22').days).toBe(2);
  });
});

describe('poziomy opanowania', () => {
  it('nowy → poznany → ćwiczony → opanowany (po sprawdzianie mieszanym)', () => {
    expect(topicLevel([], 'mat-p', 'logarytmy', null, '2026-11-22')).toBe('nowy');
    const three = [res({}), res({ task: 't2' }), res({ task: 't3' })];
    expect(topicLevel(three.slice(0, 1), 'mat-p', 'logarytmy', 1, '2026-11-22')).toBe('poznany');
    expect(topicLevel(three, 'mat-p', 'logarytmy', 0.9, '2026-11-22')).toBe('ćwiczony');
    expect(topicLevel([...three, res({ src: 'sprawdzian', at: 5 })], 'mat-p', 'logarytmy', 0.9, '2026-11-22')).toBe('opanowany');
    expect(topicLevel([...three, res({ src: 'sprawdzian', pts: 0, at: 5 })], 'mat-p', 'logarytmy', 0.9, '2026-11-22')).toBe('poznany');
  });
  it('zeszyt błędów: zadanie znika po poprawieniu', () => {
    const r = [res({ pts: 0, at: 1 }), res({ task: 't2', pts: 1, max: 2, at: 2 })];
    expect(mistakes(r).map((x) => x.task)).toEqual(['t2', 't1']);
    expect(mistakes([...r, res({ pts: 1, at: 3 })]).map((x) => x.task)).toEqual(['t2']);
  });
});

describe('fiszki: tryb Ucz się', () => {
  it('wpisywanie bez wielkości liter i polskich znaków, literówka = prawie', () => {
    expect(compareTyped('Osiagnac', 'osiągnąć')).toBe('dobrze');
    expect(compareTyped('jabko', 'jabłko')).toBe('prawie');
    expect(compareTyped('dom', 'kot')).toBe('źle');
    expect(compareTyped('house', 'house / home')).toBe('dobrze');
  });
  it('odpowiedzi do wyboru najpierw z tej samej talii', () => {
    const c = (id: string, deck: string, back: string): Flashcard => ({ id, subj: 'ang-p', deck, deckName: deck, front: id, back, example: null, step: 0, due: '2026-11-22', reviews: 0, at: 1 });
    const pool = [c('a', 'x', 'A'), c('b', 'x', 'B'), c('c', 'x', 'C'), c('d', 'y', 'D'), c('e', 'x', 'E')];
    const ds = distractors(pool[0], pool, () => 0.3);
    expect(ds).toHaveLength(3);
    expect(ds.every((x) => ['B', 'C', 'E'].includes(x))).toBe(true);
  });
});

describe('cel procentowy', () => {
  it('na 30% z podstawy: etap pierwszy, reszta z mniejszą wagą', () => {
    expect(targetTopics('mat-p', 30)).toContain('logarytmy');
    expect(targetTopics('mat-p', 30)).not.toContain('stereometria');
    expect(targetTopics('mat-p', 85)).toContain('stereometria');
    expect(targetTopics('mat-p', 100)).toBeNull();
    expect(targetFactor('mat-p', 'kombinatoryka', 60)).toBe(0.3);
    expect(targetFactor('mat-p', 'ciagi', 60)).toBe(1);
  });
});

describe('ćwiczenia: luki', () => {
  it('luka: liczby numerycznie, przedziały po zapisie', () => {
    expect(sameBlank('0,5', '1/2')).toBe(true);
    expect(sameBlank('[-2;4)', '[-2, 4)')).toBe(true);
    expect(sameBlank('3', '4')).toBe(false);
    expect(stepText({ text: 'Wynik $x = {}$.', blank: '−2' }, false)).toBe('Wynik $x = \\square$.');
  });
});
