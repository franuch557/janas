import { describe, expect, it } from 'vitest';
import { autoRate, buildSession, dueCount, memoryMap, memStatus, postponed, postponeRef, previewNext, ptsFromRate, rateFromPct, whenLabel } from '../src/logic/review';
import { effectivePct, NEW_SRS, srsFromHistory, type SrsState } from '../src/logic/srs';
import type { TickEvent } from '../src/model';

const T = (id: string, topic: string, minutes = 3, subjectId = 'mat-p') => ({ id, subjectId, topics: [topic], minutes, maxPoints: 1 });
const due = (d: string): SrsState => ({ status: 'do powtórki', step: 0, nextReview: d, lastDate: '2026-11-01', lastPct: 0, attempts: 1 });
const today = '2026-11-23';
const prio = (_s: string, t: string) => ({ ciagi: 3, potegi: 2, logarytmy: 1 })[t as 'ciagi'] ?? 0;

describe('ocena trudności a odstęp powtórki', () => {
  it('o odstępie decyduje ocena: 1, 3, 7, 14 dni', () => {
    const d = [1, 2, 3, 4].map((r) => previewNext(undefined, 100, r as 1 | 2 | 3 | 4, today));
    expect(d).toEqual(['2026-11-24', '2026-11-26', '2026-11-30', '2026-12-07']);
  });
  it('słaby wynik ogranicza „łatwe” do 3 dni', () => {
    expect(previewNext(undefined, 0, 4, today)).toBe('2026-11-26');
    expect(effectivePct(0, 4)).toBe(60);
  });
  it('wynik bez oceny działa jak wcześniej', () => {
    expect(effectivePct(85)).toBe(85);
    expect(srsFromHistory([{ d: today, pct: 100 }]).nextReview).toBe('2026-12-07');
    expect(srsFromHistory([{ d: today, pct: 100, rate: 2 }]).nextReview).toBe('2026-11-26');
  });
  it('punkty z oceny i ocena z wyniku', () => {
    expect([1, 2, 3, 4].map((r) => ptsFromRate(r as 1 | 2 | 3 | 4, 4))).toEqual([0, 1, 3, 4]);
    expect([0, 50, 75, 100].map(rateFromPct)).toEqual([1, 2, 3, 4]);
  });
  it('etykiety terminów', () => {
    expect(whenLabel('2026-11-24', today)).toBe('jutro');
    expect(whenLabel('2026-11-30', today)).toBe('za tydzień');
    expect(whenLabel(null, today)).toBe('utrwalone');
  });
});

describe('odkładanie na później', () => {
  const tick = (ref: string, d: string): TickEvent => ({ id: ref + d, k: 'o', at: 1, d, ref });
  it('odłożone zadanie nie wraca dziś, wraca jutro', () => {
    const t = [tick(postponeRef('a'), today), tick('plan-x', today)];
    expect(postponed(t, today).has('a')).toBe(true);
    expect(postponed(t, '2026-11-24').has('a')).toBe(false);
  });
});

describe('układanie sesji', () => {
  const pool = [T('p1', 'potegi'), T('p2', 'potegi'), T('c1', 'ciagi'), T('l1', 'logarytmy'), T('r1', 'ciagi'), T('e1', 'ciagi')];
  pool[5] = { ...pool[5], essay: true } as never;
  const srs = new Map<string, SrsState>([['r1', due('2026-11-20')]]);
  it('mieszane: powtórka najpierw, potem nowe z najważniejszych działów na zmianę', () => {
    const s = buildSession(pool, srs, new Map(), { minutes: 30, mode: 'mieszane', subjects: ['mat-p'], today, priority: prio });
    expect(s.map((t) => t.id)).toEqual(['r1', 'c1', 'p1', 'l1', 'p2']);
  });
  it('limit czasu i pomijanie wypracowań', () => {
    const s = buildSession(pool, srs, new Map(), { minutes: 6, mode: 'nowe', subjects: ['mat-p'], today, priority: prio });
    expect(s.map((t) => t.id)).toEqual(['c1', 'p1']);
    expect(s.some((t) => t.id === 'e1')).toBe(false);
  });
  it('same powtórki i odłożone', () => {
    expect(buildSession(pool, srs, new Map(), { minutes: 30, mode: 'powtorki', subjects: ['mat-p'], today, priority: prio }).map((t) => t.id)).toEqual(['r1']);
    expect(buildSession(pool, srs, new Map([['r1', today]]), { minutes: 30, mode: 'powtorki', subjects: ['mat-p'], today, priority: prio })).toEqual([]);
    expect(dueCount(pool, srs, new Map(), ['mat-p'], today)).toBe(1);
  });
  it('mapa pamięci liczy statusy w działach', () => {
    const m = memoryMap(pool, srs, today);
    const c = m.find((r) => r.topic === 'ciagi')!;
    expect(c.counts).toEqual({ nowe: 1, nauka: 0, powtorka: 1, utrwalone: 0 });
    expect(memStatus(NEW_SRS, today)).toBe('nowe');
    expect(memStatus({ ...due('2026-12-01'), step: 3, attempts: 2 }, today)).toBe('utrwalone');
    // jedno podejście z długim odstępem to jeszcze nauka
    expect(memStatus({ ...due('2026-12-01'), step: 3 }, today)).toBe('nauka');
  });
});

describe('automatyczna ocena trudności', () => {
  const base = { hints: 0, sec: 60, minutes: 3, retry: false };
  it('z wyniku: błąd, częściowo, dobrze, łatwe', () => {
    expect([0, 50, 75, 100].map((pct) => autoRate({ ...base, pct }).rate)).toEqual([1, 2, 3, 4]);
  });
  it('podpowiedzi, czas i druga próba obniżają ocenę', () => {
    expect(autoRate({ ...base, pct: 100, hints: 1 }).rate).toBe(3);
    expect(autoRate({ ...base, pct: 100, hints: 2 }).rate).toBe(2);
    expect(autoRate({ ...base, pct: 100, sec: 200 }).rate).toBe(3);
    expect(autoRate({ ...base, pct: 100, sec: 300 }).rate).toBe(3);
    expect(autoRate({ ...base, pct: 100, retry: true }).rate).toBe(2);
    expect(autoRate({ ...base, pct: 100, retry: true }).why).toContain('druga próba w sesji');
  });
  it('poprawka tego samego dnia po błędzie nie daje długiego odstępu', () => {
    const s = srsFromHistory([{ d: today, pct: 0, rate: 1 }, { d: today, pct: 100, rate: 4 }]);
    expect(s.nextReview).toBe('2026-11-26');
    expect(memStatus(s, today)).toBe('nauka');
  });
});

describe('licznik powtórek zgodny z sesją', () => {
  it('zadania bez działu i spoza działu nie są liczone', () => {
    const pool = [T('a', 'ciagi'), { ...T('b', 'ciagi'), topics: [] }, T('c', 'potegi')];
    const srs = new Map<string, SrsState>([['a', due('2026-11-20')], ['b', due('2026-11-20')], ['c', due('2026-11-20')]]);
    expect(dueCount(pool, srs, new Map(), ['mat-p'], today)).toBe(2);
    expect(dueCount(pool, srs, new Map(), ['mat-p'], today, 'ciagi')).toBe(1);
  });
});
