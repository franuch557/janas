// Ocena zadań otwartych z angielskiego według klucza CKE: dla każdej pozycji lista poprawnych
// odpowiedzi (z wariantami „a/b”, „(a/an)”) i przykłady błędnych. CKE akceptuje też odpowiedzi
// spoza klucza, jeśli są poprawne, więc odpowiedź, której nie ma ani w kluczu, ani wśród błędnych,
// oznaczam jako niepewną (uczeń sprawdza sam), zamiast dawać 0 pkt.

export interface EnglishItem {
  id: string;
  ok: string[];
  bad: string[];
}

const CONTR: [RegExp, string][] = [
  [/\bwon't\b/g, 'will not'],
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bshan't\b/g, 'shall not'],
  [/n't\b/g, ' not'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'ll\b/g, ' will'],
  [/'m\b/g, ' am'],
  [/'d\b/g, ' would'],
];

/** Wspólna postać: małe litery, apostrofy proste, rozwinięte skróty, bez znaków na końcu. */
export function normEn(s: string): string {
  let t = s.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
  for (const [re, v] of CONTR) t = t.replace(re, v);
  // „it's” / „he's” zostawiam jako „is” (najczęstsze w kluczu)
  t = t.replace(/\b(it|he|she|that|there|what|who)'s\b/g, '$1 is');
  return t.replace(/[.!?,;]+$/g, '').replace(/\s+/g, ' ').trim();
}

/** Wszystkie warianty zapisu z klucza: „(a/an) electric bike”, „have not/haven't changed since/from”. */
export function expandVariants(src: string, limit = 400): string[] {
  const parts = src.split(/\s*\/\s+|\s+\/\s*/); // ukośnik ze spacją („ / ”, „them/ for”) oddziela całe odpowiedzi
  const out = new Set<string>();
  for (const p of parts) {
    let acc: string[][] = [[]];
    for (const tok of p.trim().split(/\s+/)) {
      let opts: string[];
      const opt = /^\((.+)\)$/.exec(tok);
      if (opt) opts = ['', ...opt[1].split('/')];
      else if (tok.includes('/')) opts = tok.split('/').filter(Boolean);
      else opts = [tok];
      const next: string[][] = [];
      for (const a of acc) for (const o of opts) if (next.length < limit) next.push(o ? [...a, o] : a);
      // „have not/haven't” – druga opcja może zastąpić też poprzedni wyraz („haven't changed”)
      if (tok.includes('/') && !opt) for (const a of acc) for (const o of opts.slice(1)) if (a.length && next.length < limit) next.push([...a.slice(0, -1), o]);
      acc = next;
    }
    for (const a of acc) if (a.length) out.add(normEn(a.join(' ')));
  }
  return [...out];
}

export interface EnglishGrade {
  points: number;
  max: number;
  /** Pozycje: dobrze / źle (w przykładach błędnych albo puste) / niepewne (nie ma w kluczu). */
  items: { id: string; answer: string; verdict: 'dobrze' | 'źle' | 'niepewne' }[];
  confident: boolean;
}

/** Odpowiedzi ucznia: po jednej w linii, w kolejności pozycji (numer na początku jest opcjonalny). */
export function gradeEnglish(items: EnglishItem[], text: string): EnglishGrade | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const byId = (id: string) => lines.find((l) => l.startsWith(`${id}.`) || l.startsWith(`${id} `) || l.startsWith(`${id})`));
  const res = items.map((it, i) => {
    const raw = (byId(it.id) ?? lines[i] ?? '').replace(new RegExp(`^${it.id.replace('.', '\\.')}[.)]?\\s*`), '');
    const a = normEn(raw);
    if (!a) return { id: it.id, answer: raw, verdict: 'źle' as const };
    if (it.ok.some((k) => expandVariants(k).includes(a))) return { id: it.id, answer: raw, verdict: 'dobrze' as const };
    if (it.bad.some((k) => expandVariants(k).includes(a))) return { id: it.id, answer: raw, verdict: 'źle' as const };
    return { id: it.id, answer: raw, verdict: 'niepewne' as const };
  });
  return { points: res.filter((r) => r.verdict === 'dobrze').length, max: items.length, items: res, confident: res.every((r) => r.verdict !== 'niepewne') };
}
