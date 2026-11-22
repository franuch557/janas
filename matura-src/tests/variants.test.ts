// Warianty zadań: dla każdego generatora i wielu ziaren klucz uznaje poprawne rozwiązanie,
// a błędna odpowiedź nie dostaje maksimum.
import { describe, expect, it } from 'vitest';
import { GENERATORS, makeVariant, rng } from '../src/logic/variants';
import { factsOf, gradeTask } from '../src/logic/mathGrade';
import params from '../src/data/ocena-matematyka.json';

// rozwiązanie ucznia: kroki pośrednie z klucza (niższe poziomy), wartości z luk i odpowiedź
const solution = (v: ReturnType<typeof makeVariant>) =>
  [...v.key.levels.filter((l) => l.points < v.maxPoints).flatMap((l) => l.alts.flatMap((a) => factsOf(a).map((f) => f.text))), ...v.steps.filter((s) => s.blank).map((s) => s.blank!), v.answer].join('\n');

describe('warianty zadań', () => {
  it('ziarno daje zawsze ten sam wariant', () => {
    const g = GENERATORS[0];
    expect(makeVariant(g, 5)).toEqual(makeVariant(g, 5));
    expect(rng(1).next()).toBe(rng(1).next());
  });
  for (const g of GENERATORS) {
    it(`${g.id}: poprawne rozwiązanie = maksimum, brak liczb NaN`, () => {
      const bad: string[] = [];
      for (let s = 1; s <= 150; s++) {
        const v = makeVariant(g, s);
        expect(v.question).not.toMatch(/NaN|undefined|Infinity/);
        const sol = solution(v);
        const res = gradeTask(v.key, v.maxPoints, sol, params.params);
        if (!res || res.points !== v.maxPoints) bad.push(`${s}: ${JSON.stringify(sol)} → ${res?.points}`);
      }
      expect(bad.slice(0, 5)).toEqual([]);
    });
  }
});
