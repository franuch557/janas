import type { Family, Level, Topic } from '../types';

const PR: Level[] = ['podstawowy', 'rozszerzony'];
const R: Level[] = ['rozszerzony'];

/**
 * Taksonomia matematyki z założeń projektu. Tematy oznaczone tylko poziomem
 * rozszerzonym wynikają z podstawy programowej (granice, pochodne); można to
 * zmienić w ustawieniach wag, ustawiając ręczną wagę.
 */
export const MATH_TOPICS: Topic[] = [
  { id: 'potegi', family: 'matematyka', name: 'Potęgi i funkcja wykładnicza', levels: PR },
  { id: 'logarytmy', family: 'matematyka', name: 'Logarytmy', levels: PR },
  { id: 'procenty', family: 'matematyka', name: 'Procenty i ciągi finansowe', levels: PR },
  { id: 'wielomiany', family: 'matematyka', name: 'Wielomiany i wzory skróconego mnożenia', levels: PR },
  { id: 'rownania', family: 'matematyka', name: 'Równania i nierówności', levels: PR },
  { id: 'wartosc-bezwzgledna', family: 'matematyka', name: 'Wartość bezwzględna', levels: PR },
  { id: 'kwadratowa-parametr', family: 'matematyka', name: 'Funkcja kwadratowa i parametr', levels: PR },
  { id: 'wymierne', family: 'matematyka', name: 'Funkcje wymierne', levels: PR },
  { id: 'ciagi', family: 'matematyka', name: 'Ciągi arytmetyczne i geometryczne', levels: PR },
  { id: 'granice-ciagow', family: 'matematyka', name: 'Granice ciągów', levels: R },
  { id: 'trygonometria', family: 'matematyka', name: 'Trygonometria', levels: PR },
  { id: 'planimetria', family: 'matematyka', name: 'Planimetria', levels: PR },
  { id: 'podobienstwo', family: 'matematyka', name: 'Podobieństwo i twierdzenia w trójkącie', levels: PR },
  { id: 'okrag', family: 'matematyka', name: 'Okrąg i styczne', levels: PR },
  { id: 'geometria-analityczna', family: 'matematyka', name: 'Geometria analityczna', levels: PR },
  { id: 'stereometria', family: 'matematyka', name: 'Stereometria', levels: PR },
  { id: 'kombinatoryka', family: 'matematyka', name: 'Kombinatoryka', levels: PR },
  { id: 'prawdopodobienstwo', family: 'matematyka', name: 'Prawdopodobieństwo', levels: PR },
  { id: 'pochodne', family: 'matematyka', name: 'Pochodne i optymalizacja', levels: R },
  { id: 'dowody', family: 'matematyka', name: 'Dowody i rozumowanie', levels: PR },
];

/**
 * Język polski, poziom podstawowy. Podział na części według informatora CKE
 * (arkusz 1: część 1 „Język polski w użyciu”, część 2 „Test historycznoliteracki”;
 * arkusz 2: wypracowanie). Kryteria wypracowania z informatora: kompetencje
 * literackie i kulturowe 16 pkt, kompozycja 7 pkt, język wypowiedzi 11 pkt.
 */
export const POLISH_TOPICS: Topic[] = [
  {
    id: 'pol-rozumienie',
    family: 'polski',
    name: 'Język polski w użyciu: rozumienie i interpretacja tekstu',
    levels: PR,
  },
  {
    id: 'pol-jezyk',
    family: 'polski',
    name: 'Język polski w użyciu: zagadnienia językowe',
    levels: PR,
    note: 'Gramatyka, poprawność, ortografia i interpunkcja w zadaniach części 1.',
  },
  {
    id: 'pol-historycznoliteracki',
    family: 'polski',
    name: 'Test historycznoliteracki: lektury i epoki',
    levels: PR,
  },
  {
    id: 'pol-wyp-kompetencje',
    family: 'polski',
    name: 'Wypracowanie: teza, argumenty, kompetencje literackie i kulturowe',
    levels: PR,
    note: 'Informator CKE: 16 pkt.',
  },
  {
    id: 'pol-wyp-kompozycja',
    family: 'polski',
    name: 'Wypracowanie: kompozycja',
    levels: PR,
    note: 'Informator CKE: 7 pkt.',
  },
  {
    id: 'pol-wyp-jezyk',
    family: 'polski',
    name: 'Wypracowanie: język wypowiedzi, ortografia, interpunkcja',
    levels: PR,
    note: 'Informator CKE: 11 pkt.',
  },
];

/**
 * Język angielski. Części egzaminu pisemnego według informatora CKE:
 * rozumienie ze słuchu, rozumienie tekstów pisanych, znajomość środków
 * językowych, wypowiedź pisemna (poziom podstawowy: 80–130 wyrazów).
 */
export const ENGLISH_TOPICS: Topic[] = [
  { id: 'ang-sluchanie', family: 'angielski', name: 'Rozumienie ze słuchu', levels: PR },
  { id: 'ang-czytanie', family: 'angielski', name: 'Rozumienie tekstów pisanych', levels: PR },
  {
    id: 'ang-srodki',
    family: 'angielski',
    name: 'Znajomość środków językowych: gramatyka i słownictwo',
    levels: PR,
  },
  {
    id: 'ang-pisanie',
    family: 'angielski',
    name: 'Wypowiedź pisemna',
    levels: PR,
    note: 'Poziom podstawowy: 80–130 wyrazów (aneks do informatora CKE).',
  },
];

export const ALL_TOPICS: Topic[] = [...MATH_TOPICS, ...POLISH_TOPICS, ...ENGLISH_TOPICS];

export function topicsFor(family: Family, level?: Level): Topic[] {
  return ALL_TOPICS.filter((t) => t.family === family && (!level || t.levels.includes(level)));
}

export function topicName(id: string | null | undefined): string {
  if (!id) return 'bez tematu';
  return ALL_TOPICS.find((t) => t.id === id)?.name ?? id;
}

/** Kryteria oceny wypracowania (język polski) według informatora CKE. */
export const POLISH_ESSAY_CRITERIA = [
  { id: 'kompetencje', name: 'Kompetencje literackie i kulturowe', max: 16, topicId: 'pol-wyp-kompetencje' },
  { id: 'kompozycja', name: 'Kompozycja wypowiedzi', max: 7, topicId: 'pol-wyp-kompozycja' },
  { id: 'jezyk', name: 'Język wypowiedzi', max: 11, topicId: 'pol-wyp-jezyk' },
];

/**
 * Kryteria wypowiedzi pisemnej (angielski). Nazwy „Treść”, „Spójność i logika”,
 * „Poprawność” widać w kartach odpowiedzi CKE 2025. Maksymalne punkty
 * i czwarte kryterium nie zostały sprawdzone; użytkownik wpisuje je sam.
 */
export const ENGLISH_WRITING_CRITERIA = [
  { id: 'tresc', name: 'Treść', max: null as number | null },
  { id: 'spojnosc', name: 'Spójność i logika', max: null as number | null },
  { id: 'zakres', name: 'Zakres środków językowych (niezweryfikowane)', max: null as number | null },
  { id: 'poprawnosc', name: 'Poprawność środków językowych', max: null as number | null },
];
