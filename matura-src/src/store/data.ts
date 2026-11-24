// Duże dane (arkusze CKE, lektury) są w osobnych plikach: główny skrypt jest mniejszy, a po zmianie
// samego kodu przeglądarka nie pobiera ich od nowa. Wczytuję je równolegle przed pierwszym ekranem.
import { setExams } from './catalog';
import { setBooksData } from './books';
import { setKatex } from '../ui/MathText';

let loading: Promise<void> | null = null;

export function loadData(): Promise<void> {
  return (loading ??= Promise.all([import('../../data/exams.json'), import('./booksData'), import('katex')]).then(([ex, books, k]) => {
    setKatex(k.default);
    setExams(ex.default);
    setBooksData(books.default);
  }));
}
