// Automatyczna ocena rozwiązania zadania otwartego z matematyki według zasad CKE.
// Klucz jest wzorem rozumowania, nie tekstem do przepisania: z każdego poziomu punktacji
// (i z każdego wariantu „ALBO”) biorę wyniki pośrednie i równania, a w rozwiązaniu ucznia
// szukam tych samych wartości (liczonych numerycznie) i równań równoważnych.
// Parametry progów są dobrane na wzorcowych rozwiązaniach CKE (scripts/trenuj-ocene.mts).

import { close, constValue, equivalent, normalizeMath, parseEquation, type Equation } from './mathExpr';

export interface MathParams {
  /** Część faktów wariantu, które muszą się zgadzać. */
  coverage: number;
  /** Ile wartości lub równań musi mieć rozwiązanie, żeby dostać maksimum (sam wynik to za mało). */
  minWork: number;
  /** Ile punktów najwyżej za sam wynik bez rozwiązania. */
  bareCap: number;
}
export const DEFAULT_MATH_PARAMS: MathParams = { coverage: 0.75, minWork: 2, bareCap: 1 };

export type Fact = { kind: 'value'; values: number[]; text: string; weak: boolean; label?: string } | { kind: 'pair'; values: number[]; text: string } | { kind: 'eq'; eq: Equation; text: string };

/** Jednostki na końcu wyniku („4,5 m”, „12 cm²”, „30°”) nie są częścią wartości. */
const stripUnits = (s: string) => s.replace(/\s*\((?:mm|cm|dm|km|m|j)\^?[23²³]?\s*\)\s*$/i, '').replace(/\s*(?:mm|cm|dm|km|m|kg|g|zł|h|min|s|l|ha|j)(?:\^?[23²³])?\s*$/i, '').replace(/\s*[°%]\s*$/, '');

/** Matematyczny koniec tekstu: „…długością siatki, 4x + 6y” → „4x + 6y”. */
function mathTail(s: string): string {
  const words = s.trim().split(/\s+/);
  const out: string[] = [];
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (!/^[\dA-Za-zα-ω√π()|+\-−*/^.,⋅·²³]+$/.test(w)) break;
    if (/^[A-Za-ząćęłńóśźż]{3,}[,.]?$/.test(w)) break;
    out.unshift(w);
  }
  return out.join(' ').replace(/^[,.]+/, '');
}

export interface KeyLevel {
  points: number;
  alts: string[];
}

const PAIR = /[([]\s*([^,()[\]]+?)\s*[,;]\s*([^,()[\]]+?)\s*[)\]]/g;

/** Wartości par (współrzędne, wektory) przed zamianą przecinków dziesiętnych. */
function pairsIn(s: string): number[][] {
  const out: number[][] = [];
  for (const m of s.matchAll(PAIR)) {
    const a = constValue(m[1]);
    const b = constValue(m[2]);
    if (a != null && b != null) out.push([a, b]);
  }
  return out;
}

const isWeak = (vs: number[]) => vs.every((v) => Number.isInteger(v) && Math.abs(v) <= 2);

/** Fakty z opisu poziomu albo wariantu: „…: C = (14,8)”, „r = −2”, „4x + 6y = 36”. */
export function factsOf(alt: string): Fact[] {
  const colon = alt.lastIndexOf(':');
  const part = (colon >= 0 ? alt.slice(colon + 1) : alt).replace(/\bnp\.\s*/g, ' ');
  // ułamek rozbity w PDF: licznik trafia wcześniej do zdania („zdarzenia A 6 i … P(A) = . 64”)
  const lone = [...(colon >= 0 ? alt.slice(0, colon) : '').matchAll(/(?:^|\s)(\d+)(?=\s)/g)].map((m) => m[1]);
  const out: Fact[] = [];
  for (let piece of part.split(/\s+(?:oraz|i|lub|albo)\s+|;|,\s+(?=[^,]*=)/)) {
    piece = piece.replace(/[.,]\s*$/, '').trim();
    if (!piece || !/\d/.test(piece)) continue;
    const pairs = pairsIn(piece);
    const sides = piece.split('=').map((x) => x.trim());
    if (sides.length >= 2) {
      const rhs = sides[sides.length - 1];
      const rp = pairsIn(rhs);
      if (rp.length === 1) {
        out.push({ kind: 'pair', values: rp[0], text: piece });
        continue;
      }
      let v = constValue(stripUnits(rhs.replace(/\s*[a-ząćęłńóśźż]{2,}.*$/i, '')));
      const den = /^[.,]?\s*(\d+)$/.exec(rhs);
      if (den && lone.length && /^[.,]/.test(rhs)) v = Number(lone[lone.length - 1]) / Number(den[1]);
      // „4x + 6y = 36” to równanie (lewa strona jest wyrażeniem), „r = −2” to wartość
      // bez zabłąkanej liczby z rozbitego ułamka przed nazwą („11 P(x) = …”)
      const lhs = mathTail(sides[0]).replace(/^\d+\s+(?=[A-Za-z|])/, '');
      if (v != null && /[+*/^]|\d\s*[A-Za-z√(]|[A-Za-z)]\s*-/.test(normalizeMath(lhs))) {
        const eq = parseEquation(`${lhs}=${stripUnits(rhs)}`);
        if (eq) {
          out.push({ kind: 'eq', eq, text: piece });
          continue;
        }
      }
      if (v != null) {
        const label = /^(?:\|[A-Za-z]{1,3}\||[A-Za-z](?:_?\d)?|[A-Z]?\([A-Za-z]\)|[A-Za-z]\(\d+\))$/.test(lhs.replace(/\s+/g, '')) ? lhs.replace(/\s+/g, '') : undefined;
        out.push({ kind: 'value', values: [v], text: piece.replace(/=\s*[.,]\s*(\d+)$/, `= ${den ? `${lone[lone.length - 1]}/${den[1]}` : ''}`), weak: isWeak([v]), label });
        continue;
      }
      const eq = parseEquation(`${lhs}=${stripUnits(rhs)}`);
      if (eq) out.push({ kind: 'eq', eq, text: piece });
      continue;
    }
    if (pairs.length) {
      for (const p of pairs) out.push({ kind: 'pair', values: p, text: piece });
      continue;
    }
    // lista wartości: „(−√3), √3, 2”
    const vals = piece
      .split(/,\s+/)
      .map((x) => constValue(stripUnits(x.replace(/^\((.*)\)$/, '$1').replace(/\s+(?:zł|złotych|cm|m|km)\.?$/i, ''))))
      .filter((x): x is number => x != null);
    if (vals.length) out.push({ kind: 'value', values: vals, text: piece, weak: isWeak(vals) });
  }
  return out;
}

export interface Work {
  values: number[];
  /** Wartości przypisane nazwie („r = −2”, „|BC| = 2√13”). */
  labeled: Map<string, number[]>;
  pairs: number[][];
  equations: Equation[];
}

/** Wartości i równania z rozwiązania ucznia (każdy wiersz, każde ogniwo łańcucha „a = b = c”). */
export function workOf(text: string): Work {
  const values: number[] = [];
  const labeled = new Map<string, number[]>();
  const equations: Equation[] = [];
  const pairs = pairsIn(text);
  for (const p of pairs) values.push(...p);
  const norm = normalizeMath(text.replace(PAIR, ' '));
  for (const line of norm.split(/\n|;|\s{2,}|,\s+(?=\D)|\s+(?:oraz|i|więc|zatem|stąd|czyli)\s+/)) {
    const chain = line.split(/=|≈/).map((x) => stripUnits(x.trim()));
    const name = mathTail(chain[0] ?? '').replace(/\s+/g, '');
    if (chain.length >= 2 && /^(?:\|[A-Za-z]{1,3}\||[A-Za-z](?:_?\d)?|[A-Z]?\([A-Za-z]\)|[A-Za-z]\(\d+\))$/.test(name)) {
      const v = constValue(chain[chain.length - 1]);
      if (v != null) labeled.set(name, [...(labeled.get(name) ?? []), v]);
    }
    for (const c of chain) {
      const v = constValue(c);
      if (v != null) values.push(v);
      // liczby i krótkie wyrażenia w środku zdania
      for (const m of c.matchAll(/-?[\d√π(][\d√π().+\-*/^ ]*/g)) {
        // współczynnik przy zmiennej („3y”) albo wykładnik nie jest wynikiem
        const end = (m.index ?? 0) + m[0].length;
        if (/[A-Za-zα-ω]/.test(c[end] ?? '') || /[A-Za-zα-ω^_]/.test(c[(m.index ?? 0) - 1] ?? '')) continue;
        const w = constValue(m[0].replace(/[\s.]+$/, '').trim());
        if (w != null) values.push(w);
      }
    }
    for (let i = 0; i + 1 < chain.length; i++) {
      const eq = parseEquation(`${mathTail(chain[i])}=${chain[i + 1]}`);
      if (eq) equations.push(eq);
    }
  }
  return { values, labeled, pairs, equations };
}

/** 0 – brak, 1 – sama liczba (słaby dowód przy małych liczbach), 2 – pewne trafienie. */
export function factHit(f: Fact, w: Work): 0 | 1 | 2 {
  if (f.kind === 'value') {
    if (f.label && f.values.every((v) => (w.labeled.get(f.label!) ?? []).some((x) => close(x, v)))) return 2;
    if (!f.values.every((v) => w.values.some((x) => close(x, v)))) return 0;
    return f.weak ? 1 : 2;
  }
  if (f.kind === 'pair') return w.pairs.some((p) => close(p[0], f.values[0]) && close(p[1], f.values[1])) ? 2 : 0;
  return w.equations.some((e) => equivalent(f.eq, e)) ? 2 : 0;
}

export const factFound = (f: Fact, w: Work) => factHit(f, w) > 0;

export interface MathGrade {
  points: number;
  max: number;
  /** Fakty z klucza znalezione w rozwiązaniu i brakujące (dla wybranego albo najwyższego poziomu). */
  found: string[];
  missing: string[];
  /** false: klucz nie ma faktów do sprawdzenia albo rozwiązanie jest puste: potrzebna samoocena. */
  confident: boolean;
}

/** Ocena rozwiązania: najwyższy poziom, którego któryś wariant ma pokryte fakty. */
export function gradeMath(levels: KeyLevel[], max: number, answer: string, params: MathParams = DEFAULT_MATH_PARAMS): MathGrade | null {
  if (!answer.trim()) return null;
  const w = workOf(answer);
  const sorted = [...levels].filter((l) => l.points > 0).sort((a, b) => b.points - a.points);
  let checkable = 0;
  let best: { points: number; found: string[]; missing: string[] } | null = null;
  let topMissing: string[] = [];
  for (const lv of sorted) {
    for (const alt of lv.alts) {
      const facts = factsOf(alt);
      if (!facts.length) continue;
      checkable++;
      const hits = facts.map((f) => factHit(f, w));
      const hit = facts.filter((_, j) => hits[j] > 0);
      const ok = hit.length / facts.length >= params.coverage && hits.some((h) => h === 2);
      if (lv.points === sorted[0].points && !topMissing.length) topMissing = facts.filter((f) => !hit.includes(f)).map((f) => f.text);
      if (ok && (!best || lv.points > best.points)) best = { points: lv.points, found: hit.map((f) => f.text), missing: facts.filter((f) => !hit.includes(f)).map((f) => f.text) };
    }
    if (best && best.points === lv.points) break;
  }
  if (!checkable) return { points: 0, max, found: [], missing: [], confident: false };
  if (!best) return { points: 0, max, found: [], missing: topMissing, confident: true };
  let points = best.points;
  // sam wynik bez rozwiązania: CKE zwykle przyznaje najwyżej 1 pkt
  const work = new Set(w.values.map((v) => v.toPrecision(8))).size + w.equations.length;
  if (points === max && max > 1 && work < params.minWork) points = Math.min(points, params.bareCap);
  return { points, max, found: best.found, missing: points < max ? topMissing : best.missing, confident: true };
}
