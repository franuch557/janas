// Automatyczna ocena rozwiązania zadania otwartego z matematyki według zasad CKE.
// Klucz jest wzorem rozumowania, nie tekstem do przepisania: z każdego poziomu punktacji
// (i z każdego wariantu „ALBO”) biorę wyniki pośrednie i równania, a w rozwiązaniu ucznia
// szukam tych samych wartości (liczonych numerycznie) i równań równoważnych.
// Parametry progów są dobrane na wzorcowych rozwiązaniach CKE (scripts/trenuj-ocene.mts).

import { close, constValue, equivalent, evalExpr, normalizeMath, parseEquation, parseExpr, varsOf, type Equation } from './mathExpr';

export interface MathParams {
  /** Część faktów wariantu, które muszą się zgadzać. */
  coverage: number;
  /** Ile wartości lub równań musi mieć rozwiązanie, żeby dostać maksimum (sam wynik to za mało). */
  minWork: number;
  /** Ile punktów najwyżej za sam wynik bez rozwiązania. */
  bareCap: number;
}
export const DEFAULT_MATH_PARAMS: MathParams = { coverage: 0.75, minWork: 2, bareCap: 1 };

export interface Interval {
  lo: number;
  hi: number;
  loC: boolean;
  hiC: boolean;
}
type Expr = NonNullable<ReturnType<typeof parseExpr>>;
export type Fact =
  | { kind: 'value'; values: number[]; text: string; weak: boolean; label?: string }
  | { kind: 'pair'; values: number[]; text: string }
  | { kind: 'eq'; eq: Equation; text: string }
  | { kind: 'interval'; ivs: Interval[]; text: string }
  | { kind: 'expr'; expr: Expr; vars: string[]; text: string };

const INTERVAL = /([[(⟨<])\s*([^,;[\]()⟨⟩<>]+?)\s*[,;]\s*([^,;[\]()⟨⟩<>]+?)\s*([\])⟩>])/g;
const endpoint = (s: string): number | null => {
  const t = s.replace(/\s+/g, '').replace(/[−–]/g, '-');
  if (/^-∞$/.test(t)) return -Infinity;
  if (/^\+?∞$/.test(t)) return Infinity;
  return constValue(t);
};
/** Przedziały z zapisu: [−2,4], (−∞, 3), ⟨1; 5) (jeden albo suma ∪). */
export function intervalsIn(s: string): Interval[] {
  const out: Interval[] = [];
  for (const m of s.matchAll(INTERVAL)) {
    const lo = endpoint(m[2]);
    const hi = endpoint(m[3]);
    if (lo == null || hi == null || !(lo < hi)) continue;
    out.push({ lo, hi, loC: m[1] === '[' || m[1] === '⟨', hiC: m[4] === ']' || m[4] === '⟩' });
  }
  return out;
}
const sameIv = (a: Interval, b: Interval) => (a.lo === b.lo || close(a.lo, b.lo)) && (a.hi === b.hi || close(a.hi, b.hi)) && (a.loC === b.loC || !Number.isFinite(a.lo)) && (a.hiC === b.hiC || !Number.isFinite(a.hi));
const looksInterval = (s: string) => /[[\]⟨⟩∞]/.test(s);

/** Jednostki na końcu wyniku („4,5 m”, „12 cm²”, „30°”) nie są częścią wartości. */
const stripUnits = (s: string) => s.replace(/\s*\((?:mm|cm|dm|km|m|j)\^?[23²³]?\s*\)\s*$/i, '').replace(/\s*(?:mm|cm|dm|km|m|kg|g|zł|h|min|s|l|ha|j)(?:\^?[23²³])?\s*$/i, '').replace(/\s*(?:°\s*C|°|%|stopni\w*|zł|złotych|km\/h|m\/s)\s*\.?$/i, '');

/** Matematyczny koniec tekstu: „…długością siatki, 4x + 6y” → „4x + 6y”. */
function mathTail(s: string): string {
  const words = s.trim().split(/\s+/);
  const out: string[] = [];
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (!/^[\dA-Za-zα-ω√π()|+\-−*/^.,⋅·²³']+$/.test(w)) break;
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
  // dowody i przekształcenia: „przekształcenie wyrażenia … do postaci 4n(n + 1)”
  for (const m of alt.matchAll(/do postaci\s+(.+?)(?=\s+(?:oraz|i|lub|albo|,|gdzie)\s|[,;]\s|\.?$)/g)) {
    const e = parseExpr(m[1].replace(/\s*\.$/, ''));
    if (e && varsOf(e).size) out.push({ kind: 'expr', expr: e, vars: [...varsOf(e)], text: `postać ${m[1].trim()}` });
  }
  for (let piece of part.split(/\s+(?:oraz|i|lub|albo)\s+|;|,\s+(?=[^,]*=)/)) {
    piece = piece.replace(/[.,]\s*$/, '').trim();
    if (!piece || !/[\d∞]/.test(piece)) continue;
    if (looksInterval(piece)) {
      const ivs = intervalsIn(piece);
      if (ivs.length) {
        out.push({ kind: 'interval', ivs, text: piece });
        continue;
      }
    }
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
        const label = /^(?:\|[A-Za-z]{1,3}\||[A-Za-z](?:_?\d{1,2})?|[A-Z]?\([A-Za-z]\)|[A-Za-z]'?\(-?\d+\))$/.test(lhs.replace(/\s+/g, '')) ? lhs.replace(/\s+/g, '') : undefined;
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
  intervals: Interval[];
  /** Wyrażenia ze zmiennymi (każde ogniwo łańcucha), do porównania postaci w dowodach. */
  exprs: Expr[];
}

/** Wartości i równania z rozwiązania ucznia (każdy wiersz, każde ogniwo łańcucha „a = b = c”). */
export function workOf(text: string): Work {
  const values: number[] = [];
  const labeled = new Map<string, number[]>();
  const equations: Equation[] = [];
  const intervals = intervalsIn(text);
  const exprs: Expr[] = [];
  const pairs = pairsIn(text);
  for (const p of pairs) values.push(...p);
  // nawiasy przedziałów i par nie są częścią wyrażeń; nawiasy zwykłe w wyrażeniach zostają
  const norm = normalizeMath(text.replace(INTERVAL, (m) => (/[[\]⟨⟩∞]/.test(m) ? ' ' : m)).replace(/\(\s*-?[\d.,√]+\s*[,;]\s*-?[\d.,√]+\s*\)/g, ' '));
  for (const line of norm.split(/\n|;|\s{2,}|,\s+(?=\D)|\s+(?:oraz|i|więc|zatem|stąd|czyli)\s+/)) {
    const chain = line.split(/=|≈/).map((x) => stripUnits(x.trim()));
    const name = mathTail(chain[0] ?? '').replace(/\s+/g, '');
    if (chain.length >= 2 && /^(?:\|[A-Za-z]{1,3}\||[A-Za-z](?:_?\d{1,2})?|[A-Z]?\([A-Za-z]\)|[A-Za-z]'?\(-?\d+\))$/.test(name)) {
      const v = constValue(chain[chain.length - 1]);
      if (v != null) labeled.set(name, [...(labeled.get(name) ?? []), v]);
    }
    for (const c of chain) {
      const v = constValue(c);
      if (v != null) values.push(v);
      const ex = parseExpr(mathTail(c));
      if (ex && varsOf(ex).size) exprs.push(ex);
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
  return { values, labeled, pairs, equations, intervals, exprs };
}

/** 0 – brak, 1 – sama liczba (słaby dowód przy małych liczbach), 2 – pewne trafienie. */
export function factHit(f: Fact, w: Work): 0 | 1 | 2 {
  if (f.kind === 'value') {
    if (f.label && f.values.every((v) => (w.labeled.get(f.label!) ?? []).some((x) => close(x, v)))) return 2;
    if (!f.values.every((v) => w.values.some((x) => close(x, v)))) return 0;
    return f.weak ? 1 : 2;
  }
  if (f.kind === 'pair') return w.pairs.some((p) => close(p[0], f.values[0]) && close(p[1], f.values[1])) ? 2 : 0;
  if (f.kind === 'interval') return f.ivs.every((iv) => w.intervals.some((x) => sameIv(iv, x))) ? 2 : 0;
  if (f.kind === 'expr') return w.exprs.some((e) => sameExpr(f.expr, f.vars, e)) ? 2 : 0;
  return w.equations.some((e) => equivalent(f.eq, e)) ? 2 : 0;
}

export const factFound = (f: Fact, w: Work) => factHit(f, w) > 0;

// deterministyczne punkty (jak w mathExpr): wyrażenia równe tożsamościowo
const PTS = [0.37, 1.83, -2.41, 3.17, 0.71];
/** Główne działanie wyrażenia (iloczyn, suma, potęga…): „do postaci iloczynu” wymaga iloczynu. */
const topOp = (e: Expr): string => (e.t === 'b' ? (e.op === '-' ? '+' : e.op === '/' ? '*' : e.op) : e.t === 'u' && e.op === '-' ? topOp(e.a) : e.t);
function sameExpr(k: Expr, kv: string[], s: Expr): boolean {
  if (topOp(k) !== topOp(s)) return false;
  const sv = [...varsOf(s)];
  if (!sv.every((v) => kv.includes(v))) return false;
  let used = 0;
  for (let i = 0; i < PTS.length; i++) {
    const env: Record<string, number> = {};
    kv.forEach((v, j) => (env[v] = PTS[(i + j * 2) % PTS.length] + j * 0.11));
    const a = evalExpr(k, env);
    const b = evalExpr(s, env);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (!close(a, b)) return false;
    used++;
  }
  return used >= 3;
}

/** Klucz zadania w aplikacji: poziomy z wariantami, odpowiedź z pola „Rozwiązanie”, dowód. */
export interface MathKey {
  levels: KeyLevel[];
  answers?: string[];
  proof?: boolean;
  /** Wynik końcowy ze wzorcowego rozwiązania CKE (gdy opis najwyższego poziomu ma rozbity wzór). */
  final?: string[];
}

/** Fakty pozycji odpowiedzi („1. Dziedziną funkcji f jest przedział [−4,4).”) albo tekst do porównania. */
function itemFacts(item: string): { facts: Fact[]; word: string | null } {
  const t = item.replace(/^\d+\.\s*/, '').trim();
  const facts = factsOf(t);
  if (facts.length) return { facts, word: null };
  const w = t.replace(/[.;,]$/, '').trim();
  return { facts: [], word: w.length && w.length <= 40 ? w.toLowerCase() : null };
}

/** Odpowiedź krótka: każda pozycja to 1 pkt (gdy pozycji jest tyle co punktów) albo komplet = maksimum. */
export function gradeAnswers(answers: string[], max: number, text: string): MathGrade | null {
  if (!text.trim() || !answers.length) return null;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const numbered = (n: number) => lines.find((l) => new RegExp(`^${n}[.)]\\s*`).test(l));
  const found: string[] = [];
  const missing: string[] = [];
  let ok = 0;
  let checkable = 0;
  answers.forEach((a, i) => {
    const { facts, word } = itemFacts(a);
    if (!facts.length && !word) return;
    checkable++;
    const cand = answers.length > 1 ? [numbered(i + 1) ?? lines[i] ?? ''] : [text];
    const hit = cand.some((c) => {
      if (facts.length) {
        const w = workOf(c.replace(/^\d+[.)]\s*/, ''));
        return facts.every((f) => factHit(f, w) > 0);
      }
      const n = c.replace(/^\d+[.)]\s*/, '').toLowerCase();
      return n === word || n.includes(word!);
    });
    if (hit) {
      ok++;
      found.push(a.replace(/^\d+\.\s*/, ''));
    } else missing.push(a.replace(/^\d+\.\s*/, ''));
  });
  if (!checkable) return null;
  const each = answers.length === max && max > 1;
  const points = each ? ok : ok === checkable ? max : 0;
  return { points, max, found, missing, confident: checkable === answers.length };
}

const CONCLUSION = /co należało|c\.?\s?n\.?\s?[dw]\.?|zatem|więc|stąd|dlatego|czyli|wobec tego|to kończy dowód/i;

/** Ocena według klucza aplikacji: odpowiedź krótka, poziomy, dowód (pełne punkty po krokach z klucza i wniosku). */
export function gradeTask(key: MathKey, max: number, text: string, params: MathParams = DEFAULT_MATH_PARAMS): MathGrade | null {
  const hasTopFacts = key.levels.some((l) => l.points === max && l.alts.some((a) => factsOf(a).length));
  if (key.answers?.length) {
    const g = gradeAnswers(key.answers, max, text);
    // klucz odpowiedzi rozstrzyga, gdy poziomy nie mają faktów albo odpowiedź jest pełna
    if (g && (!hasTopFacts || g.points === max)) return g;
  }
  const g = gradeMath(key.levels, max, text, params);
  // najwyższy poziom bez wzoru do sprawdzenia: wynik końcowy z rozwiązania CKE
  if (g && !hasTopFacts && !key.proof && key.final?.length && g.points < max) {
    const w = workOf(text);
    const facts = key.final.flatMap((l) => factsOf(l));
    const hits = facts.map((f) => factHit(f, w));
    const work = Math.max(workBeyond(w, facts), mathLineCount(text) - 1);
    if (facts.length && hits.every((h) => h > 0) && hits.some((h) => h === 2) && (max === 1 || work >= params.minWork)) {
      return { points: max, max, found: facts.map((f) => f.text), missing: [], confident: true };
    }
    if (facts.length && !g.found.length) return { ...g, missing: facts.filter((_, i) => !hits[i]).map((f) => f.text) };
  }
  if (!g || !key.proof || hasTopFacts) return g;
  // dowód: najwyższy poziom to „pełne rozumowanie” bez wzoru; po wszystkich krokach z klucza
  // i wniosku na końcu daję maksimum
  const checkLevels = key.levels.filter((l) => l.points > 0 && l.alts.some((a) => factsOf(a).length));
  const topCheck = Math.max(0, ...checkLevels.map((l) => l.points));
  if (g.confident && g.points === topCheck && topCheck > 0 && topCheck < max && CONCLUSION.test(text)) return { ...g, points: max };
  return g;
}

export interface MathGrade {
  points: number;
  max: number;
  /** Fakty z klucza znalezione w rozwiązaniu i brakujące (dla wybranego albo najwyższego poziomu). */
  found: string[];
  missing: string[];
  /** false: klucz nie ma faktów do sprawdzenia albo rozwiązanie jest puste: potrzebna samoocena. */
  confident: boolean;
}


/** Wiersze z obliczeniami (z cyfrą): rozwiązanie w kilku wierszach to nie „sam wynik”. */
export const mathLineCount = (text: string) => text.split(/\n+/).filter((l) => /\d/.test(l)).length;

/** Ile kroków ma rozwiązanie poza samym wynikiem: liczby i równania, których nie ma w faktach wyniku. */
export function workBeyond(w: Work, result: Fact[]): number {
  const vals = result.flatMap((f) => (f.kind === 'value' || f.kind === 'pair' ? f.values : f.kind === 'interval' ? f.ivs.flatMap((i) => [i.lo, i.hi]) : []));
  const own = new Set(w.values.filter((v) => !vals.some((x) => close(x, v))).map((v) => v.toPrecision(8)));
  const eqs = w.equations.filter((e) => !result.some((f) => f.kind === 'eq' && equivalent(f.eq, e)));
  return own.size + eqs.length;
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
  // sam wynik bez rozwiązania: CKE zwykle przyznaje najwyżej 1 pkt (liczę kroki poza wynikiem)
  const topFacts = sorted.filter((l) => l.points === max).flatMap((l) => l.alts.flatMap((a) => factsOf(a)));
  const work = Math.max(workBeyond(w, topFacts), mathLineCount(answer) - 1);
  if (points === max && max > 1 && work < params.minWork) points = Math.min(points, params.bareCap);
  return { points, max, found: best.found, missing: points < max ? topMissing : best.missing, confident: true };
}
