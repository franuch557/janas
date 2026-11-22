// Tryb „Ucz się” fiszek (jak w Quizlecie): każda karta najpierw jako wybór z 4 odpowiedzi,
// potem jako wpisywanie z pamięci. Wpisanie z pamięci kończy kartę w tej sesji i trafia
// do powtórek SM-2 („Dobrze”, albo „Łatwe”, gdy obie próby od razu poprawne).

import type { Flashcard } from '../model';

/** Porównanie wpisanej odpowiedzi: bez wielkości liter, polskich znaków i interpunkcji; literówka (1 znak) w dłuższym słowie = „prawie”. */
export function compareTyped(input: string, want: string): 'dobrze' | 'prawie' | 'źle' {
  const n = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[’']/g, "'")
      .replace(/[.,;:!?()"„”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const a = n(input);
  const variants = want.split(/\s*[/;]\s*|,\s+/).map(n).filter(Boolean);
  if (!a) return 'źle';
  if (variants.includes(a) || n(want) === a) return 'dobrze';
  if (variants.some((v) => v.length >= 5 && lev(a, v) <= 1)) return 'prawie';
  return 'źle';
}

function lev(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** 3 błędne odpowiedzi do wyboru: z tej samej talii, potem z innych kart przedmiotu. */
export function distractors(card: Flashcard, pool: Flashcard[], rnd: () => number = Math.random): string[] {
  const same = pool.filter((c) => c.id !== card.id && !c.deleted && c.deck === card.deck && c.back !== card.back);
  const other = pool.filter((c) => c.id !== card.id && !c.deleted && c.deck !== card.deck && c.subj === card.subj && c.back !== card.back);
  const pick = (xs: Flashcard[]) => [...xs].sort(() => rnd() - 0.5).map((c) => c.back);
  return [...new Set([...pick(same), ...pick(other)])].slice(0, 3);
}
