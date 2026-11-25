// Ocena przybliżona zadań, których nie sprawdza żaden dokładniejszy oceniacz (dowody, krótkie odpowiedzi
// słowne, zadania z nietypowym kluczem): porównanie słów kluczowych i liczb z kluczem CKE.
// Wynik jest oznaczany w aplikacji jako przybliżony – uczeń może go poprawić.

import { keywords } from './bookQuiz';

export interface TextKey {
  max: number;
  /** odpowiedzi z klucza CKE (warianty rozdzielone „/”) */
  answer?: string[];
  /** poziomy punktacji z opisem */
  levels?: { points: number; alts: string[] }[];
  /** wzorcowe rozwiązanie (dowody, zadania obliczeniowe) */
  solution?: string | null;
}

export interface KeyGrade {
  points: number;
  /** czym ocena się kierowała */
  basis: 'odpowiedzi' | 'rozwiązanie' | 'poziomy';
  matched: string[];
  missing: string[];
}

// słowa z opisów punktacji, których uczeń nie pisze („poprawne podanie”, „zapisanie”, „uzasadnienie” …)
const GENERIC = new Set(
  keywords(
    'poprawne poprawnie poprawna poprawny podanie zapisanie obliczenie wyznaczenie uzasadnienie rozpatrzenie przypadku przypadek przeprowadzenie pełnego rozumowania rozumowanie zastosowanie metody metoda liczba liczby uzupełnienie zdania zdań wszystkich dwóch jednego odpowiedź odpowiedzi brak niepoprawna niepełna zadania zadanie rozwiązanie rozwiązania wskazanie sformułowanie zdający zapisze poda obliczy wyznaczy uzasadni tabeli tabela wiersza wierszy utworu fragmentu fragment spełnienia powyższych kryteriów',
  ),
);

const numbers = (s: string) => [...new Set((s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => x.replace(',', '.')))];
const words = (s: string) => keywords(s).filter((w) => !GENERIC.has(w) && !/^\d/.test(w));

function hits(mine: { w: string[]; n: string[] }, want: { w: string[]; n: string[] }) {
  const hasW = (w: string) => mine.w.some((m) => m === w || (m.length >= 4 && (m.startsWith(w) || w.startsWith(m))));
  const okW = want.w.filter(hasW);
  const okN = want.n.filter((n) => mine.n.includes(n));
  return { ok: okW.length + okN.length, all: want.w.length + want.n.length, missW: want.w.filter((w) => !hasW(w)) };
}

const parse = (s: string) => ({ w: words(s), n: numbers(s) });

/** Czy odpowiedź ucznia zawiera jeden z wariantów odpowiedzi z klucza („Rzecki / Ignacy Rzecki”). */
function matchesAnswer(mine: { w: string[]; n: string[] }, key: string): boolean {
  return key
    .split(/\s+\/\s+|\s+albo\s+|;\s*/)
    .map((v) => v.replace(/^[^:]{1,25}:\s*/, '')) // „Fragment A: Dziady cz. III” → „Dziady cz. III”
    .some((v) => {
      const want = parse(v);
      const h = hits(mine, want);
      return h.all > 0 && h.ok >= Math.max(1, Math.ceil(h.all * 0.6));
    });
}

export function gradeByKey(text: string, k: TextKey): KeyGrade | null {
  const mine = parse(text);
  if (!mine.w.length && !mine.n.length) return null;
  const answers = (k.answer ?? []).filter((a) => a.trim());
  if (answers.length) {
    const ok = answers.filter((a) => matchesAnswer(mine, a));
    const pts = ok.length === answers.length ? k.max : Math.floor((k.max * ok.length) / answers.length);
    return { points: pts, basis: 'odpowiedzi', matched: ok, missing: answers.filter((a) => !ok.includes(a)) };
  }
  // poziomy punktacji: najwyższy poziom, którego opis (warianty „•”, „albo”, „LUB”) pasuje do odpowiedzi
  const levels = (k.levels ?? []).filter((l) => l.points > 0).sort((a, b) => b.points - a.points);
  let byLevel: KeyGrade | null = null;
  outer: for (const lv of levels)
    for (const alt of lv.alts.flatMap((a) => a.split(/\s+LUB\s+|\s*•\s*|\s+albo\s+/))) {
      const want = parse(alt);
      const h = hits(mine, want);
      if (h.all >= 3 && h.ok >= Math.ceil(h.all * 0.8)) {
        byLevel = { points: lv.points, basis: 'poziomy', matched: [alt], missing: [] };
        break outer;
      }
    }
  // dowód / rozwiązanie: ile kluczowych liczb i pojęć ze wzorcowego rozwiązania pojawia się u ucznia
  let bySolution: KeyGrade | null = null;
  if (k.solution) {
    const want = parse(k.solution);
    const h = hits(mine, want);
    if (h.all) bySolution = { points: Math.min(k.max, Math.round(k.max * Math.min(1, h.ok / h.all / 0.6))), basis: 'rozwiązanie', matched: [], missing: [] };
  }
  const best = [byLevel, bySolution].filter((x): x is KeyGrade => !!x).sort((a, b) => b.points - a.points)[0];
  if (best) return best;
  return levels.length ? { points: 0, basis: 'poziomy', matched: [], missing: [] } : null;
}
