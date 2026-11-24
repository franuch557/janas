// Sprawdzanie krótkiej odpowiedzi do pytań z lektur: porównanie słów kluczowych z kluczem.
// Słowa porównuję po początku (do 5 liter), żeby odmiana nie psuła wyniku („Wokulskiego” = „Wokulski”).

export type QuizVerdict = 'dobrze' | 'czesciowo' | 'zle' | 'puste';

const STOP = new Set(
  'oraz albo lecz jest jako jego jej ich które który która tego tylko także przez przed jednak bardzo może są był była było będzie żeby gdyż ponieważ więc nawet wtedy kiedy gdzie także czyli między podczas wobec tym tej tak nie się przy pod nad dla bez lub czy aby już też jeszcze'.split(' '),
);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[*_„”"«»().,;:!?–—\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stem = (w: string) => w.slice(0, Math.min(w.length, 5));

/** Słowa kluczowe: dłuższe niż 2 litery (liczby zawsze), bez słów pomocniczych. */
export function keywords(s: string): string[] {
  const out = new Set<string>();
  for (const w of norm(s).split(' ')) {
    if (!w || STOP.has(w)) continue;
    if (/^\d+$/.test(w) || w.length >= 3) out.add(stem(w));
  }
  return [...out];
}

export function checkBookAnswer(answer: string, key: string): { verdict: QuizVerdict; score: number } {
  const mine = keywords(answer);
  if (!mine.length) return { verdict: 'puste', score: 0 };
  const want = keywords(key);
  if (!want.length) return { verdict: 'czesciowo', score: 0 };
  const has = new Set(mine);
  const hit = want.filter((w) => has.has(w) || mine.some((m) => m.length >= 4 && (m.startsWith(w) || w.startsWith(m)))).length;
  // długi klucz (pytania interpretacyjne): wystarczy trafić część myśli
  const need = want.length <= 2 ? want.length : want.length <= 5 ? Math.ceil(want.length * 0.6) : Math.max(3, Math.ceil(want.length * 0.3));
  const score = hit / want.length;
  return { verdict: hit >= need ? 'dobrze' : hit > 0 ? 'czesciowo' : 'zle', score };
}
