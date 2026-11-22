// Kolejność działów matematyki według tier-list matemaks.pl (matura 2027, analiza arkuszy CKE
// 2023–2026): https://www.matemaks.pl/tier-lista i https://www.matemaks.pl/tier-lista-matura-rozszerzona
// (oraz PDF „Tier lista” i „Plan nauki na 90+ dni”).
//
// Tier mówi, ile punktów daje dział w stosunku do czasu nauki: S+ najwięcej, D najmniej.
// Dział aplikacji obejmuje kilka zagadnień z listy, więc dostaje najlepszy tier spośród nich
// (najłatwiejsze punkty są w jego najprostszych typach zadań).
// Zalecenie matemaks: gdy do matury zostało mniej niż 6 miesięcy, najpierw S+ i S, potem A, potem reszta;
// przy dłuższym czasie kolejność z listy. Etapy: 1 = S+ i S, 2 = A, 3 = B, 4 = C i D.
// Następny etap dostaje pełną wagę, gdy poprzedni jest opanowany (średnia biegłość ≥ GATE).

export type Tier = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export const TIERS: Record<'mat-p' | 'mat-r', Record<string, Tier>> = {
  'mat-p': {
    potegi: 'S+', // potęgi i pierwiastki S+ (funkcja wykładnicza: B)
    'wartosc-bezwzgledna': 'S+',
    logarytmy: 'S+',
    rownania: 'S+', // nierówność liniowa S+, równanie iloczynowe S+, odczyt z wykresu S+, nierówność kwadratowa S, układ A, zadanie z treścią B
    ciagi: 'S+', // ciąg wzorem ogólnym S+, arytmetyczny S+, geometryczny S
    okrag: 'S+', // kąty środkowe i wpisane S+
    'geometria-analityczna': 'S+', // odcinek S+, proste równoległe S+, równanie okręgu S, zadanie za 3–4 pkt B
    wielomiany: 'S', // wzory skróconego mnożenia S, wielomiany B
    wymierne: 'S', // wyrażenia i równania wymierne S (funkcja odwrotnie proporcjonalna B)
    'kwadratowa-parametr': 'S', // funkcja kwadratowa S, optymalizacja S, przesunięcia wykresów A
    prawdopodobienstwo: 'S', // statystyka S, prawdopodobieństwo B
    procenty: 'A',
    trygonometria: 'A',
    planimetria: 'A', // trójkąty, trapezy, Pitagoras, Tales A; twierdzenie cosinusów A
    podobienstwo: 'A',
    stereometria: 'A', // walce i stożki A, prostopadłościany i ostrosłupy B
    dowody: 'B', // dowód z podzielnością lub resztą B
    kombinatoryka: 'C',
  },
  'mat-r': {
    'wartosc-bezwzgledna': 'S+',
    ciagi: 'S+', // ciąg arytmetyczny i geometryczny lub szereg
    pochodne: 'S+', // zadanie optymalizacyjne S+, pochodne i styczna S
    logarytmy: 'S',
    'kwadratowa-parametr': 'S', // równanie kwadratowe z parametrem, wzory Viète’a
    'granice-ciagow': 'S',
    wielomiany: 'S', // w zagadnieniu „Pochodne, styczna do wykresu i ekstrema. Wielomiany.”
    trygonometria: 'S', // równanie trygonometryczne
    'geometria-analityczna': 'S',
    potegi: 'A', // funkcja wykładnicza – zastosowania praktyczne
    dowody: 'A', // dowód algebraiczny
    stereometria: 'B',
    prawdopodobienstwo: 'B', // klasyczne, warunkowe, Bayes, Bernoulli
    rownania: 'B', // poza listą (potrzebne w innych działach)
    planimetria: 'C', // dowód z geometrii płaskiej, geometria płaska
    podobienstwo: 'C',
    okrag: 'C',
    wymierne: 'C', // poza listą
    kombinatoryka: 'D',
    procenty: 'D', // poza listą
  },
};

/** Mnożnik priorytetu według tieru. */
export const TIER_FACTOR: Record<Tier, number> = { 'S+': 1.8, S: 1.5, A: 1.2, B: 0.9, C: 0.7, D: 0.5 };
const STAGE_OF: Record<Tier, number> = { 'S+': 1, S: 1, A: 2, B: 3, C: 4, D: 4 };
/** Biegłość etapu, od której następny etap dostaje pełną wagę. */
export const GATE = 0.6;
/** Mnożnik działu z etapu, którego poprzedni etap nie jest jeszcze opanowany. */
const LOCKED = 0.5;

export function tierOf(subject: string, topic: string): Tier | null {
  const t = TIERS[subject as 'mat-p' | 'mat-r'];
  if (!t) return null;
  return t[topic] ?? 'C';
}

export const stageOf = (tier: Tier) => STAGE_OF[tier];

/** Etap ucznia: pierwszy etap ze średnią biegłością poniżej GATE albo bez wyników. */
export function currentStage(subject: string, mastery: Record<string, { value: number | null }>): number {
  const t = TIERS[subject as 'mat-p' | 'mat-r'];
  if (!t) return 1;
  for (let s = 1; s <= 4; s++) {
    const vals = Object.entries(t)
      .filter(([, v]) => STAGE_OF[v] === s)
      .map(([k]) => mastery[k]?.value)
      .filter((v): v is number => v != null);
    if (!vals.length || vals.reduce((a, b) => a + b, 0) / vals.length < GATE) return s;
  }
  return 4;
}

/** Mnożnik priorytetu działu według tier-listy (1 dla przedmiotów spoza matematyki). */
export function tierFactor(subject: string, topic: string, stage: number): number {
  const tier = tierOf(subject, topic);
  if (tier == null) return 1;
  return TIER_FACTOR[tier] * (STAGE_OF[tier] > stage ? LOCKED : 1);
}

// ---------- cel procentowy (plan matemaks: „na 30%”, „na 60%”, „na 85%”, „na 100%”) ----------

/** Działy potrzebne do celu: podstawa według etapów listy lekcji matemaks, rozszerzenie: S+ i S na 60–70%. */
const TARGET_P: [number, string[]][] = [
  [30, ['potegi', 'logarytmy', 'wartosc-bezwzgledna', 'wielomiany', 'rownania', 'wymierne']],
  [60, ['ciagi', 'okrag', 'geometria-analityczna', 'prawdopodobienstwo', 'kwadratowa-parametr']],
  [85, ['trygonometria', 'planimetria', 'podobienstwo', 'stereometria']],
  [100, ['procenty', 'kombinatoryka', 'dowody']],
];

export const TARGET_OPTIONS: Record<string, number[]> = { 'mat-p': [30, 60, 85, 100], 'mat-r': [70, 100], 'pol-p': [30, 50, 70, 90], 'ang-p': [30, 50, 70, 90] };

/** Działy, które obejmuje cel (null = wszystkie albo przedmiot bez podziału). */
export function targetTopics(subject: string, target: number | undefined): string[] | null {
  if (target == null || target >= 100) return null;
  if (subject === 'mat-p') return TARGET_P.filter(([t]) => t <= Math.max(30, target)).flatMap(([, xs]) => xs);
  if (subject === 'mat-r' && target <= 70) return Object.entries(TIERS['mat-r']).filter(([, v]) => v === 'S+' || v === 'S').map(([k]) => k);
  return null;
}

/** Działy spoza celu dostają mniejszą wagę (×0,3), ale nie znikają z planu. */
export function targetFactor(subject: string, topic: string, target: number | undefined): number {
  const xs = targetTopics(subject, target);
  return !xs || xs.includes(topic) ? 1 : 0.3;
}
