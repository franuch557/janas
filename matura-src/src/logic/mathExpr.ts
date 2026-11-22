// Małe wyrażenia matematyczne z tekstu ucznia i z zasad oceniania CKE: liczby, + − · / ^,
// nawiasy, √, π, mnożenie domyślne (2√13, 3x), zmienne (x, a1, |AB| jako nazwa).
// Wartość liczę numerycznie, więc różne zapisy tej samej liczby są równe (√52 = 2√13 = 7,2111…).

export type Env = Record<string, number>;
type Node =
  | { t: 'n'; v: number }
  | { t: 'v'; name: string }
  | { t: 'u'; op: '-' | '√'; a: Node }
  | { t: 'b'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'f'; name: string; a: Node };

const FUN = new Set(['sin', 'cos', 'tg', 'tan', 'ctg', 'log', 'ln', 'sqrt']);

/** Zapis ucznia i klucza do wspólnej postaci (przed parsowaniem). */
export function normalizeMath(s: string): string {
  return s
    .replace(/[²]/g, '^2')
    .replace(/[³]/g, '^3')
    .normalize('NFKC')
    .replace(/[−–—]/g, '-')
    .replace(/[⋅·×∙]/g, '*')
    .replace(/[:÷]/g, '/')
    .replace(/\bpi\b/gi, 'π')
    .replace(/(\d),(\d)/g, '$1.$2');
}

/** Tokeny: liczby, nazwy (litery z cyframi, |AB|), operatory. */
function tokens(s: string): string[] | null {
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (num) {
      out.push(num[0]);
      i += num[0].length;
      continue;
    }
    const abs = /^\|[A-Za-z]{1,3}\|/.exec(s.slice(i));
    if (abs) {
      out.push(abs[0]);
      i += abs[0].length;
      continue;
    }
    const fn = /^(sin|cos|tg|tan|ctg|log|ln|sqrt)/.exec(s.slice(i));
    if (fn) {
      out.push(fn[0]);
      i += fn[0].length;
      continue;
    }
    // nazwa zmiennej: x, a1, f' (pochodna)
    const v = /^[A-Za-zα-ωΑ-Ω](?:_?\d)?'?/.exec(s.slice(i));
    if (v && v[0] !== 'π') {
      out.push(v[0].replace('_', ''));
      i += v[0].length;
      continue;
    }
    if ('+-*/^()√π'.includes(c)) {
      out.push(c);
      i++;
      continue;
    }
    return null;
  }
  return out;
}

/** Parser rekurencyjny; null, gdy wyrażenie jest niepełne albo ma nieznane znaki. */
export function parseExpr(src: string): Node | null {
  const ts = tokens(normalizeMath(src));
  if (!ts || !ts.length) return null;
  let p = 0;
  const peek = () => ts[p];
  const isAtomStart = (t: string | undefined) => t != null && (/^\d/.test(t) || t === '(' || t === '√' || t === 'π' || /^[A-Za-zα-ωΑ-Ω|]/.test(t));
  const atom = (): Node | null => {
    const t = ts[p++];
    if (t == null) return null;
    if (/^\d/.test(t)) return { t: 'n', v: Number(t) };
    if (t === 'π') return { t: 'n', v: Math.PI };
    if (t === '(') {
      const e = sum();
      if (ts[p++] !== ')') return null;
      return e;
    }
    if (t === '√' || t === 'sqrt') {
      const a = power();
      return a ? { t: 'u', op: '√', a } : null;
    }
    if (FUN.has(t)) {
      const a = power();
      return a ? { t: 'f', name: t, a } : null;
    }
    if (/^[A-Za-zα-ωΑ-Ω|]/.test(t)) return { t: 'v', name: t };
    return null;
  };
  const power = (): Node | null => {
    const a = atom();
    if (!a) return null;
    if (peek() === '^') {
      p++;
      const neg = peek() === '-' ? (p++, true) : false;
      const b = power();
      if (!b) return null;
      return { t: 'b', op: '^', a, b: neg ? { t: 'u', op: '-', a: b } : b };
    }
    return a;
  };
  const unary = (): Node | null => {
    if (peek() === '-') {
      p++;
      const a = unary();
      return a ? { t: 'u', op: '-', a } : null;
    }
    if (peek() === '+') p++;
    return power();
  };
  const product = (): Node | null => {
    let a = unary();
    if (!a) return null;
    for (;;) {
      const t = peek();
      if (t === '*' || t === '/') {
        p++;
        const b = unary();
        if (!b) return null;
        a = { t: 'b', op: t, a, b };
      } else if (isAtomStart(t)) {
        // mnożenie domyślne: 2√13, 3x, 2(x+1)
        const b = power();
        if (!b) return null;
        a = { t: 'b', op: '*', a, b };
      } else return a;
    }
  };
  const sum = (): Node | null => {
    let a = product();
    if (!a) return null;
    for (;;) {
      const t = peek();
      if (t !== '+' && t !== '-') return a;
      p++;
      const b = product();
      if (!b) return null;
      a = { t: 'b', op: t, a, b };
    }
  };
  const e = sum();
  return e && p === ts.length ? e : null;
}

export function evalExpr(n: Node, env: Env = {}): number {
  switch (n.t) {
    case 'n':
      return n.v;
    case 'v':
      return n.name in env ? env[n.name] : NaN;
    case 'u':
      return n.op === '-' ? -evalExpr(n.a, env) : Math.sqrt(evalExpr(n.a, env));
    case 'f': {
      const a = evalExpr(n.a, env);
      if (n.name === 'sin') return Math.sin((a * Math.PI) / 180);
      if (n.name === 'cos') return Math.cos((a * Math.PI) / 180);
      if (n.name === 'tg' || n.name === 'tan') return Math.tan((a * Math.PI) / 180);
      if (n.name === 'ctg') return 1 / Math.tan((a * Math.PI) / 180);
      if (n.name === 'ln') return Math.log(a);
      if (n.name === 'log') return Math.log10(a);
      return Math.sqrt(a);
    }
    case 'b': {
      const a = evalExpr(n.a, env);
      const b = evalExpr(n.b, env);
      if (n.op === '+') return a + b;
      if (n.op === '-') return a - b;
      if (n.op === '*') return a * b;
      if (n.op === '/') return a / b;
      return Math.pow(a, b);
    }
  }
}

export function varsOf(n: Node, out = new Set<string>()): Set<string> {
  if (n.t === 'v') out.add(n.name);
  else if (n.t === 'u' || n.t === 'f') varsOf(n.a, out);
  else if (n.t === 'b') {
    varsOf(n.a, out);
    varsOf(n.b, out);
  }
  return out;
}

export const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b));

/** Wartość wyrażenia bez zmiennych (albo null). */
export function constValue(src: string): number | null {
  const e = parseExpr(src);
  if (!e || varsOf(e).size) return null;
  const v = evalExpr(e);
  return Number.isFinite(v) ? v : null;
}

/** Równanie f = g jako różnica f − g (do porównań równoważności). */
export interface Equation {
  diff: Node;
  vars: string[];
  text: string;
}

export function parseEquation(src: string): Equation | null {
  const sides = src.split('=');
  if (sides.length !== 2) return null;
  const a = parseExpr(sides[0]);
  const b = parseExpr(sides[1]);
  if (!a || !b) return null;
  const diff: Node = { t: 'b', op: '-', a, b };
  const vars = [...varsOf(diff)];
  return vars.length ? { diff, vars, text: src.trim() } : null;
}

// deterministyczne punkty próbne (bez Math.random: wynik oceny zawsze ten sam)
const SAMPLES = [0.37, 1.83, -2.41, 3.17, 0.71, -1.29];

/** Czy równania są równoważne: f_s = c · f_k dla stałego c ≠ 0 w punktach próbnych. */
export function equivalent(k: Equation, s: Equation): boolean {
  const vars = [...new Set([...k.vars, ...s.vars])];
  if (!s.vars.every((v) => k.vars.includes(v))) return false;
  let ratio: number | null = null;
  let used = 0;
  for (let i = 0; i < SAMPLES.length; i++) {
    const env: Env = {};
    vars.forEach((v, j) => (env[v] = SAMPLES[(i + j * 2) % SAMPLES.length] + j * 0.13));
    const fk = evalExpr(k.diff, env);
    const fs = evalExpr(s.diff, env);
    if (!Number.isFinite(fk) || !Number.isFinite(fs)) continue;
    if (Math.abs(fk) < 1e-9) {
      if (Math.abs(fs) > 1e-6) return false;
      continue;
    }
    const r = fs / fk;
    if (ratio == null) ratio = r;
    else if (!close(r, ratio)) return false;
    used++;
  }
  return used >= 3 && ratio != null && Math.abs(ratio) > 1e-9;
}
