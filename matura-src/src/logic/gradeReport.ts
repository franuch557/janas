// Raport z oceny zadania otwartego z matematyki: etap po etapie, jak w zasadach oceniania CKE.
// Punkty liczy gradeTask (mathGrade.ts); tu rozpisuję, które etapy rozwiązanie spełnia,
// czego brakuje i dlaczego wynik jest niższy niż maksimum. Raport pokazuję dopiero po sprawdzeniu.

import { DEFAULT_MATH_PARAMS, factHit, factsOf, gradeTask, mathLineCount, workBeyond, workOf, type MathKey, type MathParams } from './mathGrade';

export interface Stage {
  /** Liczba punktów za ten etap (próg z zasad oceniania). */
  points: number;
  /** Co trzeba zrobić, żeby go zaliczyć (opis z klucza, bez wyniku liczbowego). */
  label: string;
  met: boolean;
  /** Wyniki z klucza znalezione i brakujące w rozwiązaniu. */
  found: string[];
  missing: string[];
}

export interface GradeReport {
  points: number;
  max: number;
  stages: Stage[];
  tips: string[];
  /** false: klucz nie ma czego sprawdzić – potrzebna samoocena. */
  confident: boolean;
}

/** Opis etapu bez dopisanych na końcu wartości („…: P(A) = 6/64”) i bez powtórzeń spacji. */
export function stageLabel(alt: string): string {
  const s = alt.replace(/\s+/g, ' ').trim();
  const i = s.lastIndexOf(':');
  const head = i > 8 ? s.slice(0, i) : s;
  const t = head.replace(/[,;:]?\s*\b(np|m\.in|tj|tzn)\.?\s*$/i, '').replace(/\s*[.;,]\s*$/, '');
  const short = t.length > 180 ? `${t.slice(0, 177).replace(/\s+\S*$/, '')}…` : t;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export function gradeReport(key: MathKey, max: number, text: string, params: MathParams = DEFAULT_MATH_PARAMS): GradeReport | null {
  const g = gradeTask(key, max, text, params);
  if (!g) return null;
  const w = workOf(text);
  const levels = [...key.levels].filter((l) => l.points > 0).sort((a, b) => a.points - b.points);
  const stages: Stage[] = [];
  for (const lv of levels) {
    // wariant („ALBO”) najbliższy rozwiązaniu ucznia
    let best: Stage | null = null;
    let bestRatio = -1;
    for (const alt of lv.alts) {
      const facts = factsOf(alt);
      const hits = facts.map((f) => factHit(f, w));
      const ratio = facts.length ? hits.filter((h) => h > 0).length / facts.length : 0;
      const st: Stage = {
        points: lv.points,
        label: stageLabel(alt),
        met: lv.points <= g.points,
        found: facts.filter((_, i) => hits[i] > 0).map((f) => f.text),
        missing: facts.filter((_, i) => !hits[i]).map((f) => f.text),
      };
      if (ratio > bestRatio) {
        best = st;
        bestRatio = ratio;
      }
    }
    if (best) stages.push(best);
  }
  // kilka wariantów na tym samym progu – jeden etap na próg
  const byPts = new Map<number, Stage>();
  for (const s of stages) if (!byPts.has(s.points) || (s.met && !byPts.get(s.points)!.met)) byPts.set(s.points, s);
  const list = [...byPts.values()].sort((a, b) => a.points - b.points);

  const tips: string[] = [];
  if (g.points === max) tips.push('Pełna punktacja: rozwiązanie zawiera wszystkie etapy z zasad oceniania.');
  else {
    const topFacts = key.levels.filter((l) => l.points === max).flatMap((l) => l.alts.flatMap((a) => factsOf(a)));
    const allTop = topFacts.length > 0 && topFacts.every((f) => factHit(f, w) > 0);
    const work = Math.max(workBeyond(w, topFacts), mathLineCount(text) - 1);
    if (allTop && work < params.minWork) tips.push('Wynik się zgadza, ale brakuje obliczeń. Za sam wynik bez rozwiązania można dostać najwyżej 1 pkt – zapisz kolejne kroki.');
    const next = list.find((s) => !s.met);
    if (next) tips.push(`Następny etap (${next.points} pkt): ${next.label.charAt(0).toLowerCase()}${next.label.slice(1)}.`);
    if (!g.points && !g.found.length) tips.push('Nie znalazłem w rozwiązaniu żadnego wyniku z klucza. Sprawdź obliczenia albo zapisz je dokładniej.');
  }
  return { points: g.points, max, stages: list, tips, confident: g.confident };
}
