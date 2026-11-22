// Warianty zadań z matematyki: typy zadań z arkuszy CKE (działy S+ i S z tier-list matemaks.pl)
// z losowanymi danymi. Liczby dobieram tak, żeby wynik był „ładny” jak w CKE, a program liczy
// klucz (w formacie MathKey, jak klucze CKE) i kroki rozwiązania (przykład, luki, podpowiedzi).
// Treść poleceń jest napisana od nowa, w stylu CKE.

import type { MathKey } from './mathGrade';

export interface Step {
  /** Tekst kroku ($…$ dla wzorów); `{}` w miejscu luki. */
  text: string;
  /** Wartość luki (do wpisania w trybie „z lukami”). */
  blank?: string;
}

export interface Variant {
  gen: string;
  seed: number;
  subjectId: 'mat-p' | 'mat-r';
  topic: string;
  maxPoints: number;
  question: string;
  key: MathKey;
  steps: Step[];
  /** Odpowiedź końcowa (tekst). */
  answer: string;
}

export interface Generator {
  id: string;
  subjectId: 'mat-p' | 'mat-r';
  topic: string;
  name: string;
  make: (r: Rng) => Omit<Variant, 'gen' | 'seed' | 'subjectId' | 'topic'>;
}

// ---------- losowanie z ziarnem (ten sam wariant przy tym samym ziarnie) ----------

export interface Rng {
  next(): number;
  int(a: number, b: number): number;
  pick<T>(xs: T[]): T;
  nz(a: number, b: number): number;
}

export function rng(seed: number): Rng {
  let s = seed >>> 0 || 1;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (a: number, b: number) => a + Math.floor(next() * (b - a + 1));
  return {
    next,
    int,
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    nz: (a, b) => {
      let v = 0;
      while (v === 0) v = int(a, b);
      return v;
    },
  };
}

// ---------- zapis liczb ----------

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** Ułamek jako tekst do klucza („3/4”, „−2”) i jako LaTeX. */
export function frac(p: number, q: number): { key: string; tex: string; value: number } {
  if (q < 0) {
    p = -p;
    q = -q;
  }
  const g = gcd(p, q) || 1;
  p /= g;
  q /= g;
  if (q === 1) return { key: num(p), tex: num(p), value: p };
  return { key: `${p}/${q}`, tex: `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`, value: p / q };
}
const num = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n));
const tnum = (n: number) => (n < 0 ? `-${Math.abs(n)}` : String(n));
/** „+ 3”, „− 3” w środku wyrażenia. */
const sgn = (n: number) => (n < 0 ? `- ${Math.abs(n)}` : `+ ${n}`);
/** Współczynnik przy zmiennej: 1 → „”, −1 → „−”. */
const coef = (n: number) => (n === 1 ? '' : n === -1 ? '-' : String(n));
const lin = (a: number, b: number, v = 'x') => `${coef(a)}${v} ${b === 0 ? '' : sgn(b)}`.trim();

// ---------- generatory ----------

export const GENERATORS: Generator[] = [
  {
    id: 'potegi-iloraz',
    subjectId: 'mat-p',
    topic: 'potegi',
    name: 'Działania na potęgach',
    make: (r) => {
      const a = r.pick([2, 3, 5]);
      const m = r.int(3, 9);
      const n = r.int(-4, 4);
      const k = r.int(1, 6);
      const e = m + n - k;
      if (e < -2 || e > 6) return GENERATORS[0].make(r);
      const v = e >= 0 ? frac(a ** e, 1) : frac(1, a ** -e);
      return {
        maxPoints: 1,
        question: `Oblicz wartość wyrażenia $\\dfrac{${a}^{${m}} \\cdot ${a}^{${n}}}{${a}^{${k}}}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie wartości: ${v.key}`] }], answers: [v.key] },
        steps: [
          { text: `Mnożąc potęgi o tej samej podstawie, dodajemy wykładniki: $${a}^{${m}} \\cdot ${a}^{${n}} = ${a}^{{}}$.`, blank: String(m + n) },
          { text: `Dzieląc, odejmujemy wykładniki: $${a}^{${m + n}} : ${a}^{${k}} = ${a}^{{}}$.`, blank: String(e) },
          { text: `Zatem wartość wyrażenia to $${v.tex}$.`, blank: v.key },
        ],
        answer: v.key,
      };
    },
  },
  {
    id: 'pierwiastki-iloczyn',
    subjectId: 'mat-p',
    topic: 'potegi',
    name: 'Pierwiastki',
    make: (r) => {
      const k = r.pick([2, 3, 5, 6, 7]);
      const a = r.int(2, 5);
      const b = r.int(2, 5);
      // √(k·a²) · √(k·b²) = k·a·b
      const x = k * a * a;
      const y = k * b * b;
      const v = k * a * b;
      return {
        maxPoints: 1,
        question: `Oblicz $\\sqrt{${x}} \\cdot \\sqrt{${y}}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${v}`] }], answers: [String(v)] },
        steps: [
          { text: `$\\sqrt{${x}} = ${a}\\sqrt{${k}}$, bo $${x} = ${a * a} \\cdot ${k}$. Podobnie $\\sqrt{${y}} = {}\\sqrt{${k}}$.`, blank: String(b) },
          { text: `Iloczyn: $${a}\\sqrt{${k}} \\cdot ${b}\\sqrt{${k}} = ${a * b} \\cdot ${k} = {}$.`, blank: String(v) },
        ],
        answer: String(v),
      };
    },
  },
  {
    id: 'logarytmy-suma',
    subjectId: 'mat-p',
    topic: 'logarytmy',
    name: 'Suma i różnica logarytmów',
    make: (r) => {
      const b = r.pick([2, 3, 5]);
      const k = r.int(2, 5);
      const p = r.int(1, k - 1);
      const x = b ** p * r.pick([1, 2, 3]);
      const total = b ** k;
      if (total % x !== 0) return GENERATORS[2].make(r);
      const y = total / x;
      const op = r.pick(['+', '-']);
      if (op === '+')
        return {
          maxPoints: 1,
          question: `Oblicz $\\log_{${b}} ${x} + \\log_{${b}} ${y}$.`,
          key: { levels: [{ points: 1, alts: [`obliczenie: ${k}`] }], answers: [String(k)] },
          steps: [
            { text: `Suma logarytmów o tej samej podstawie to logarytm iloczynu: $\\log_{${b}} (${x} \\cdot ${y}) = \\log_{${b}} {}$.`, blank: String(total) },
            { text: `Szukamy wykładnika: $${b}^{{}} = ${total}$.`, blank: String(k) },
          ],
          answer: String(k),
        };
      const big = total * x;
      return {
        maxPoints: 1,
        question: `Oblicz $\\log_{${b}} ${big} - \\log_{${b}} ${x}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${k}`] }], answers: [String(k)] },
        steps: [
          { text: `Różnica logarytmów to logarytm ilorazu: $\\log_{${b}} \\dfrac{${big}}{${x}} = \\log_{${b}} {}$.`, blank: String(total) },
          { text: `Szukamy wykładnika: $${b}^{{}} = ${total}$.`, blank: String(k) },
        ],
        answer: String(k),
      };
    },
  },
  {
    id: 'wartosc-rownanie',
    subjectId: 'mat-p',
    topic: 'wartosc-bezwzgledna',
    name: 'Równanie z wartością bezwzględną',
    make: (r) => {
      const a = r.nz(-9, 9);
      const b = r.int(1, 9);
      const x1 = a - b;
      const x2 = a + b;
      return {
        maxPoints: 1,
        question: `Rozwiąż równanie $|x ${sgn(-a)}| = ${b}$. Podaj wszystkie rozwiązania.`,
        key: { levels: [{ points: 1, alts: [`podanie rozwiązań: ${num(x1)}, ${num(x2)}`] }], answers: [`${num(x1)}, ${num(x2)}`] },
        steps: [
          { text: `$|x ${sgn(-a)}| = ${b}$ oznacza, że $x ${sgn(-a)} = ${b}$ albo $x ${sgn(-a)} = -${b}$.` },
          { text: `Z pierwszego: $x = {}$.`, blank: tnum(x2) },
          { text: `Z drugiego: $x = {}$.`, blank: tnum(x1) },
        ],
        answer: `${num(x1)}, ${num(x2)}`,
      };
    },
  },
  {
    id: 'nierownosc-liniowa',
    subjectId: 'mat-p',
    topic: 'rownania',
    name: 'Nierówność liniowa',
    make: (r) => {
      const a = r.nz(-6, 6);
      const x0 = r.int(-6, 6);
      const b = r.int(-9, 9);
      const c = a * x0 + b;
      const rel = r.pick(['>', '<', '\\ge', '\\le']);
      // ax + b rel c  →  x rel' x0 (odwrócenie przy a < 0)
      const flip = a < 0;
      const geq = rel === '\\ge' || rel === '\\le';
      const right = (rel === '>' || rel === '\\ge') !== flip;
      const iv = right ? `${geq ? '[' : '('}${tnum(x0)}, +∞)` : `(−∞, ${tnum(x0)}${geq ? ']' : ')'}`;
      return {
        maxPoints: 1,
        question: `Rozwiąż nierówność $${lin(a, b)} ${rel} ${c}$. Zapisz zbiór rozwiązań w postaci przedziału.`,
        key: { levels: [{ points: 1, alts: [`zbiór rozwiązań: ${iv}`] }], answers: [iv] },
        steps: [
          { text: `Przenosimy wyraz wolny: $${coef(a)}x ${rel} ${c} ${sgn(-b)} = {}$.`, blank: String(c - b) },
          { text: `Dzielimy przez ${a}${flip ? ' (liczba ujemna, więc zmieniamy znak nierówności)' : ''}: $x$ ${right ? 'większe' : 'mniejsze'} ${geq ? 'lub równe ' : ''}od ${x0}.` },
          { text: `Zbiór rozwiązań: ${iv}.`, blank: iv },
        ],
        answer: iv,
      };
    },
  },
  {
    id: 'nierownosc-kwadratowa',
    subjectId: 'mat-p',
    topic: 'rownania',
    name: 'Nierówność kwadratowa',
    make: (r) => {
      const p = r.int(-7, 5);
      const q = p + r.int(1, 8);
      const b = -(p + q);
      const c = p * q;
      const le = r.pick([true, false]);
      const iv = le ? `[${tnum(p)}, ${tnum(q)}]` : `(−∞, ${tnum(p)}) ∪ (${tnum(q)}, +∞)`;
      return {
        maxPoints: 2,
        question: `Rozwiąż nierówność $x^2 ${b === 0 ? '' : `${sgn(b)}x`} ${c === 0 ? '' : sgn(c)} ${le ? '\\le' : '>'} 0$.`,
        key: {
          levels: [
            { points: 2, alts: [`poprawny zbiór rozwiązań: ${iv}`] },
            { points: 1, alts: [`obliczenie pierwiastków trójmianu: x = ${num(p)} oraz x = ${num(q)}`] },
          ],
        },
        steps: [
          { text: `Liczymy $\\Delta = ${b * b} - 4 \\cdot ${c} = {}$.`, blank: String(b * b - 4 * c) },
          { text: `Pierwiastki: $x_1 = {}$`, blank: tnum(p) },
          { text: `i $x_2 = {}$.`, blank: tnum(q) },
          { text: `Parabola ma ramiona skierowane w górę, więc trójmian jest ${le ? 'niedodatni między pierwiastkami' : 'dodatni poza przedziałem między pierwiastkami'}: ${iv}.` },
        ],
        answer: iv,
      };
    },
  },
  {
    id: 'rownanie-iloczynowe',
    subjectId: 'mat-p',
    topic: 'rownania',
    name: 'Równanie w postaci iloczynowej',
    make: (r) => {
      const a = r.nz(-6, 6);
      const b = r.nz(-6, 6);
      const k = r.pick([2, 3]);
      const c = r.nz(-9, 9);
      const x3 = frac(c, k);
      const roots = [...new Set([a, -b, x3.value])].length;
      if (roots < 3) return GENERATORS[6].make(r);
      return {
        maxPoints: 1,
        question: `Rozwiąż równanie $(x ${sgn(-a)})(x ${sgn(b)})(${k}x ${sgn(-c)}) = 0$. Podaj wszystkie rozwiązania.`,
        key: { levels: [{ points: 1, alts: [`rozwiązania: ${num(a)}, ${num(-b)}, ${x3.key}`] }], answers: [`${num(a)}, ${num(-b)}, ${x3.key}`] },
        steps: [
          { text: 'Iloczyn jest równy zero, gdy któryś z czynników jest równy zero.' },
          { text: `$x ${sgn(-a)} = 0$, więc $x = {}$.`, blank: tnum(a) },
          { text: `$x ${sgn(b)} = 0$, więc $x = {}$.`, blank: tnum(-b) },
          { text: `$${k}x ${sgn(-c)} = 0$, więc $x = {}$.`, blank: x3.key },
        ],
        answer: `${num(a)}, ${num(-b)}, ${x3.key}`,
      };
    },
  },
  {
    id: 'funkcja-liniowa-zero',
    subjectId: 'mat-p',
    topic: 'rownania',
    name: 'Miejsce zerowe funkcji liniowej',
    make: (r) => {
      const a = r.nz(-5, 5);
      const x0 = frac(r.nz(-12, 12), r.pick([1, 1, 2, 3]));
      const b = -a * x0.value;
      if (!Number.isInteger(b)) return GENERATORS[7].make(r);
      return {
        maxPoints: 1,
        question: `Wyznacz miejsce zerowe funkcji $f(x) = ${lin(a, b)}$.`,
        key: { levels: [{ points: 1, alts: [`miejsce zerowe: x = ${x0.key}`] }], answers: [x0.key] },
        steps: [
          { text: `Rozwiązujemy $${lin(a, b)} = 0$, czyli $${coef(a)}x = {}$.`, blank: tnum(-b) },
          { text: `$x = {}$.`, blank: x0.key },
        ],
        answer: x0.key,
      };
    },
  },
  {
    id: 'rownanie-wymierne',
    subjectId: 'mat-p',
    topic: 'wymierne',
    name: 'Równanie wymierne',
    make: (r) => {
      const b = r.int(-6, 6);
      const c = r.pick([2, 3, -2, 4]);
      const x = r.int(-9, 9);
      if (x === b) return GENERATORS[8].make(r);
      // (x + a)/(x − b) = c  →  a = c(x − b) − x
      const a = c * (x - b) - x;
      return {
        maxPoints: 1,
        question: `Rozwiąż równanie $\\dfrac{x ${sgn(a)}}{x ${sgn(-b)}} = ${c}$ dla $x \\ne ${b}$.`,
        key: { levels: [{ points: 1, alts: [`rozwiązanie: x = ${num(x)}`] }], answers: [num(x)] },
        steps: [
          { text: `Mnożymy obie strony przez $x ${sgn(-b)}$: $x ${sgn(a)} = ${c}(x ${sgn(-b)})$.` },
          { text: `$x ${sgn(a)} = ${c}x ${sgn(-c * b)}$, stąd $${1 - c}x = {}$.`, blank: tnum(-c * b - a) },
          { text: `$x = {}$ (różne od ${b}, więc jest rozwiązaniem).`, blank: tnum(x) },
        ],
        answer: num(x),
      };
    },
  },
  {
    id: 'ciag-arytmetyczny',
    subjectId: 'mat-p',
    topic: 'ciagi',
    name: 'Ciąg arytmetyczny',
    make: (r) => {
      const a1 = r.int(-10, 15);
      const d = r.nz(-5, 6);
      const k = r.int(3, 6);
      const n = r.int(8, 20);
      const ak = a1 + (k - 1) * d;
      const an = a1 + (n - 1) * d;
      return {
        maxPoints: 2,
        question: `W ciągu arytmetycznym $(a_n)$ pierwszy wyraz jest równy $${a1}$, a $a_{${k}} = ${ak}$. Oblicz $a_{${n}}$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie wyrazu: a${n} = ${num(an)}`] },
            { points: 1, alts: [`obliczenie różnicy ciągu: r = ${num(d)}`] },
          ],
        },
        steps: [
          { text: `$a_{${k}} = a_1 + ${k - 1}r$, więc $${ak} = ${a1} + ${k - 1}r$ i $r = {}$.`, blank: tnum(d) },
          { text: `$a_{${n}} = a_1 + ${n - 1}r = ${a1} + ${n - 1} \\cdot (${d}) = {}$.`, blank: tnum(an) },
        ],
        answer: `a${n} = ${num(an)}`,
      };
    },
  },
  {
    id: 'ciag-arytmetyczny-suma',
    subjectId: 'mat-p',
    topic: 'ciagi',
    name: 'Suma wyrazów ciągu arytmetycznego',
    make: (r) => {
      const a1 = r.int(-8, 12);
      const d = r.nz(-4, 5);
      const n = r.pick([10, 12, 15, 20]);
      const an = a1 + (n - 1) * d;
      const S = ((a1 + an) * n) / 2;
      return {
        maxPoints: 2,
        question: `Ciąg arytmetyczny $(a_n)$ ma pierwszy wyraz $a_1 = ${a1}$ i różnicę $r = ${d}$. Oblicz sumę ${n} początkowych wyrazów tego ciągu.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie sumy: S${n} = ${num(S)}`] },
            { points: 1, alts: [`obliczenie wyrazu: a${n} = ${num(an)}`] },
          ],
        },
        steps: [
          { text: `$a_{${n}} = ${a1} + ${n - 1} \\cdot (${d}) = {}$.`, blank: tnum(an) },
          { text: `$S_{${n}} = \\dfrac{a_1 + a_{${n}}}{2} \\cdot ${n} = \\dfrac{${a1} + (${an})}{2} \\cdot ${n} = {}$.`, blank: tnum(S) },
        ],
        answer: `S${n} = ${num(S)}`,
      };
    },
  },
  {
    id: 'ciag-geometryczny',
    subjectId: 'mat-p',
    topic: 'ciagi',
    name: 'Ciąg geometryczny',
    make: (r) => {
      const a1 = r.pick([1, 2, 3, -2, 5, 4]);
      const q = r.pick([2, 3, -2, -3]);
      const n = r.int(4, 6);
      const an = a1 * q ** (n - 1);
      const a2 = a1 * q;
      return {
        maxPoints: 1,
        question: `Ciąg geometryczny $(a_n)$ ma wyrazy $a_1 = ${a1}$ oraz $a_2 = ${a2}$. Oblicz $a_{${n}}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: a${n} = ${num(an)}`] }], answers: [num(an)] },
        steps: [
          { text: `Iloraz ciągu: $q = \\dfrac{a_2}{a_1} = {}$.`, blank: tnum(q) },
          { text: `$a_{${n}} = a_1 \\cdot q^{${n - 1}} = ${a1} \\cdot (${q})^{${n - 1}} = {}$.`, blank: tnum(an) },
        ],
        answer: num(an),
      };
    },
  },
  {
    id: 'odcinek-srodek',
    subjectId: 'mat-p',
    topic: 'geometria-analityczna',
    name: 'Środek odcinka',
    make: (r) => {
      const sx = r.int(-6, 6);
      const sy = r.int(-6, 6);
      const ax = r.int(-8, 8);
      const ay = r.int(-8, 8);
      const bx = 2 * sx - ax;
      const by = 2 * sy - ay;
      return {
        maxPoints: 1,
        question: `Punkty $A = (${ax}, ${ay})$ i $B = (${bx}, ${by})$ są końcami odcinka $AB$. Wyznacz współrzędne środka $S$ tego odcinka.`,
        key: { levels: [{ points: 1, alts: [`współrzędne środka: S = (${sx},${sy})`] }] },
        steps: [
          { text: `$x_S = \\dfrac{${ax} + (${bx})}{2} = {}$.`, blank: tnum(sx) },
          { text: `$y_S = \\dfrac{${ay} + (${by})}{2} = {}$.`, blank: tnum(sy) },
          { text: `$S = (${sx}, ${sy})$.` },
        ],
        answer: `S = (${sx}, ${sy})`,
      };
    },
  },
  {
    id: 'odcinek-dlugosc',
    subjectId: 'mat-p',
    topic: 'geometria-analityczna',
    name: 'Długość odcinka',
    make: (r) => {
      const ax = r.int(-6, 6);
      const ay = r.int(-6, 6);
      const dx = r.nz(-7, 7);
      const dy = r.nz(-7, 7);
      const bx = ax + dx;
      const by = ay + dy;
      const s = dx * dx + dy * dy;
      const root = Math.sqrt(s);
      const res = Number.isInteger(root) ? String(root) : `√${s}`;
      return {
        maxPoints: 1,
        question: `Oblicz długość odcinka o końcach $A = (${ax}, ${ay})$ i $B = (${bx}, ${by})$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie długości: |AB| = ${res}`] }] },
        steps: [
          { text: `$|AB| = \\sqrt{(${bx} - (${ax}))^2 + (${by} - (${ay}))^2} = \\sqrt{${dx * dx} + ${dy * dy}} = \\sqrt{{}}$.`, blank: String(s) },
          { text: `$|AB| = ${Number.isInteger(root) ? root : `\\sqrt{${s}}`}$.` },
        ],
        answer: `|AB| = ${res}`,
      };
    },
  },
  {
    id: 'prosta-rownolegla',
    subjectId: 'mat-p',
    topic: 'geometria-analityczna',
    name: 'Prosta równoległa',
    make: (r) => {
      const a = r.nz(-4, 4);
      const b0 = r.int(-6, 6);
      const px = r.int(-5, 5);
      const py = r.int(-8, 8);
      const b = py - a * px;
      return {
        maxPoints: 1,
        question: `Wyznacz równanie prostej równoległej do prostej $y = ${lin(a, b0)}$ i przechodzącej przez punkt $P = (${px}, ${py})$. Zapisz je w postaci $y = ax + b$.`,
        key: { levels: [{ points: 1, alts: [`równanie prostej: y = ${a}x + ${b}`] }] },
        steps: [
          { text: `Proste równoległe mają ten sam współczynnik kierunkowy: $a = {}$.`, blank: tnum(a) },
          { text: `Punkt $P$ leży na prostej: $${py} = ${a} \\cdot (${px}) + b$, więc $b = {}$.`, blank: tnum(b) },
          { text: `$y = ${lin(a, b)}$.` },
        ],
        answer: `y = ${lin(a, b)}`,
      };
    },
  },
  {
    id: 'rownanie-okregu',
    subjectId: 'mat-p',
    topic: 'geometria-analityczna',
    name: 'Równanie okręgu',
    make: (r) => {
      const a = r.int(-6, 6);
      const b = r.int(-6, 6);
      const rad = r.int(2, 7);
      const xs = a === 0 ? 'x^2' : `(x ${sgn(-a)})^2`;
      const ys = b === 0 ? 'y^2' : `(y ${sgn(-b)})^2`;
      return {
        maxPoints: 1,
        question: `Zapisz równanie okręgu o środku $S = (${a}, ${b})$ i promieniu $r = ${rad}$.`,
        key: { levels: [{ points: 1, alts: [`równanie okręgu: (x - ${a})^2 + (y - ${b})^2 = ${rad * rad}`] }] },
        steps: [
          { text: 'Równanie okręgu: $(x - a)^2 + (y - b)^2 = r^2$, gdzie $(a, b)$ to środek.' },
          { text: `$${xs} + ${ys} = {}$.`, blank: String(rad * rad) },
        ],
        answer: `${xs.replace(/\^2/g, '²')} + ${ys.replace(/\^2/g, '²')} = ${rad * rad}`,
      };
    },
  },
  {
    id: 'wierzcholek-paraboli',
    subjectId: 'mat-p',
    topic: 'kwadratowa-parametr',
    name: 'Wierzchołek paraboli',
    make: (r) => {
      const a = r.nz(-3, 3);
      const p = r.int(-5, 5);
      const q = r.int(-8, 8);
      const b = -2 * a * p;
      const c = a * p * p + q;
      return {
        maxPoints: 1,
        question: `Wyznacz współrzędne wierzchołka paraboli $y = ${coef(a)}x^2 ${b === 0 ? '' : `${sgn(b)}x`} ${c === 0 ? '' : sgn(c)}$.`,
        key: { levels: [{ points: 1, alts: [`współrzędne wierzchołka: W = (${p},${q})`] }] },
        steps: [
          { text: `$p = \\dfrac{-b}{2a} = \\dfrac{${-b}}{${2 * a}} = {}$.`, blank: tnum(p) },
          { text: `$q = f(p) = f(${p}) = {}$.`, blank: tnum(q) },
          { text: `$W = (${p}, ${q})$.` },
        ],
        answer: `W = (${p}, ${q})`,
      };
    },
  },
  {
    id: 'statystyka-srednia',
    subjectId: 'mat-p',
    topic: 'prawdopodobienstwo',
    name: 'Średnia i mediana',
    make: (r) => {
      const n = r.pick([6, 7, 8]);
      const xs = Array.from({ length: n }, () => r.int(1, 9));
      const sum = xs.reduce((a, b) => a + b, 0);
      const mean = frac(sum, n);
      const s = [...xs].sort((a, b) => a - b);
      const med = n % 2 ? frac(s[(n - 1) / 2], 1) : frac(s[n / 2 - 1] + s[n / 2], 2);
      const askMean = r.pick([true, false]);
      const res = askMean ? mean : med;
      return {
        maxPoints: 1,
        question: `Dany jest zestaw danych: ${xs.join(', ')}. Oblicz ${askMean ? 'średnią arytmetyczną' : 'medianę'} tego zestawu.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${res.key}`] }], answers: [res.key] },
        steps: askMean
          ? [
              { text: `Suma danych: ${xs.join(' + ')} = {}.`, blank: String(sum) },
              { text: `Średnia: $\\dfrac{${sum}}{${n}} = {}$.`, blank: mean.key },
            ]
          : [
              { text: `Porządkujemy dane rosnąco: ${s.join(', ')}.` },
              { text: n % 2 ? `Liczba danych jest nieparzysta, mediana to środkowa wartość: {}.` : `Liczba danych jest parzysta, mediana to średnia dwóch środkowych: $\\dfrac{${s[n / 2 - 1]} + ${s[n / 2]}}{2} = {}$.`, blank: med.key },
            ],
        answer: res.key,
      };
    },
  },
  // ---------- rozszerzenie ----------
  {
    id: 'r-logarytm-podstawa',
    subjectId: 'mat-r',
    topic: 'logarytmy',
    name: 'Logarytmy: zamiana podstawy',
    make: (r) => {
      const g = r.pick([2, 3, 5]);
      const m = r.int(1, 3);
      const k = r.int(1, 5);
      const b = g ** m;
      const x = g ** k;
      const v = frac(k, m);
      return {
        maxPoints: 1,
        question: `Oblicz $\\log_{${b}} ${x}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${v.key}`] }], answers: [v.key] },
        steps: [
          { text: `Zamieniamy podstawę na ${g}: $\\log_{${b}} ${x} = \\dfrac{\\log_{${g}} ${x}}{\\log_{${g}} ${b}} = \\dfrac{${k}}{{}}$.`, blank: String(m) },
          { text: `Wynik: $${v.tex}$.`, blank: v.key },
        ],
        answer: v.key,
      };
    },
  },
  {
    id: 'r-szereg-geometryczny',
    subjectId: 'mat-r',
    topic: 'ciagi',
    name: 'Szereg geometryczny',
    make: (r) => {
      const q = r.pick([frac(1, 2), frac(1, 3), frac(-1, 2), frac(2, 3), frac(1, 4), frac(-1, 3)]);
      const [qp, qq] = q.key.includes('/') ? q.key.split('/').map(Number) : [q.value, 1];
      const a1 = r.int(1, 6) * qq;
      const S = frac(a1 * qq, qq - qp);
      return {
        maxPoints: 2,
        question: `Oblicz sumę szeregu geometrycznego, w którym $a_1 = ${a1}$ i iloraz $q = ${q.tex}$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie sumy: S = ${S.key}`] },
            { points: 1, alts: [`zapisanie warunku zbieżności i wzoru: |q| < 1, S = a1/(1 - q)`] },
          ],
        },
        steps: [
          { text: `$|q| < 1$, więc szereg jest zbieżny i $S = \\dfrac{a_1}{1 - q}$.` },
          { text: `$1 - q = 1 - (${q.tex}) = {}$.`, blank: frac(qq - qp, qq).key },
          { text: `$S = \\dfrac{${a1}}{1 - q} = {}$.`, blank: S.key },
        ],
        answer: `S = ${S.key}`,
      };
    },
  },
  {
    id: 'r-viete',
    subjectId: 'mat-r',
    topic: 'kwadratowa-parametr',
    name: 'Wzory Viète’a',
    make: (r) => {
      const x1 = r.nz(-6, 6);
      const x2 = r.nz(-6, 6);
      const b = -(x1 + x2);
      const c = x1 * x2;
      const sq = x1 * x1 + x2 * x2;
      return {
        maxPoints: 2,
        question: `Równanie $x^2 ${b === 0 ? '' : `${sgn(b)}x`} ${sgn(c)} = 0$ ma dwa rozwiązania $x_1, x_2$. Nie obliczając ich, wyznacz $x_1^2 + x_2^2$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie wartości: ${sq}`] },
            { points: 1, alts: [`zapisanie wzorów Viète’a: x1 + x2 = ${num(-b)} oraz x1x2 = ${num(c)}`] },
          ],
          answers: [String(sq)],
        },
        steps: [
          { text: `Wzory Viète’a: $x_1 + x_2 = -b = {}$`, blank: tnum(-b) },
          { text: `oraz $x_1 x_2 = c = {}$.`, blank: tnum(c) },
          { text: `$x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1x_2 = ${(-b) ** 2} - 2 \\cdot (${c}) = {}$.`, blank: String(sq) },
        ],
        answer: String(sq),
      };
    },
  },
  {
    id: 'r-granica',
    subjectId: 'mat-r',
    topic: 'granice-ciagow',
    name: 'Granica ciągu',
    make: (r) => {
      const a = r.nz(-6, 7);
      const c = r.nz(1, 5);
      const b = r.int(-9, 9);
      const d = r.int(1, 9);
      const e = r.int(-5, 5);
      const g = frac(a, c);
      return {
        maxPoints: 1,
        question: `Oblicz granicę $\\lim\\limits_{n \\to \\infty} \\dfrac{${coef(a)}n^2 ${b === 0 ? '' : `${sgn(b)}n`} + ${d}}{${coef(c)}n^2 ${e === 0 ? '' : `${sgn(e)}n`} + 1}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie granicy: ${g.key}`] }], answers: [g.key] },
        steps: [
          { text: `Dzielimy licznik i mianownik przez $n^2$: wyrazy z $\\tfrac{1}{n}$ i $\\tfrac{1}{n^2}$ dążą do 0.` },
          { text: `Granica to iloraz współczynników przy $n^2$: $\\dfrac{${a}}{${c}} = {}$.`, blank: g.key },
        ],
        answer: g.key,
      };
    },
  },
  {
    id: 'r-pochodna-wartosc',
    subjectId: 'mat-r',
    topic: 'pochodne',
    name: 'Pochodna w punkcie',
    make: (r) => {
      const a = r.nz(-3, 3);
      const b = r.int(-6, 6);
      const c = r.int(-9, 9);
      const x0 = r.int(-3, 3);
      const v = 3 * a * x0 * x0 + 2 * b * x0 + c;
      return {
        maxPoints: 2,
        question: `Funkcja $f$ jest określona wzorem $f(x) = ${coef(a)}x^3 ${b === 0 ? '' : `${sgn(b)}x^2`} ${c === 0 ? '' : `${sgn(c)}x`} + 1$. Oblicz $f'(${x0})$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie: f'(${x0}) = ${num(v)}`] },
            { points: 1, alts: [`wyznaczenie pochodnej: f'(x) = ${3 * a}x^2 ${sgn(2 * b)}x ${sgn(c)}`] },
          ],
        },
        steps: [
          { text: `$f'(x) = ${3 * a}x^2 ${sgn(2 * b)}x ${sgn(c)}$.` },
          { text: `$f'(${x0}) = ${3 * a} \\cdot (${x0})^2 ${sgn(2 * b)} \\cdot (${x0}) ${sgn(c)} = {}$.`, blank: tnum(v) },
        ],
        answer: `f'(${x0}) = ${num(v)}`,
      };
    },
  },
];

export const genById = (id: string) => GENERATORS.find((g) => g.id === id);
export const generatorsFor = (subjectId: string, topic: string) => GENERATORS.filter((g) => g.subjectId === subjectId && g.topic === topic);

/** Wariant: ten sam przy tym samym ziarnie. */
export function makeVariant(g: Generator, seed: number): Variant {
  return { ...g.make(rng(seed * 7919 + g.id.length)), gen: g.id, seed, subjectId: g.subjectId, topic: g.topic };
}

export const variantTaskId = (v: { gen: string; seed: number }) => `gen-${v.gen}-${v.seed}`;
export const genOfTask = (taskId: string) => (taskId.startsWith('gen-') ? taskId.slice(4).replace(/-\d+$/, '') : null);
