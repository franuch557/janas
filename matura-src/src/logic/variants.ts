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
  // ---------- nowe działy: procenty, wielomiany, trygonometria, geometria, kombinatoryka ----------
  {
    id: 'procenty-dwie-zmiany',
    subjectId: 'mat-p',
    topic: 'procenty',
    name: 'Dwie zmiany ceny',
    make: (r) => {
      const x = r.pick([200, 400, 500, 800, 1000]);
      const p = r.pick([10, 20, 25, 50]);
      const q = r.pick([10, 20, 25, 40]);
      const up = Math.round(x * (100 + p)) / 100;
      const fin = Math.round(up * (100 - q)) / 100;
      const dec = (n: number) => String(n).replace('.', ',');
      return {
        maxPoints: 1,
        question: `Cena towaru wynosiła ${x} zł. Najpierw podniesiono ją o ${p}%, a potem obniżono o ${q}%. Oblicz cenę końcową (w zł).`,
        key: { levels: [{ points: 1, alts: [`cena końcowa: ${fin}`] }], answers: [String(fin)] },
        steps: [
          { text: `Po podwyżce o ${p}%: $${x} \\cdot ${dec((100 + p) / 100)} = {}$ zł.`, blank: String(up) },
          { text: `Po obniżce o ${q}%: $${up} \\cdot ${dec((100 - q) / 100)} = {}$ zł.`, blank: String(fin) },
        ],
        answer: `${dec(fin)} zł`,
      };
    },
  },
  {
    id: 'procenty-cena-poczatkowa',
    subjectId: 'mat-p',
    topic: 'procenty',
    name: 'Cena przed obniżką',
    make: (r) => {
      const p = r.pick([10, 20, 25, 40]);
      const x = r.pick([20, 40, 60, 80, 120, 200, 240]) * 5;
      const y = (x * (100 - p)) / 100;
      const m = (100 - p) / 100;
      const dec = (n: number) => String(n).replace('.', ',');
      return {
        maxPoints: 2,
        question: `Po obniżce o ${p}% kurtka kosztuje ${y} zł. Oblicz cenę kurtki przed obniżką.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie ceny początkowej: x = ${x}`] },
            { points: 1, alts: [`ustalenie, że cena po obniżce to ${100 - p}% ceny początkowej: ${m}`] },
          ],
        },
        steps: [
          { text: `Cena po obniżce to ${100 - p}% ceny początkowej, czyli mnożnik $${dec(m)}$: $${dec(m)} \\cdot x = ${y}$. Mnożnik: {}.`, blank: String(m) },
          { text: `$x = \\dfrac{${y}}{${dec(m)}} = {}$ zł.`, blank: String(x) },
        ],
        answer: `x = ${x} zł`,
      };
    },
  },
  {
    id: 'wielomian-reszta',
    subjectId: 'mat-p',
    topic: 'wielomiany',
    name: 'Reszta z dzielenia wielomianu',
    make: (r) => {
      const a = r.int(-3, 3);
      const b = r.int(-6, 6);
      const c = r.int(-9, 9);
      const k = r.nz(-3, 3);
      const v = k ** 3 + a * k * k + b * k + c;
      const poly = `x^3 ${a ? `${sgn(a)}x^2`.replace(/([+-] )1x/, '$1x') : ''} ${b ? `${sgn(b)}x`.replace(/([+-] )1x/, '$1x') : ''} ${c ? sgn(c) : ''}`.replace(/\s+/g, ' ').trim();
      return {
        maxPoints: 1,
        question: `Oblicz resztę z dzielenia wielomianu $W(x) = ${poly}$ przez dwumian $(${lin(1, -k)})$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie reszty: W(${num(k)}) = ${num(v)}`] }], answers: [num(v)] },
        steps: [
          { text: `Reszta z dzielenia przez $(x - a)$ to $W(a)$. Tu $a = {}$.`, blank: tnum(k) },
          { text: `$W(${tnum(k)}) = (${tnum(k)})^3 ${a ? `${Math.abs(a) === 1 ? (a < 0 ? '-' : '+') : `${sgn(a)} \\cdot`} (${tnum(k)})^2` : ''} ${b ? `${Math.abs(b) === 1 ? (b < 0 ? '-' : '+') : `${sgn(b)} \\cdot`} (${tnum(k)})` : ''} ${c ? sgn(c) : ''} = {}$.`, blank: tnum(v) },
        ],
        answer: num(v),
      };
    },
  },
  {
    id: 'wielomian-pierwiastki',
    subjectId: 'mat-p',
    topic: 'wielomiany',
    name: 'Pierwiastki wielomianu',
    make: (r) => {
      const a = r.int(3, 7);
      const b = r.int(3, 8);
      if (a === b) return GENERATORS.find((g) => g.id === 'wielomian-pierwiastki')!.make(r);
      // (x − a)(x² − b²) = x³ − a x² − b² x + a b²
      const poly = `x^3 - ${a}x^2 - ${b * b}x + ${a * b * b}`;
      return {
        maxPoints: 2,
        question: `Wyznacz wszystkie pierwiastki wielomianu $W(x) = ${poly}$.`,
        key: {
          levels: [
            { points: 2, alts: [`wyznaczenie pierwiastków: x = ${a}, x = ${b}, x = −${b}`] },
            { points: 1, alts: [`pogrupowanie wyrazów i wyznaczenie pierwiastka: x = ${a}`] },
          ],
        },
        steps: [
          { text: `Grupujemy: $x^2(x - ${a}) - ${b * b}(x - ${a}) = (x - ${a})(x^2 - ${b * b})$. Pierwszy pierwiastek: $x = {}$.`, blank: String(a) },
          { text: `$x^2 - ${b * b} = (x - ${b})(x + ${b})$, więc kolejne pierwiastki to $x = {}$ i $x = -${b}$.`, blank: String(b) },
        ],
        answer: `x = ${a}, x = ${b}, x = −${b}`,
      };
    },
  },
  {
    id: 'tryg-sinus',
    subjectId: 'mat-p',
    topic: 'trygonometria',
    name: 'Sinus i cosinus w trójkącie prostokątnym',
    make: (r) => {
      const [p, q, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
      const k = r.int(1, 3);
      const fn = r.pick(['sin', 'cos', 'tg']);
      const opp = p * k;
      const adj = q * k;
      const hyp = h * k;
      const v = fn === 'sin' ? frac(p, h) : fn === 'cos' ? frac(q, h) : frac(p, q);
      const name = fn === 'tg' ? '\\operatorname{tg}' : `\\${fn}`;
      return {
        maxPoints: 1,
        question: `W trójkącie prostokątnym przyprostokątne mają długości ${opp} i ${adj}, a przeciwprostokątna ${hyp}. Kąt $\\alpha$ leży naprzeciw boku długości ${opp}. Oblicz $${name}\\alpha$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${v.key}`] }], answers: [v.key] },
        steps: [
          { text: fn === 'sin' ? `$\\sin\\alpha$ = przyprostokątna naprzeciw kąta : przeciwprostokątna = $\\frac{${opp}}{${hyp}}$.` : fn === 'cos' ? `$\\cos\\alpha$ = przyprostokątna przy kącie : przeciwprostokątna = $\\frac{${adj}}{${hyp}}$.` : `$\\operatorname{tg}\\alpha$ = przyprostokątna naprzeciw : przyprostokątna przy kącie = $\\frac{${opp}}{${adj}}$.` },
          { text: `Po skróceniu: {}.`, blank: v.key },
        ],
        answer: v.key,
      };
    },
  },
  {
    id: 'tryg-jedynka',
    subjectId: 'mat-p',
    topic: 'trygonometria',
    name: 'Jedynka trygonometryczna',
    make: (r) => {
      const [p, q, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]);
      const sinV = frac(p, h);
      const cosV = frac(q, h);
      const tg = frac(p, q);
      return {
        maxPoints: 2,
        question: `Kąt $\\alpha$ jest ostry i $\\sin\\alpha = \\frac{${p}}{${h}}$. Oblicz $\\operatorname{tg}\\alpha$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie tangensa: tg α = ${tg.key}`] },
            { points: 1, alts: [`obliczenie cosinusa: cos α = ${cosV.key}`] },
          ],
        },
        steps: [
          { text: `Z jedynki: $\\cos^2\\alpha = 1 - \\left(${sinV.tex}\\right)^2 = \\frac{${h * h - p * p}}{${h * h}}$, kąt ostry, więc $\\cos\\alpha = {}$.`, blank: cosV.key },
          { text: `$\\operatorname{tg}\\alpha = \\dfrac{\\sin\\alpha}{\\cos\\alpha} = \\dfrac{${sinV.tex}}{${cosV.tex}} = {}$.`, blank: tg.key },
        ],
        answer: `tg α = ${tg.key}`,
      };
    },
  },
  {
    id: 'pitagoras',
    subjectId: 'mat-p',
    topic: 'planimetria',
    name: 'Twierdzenie Pitagorasa',
    make: (r) => {
      const [p, q, h] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [7, 24, 25]]);
      const k = r.int(1, 3);
      const askHyp = r.pick([true, false]);
      const [a, b, c] = [p * k, q * k, h * k];
      return {
        maxPoints: 1,
        question: askHyp ? `Przyprostokątne trójkąta prostokątnego mają długości ${a} i ${b}. Oblicz długość przeciwprostokątnej.` : `Przeciwprostokątna trójkąta prostokątnego ma długość ${c}, a jedna z przyprostokątnych ${a}. Oblicz długość drugiej przyprostokątnej.`,
        key: { levels: [{ points: 1, alts: [`obliczenie długości: ${askHyp ? c : b}`] }], answers: [String(askHyp ? c : b)] },
        steps: askHyp
          ? [{ text: `$c^2 = ${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${c * c}$.` }, { text: `$c = \\sqrt{${c * c}} = {}$.`, blank: String(c) }]
          : [{ text: `$b^2 = ${c}^2 - ${a}^2 = ${c * c} - ${a * a} = ${b * b}$.` }, { text: `$b = \\sqrt{${b * b}} = {}$.`, blank: String(b) }],
        answer: String(askHyp ? c : b),
      };
    },
  },
  {
    id: 'pole-trapezu',
    subjectId: 'mat-p',
    topic: 'planimetria',
    name: 'Pole trapezu',
    make: (r) => {
      const a = r.int(4, 14);
      const b = r.int(2, 12);
      const h = r.int(2, 9) * 2;
      const P = ((a + b) * h) / 2;
      return {
        maxPoints: 1,
        question: `Trapez ma podstawy długości ${a} i ${b} oraz wysokość ${h}. Oblicz jego pole.`,
        key: { levels: [{ points: 1, alts: [`obliczenie pola: ${P}`] }], answers: [String(P)] },
        steps: [
          { text: `$P = \\dfrac{(a + b) \\cdot h}{2} = \\dfrac{(${a} + ${b}) \\cdot ${h}}{2}$.` },
          { text: `$P = \\dfrac{${(a + b) * h}}{2} = {}$.`, blank: String(P) },
        ],
        answer: String(P),
      };
    },
  },
  {
    id: 'podobienstwo-pole',
    subjectId: 'mat-p',
    topic: 'podobienstwo',
    name: 'Pole figury podobnej',
    make: (r) => {
      const k = r.int(2, 5);
      const P = r.int(2, 12);
      const ask = r.pick(['pole', 'obwód']);
      const O = r.int(5, 20);
      const res = ask === 'pole' ? P * k * k : O * k;
      return {
        maxPoints: 1,
        question: ask === 'pole' ? `Trójkąty $ABC$ i $A'B'C'$ są podobne w skali $k = ${k}$ (większy to $A'B'C'$). Pole trójkąta $ABC$ wynosi ${P}. Oblicz pole trójkąta $A'B'C'$.` : `Trójkąty $ABC$ i $A'B'C'$ są podobne w skali $k = ${k}$ (większy to $A'B'C'$). Obwód trójkąta $ABC$ wynosi ${O}. Oblicz obwód trójkąta $A'B'C'$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${res}`] }], answers: [String(res)] },
        steps:
          ask === 'pole'
            ? [{ text: `Pole zmienia się o kwadrat skali: $k^2 = {}$.`, blank: String(k * k) }, { text: `$${P} \\cdot ${k * k} = {}$.`, blank: String(res) }]
            : [{ text: `Obwód zmienia się tak jak boki – o skalę $k = ${k}$.` }, { text: `$${O} \\cdot ${k} = {}$.`, blank: String(res) }],
        answer: String(res),
      };
    },
  },
  {
    id: 'okrag-kat-wpisany',
    subjectId: 'mat-p',
    topic: 'okrag',
    name: 'Kąt wpisany i środkowy',
    make: (r) => {
      const alpha = r.int(12, 80);
      const askIns = r.pick([true, false]);
      return {
        maxPoints: 1,
        question: askIns ? `Kąt środkowy oparty na łuku $AB$ ma miarę $${2 * alpha}^\\circ$. Oblicz miarę kąta wpisanego opartego na tym samym łuku.` : `Kąt wpisany oparty na łuku $AB$ ma miarę $${alpha}^\\circ$. Oblicz miarę kąta środkowego opartego na tym samym łuku.`,
        key: { levels: [{ points: 1, alts: [`obliczenie kąta: ${askIns ? alpha : 2 * alpha}`] }], answers: [String(askIns ? alpha : 2 * alpha)] },
        steps: [
          { text: `Kąt środkowy jest dwa razy większy od kąta wpisanego opartego na tym samym łuku.` },
          { text: askIns ? `$${2 * alpha}^\\circ : 2 = {}^\\circ$.` : `$2 \\cdot ${alpha}^\\circ = {}^\\circ$.`, blank: String(askIns ? alpha : 2 * alpha) },
        ],
        answer: `${askIns ? alpha : 2 * alpha}°`,
      };
    },
  },
  {
    id: 'prostopadloscian-przekatna',
    subjectId: 'mat-p',
    topic: 'stereometria',
    name: 'Przekątna prostopadłościanu',
    make: (r) => {
      const [a, b, c, d] = r.pick([[2, 3, 6, 7], [1, 4, 8, 9], [2, 6, 9, 11], [4, 4, 7, 9], [6, 6, 7, 11], [2, 10, 11, 15]]);
      const k = r.int(1, 2);
      return {
        maxPoints: 1,
        question: `Krawędzie prostopadłościanu mają długości ${a * k}, ${b * k} i ${c * k}. Oblicz długość przekątnej tego prostopadłościanu.`,
        key: { levels: [{ points: 1, alts: [`obliczenie przekątnej: ${d * k}`] }], answers: [String(d * k)] },
        steps: [
          { text: `$d = \\sqrt{a^2 + b^2 + c^2} = \\sqrt{${a * a * k * k} + ${b * b * k * k} + ${c * c * k * k}} = \\sqrt{${d * d * k * k}}$.` },
          { text: `$d = {}$.`, blank: String(d * k) },
        ],
        answer: String(d * k),
      };
    },
  },
  {
    id: 'ostroslup-objetosc',
    subjectId: 'mat-p',
    topic: 'stereometria',
    name: 'Objętość ostrosłupa',
    make: (r) => {
      const a = r.int(2, 10);
      const H = r.int(1, 6) * 3;
      const Pp = a * a;
      const V = (Pp * H) / 3;
      return {
        maxPoints: 2,
        question: `Ostrosłup prawidłowy czworokątny ma krawędź podstawy ${a} i wysokość ${H}. Oblicz jego objętość.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie objętości: V = ${V}`] },
            { points: 1, alts: [`obliczenie pola podstawy: Pp = ${Pp}`] },
          ],
        },
        steps: [
          { text: `Podstawa to kwadrat: $P_p = ${a}^2 = {}$.`, blank: String(Pp) },
          { text: `$V = \\frac13 P_p \\cdot H = \\frac13 \\cdot ${Pp} \\cdot ${H} = {}$.`, blank: String(V) },
        ],
        answer: `V = ${V}`,
      };
    },
  },
  {
    id: 'kombinatoryka-liczby',
    subjectId: 'mat-p',
    topic: 'kombinatoryka',
    name: 'Ile jest liczb',
    make: (r) => {
      const k = r.pick([3, 4]);
      const kind = r.pick(['nieparzyste', 'nieparzyste-rozne', 'parzyste', 'rozne']);
      // nieparzyste: 5^k; nieparzyste różne: 5·4·3(·2); parzyste (cyfry 0,2,4,6,8): 4·5^(k−1); różne cyfry: 9·9·8(·7)
      const res =
        kind === 'nieparzyste' ? 5 ** k : kind === 'nieparzyste-rozne' ? (k === 3 ? 60 : 120) : kind === 'parzyste' ? 4 * 5 ** (k - 1) : k === 3 ? 648 : 4536;
      const opis = { nieparzyste: 'których wszystkie cyfry są nieparzyste', 'nieparzyste-rozne': 'których cyfry są nieparzyste i różne', parzyste: 'których wszystkie cyfry są parzyste', rozne: 'o różnych cyfrach' }[kind] ?? '';
      const words = k === 3 ? 'trzycyfrowych' : 'czterocyfrowych';
      const first = kind === 'parzyste' ? '4 (bez zera)' : kind === 'rozne' ? '9 (bez zera)' : '5';
      const rest =
        kind === 'nieparzyste' ? Array(k - 1).fill(5).join(' \\cdot ') : kind === 'nieparzyste-rozne' ? [4, 3, 2].slice(0, k - 1).join(' \\cdot ') : kind === 'parzyste' ? Array(k - 1).fill(5).join(' \\cdot ') : [9, 8, 7].slice(0, k - 1).join(' \\cdot ');
      return {
        maxPoints: 1,
        question: `Ile jest liczb ${words}${opis.startsWith('o ') ? ' ' : ', '}${opis}?`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${res}`] }], answers: [String(res)] },
        steps: [
          { text: `Pierwsza cyfra: ${first} możliwości.` },
          { text: `Kolejne cyfry: $${rest}$ możliwości. Reguła mnożenia: $${first.split(' ')[0]} \\cdot ${rest} = {}$.`, blank: String(res) },
        ],
        answer: String(res),
      };
    },
  },
  {
    id: 'kombinatoryka-pary',
    subjectId: 'mat-p',
    topic: 'kombinatoryka',
    name: 'Wybór bez kolejności',
    make: (r) => {
      const n = r.int(6, 20);
      const k = r.pick([2, 2, 3]);
      const res = k === 2 ? (n * (n - 1)) / 2 : (n * (n - 1) * (n - 2)) / 6;
      return {
        maxPoints: 1,
        question: k === 2 ? `Na turnieju jest ${n} drużyn. Każda gra z każdą dokładnie jeden mecz. Ile meczów zostanie rozegranych?` : `Z klasy liczącej ${n} osób wybieramy trzyosobową delegację. Na ile sposobów można to zrobić?`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${res}`] }], answers: [String(res)] },
        steps: [
          { text: `Kolejność nie ma znaczenia, więc liczymy kombinacje $\\binom{${n}}{${k}}$.` },
          { text: k === 2 ? `$\\binom{${n}}{2} = \\dfrac{${n} \\cdot ${n - 1}}{2} = {}$.` : `$\\binom{${n}}{3} = \\dfrac{${n} \\cdot ${n - 1} \\cdot ${n - 2}}{6} = {}$.`, blank: String(res) },
        ],
        answer: String(res),
      };
    },
  },
  {
    id: 'kostki-suma',
    subjectId: 'mat-p',
    topic: 'prawdopodobienstwo',
    name: 'Dwie kostki – suma oczek',
    make: (r) => {
      const s = r.int(3, 11);
      const cnt = 6 - Math.abs(7 - s);
      const P = frac(cnt, 36);
      return {
        maxPoints: 2,
        question: `Rzucamy dwa razy symetryczną sześcienną kostką do gry. Oblicz prawdopodobieństwo, że suma wyrzuconych oczek będzie równa ${s}.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie prawdopodobieństwa: P(A) = ${P.key}`] },
            { points: 1, alts: [`obliczenie liczby zdarzeń sprzyjających: ${cnt}`] },
          ],
        },
        steps: [
          { text: `Wszystkich wyników jest $6 \\cdot 6 = 36$. Sumę ${s} daje {} par.`, blank: String(cnt) },
          { text: `$P(A) = \\dfrac{${cnt}}{36} = {}$.`, blank: P.key },
        ],
        answer: `P(A) = ${P.key}`,
      };
    },
  },
  {
    id: 'wartosc-nierownosc-calkowite',
    subjectId: 'mat-p',
    topic: 'wartosc-bezwzgledna',
    name: 'Nierówność z wartością bezwzględną',
    make: (r) => {
      const a = r.int(-6, 6);
      const b = r.int(2, 7);
      const strict = r.pick([true, false]);
      const cnt = strict ? 2 * b - 1 : 2 * b + 1;
      const xa = a === 0 ? 'x' : `x ${sgn(-a)}`;
      return {
        maxPoints: 1,
        question: `Ile liczb całkowitych spełnia nierówność $|${xa}| ${strict ? '<' : '\\le'} ${b}$?`,
        key: { levels: [{ points: 1, alts: [`obliczenie liczby rozwiązań: ${cnt}`] }], answers: [String(cnt)] },
        steps: [
          { text: `$${a - b} ${strict ? '<' : '\\le'} x ${strict ? '<' : '\\le'} ${a + b}$ – liczby odległe od $${a}$ o ${strict ? 'mniej niż' : 'co najwyżej'} ${b}.` },
          { text: `Liczb całkowitych w tym przedziale jest {}.`, blank: String(cnt) },
        ],
        answer: String(cnt),
      };
    },
  },
  // ---------- poziom rozszerzony ----------
  {
    id: 'r-styczna',
    subjectId: 'mat-r',
    topic: 'pochodne',
    name: 'Równanie stycznej',
    make: (r) => {
      const a = r.nz(-2, 3);
      const b = r.int(-5, 5);
      const c = r.int(-6, 6);
      const x0 = r.nz(-3, 3);
      const y0 = a * x0 * x0 + b * x0 + c;
      const m = 2 * a * x0 + b;
      const k = y0 - m * x0;
      if (Math.abs(m) < 2 || Math.abs(y0) < 3) return GENERATORS.find((g) => g.id === 'r-styczna')!.make(r);
      const f = `${coef(a)}x^2 ${b ? `${sgn(b)}x`.replace(/([+-] )1x/, '$1x') : ''} ${c ? sgn(c) : ''}`.replace(/\s+/g, ' ').trim();
      const line = `y = ${m === 0 ? '' : `${coef(m)}x`}${m === 0 ? num(k) : k === 0 ? '' : ` ${sgn(k)}`}`.replace('−', '-');
      return {
        maxPoints: 2,
        question: `Wyznacz równanie stycznej do wykresu funkcji $f(x) = ${f}$ w punkcie o pierwszej współrzędnej $x_0 = ${x0}$.`,
        key: {
          levels: [
            { points: 2, alts: [`równanie stycznej: ${line}`] },
            { points: 1, alts: [`obliczenie współczynnika kierunkowego: f'(${x0}) = ${num(m)}`] },
          ],
        },
        steps: [
          { text: `$f(${x0}) = {}$ – punkt styczności $(${x0}, ${tnum(y0)})$.`, blank: tnum(y0) },
          { text: `$f'(x) = ${2 * a}x ${b ? sgn(b) : ''}$, więc $f'(${x0}) = {}$.`, blank: tnum(m) },
          { text: `$y = f'(x_0)(x - x_0) + f(x_0) = ${tnum(m)}(x - (${x0})) + (${tnum(y0)})$, czyli {}.`, blank: line },
        ],
        answer: line,
      };
    },
  },
  {
    id: 'r-ekstremum',
    subjectId: 'mat-r',
    topic: 'pochodne',
    name: 'Ekstremum funkcji',
    make: (r) => {
      const p = r.int(2, 4);
      const c = r.int(-10, 10);
      const askMin = r.pick([true, false]);
      // f(x) = x³ − 3p²x + c: maksimum w −p, minimum w p
      const x = askMin ? p : -p;
      const v = x ** 3 - 3 * p * p * x + c;
      if (Math.abs(v) < 3) return GENERATORS.find((g) => g.id === 'r-ekstremum')!.make(r);
      return {
        maxPoints: 2,
        question: `Wyznacz ${askMin ? 'minimum lokalne' : 'maksimum lokalne'} funkcji $f(x) = x^3 - ${3 * p * p}x ${c ? sgn(c) : ''}$ (podaj wartość funkcji w tym punkcie).`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie ${askMin ? 'minimum' : 'maksimum'}: f(${num(x)}) = ${num(v)}`] },
            { points: 1, alts: [`wyznaczenie miejsc zerowych pochodnej: x = ${p}, x = −${p}`] },
          ],
        },
        steps: [
          { text: `$f'(x) = 3x^2 - ${3 * p * p} = 3(x - ${p})(x + ${p})$, miejsca zerowe: $x = -${p}$ i $x = {}$.`, blank: String(p) },
          { text: `Pochodna zmienia znak z $+$ na $-$ w $x = -${p}$ (maksimum), z $-$ na $+$ w $x = ${p}$ (minimum).` },
          { text: `$f(${tnum(x)}) = (${tnum(x)})^3 - ${3 * p * p} \\cdot (${tnum(x)}) ${c ? sgn(c) : ''} = {}$.`, blank: tnum(v) },
        ],
        answer: `f(${num(x)}) = ${num(v)}`,
      };
    },
  },
  {
    id: 'r-pochodna-ilorazu',
    subjectId: 'mat-r',
    topic: 'pochodne',
    name: 'Pochodna ilorazu',
    make: (r) => {
      const a = r.nz(-4, 4);
      const b = r.int(-6, 6);
      const c = r.nz(-4, 4);
      if (a * c - b === 0) return GENERATORS.find((g) => g.id === 'r-pochodna-ilorazu')!.make(r);
      let x0 = r.int(-3, 3);
      if (x0 + c === 0) x0 += 1;
      const v = frac(a * c - b, (x0 + c) ** 2);
      return {
        maxPoints: 1,
        question: `Funkcja $f$ jest określona wzorem $f(x) = \\dfrac{${lin(a, b)}}{${lin(1, c)}}$ dla $x \\neq ${-c}$. Oblicz $f'(${x0})$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie: ${v.key}`] }], answers: [v.key] },
        steps: [
          { text: `$f'(x) = \\dfrac{${a}(${lin(1, c)}) - (${lin(a, b)}) \\cdot 1}{(${lin(1, c)})^2} = \\dfrac{${a * c - b}}{(${lin(1, c)})^2}$.` },
          { text: `$f'(${x0}) = \\dfrac{${a * c - b}}{${(x0 + c) ** 2}} = {}$.`, blank: v.key },
        ],
        answer: v.key,
      };
    },
  },
  {
    id: 'r-optymalizacja-plot',
    subjectId: 'mat-r',
    topic: 'pochodne',
    name: 'Optymalizacja – największe pole',
    make: (r) => {
      const L = r.int(3, 15) * 4;
      const x = L / 4;
      const P = (L * L) / 8;
      return {
        maxPoints: 3,
        question: `Z siatki o długości ${L} m trzeba ogrodzić prostokątny wybieg przy ścianie budynku (ściana tworzy jeden bok, siatka – trzy pozostałe). Oblicz wymiary wybiegu o największym polu i to pole.`,
        key: {
          levels: [
            { points: 3, alts: [`obliczenie największego pola: P = ${P}`] },
            { points: 2, alts: [`wyznaczenie wymiarów: x = ${x}, ${L - 2 * x}`] },
            { points: 1, alts: [`wyznaczenie argumentu, w którym pochodna jest równa zero: x = ${x}`] },
          ],
        },
        steps: [
          { text: `Boki prostopadłe do ściany: $x$, bok równoległy: $${L} - 2x$. Pole: $P(x) = x(${L} - 2x) = ${L}x - 2x^2$, $x \\in (0, ${L / 2})$.` },
          { text: `$P'(x) = ${L} - 4x = 0$ dla $x = {}$; pochodna zmienia znak z $+$ na $-$, więc to maksimum.`, blank: String(x) },
          { text: `Wymiary: $${x}$ m i $${L - 2 * x}$ m, pole $P = ${x} \\cdot ${L - 2 * x} = {}$ m².`, blank: String(P) },
        ],
        answer: `${x} m × ${L - 2 * x} m, P = ${P} m²`,
      };
    },
  },
  {
    id: 'r-granica-sprzezenie',
    subjectId: 'mat-r',
    topic: 'granice-ciagow',
    name: 'Granica z pierwiastkiem',
    make: (r) => {
      const a = r.int(1, 7) * 2;
      const v = a / 2;
      return {
        maxPoints: 1,
        question: `Oblicz granicę $\\lim\\limits_{n \\to \\infty} \\left(\\sqrt{n^2 + ${a}n} - n\\right)$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie granicy: ${v}`] }], answers: [String(v)] },
        steps: [
          { text: `Mnożymy przez sprzężenie: $\\dfrac{n^2 + ${a}n - n^2}{\\sqrt{n^2 + ${a}n} + n} = \\dfrac{${a}n}{\\sqrt{n^2 + ${a}n} + n}$.` },
          { text: `Dzielimy przez $n$: $\\dfrac{${a}}{\\sqrt{1 + \\frac{${a}}{n}} + 1} \\to \\dfrac{${a}}{2} = {}$.`, blank: String(v) },
        ],
        answer: String(v),
      };
    },
  },
  {
    id: 'r-granica-potegi',
    subjectId: 'mat-r',
    topic: 'granice-ciagow',
    name: 'Granica z potęgami',
    make: (r) => {
      const p = r.int(3, 6);
      const q = r.int(2, p - 1);
      const k = r.int(1, 3);
      // (p^(n+k) + q^n) / (p^n + q^(n+1)) → p^k
      const v = p ** k;
      return {
        maxPoints: 1,
        question: `Oblicz granicę $\\lim\\limits_{n \\to \\infty} \\dfrac{${p}^{n+${k}} + ${q}^{n}}{${p}^{n} + ${q}^{n+1}}$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie granicy: ${v}`] }], answers: [String(v)] },
        steps: [
          { text: `Dzielimy licznik i mianownik przez $${p}^n$: $\\dfrac{${p}^{${k}} + \\left(\\frac{${q}}{${p}}\\right)^n}{1 + ${q}\\left(\\frac{${q}}{${p}}\\right)^n}$.` },
          { text: `$\\left(\\frac{${q}}{${p}}\\right)^n \\to 0$, więc granica to $${p}^{${k}} = {}$.`, blank: String(v) },
        ],
        answer: String(v),
      };
    },
  },
  {
    id: 'r-dwie-wartosci',
    subjectId: 'mat-r',
    topic: 'wartosc-bezwzgledna',
    name: 'Równanie z dwiema wartościami bezwzględnymi',
    make: (r) => {
      const a = r.int(-5, 3);
      const d = r.int(1, 6);
      const b = a + d;
      const c = d + 2 * r.int(1, 4);
      // |x − a| + |x − b| = c, c > b − a: x = (a + b ± c) / 2
      const x1 = (a + b - c) / 2;
      const x2 = (a + b + c) / 2;
      if (!Number.isInteger(x1)) return GENERATORS.find((g) => g.id === 'r-dwie-wartosci')!.make(r);
      const ab = (v: number) => (v === 0 ? 'x' : `x ${sgn(-v)}`);
      return {
        maxPoints: 3,
        question: `Rozwiąż równanie $|${ab(a)}| + |${ab(b)}| = ${c}$.`,
        key: {
          levels: [
            { points: 3, alts: [`wyznaczenie wszystkich rozwiązań: x = ${num(x1)}, x = ${num(x2)}`] },
            { points: 2, alts: [`wyznaczenie jednego rozwiązania: x = ${num(x2)}`] },
            { points: 1, alts: [`podział na przedziały wyznaczone przez ${num(a)} i ${num(b)}`] },
          ],
        },
        steps: [
          { text: `Punkty $x = ${a}$ i $x = ${b}$ dzielą oś na trzy przedziały.` },
          { text: `Dla $x < ${a}$: $-(${ab(a)}) - (${ab(b)}) = ${c}$, czyli $-2x ${sgn(a + b)} = ${c}$, $x = {}$ (należy do przedziału).`, blank: tnum(x1) },
          { text: `Dla $${a} \\le x \\le ${b}$: wychodzi $${d} = ${c}$ – sprzeczność.` },
          { text: `Dla $x > ${b}$: $2x ${sgn(-(a + b))} = ${c}$, $x = {}$.`, blank: tnum(x2) },
        ],
        answer: `x = ${num(x1)}, x = ${num(x2)}`,
      };
    },
  },
  {
    id: 'r-wielomian-parametr',
    subjectId: 'mat-r',
    topic: 'wielomiany',
    name: 'Wielomian z parametrem',
    make: (r) => {
      const k = r.nz(-3, 3);
      const m = r.pick([-7, -6, -5, -4, -3, 3, 4, 5, 6, 7]);
      const b = r.int(-6, 6);
      const c = -(k ** 3 + m * k * k + b * k);
      const free = k ** 3 + b * k + c;
      return {
        maxPoints: 2,
        question: `Wielomian $W(x) = x^3 + mx^2 ${b ? `${sgn(b)}x`.replace(/([+-] )1x/, '$1x') : ''} ${c ? sgn(c) : ''}$ jest podzielny przez dwumian $(${lin(1, -k)})$. Oblicz $m$.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie parametru: m = ${num(m)}`] },
            { points: 1, alts: [`zapisanie warunku W(${num(k)}) = 0: ${k * k}m ${sgn(free)} = 0`] },
          ],
        },
        steps: [
          { text: `Podzielność przez $(${lin(1, -k)})$ oznacza $W(${k}) = 0$.` },
          { text: `$(${k})^3 + m \\cdot (${k})^2 ${b ? `${sgn(b)} \\cdot (${k})` : ''} ${c ? sgn(c) : ''} = 0$, czyli $${k * k}m ${sgn(free)} = 0$, więc $m = {}$.`, blank: tnum(m) },
        ],
        answer: `m = ${num(m)}`,
      };
    },
  },
  {
    id: 'r-tryg-rownanie',
    subjectId: 'mat-r',
    topic: 'trygonometria',
    name: 'Równanie trygonometryczne',
    make: (r) => {
      const forms = [
        { eq: '2\\sin^2 x - \\sin x = 0', sol: ['0', '\\frac{\\pi}{6}', '\\frac{5\\pi}{6}', '\\pi', '2\\pi'], hint: '$\\sin x(2\\sin x - 1) = 0$: $\\sin x = 0$ albo $\\sin x = \\frac12$.' },
        { eq: '2\\cos^2 x - \\cos x = 0', sol: ['\\frac{\\pi}{3}', '\\frac{\\pi}{2}', '\\frac{3\\pi}{2}', '\\frac{5\\pi}{3}'], hint: '$\\cos x(2\\cos x - 1) = 0$: $\\cos x = 0$ albo $\\cos x = \\frac12$.' },
        { eq: '2\\sin^2 x = 1', sol: ['\\frac{\\pi}{4}', '\\frac{3\\pi}{4}', '\\frac{5\\pi}{4}', '\\frac{7\\pi}{4}'], hint: '$\\sin^2 x = \\frac12$: $\\sin x = \\frac{\\sqrt2}{2}$ albo $\\sin x = -\\frac{\\sqrt2}{2}$.' },
        { eq: '\\sin x \\cos x = 0', sol: ['0', '\\frac{\\pi}{2}', '\\pi', '\\frac{3\\pi}{2}', '2\\pi'], hint: '$\\sin x = 0$ albo $\\cos x = 0$.' },
        { eq: '\\operatorname{tg}^2 x = 3', sol: ['\\frac{\\pi}{3}', '\\frac{2\\pi}{3}', '\\frac{4\\pi}{3}', '\\frac{5\\pi}{3}'], hint: '$\\operatorname{tg} x = \\sqrt3$ albo $\\operatorname{tg} x = -\\sqrt3$.' },
      ];
      const f = r.pick(forms);
      const n = f.sol.length;
      return {
        maxPoints: 2,
        question: `Ile rozwiązań ma równanie $${f.eq}$ w przedziale $[0, 2\\pi]$?`,
        key: {
          levels: [
            { points: 2, alts: [`podanie liczby rozwiązań: ${n}`] },
            { points: 1, alts: ['sprowadzenie równania do równań elementarnych'] },
          ],
          answers: [String(n)],
        },
        steps: [
          { text: f.hint },
          { text: `Rozwiązania w $[0, 2\\pi]$: $${f.sol.join(',\\ ')}$ – jest ich {}.`, blank: String(n) },
        ],
        answer: String(n),
      };
    },
  },
  {
    id: 'r-bernoulli',
    subjectId: 'mat-r',
    topic: 'prawdopodobienstwo',
    name: 'Schemat Bernoulliego',
    make: (r) => {
      const n = r.int(4, 8);
      const k = r.int(1, n - 1);
      let C = 1;
      for (let i = 0; i < k; i++) C = (C * (n - i)) / (i + 1);
      const P = frac(C, 2 ** n);
      return {
        maxPoints: 2,
        question: `Rzucamy ${n} razy symetryczną monetą. Oblicz prawdopodobieństwo, że orzeł wypadnie dokładnie ${k} ${k === 1 ? 'raz' : 'razy'}.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie prawdopodobieństwa: P = ${P.key}`] },
            { points: 1, alts: [`obliczenie liczby sposobów: ${C}`] },
          ],
        },
        steps: [
          { text: `Schemat Bernoulliego: $P = \\binom{${n}}{${k}} \\cdot \\left(\\frac12\\right)^{${n}}$. Liczba sposobów: $\\binom{${n}}{${k}} = {}$.`, blank: String(C) },
          { text: `$P = \\dfrac{${C}}{${2 ** n}} = {}$.`, blank: P.key },
        ],
        answer: `P = ${P.key}`,
      };
    },
  },
  {
    id: 'r-warunkowe',
    subjectId: 'mat-r',
    topic: 'prawdopodobienstwo',
    name: 'Prawdopodobieństwo warunkowe',
    make: (r) => {
      const s = r.int(7, 10);
      // A: suma oczek ≥ s, B: na pierwszej kostce wypadła liczba parzysta
      let ab = 0;
      for (let x = 2; x <= 6; x += 2) for (let y = 1; y <= 6; y++) if (x + y >= s) ab++;
      const P = frac(ab, 18);
      return {
        maxPoints: 2,
        question: `Rzucamy dwa razy kostką. Oblicz prawdopodobieństwo, że suma oczek będzie co najmniej ${s}, jeśli wiadomo, że w pierwszym rzucie wypadła liczba parzysta.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie prawdopodobieństwa warunkowego: P(A|B) = ${P.key}`] },
            { points: 1, alts: [`obliczenie liczby zdarzeń A∩B: ${ab}`] },
          ],
        },
        steps: [
          { text: `$B$ – pierwsza liczba parzysta: $|B| = 3 \\cdot 6 = 18$.` },
          { text: `$A \\cap B$ – pierwsza parzysta i suma co najmniej ${s}: {} wyników.`, blank: String(ab) },
          { text: `$P(A|B) = \\dfrac{|A \\cap B|}{|B|} = \\dfrac{${ab}}{18} = {}$.`, blank: P.key },
        ],
        answer: `P(A|B) = ${P.key}`,
      };
    },
  },
  {
    id: 'r-odleglosc-punktu',
    subjectId: 'mat-r',
    topic: 'geometria-analityczna',
    name: 'Odległość punktu od prostej',
    make: (r) => {
      const [A, B, N] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [5, 12, 13], [12, 5, 13], [8, 6, 10]]);
      const d = r.int(1, 5);
      const x0 = r.int(-4, 4);
      const y0 = r.int(-4, 4);
      const sign = r.pick([1, -1]);
      const C = sign * d * N - A * x0 - B * y0;
      return {
        maxPoints: 1,
        question: `Oblicz odległość punktu $P = (${x0}, ${y0})$ od prostej $${A}x + ${B}y ${C ? sgn(C) : ''} = 0$.`,
        key: { levels: [{ points: 1, alts: [`obliczenie odległości: ${d}`] }], answers: [String(d)] },
        steps: [
          { text: `$d = \\dfrac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}} = \\dfrac{|${A} \\cdot (${x0}) + ${B} \\cdot (${y0}) ${C ? sgn(C) : ''}|}{\\sqrt{${A * A} + ${B * B}}} = \\dfrac{${d * N}}{${N}}$.` },
          { text: `$d = {}$.`, blank: String(d) },
        ],
        answer: String(d),
      };
    },
  },
  {
    id: 'r-cosinusy-120',
    subjectId: 'mat-r',
    topic: 'podobienstwo',
    name: 'Twierdzenie cosinusów',
    make: (r) => {
      const [a, b, c] = r.pick([[3, 5, 7], [5, 3, 7], [7, 8, 13], [5, 16, 19], [8, 7, 13], [16, 5, 19], [11, 24, 31]]);
      return {
        maxPoints: 2,
        question: `W trójkącie dwa boki mają długości ${a} i ${b}, a kąt między nimi ma miarę $120^\\circ$. Oblicz długość trzeciego boku.`,
        key: {
          levels: [
            { points: 2, alts: [`obliczenie długości boku: ${c}`] },
            { points: 1, alts: [`zastosowanie twierdzenia cosinusów: c^2 = ${c * c}`] },
          ],
        },
        steps: [
          { text: `$c^2 = a^2 + b^2 - 2ab\\cos 120^\\circ$, a $\\cos 120^\\circ = -\\frac12$, więc $c^2 = ${a * a} + ${b * b} + ${a * b} = {}$.`, blank: String(c * c) },
          { text: `$c = \\sqrt{${c * c}} = {}$.`, blank: String(c) },
        ],
        answer: String(c),
      };
    },
  },
  {
    id: 'r-rownanie-logarytmiczne',
    subjectId: 'mat-r',
    topic: 'logarytmy',
    name: 'Równanie logarytmiczne',
    make: (r) => {
      const [x, d, k] = r.pick([[4, 2, 3], [8, 4, 5], [4, 3, 2], [2, 1, 1], [8, 6, 4], [16, 12, 6], [8, 7, 3], [16, 14, 5]]);
      const other = -(2 ** k) / x; // drugi pierwiastek (iloczyn pierwiastków równa się −2^k)
      return {
        maxPoints: 3,
        question: `Rozwiąż równanie $\\log_2 x + \\log_2 (x - ${d}) = ${k}$.`,
        key: {
          levels: [
            { points: 3, alts: [`rozwiązanie z uwzględnieniem dziedziny: x = ${x}`] },
            { points: 2, alts: [`zapisanie równania kwadratowego: x^2 - ${d}x - ${2 ** k} = 0`] },
            { points: 1, alts: [`wyznaczenie dziedziny: x > ${d}`] },
          ],
        },
        steps: [
          { text: `Dziedzina: $x > 0$ i $x > ${d}$, czyli $x > ${d}$.` },
          { text: `$\\log_2 [x(x - ${d})] = ${k}$, więc $x^2 - ${d}x = ${2 ** k}$.` },
          { text: `Pierwiastki równania $x^2 - ${d}x - ${2 ** k} = 0$: $x = ${x}$ oraz $x = ${tnum(other)}$ – drugi nie należy do dziedziny. Rozwiązanie: $x = {}$.`, blank: String(x) },
        ],
        answer: `x = ${x}`,
      };
    },
  },
];

export const genById = (id: string) => GENERATORS.find((g) => g.id === id);
/** Generatory działu; rozszerzenie obejmuje też zadania z podstawy (najpierw typy z rozszerzenia). */
export const generatorsFor = (subjectId: string, topic: string) => [
  ...GENERATORS.filter((g) => g.subjectId === subjectId && g.topic === topic),
  ...(subjectId === 'mat-r' ? GENERATORS.filter((g) => g.subjectId === 'mat-p' && g.topic === topic) : []),
];

/** Wariant: ten sam przy tym samym ziarnie. */
export function makeVariant(g: Generator, seed: number): Variant {
  return { ...g.make(rng(seed * 7919 + g.id.length)), gen: g.id, seed, subjectId: g.subjectId, topic: g.topic };
}

export const variantTaskId = (v: { gen: string; seed: number }) => `gen-${v.gen}-${v.seed}`;
export const genOfTask = (taskId: string) => (taskId.startsWith('gen-') ? taskId.slice(4).replace(/-\d+$/, '') : null);
