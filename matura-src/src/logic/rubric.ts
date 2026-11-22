// Ocena zadania otwartego bez Claude'a: uczeń wybiera najwyższy poziom z zasad oceniania CKE,
// a strona porównuje liczby z jego wyniku z wynikiem w kluczu (podpowiedź, nie wyrok).

/** Liczby z napisu: „4,5”, „−2”, „√52”, „3/4”, „π”; zapis znormalizowany. */
export function numbersIn(text: string): string[] {
  const s = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, '')
    .replace(/sqrt\(?(\d+(?:\.\d+)?)\)?/g, '√$1')
    .replace(/pi/g, 'π');
  const out: string[] = [];
  for (const m of s.matchAll(/-?(?:√?\d+(?:\.\d+)?(?:\/\d+)?π?|π)/g)) {
    let v = m[0];
    // „x=-2” i „-2” to to samo; minus przed liczbą liczę tylko, gdy nie jest odejmowaniem po cyfrze
    const before = s[(m.index ?? 0) - 1];
    if (v.startsWith('-') && before && /[\d)]/.test(before)) v = v.slice(1);
    out.push(v.replace(/\.0+$/, ''));
  }
  return out;
}

export type ResultMatch = 'zgodny' | 'brakuje' | null;

/** Czy wszystkie liczby z klucza są w odpowiedzi ucznia. Null, gdy nie ma czego porównać. */
export function matchResult(answer: string, key: string | null): { match: ResultMatch; missing: string[] } {
  if (!key || !answer.trim()) return { match: null, missing: [] };
  const want = numbersIn(key);
  if (!want.length) return { match: null, missing: [] };
  const have = numbersIn(answer);
  const pool = [...have];
  const missing: string[] = [];
  for (const w of want) {
    const i = pool.indexOf(w);
    if (i >= 0) pool.splice(i, 1);
    else missing.push(w);
  }
  return { match: missing.length ? 'brakuje' : 'zgodny', missing };
}

