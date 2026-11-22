// Ocena automatyczna bez Claude'a: wyrażenia, matematyka według klucza CKE, sens odpowiedzi, konta.
import { describe, expect, it } from 'vitest';
import { constValue, equivalent, parseEquation } from '../src/logic/mathExpr';
import { gradeMath } from '../src/logic/mathGrade';
import { gradeText, packVec, unpackVec } from '../src/logic/textGrade';
import { fixStan } from '../src/store/local';
import { userEmail, validUser } from '../src/store/supabase';
import mathKeys from '../src/data/klucze-matematyka.json';
import mathParams from '../src/data/ocena-matematyka.json';

describe('wyrażenia', () => {
  it('różne zapisy tej samej liczby są równe', () => {
    expect(constValue('√52')).toBeCloseTo(constValue('2√13')!, 9);
    expect(constValue('4,5')).toBe(4.5);
    expect(constValue('2^3 - 1/2')).toBe(7.5);
    expect(constValue('(5π)/6')).toBeCloseTo((5 * Math.PI) / 6, 9);
  });
  it('równania równoważne po przekształceniu', () => {
    const k = parseEquation('4x + 6y = 36')!;
    expect(equivalent(k, parseEquation('2x+3y=18')!)).toBe(true);
    expect(equivalent(k, parseEquation('y = 6 - 2x/3')!)).toBe(true);
    expect(equivalent(k, parseEquation('4x+6y=30')!)).toBe(false);
  });
});

describe('matematyka według klucza CKE', () => {
  const levels = [
    { points: 2, alts: ['obliczenie długości boku BC: |BC| = √52.'] },
    { points: 1, alts: ['zapisanie współrzędnych punktu C: C = (14,8)', 'zapisanie współrzędnych punktu D: D = (2,12)'] },
    { points: 0, alts: ['brak rozwiązania'] },
  ];
  const p = mathParams.params;
  it('pełne rozwiązanie innym zapisem: maksimum', () => {
    expect(gradeMath(levels, 2, 'P jest środkiem AC\nC = (14, 8)\nBC = √((14-10)^2 + (8-2)^2) = √(16+36)\n|BC| = 2√13', p)!.points).toBe(2);
  });
  it('krok pośredni z dowolnego wariantu „ALBO”: część punktów', () => {
    expect(gradeMath(levels, 2, 'D = (2,12)', p)!.points).toBe(1);
  });
  it('zamienione współrzędne i zły wynik: 0 pkt', () => {
    expect(gradeMath(levels, 2, 'C = (8,14)\n|BC| = 10', p)!.points).toBe(0);
  });
  it('sam wynik bez rozwiązania nie daje maksimum', () => {
    expect(gradeMath(levels, 2, '2√13', p)!.points).toBeLessThan(2);
  });
  it('klucze z PDF: 175+ zadań, każde z poziomem maksymalnym', () => {
    expect(Object.keys(mathKeys).length).toBeGreaterThan(150);
  });
});

describe('sens odpowiedzi (wektory)', () => {
  const v = (...x: number[]) => {
    const a = Float32Array.from(x);
    const n = Math.hypot(...a);
    return a.map((y) => y / n);
  };
  it('zapis wektora int8 zachowuje kierunek', () => {
    const a = v(0.3, -0.5, 0.8, 0.1);
    const b = unpackVec(packVec(a));
    for (let i = 0; i < a.length; i++) expect(b[i]).toBeCloseTo(a[i], 1);
  });
  it('blisko przykładu za 2 pkt: 2 pkt; daleko od wszystkich: 0 pkt', () => {
    const ex = [{ points: 2, vec: v(1, 0, 0) }, { points: 1, vec: v(0, 1, 0) }];
    expect(gradeText(v(0.95, 0.1, 0), ex, 2, { tau: 0.6, full: 0.8 })!.points).toBe(2);
    expect(gradeText(v(0.7, 0.1, 0.7), ex, 2, { tau: 0.6, full: 0.8 })!.points).toBe(1);
    expect(gradeText(v(0, 0, 1), ex, 2, { tau: 0.6, full: 0.8 })!.points).toBe(0);
  });
});

describe('konta i korepetycje', () => {
  it('nazwa użytkownika', () => {
    expect(validUser('Franek_1')).toBe(true);
    expect(validUser('ab')).toBe(false);
    expect(validUser('ala ma')).toBe(false);
    expect(userEmail(' Franek ')).toBe('franek@konto.matura2027.app');
  });
  it('stare korepetycje z angielskiego przechodzą na listę zajęć; nowe konto nie ma zajęć', () => {
    const old = fixStan({ tutoring: { enabled: true, weekday: 6, start: '15:15', minutes: 60 } }, '2026-11-23');
    expect(old.lessons).toEqual([{ id: 'k-ang', subj: 'ang-p', weekday: 6, start: '15:15', minutes: 60 }]);
    expect(fixStan({}, '2026-11-23').lessons).toEqual([]);
  });
});
