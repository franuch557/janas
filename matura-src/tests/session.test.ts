import { describe, expect, it } from 'vitest';
import { elapsed, newSession, parseSession, pause, remaining, restoreAfterReload, resume, serializeSession, setAnswer } from '../src/logic/session';
import { parseLocal } from '../src/store/local';
import { defaultStan, type LocalData } from '../src/model';

const base = () =>
  newSession({ id: 'arkusz-1', mode: 'arkusz', subjectId: 'mat-p', examId: 'MMAP-P0-100-2505', partId: null, taskIds: ['a', 'b', 'c'], limitMs: 180 * 60_000, planDate: '2026-11-21', now: 1_000 });

describe('sesja arkusza: czas', () => {
  it('liczy czas tylko podczas pracy', () => {
    let s = resume(base(), 10_000);
    expect(elapsed(s, 70_000)).toBe(60_000);
    s = pause(s, 70_000);
    expect(elapsed(s, 500_000)).toBe(60_000);
    s = resume(s, 500_000);
    expect(elapsed(s, 530_000)).toBe(90_000);
    expect(remaining(s, 530_000)).toBe(180 * 60_000 - 90_000);
  });

  it('po odświeżeniu przerwa nie zjada czasu (liczy do ostatniego znaku życia strony)', () => {
    const s = resume(base(), 10_000);
    const r = restoreAfterReload(s, 900_000, 40_000);
    expect(r.runningSince).toBeNull();
    expect(r.elapsedMs).toBe(30_000);
  });
});

describe('zapis i wznowienie postępu arkusza', () => {
  it('serializacja zachowuje odpowiedzi, flagi, bieżące zadanie i odtworzenia', () => {
    let s = resume(base(), 10_000);
    s = setAnswer(s, 'a', { choice: { '1': 'B' } }, 20_000);
    s = setAnswer(s, 'b', { flagged: true, paper: true }, 21_000);
    s = { ...s, current: 2, plays: { c: 1 } };
    const back = parseSession(serializeSession(s))!;
    expect(back.answers).toEqual(s.answers);
    expect(back.current).toBe(2);
    expect(back.plays).toEqual({ c: 1 });
    expect(back.limitMs).toBe(s.limitMs);
  });

  it('„odświeżenie strony”: stan z localStorage odtwarza trwającą sesję', () => {
    let s = resume(base(), 10_000);
    s = setAnswer(s, 'a', { choice: { '1': 'C' } }, 15_000);
    const data: LocalData = { stan: defaultStan('2026-11-21'), events: [], sessions: { [s.id]: s }, essays: [] };
    const restored = parseLocal(JSON.stringify(data), '2026-11-21');
    const r = restored.sessions['arkusz-1'];
    expect(r.status).toBe('trwa');
    expect(r.answers.a.choice).toEqual({ '1': 'C' });
    const resumed = resume(restoreAfterReload(r, 100_000, 25_000), 100_000);
    expect(elapsed(resumed, 110_000)).toBe(15_000 + 10_000);
  });

  it('uszkodzone dane nie wywracają odczytu', () => {
    expect(parseSession('{zły json')).toBeNull();
    expect(parseSession({ typ: 'inne' })).toBeNull();
    expect(parseLocal('nie json', '2026-11-21').events).toEqual([]);
  });
});
