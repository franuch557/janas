/**
 * Spis treści książki „Jak zdać maturę. Matematyka rozszerzona 2027”,
 * przepisany ze zdjęć przesłanych przez użytkownika (strony 5–7 książki).
 * Numery stron działu 1 odczytano z nieostrego zdjęcia i trzeba je sprawdzić.
 * Przypisanie tematów zrobiłem na podstawie tytułów podrozdziałów; każde
 * zadanie można przypisać ręcznie do innego tematu.
 */

export type BookSectionKind = 'wstęp' | 'zadania' | 'rozwiązania' | 'podsumowanie' | 'odpowiedzi';

export interface BookSection {
  chapter: number;
  title: string;
  from: number;
  kind: BookSectionKind;
  topics: string[];
}

export interface BookChapter {
  nr: number;
  title: string;
  topics: string[];
  uncertainPages?: boolean;
}

export const BOOK_TITLE = 'Jak zdać maturę. Matematyka rozszerzona 2027';
export const BOOK_LAST_PAGE = 400; // koniec nieznany; strony po 385 to odpowiedzi

export const BOOK_CHAPTERS: BookChapter[] = [
  { nr: 1, title: 'Liczby rzeczywiste', topics: ['potegi', 'dowody', 'logarytmy', 'wartosc-bezwzgledna'], uncertainPages: true },
  { nr: 2, title: 'Wyrażenia algebraiczne', topics: ['wielomiany', 'dowody'] },
  { nr: 3, title: 'Funkcje', topics: ['kwadratowa-parametr', 'potegi', 'logarytmy', 'wymierne'] },
  { nr: 4, title: 'Równania i nierówności', topics: ['rownania', 'wielomiany', 'wymierne', 'wartosc-bezwzgledna', 'kwadratowa-parametr'] },
  { nr: 5, title: 'Układy równań', topics: ['rownania'] },
  { nr: 6, title: 'Ciągi', topics: ['ciagi', 'granice-ciagow'] },
  { nr: 7, title: 'Trygonometria', topics: ['trygonometria'] },
  { nr: 8, title: 'Planimetria', topics: ['planimetria', 'podobienstwo', 'okrag', 'dowody'] },
  { nr: 9, title: 'Geometria kartezjańska', topics: ['geometria-analityczna'] },
  { nr: 10, title: 'Stereometria', topics: ['stereometria'] },
  { nr: 11, title: 'Kombinatoryka', topics: ['kombinatoryka'] },
  { nr: 12, title: 'Rachunek prawdopodobieństwa i statystyka', topics: ['prawdopodobienstwo'] },
  { nr: 13, title: 'Rachunek różniczkowy', topics: ['pochodne'] },
];

const s = (chapter: number, from: number, kind: BookSectionKind, title: string, topics: string[] = []): BookSection => ({
  chapter,
  from,
  kind,
  title,
  topics,
});

export const BOOK_SECTIONS: BookSection[] = [
  s(1, 9, 'wstęp', 'Potęgi i pierwiastki', ['potegi']),
  s(1, 10, 'zadania', 'Działania na potęgach i pierwiastkach', ['potegi']),
  s(1, 13, 'zadania', 'Dowody z wykorzystaniem potęg i pierwiastków', ['potegi', 'dowody']),
  s(1, 15, 'wstęp', 'Dowody dotyczące podzielności cz. 1', ['dowody']),
  s(1, 15, 'zadania', 'Dowody dotyczące podzielności cz. 1', ['dowody']),
  s(1, 19, 'wstęp', 'Podzielność iloczynów kolejnych liczb całkowitych', ['dowody']),
  s(1, 20, 'zadania', 'Podzielność iloczynów kolejnych liczb całkowitych', ['dowody']),
  s(1, 21, 'zadania', 'Wykazywanie, że wyrażenie lub liczba spełnia określone warunki', ['dowody']),
  s(1, 23, 'wstęp', 'Logarytmy', ['logarytmy']),
  s(1, 24, 'zadania', 'Logarytmy', ['logarytmy']),
  s(1, 27, 'wstęp', 'Wartość bezwzględna, równania i nierówności z jedną wartością bezwzględną', ['wartosc-bezwzgledna']),
  s(1, 29, 'zadania', 'Działania z wartością bezwzględną; równania i nierówności z jedną wartością bezwzględną', ['wartosc-bezwzgledna']),
  s(1, 31, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(1, 39, 'podsumowanie', 'Podsumowanie 1'),

  s(2, 41, 'wstęp', 'Wzory skróconego mnożenia, wzór Newtona i trójkąt Pascala', ['wielomiany']),
  s(2, 42, 'zadania', 'Wykorzystanie rozwinięcia wzoru (a+b)^n', ['wielomiany', 'kombinatoryka']),
  s(2, 43, 'wstęp', 'Wykazywanie prawdziwości równań i nierówności', ['dowody']),
  s(2, 44, 'zadania', 'Wykazywanie prawdziwości równań i nierówności', ['dowody']),
  s(2, 50, 'wstęp', 'Twierdzenia o wielomianach: Bézout, pierwiastki wymierne, reszta', ['wielomiany']),
  s(2, 51, 'zadania', 'Zadania dotyczące wielomianów', ['wielomiany']),
  s(2, 59, 'zadania', 'Dowody dotyczące podzielności cz. 2', ['dowody']),
  s(2, 60, 'zadania', 'Dowody z wykazywaniem reszty z dzielenia', ['dowody']),
  s(2, 61, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(2, 69, 'podsumowanie', 'Podsumowanie 2'),

  s(3, 71, 'wstęp', 'Własności funkcji, przekształcenia wykresu, funkcja liniowa i kwadratowa', ['kwadratowa-parametr']),
  s(3, 74, 'zadania', 'Odczytywanie liczby rozwiązań z wykresu funkcji', ['kwadratowa-parametr']),
  s(3, 75, 'wstęp', 'Funkcja wykładnicza i logarytmiczna', ['potegi', 'logarytmy']),
  s(3, 76, 'zadania', 'Funkcja wykładnicza i logarytmiczna', ['potegi', 'logarytmy']),
  s(3, 77, 'zadania', 'Zadania optymalizacyjne z funkcją kwadratową', ['kwadratowa-parametr']),
  s(3, 81, 'wstęp', 'Funkcja homograficzna', ['wymierne']),
  s(3, 82, 'zadania', 'Funkcja homograficzna', ['wymierne']),
  s(3, 85, 'zadania', 'Zastosowania praktyczne funkcji'),
  s(3, 87, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(3, 93, 'podsumowanie', 'Podsumowanie 3'),

  s(4, 95, 'wstęp', 'Rodzaje równań kwadratowych', ['rownania', 'kwadratowa-parametr']),
  s(4, 96, 'zadania', 'Równania i nierówności wielomianowe oraz wymierne', ['rownania', 'wielomiany', 'wymierne']),
  s(4, 100, 'zadania', 'Równania i nierówności z dwiema i więcej wartościami bezwzględnymi', ['wartosc-bezwzgledna']),
  s(4, 105, 'wstęp', 'Równania z parametrem ze wzorami Viète’a', ['kwadratowa-parametr']),
  s(4, 106, 'zadania', 'Równania z parametrem ze wzorami Viète’a', ['kwadratowa-parametr']),
  s(4, 116, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(4, 127, 'podsumowanie', 'Podsumowanie 4'),

  s(5, 129, 'zadania', 'Układy równań', ['rownania']),
  s(5, 134, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(5, 138, 'podsumowanie', 'Podsumowanie 5'),

  s(6, 140, 'wstęp', 'Definicja ciągu, monotoniczność, ciąg arytmetyczny i geometryczny', ['ciagi']),
  s(6, 141, 'zadania', 'Ciąg arytmetyczny i geometryczny', ['ciagi']),
  s(6, 143, 'zadania', 'Wykorzystanie własności ciągu arytmetycznego i geometrycznego', ['ciagi']),
  s(6, 150, 'wstęp', 'Szereg geometryczny', ['granice-ciagow', 'ciagi']),
  s(6, 151, 'zadania', 'Szereg geometryczny', ['granice-ciagow', 'ciagi']),
  s(6, 152, 'wstęp', 'Granice ciągów', ['granice-ciagow']),
  s(6, 153, 'zadania', 'Granice ciągów', ['granice-ciagow']),
  s(6, 157, 'zadania', 'Ciągi określone wzorem rekurencyjnym', ['ciagi']),
  s(6, 158, 'zadania', 'Twierdzenie o trzech ciągach', ['granice-ciagow']),
  s(6, 160, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(6, 169, 'podsumowanie', 'Podsumowanie 6'),

  s(7, 171, 'wstęp', 'Wzory i zależności dotyczące funkcji trygonometrycznych', ['trygonometria']),
  s(7, 173, 'zadania', 'Podstawowe własności i zależności między funkcjami trygonometrycznymi', ['trygonometria']),
  s(7, 180, 'zadania', 'Równania trygonometryczne', ['trygonometria']),
  s(7, 189, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(7, 196, 'podsumowanie', 'Podsumowanie 7'),

  s(8, 198, 'wstęp', 'Wzory dotyczące figur, twierdzenia, cechy przystawania i podobieństwa', ['planimetria', 'podobienstwo']),
  s(8, 202, 'zadania', 'Twierdzenia Pitagorasa, sinusów, cosinusów, okrąg wpisany i opisany', ['planimetria', 'podobienstwo', 'okrag']),
  s(8, 211, 'zadania', 'Dowody: kąty, okręgi, przystawanie i podobieństwo trójkątów', ['dowody', 'planimetria', 'okrag', 'podobienstwo']),
  s(8, 223, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(8, 234, 'podsumowanie', 'Podsumowanie 8'),

  s(9, 236, 'wstęp', 'Odcinek, prosta, odległość, wektory, przekształcenia, równanie okręgu', ['geometria-analityczna']),
  s(9, 238, 'zadania', 'Podstawowe wzory geometrii kartezjańskiej', ['geometria-analityczna']),
  s(9, 254, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(9, 261, 'podsumowanie', 'Podsumowanie 9'),

  s(10, 263, 'wstęp', 'Graniastosłupy, ostrosłupy, bryły obrotowe', ['stereometria']),
  s(10, 265, 'zadania', 'Graniastosłupy', ['stereometria']),
  s(10, 273, 'zadania', 'Ostrosłupy', ['stereometria']),
  s(10, 282, 'zadania', 'Bryły obrotowe', ['stereometria']),
  s(10, 288, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(10, 301, 'podsumowanie', 'Podsumowanie 10'),

  s(11, 303, 'wstęp', 'Wzory i definicje kombinatoryki', ['kombinatoryka']),
  s(11, 303, 'zadania', 'Podstawowe wzory kombinatoryki', ['kombinatoryka']),
  s(11, 305, 'zadania', 'Zastosowanie wzorów kombinatorycznych', ['kombinatoryka']),
  s(11, 311, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(11, 315, 'podsumowanie', 'Podsumowanie 11'),

  s(12, 317, 'wstęp', 'Statystyka i rachunek prawdopodobieństwa', ['prawdopodobienstwo']),
  s(12, 318, 'zadania', 'Prawdopodobieństwo klasyczne', ['prawdopodobienstwo']),
  s(12, 325, 'wstęp', 'Prawdopodobieństwo warunkowe', ['prawdopodobienstwo']),
  s(12, 325, 'zadania', 'Prawdopodobieństwo warunkowe', ['prawdopodobienstwo']),
  s(12, 328, 'wstęp', 'Prawdopodobieństwo całkowite', ['prawdopodobienstwo']),
  s(12, 329, 'zadania', 'Prawdopodobieństwo całkowite', ['prawdopodobienstwo']),
  s(12, 332, 'wstęp', 'Twierdzenie Bayesa', ['prawdopodobienstwo']),
  s(12, 332, 'zadania', 'Twierdzenie Bayesa', ['prawdopodobienstwo']),
  s(12, 334, 'wstęp', 'Schemat Bernoulliego', ['prawdopodobienstwo']),
  s(12, 334, 'zadania', 'Schemat Bernoulliego', ['prawdopodobienstwo']),
  s(12, 338, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(12, 348, 'podsumowanie', 'Podsumowanie 12'),

  s(13, 350, 'wstęp', 'Granica funkcji', ['pochodne']),
  s(13, 350, 'zadania', 'Granica funkcji', ['pochodne']),
  s(13, 352, 'wstęp', 'Pochodna, styczna, monotoniczność i ekstrema', ['pochodne']),
  s(13, 354, 'zadania', 'Pochodne funkcji', ['pochodne']),
  s(13, 356, 'zadania', 'Styczna do wykresu funkcji w punkcie', ['pochodne']),
  s(13, 358, 'zadania', 'Monotoniczność i ekstrema lokalne', ['pochodne']),
  s(13, 359, 'zadania', 'Zadania optymalizacyjne z rachunkiem pochodnych', ['pochodne']),
  s(13, 369, 'wstęp', 'Twierdzenie Darboux', ['pochodne']),
  s(13, 369, 'zadania', 'Twierdzenie Darboux', ['pochodne']),
  s(13, 371, 'rozwiązania', 'Rozwiązania zadań sprawdzających'),
  s(13, 383, 'podsumowanie', 'Podsumowanie 13'),
  s(13, 385, 'odpowiedzi', 'Odpowiedzi do podsumowań 1–13'),
];

/** Sekcje, w których leży strona (strona może należeć do kilku, gdy sekcje zaczynają się na tej samej stronie). */
export function sectionsForPage(page: number): BookSection[] {
  if (!Number.isFinite(page) || page < BOOK_SECTIONS[0].from) return [];
  // koniec sekcji = początek następnej sekcji o innej stronie startowej
  const starts = [...new Set(BOOK_SECTIONS.map((x) => x.from))].sort((a, b) => a - b);
  let start = starts[0];
  for (const st of starts) if (st <= page) start = st;
  const result = BOOK_SECTIONS.filter((x) => x.from === start);
  // sekcja zaczynająca się wcześniej, ale nadal trwająca (np. wstęp i zadania na tej samej stronie)
  return result;
}

/** Podpowiedź tematu dla strony: tematy sekcji z zadaniami, a dla rozwiązań i podsumowań tematy działu. */
export function topicsForPage(page: number): { topics: string[]; chapter: BookChapter | null; section: BookSection | null } {
  const secs = sectionsForPage(page);
  if (secs.length === 0) return { topics: [], chapter: null, section: null };
  const sec = secs.find((x) => x.kind === 'zadania') ?? secs[secs.length - 1];
  const chapter = BOOK_CHAPTERS.find((c) => c.nr === sec.chapter) ?? null;
  const topics = sec.topics.length > 0 ? sec.topics : chapter?.topics ?? [];
  return { topics, chapter, section: sec };
}
