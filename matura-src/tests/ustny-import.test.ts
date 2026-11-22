import { describe, expect, it } from 'vitest';
// @ts-expect-error moduł JS bez typów
import { parsePytania, yearOf } from '../scripts/ustny-parse.mjs';

// Sztuczny tekst w układzie wykazu (nie są to prawdziwe pytania CKE).
describe('pytania jawne: analiza tekstu', () => {
  it('numery, nagłówki lektur i treść wielowierszowa', () => {
    const lines = [
      'Wykaz testowy',
      'Autor Pierwszy, Lektura testowa A',
      '1. Pierwsze pytanie testowe, które ma',
      'ciąg dalszy w kolejnej linii.',
      '2. Drugie pytanie testowe?',
      'Strona 1 z 3',
      'Autor Drugi, Lektura testowa B',
      '3. Trzecie pytanie testowe.',
    ];
    expect(parsePytania(lines)).toEqual([
      { nr: 1, lektura: 'Autor Pierwszy, Lektura testowa A', lekturaId: null, tresc: 'Pierwsze pytanie testowe, które ma ciąg dalszy w kolejnej linii.' },
      { nr: 2, lektura: 'Autor Pierwszy, Lektura testowa A', lekturaId: null, tresc: 'Drugie pytanie testowe?' },
      { nr: 3, lektura: 'Autor Drugi, Lektura testowa B', lekturaId: null, tresc: 'Trzecie pytanie testowe.' },
    ]);
  });
  it('wykaz bez nagłówków: lektura = null; numer spoza kolejności to kontynuacja', () => {
    const r = parsePytania(['1. Pytanie testowe obejmujące', '20 lat i więcej.', '2. Kolejne testowe.']);
    expect(r.map((p: { nr: number; lektura: string | null; tresc: string }) => [p.nr, p.lektura, p.tresc])).toEqual([
      [1, null, 'Pytanie testowe obejmujące 20 lat i więcej.'],
      [2, null, 'Kolejne testowe.'],
    ]);
  });
  it('rok z nazwy pliku', () => {
    expect(yearOf('pytania-jawne-2026.pdf')).toBe(2026);
    expect(yearOf('jawne.pdf', 'Wykaz na rok 2027')).toBe(2027);
    expect(yearOf('jawne.pdf')).toBeNull();
  });
});
