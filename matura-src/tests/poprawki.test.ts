import { describe, expect, it } from 'vitest';
import { mergeData, mergeStan, stableStringify, stampStan } from '../src/store/merge';
import { EMPTY_AI } from '../src/store/local';
import { defaultStan, type AppEvent, type LocalData, type Stan } from '../src/model';
import { newSession, pauseIfRunning, resume, setAnswer } from '../src/logic/session';
import { finalizeEvents } from '../src/logic/finalize';
import { activeEvents } from '../src/logic/events';
import { scoreExam } from '../src/logic/scoring';
import { displayNr, taskLabel } from '../src/logic/cke';
import type { ClosedAnswer } from '../src/logic/cke';
import { ckeTask } from './helpers';

const base = (): Stan => ({ ...defaultStan('2026-11-23'), onboarded: true, updatedAt: 100, fieldAt: {} });

describe('scalanie stanu po polach', () => {
  it('konflikt: godzina przypomnienia z A i rozmiar tekstu z B – obie zmiany zostają', () => {
    const start = base();
    const a = stampStan(start, { ...start, reminder: { enabled: true, time: '20:30' } }, 1000);
    const b = stampStan(start, { ...start, textSize: 'duży' }, 1001);
    const ab = mergeStan(a, b);
    const ba = mergeStan(b, a);
    expect(ab.reminder.time).toBe('20:30');
    expect(ab.textSize).toBe('duży');
    expect(stableStringify(ab)).toBe(stableStringify(ba));
  });

  it('nadpisania planu scalane według dnia', () => {
    const start = base();
    const a = stampStan(start, { ...start, overrides: { '2026-11-23': { add: [], remove: ['t:x'] } } }, 1000);
    const b = stampStan(start, { ...start, overrides: { '2026-11-24': { add: [], remove: ['t:y'] } } }, 1001);
    const m = mergeStan(a, b);
    expect(Object.keys(m.overrides).sort()).toEqual(['2026-11-23', '2026-11-24']);
  });

  it('usunięty dzień nadpisań nie wraca z drugiego urządzenia', () => {
    const start = stampStan(base(), { ...base(), overrides: { '2026-11-23': { add: [], remove: ['t:x'] } } }, 500);
    const cleared = stampStan(start, { ...start, overrides: {} }, 1000);
    const m = mergeStan(cleared, start);
    expect(m.overrides['2026-11-23']?.remove ?? []).toEqual([]);
  });

  it('zadania własne: suma po id', () => {
    const t = (id: string, at: number) => ({ id, subjectId: 'mat-p' as const, topicId: 'ciagi', url: null, ref: '', text: 'x', imageId: null, maxPoints: 1, type: 'otwarte' as const, source: 'własne' as const, createdAt: '2026-11-23', at });
    const a = { ...base(), userTasks: [t('u-1', 10)] };
    const b = { ...base(), userTasks: [t('u-2', 11)] };
    expect(mergeStan(a, b).userTasks.map((x) => x.id)).toEqual(['u-1', 'u-2']);
  });

  it('powitanie ukończone na którymkolwiek urządzeniu, resetAt jako maksimum', () => {
    const fresh = { ...defaultStan('2026-11-23'), updatedAt: 0 };
    const done = stampStan(fresh, { ...fresh, onboarded: true }, 1000);
    expect(mergeStan(fresh, done).onboarded).toBe(true);
    const reset = { ...defaultStan('2026-11-23'), updatedAt: 2000, resetAt: 2000 };
    const m = mergeStan(done, reset);
    expect(m.onboarded).toBe(false);
    expect(m.resetAt).toBe(2000);
  });

  it('mergeData: zdarzenia sprzed usunięcia danych nie wracają', () => {
    const ev: AppEvent = { id: 'w1', k: 'w', at: 500, d: '2026-11-23', task: 'T', subj: 'mat-p', topics: [], pts: 1, max: 1, sec: 1, src: 'zadanie' };
    const local: LocalData = { stan: base(), events: [ev], sessions: {}, essays: [], ...EMPTY_AI() };
    const remote: Partial<LocalData> = { stan: { ...defaultStan('2026-11-23'), updatedAt: 2000, resetAt: 1000 }, events: [] };
    expect(mergeData(local, remote).events).toEqual([]);
  });
});

describe('sesja: wyjście z ekranu po zakończeniu', () => {
  it('wstrzymanie nie przywraca zakończonej sesji do „trwa”', () => {
    let s = resume(newSession({ id: 's', mode: 'diagnoza', subjectId: 'mat-p', examId: null, partId: null, taskIds: ['a'], limitMs: 1800_000, planDate: null, now: 0 }), 10);
    const finished = { ...s, status: 'koniec' as const, runningSince: null, finishedAt: 50 };
    expect(pauseIfRunning(finished, 100)).toBe(finished);
    s = pauseIfRunning(s, 1010);
    expect(s.runningSince).toBeNull();
    expect(s.elapsedMs).toBe(1000);
  });
});

describe('ponowne zakończenie arkusza („Oceń pozostałe”)', () => {
  const abcd: ClosedAnswer = { items: [{ id: '1', label: null, options: ['A', 'B', 'C', 'D'], correct: 'B' }], scoring: 'each' };
  const t1 = ckeTask('z1', { auto: true, type: 'zamknięte', answer: abcd, maxPoints: 1 });
  const t2 = ckeTask('z2', { maxPoints: 3 });
  let n = 0;
  const id = (p: string) => `${p}-${++n}`;
  it('komplet wyników po drugim zakończeniu, stare ukryte', () => {
    let s = setAnswer(newSession({ id: 'S', mode: 'arkusz', subjectId: 'mat-p', examId: 'E', partId: null, taskIds: ['z1', 'z2'], limitMs: null, planDate: null, now: 0 }), 'z1', { choice: { 1: 'B' } }, 1);
    const ev1 = finalizeEvents(s, [t1, t2], scoreExam([t1, t2], s.answers), '2026-11-23', [], 1000, id);
    let a = activeEvents(ev1);
    expect(a.results.map((r) => r.task)).toEqual(['z1']);
    s = setAnswer(s, 'z2', { self: 2 }, 2);
    const ev2 = finalizeEvents(s, [t1, t2], scoreExam([t1, t2], s.answers), '2026-11-23', ev1, 2000, id);
    a = activeEvents([...ev1, ...ev2]);
    expect(a.results.map((r) => r.task).sort()).toEqual(['z1', 'z2']);
    expect(a.sessions).toHaveLength(1);
    expect(a.sessions[0].pts).toBe(3);
  });
});

describe('numeracja jak w arkuszu CKE', () => {
  it('polski: A1.7.1 → 7.1, A2.1 → temat 1', () => {
    expect(displayNr('A1.7.1')).toBe('7.1');
    expect(displayNr('A2.1')).toBe('temat 1');
    expect(displayNr('6.1')).toBe('6.1');
    expect(taskLabel({ year: 2025, session: 'maj', nr: 'A1.15' })).toBe('CKE 2025, maj, zad. 15');
  });
});
