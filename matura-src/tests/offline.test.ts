// Ocena bez Claude'a: wynik z klucza CKE, OCR na fiszki, lista kontrolna planu ustnego.
import { describe, expect, it } from 'vitest';
import { matchResult, numbersIn } from '../src/logic/rubric';
import { linesToText } from '../src/logic/ocr';
import { parseCardText } from '../src/logic/ai';
import { checkOralPlan } from '../src/logic/oralCheck';
import { EXAMS } from '../src/store/catalog';

describe('wynik z klucza', () => {
  it('normalizuje zapis liczb', () => {
    expect(numbersIn('𝑥 = 4,5 m oraz 𝑦 = 3 m')).toEqual(['4.5', '3']);
    expect(numbersIn('r = −2')).toEqual(['-2']);
    expect(numbersIn('|BC| = sqrt(52)')).toEqual(['√52']);
  });
  it('porównuje liczby niezależnie od kolejności i zapisu', () => {
    expect(matchResult('y=3, x=4.5', 'x = 4,5 m oraz y = 3 m').match).toBe('zgodny');
    expect(matchResult('r=2', 'r = −2')).toEqual({ match: 'brakuje', missing: ['-2'] });
    expect(matchResult('', 'r = −2').match).toBeNull();
    expect(matchResult('cokolwiek', null).match).toBeNull();
  });
});

describe('fiszki z OCR', () => {
  const w = (text: string, x0: number, x1: number) => ({ text, x0, x1, y0: 0, y1: 20 });
  it('dzieli linię na dwie kolumny po dużej przerwie', () => {
    const text = linesToText([[w('to', 0, 20), w('accomplish', 26, 140), w('osiągnąć', 300, 380)], [w('apple', 0, 60), w('–', 66, 72), w('jabłko', 78, 140)]]);
    expect(parseCardText(text)).toEqual([
      { front: 'to accomplish', back: 'osiągnąć', example: null },
      { front: 'apple', back: 'jabłko', example: null },
    ]);
  });
  it('zwykłego zdania nie dzieli', () => {
    expect(linesToText([[w('Ala', 0, 30), w('ma', 36, 60), w('kota', 66, 110)]])).toBe('Ala ma kota');
  });
});

describe('lista kontrolna planu ustnego', () => {
  it('rozpoznaje elementy planu', () => {
    const plan = 'Teza: samotność prowadzi do buntu.\n1. Konrad w Wielkiej Improwizacji\n2. Kontekst historyczny: powstanie listopadowe\nDrugi tekst: Lalka\nWniosek: bunt wynika z samotności.';
    const items = checkOralPlan(plan, 'jawne', ['Dziady cz. III', 'Lalka'], 'Dziady cz. III');
    expect(items.filter((i) => !i.ok).map((i) => i.label)).toEqual([expect.stringMatching(/^Plan ma treść/)]);
  });
  it('pusty plan nie spełnia niczego', () => {
    expect(checkOralPlan('', 'z2', [], null).every((i) => !i.ok)).toBe(true);
  });
});

describe('punktacja CKE w danych', () => {
  it('większość zadań otwartych ma poziomy punktacji od maksimum do zera', () => {
    const exams = EXAMS;
    // stara formuła (2015–2022) ma schematy punktowania w innym układzie
    const open = exams.flatMap((e) => e.tasks).filter((t) => !t.auto && !t.essay && t.subjectId.startsWith('mat') && (t.year >= 2023 || t.session === 'marzec'));
    const withRubric = open.filter((t) => t.rubric);
    expect(withRubric.length / open.length).toBeGreaterThan(0.9);
    for (const t of withRubric) {
      expect(t.rubric!.levels[0].points).toBe(t.maxPoints);
      expect(t.rubric!.levels.at(-1)!.points).toBe(0);
    }
  });
});
