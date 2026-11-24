import { describe, expect, it } from 'vitest';
import { formulaPages } from '../src/ui/Formulas';

describe('karta wzorów', () => {
  it('tablica (jeden plik) i obiekt (GitHub Pages) dają strony w kolejności', () => {
    expect(formulaPages(['a', 'b'])).toEqual(['a', 'b']);
    expect(formulaPages({ '10': 'k', '2': 'c', '0': 'a', '1': 'b' })).toEqual(['a', 'b', 'c', 'k']);
    expect(formulaPages(null)).toEqual([]);
  });
});
