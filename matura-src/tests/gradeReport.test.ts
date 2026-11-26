import { describe, expect, it } from 'vitest';
import { gradeReport, stageLabel } from '../src/logic/gradeReport';

const key = { levels: [{ points: 2, alts: ['obliczenie sumy: S10 = 120'] }, { points: 1, alts: ['obliczenie wyrazu: a10 = 21'] }] };

describe('raport z oceny zadania otwartego', () => {
  it('etapy spełnione i niespełnione', () => {
    const part = gradeReport(key, 2, 'a10 = 3 + 9*2 = 21')!;
    expect(part.points).toBe(1);
    expect(part.stages.map((s) => [s.points, s.met])).toEqual([[1, true], [2, false]]);
    expect(part.tips.join(' ')).toMatch(/Następny etap \(2 pkt\)/);
    const full = gradeReport(key, 2, 'a10 = 21\nS10 = (3 + 21)/2 * 10 = 120')!;
    expect(full.points).toBe(2);
    expect(full.stages.every((s) => s.met)).toBe(true);
  });
  it('opis etapu bez wyniku i bez „np.”', () => {
    expect(stageLabel('obliczenie sumy: S10 = 120')).toBe('Obliczenie sumy');
    expect(stageLabel('zapisanie układu równań pozwalającego obliczyć r, np.: −1 = a1 + 2r')).toBe('Zapisanie układu równań pozwalającego obliczyć r');
  });
});
