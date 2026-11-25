import { describe, expect, it } from 'vitest';
import { gradeByKey } from '../src/logic/keyGrade';
import keys from '../src/data/klucze-tekst.json';

const K = keys as unknown as Record<string, Parameters<typeof gradeByKey>[1]>;

describe('ocena przybliżona według klucza CKE', () => {
  it('krótka odpowiedź z wariantami: „Rzecki / Ignacy Rzecki”', () => {
    const k = K['MPOP-P1-P2-2605-nA1-11-1'];
    expect(k).toBeTruthy();
    expect(gradeByKey('To Ignacy Rzecki', k)?.points).toBe(1);
    expect(gradeByKey('Wokulski', k)?.points).toBe(0);
  });
  it('dowód: kroki ze wzorcowego rozwiązania dają punkty, przypadkowy tekst nie', () => {
    const k = K['MMAP-P0-100-2605-n7'];
    expect(k).toBeTruthy();
    const good = gradeByKey(k.solution ?? '', k);
    expect(good?.points).toBe(k.max);
    expect(gradeByKey('nie wiem jak to zrobić', k)?.points ?? 0).toBe(0);
  });
  it('dowód innym sposobem niż w kluczu: opis poziomu punktacji daje pełne punkty', () => {
    const k = K['MMAP-P0-100-2605-n7'];
    expect(gradeByKey('7n^2+21n = 7n(n+3). Jedna z liczb n i n+3 jest parzysta, więc liczba jest podzielna przez 7 i przez 2, czyli przez 14.', k)?.points).toBe(2);
    expect(gradeByKey('7n^2+21n=7n(n+3) więc dzieli się przez 7', k)?.points).toBe(1);
    expect(gradeByKey('n=2 daje 28+42=70', k)?.points).toBe(0);
  });
  it('pusta odpowiedź nie jest oceniana', () => {
    expect(gradeByKey('   ', { max: 1, answer: ['Lalka'] })).toBeNull();
  });
});
