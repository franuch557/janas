// Najczęstsze błędy i mnemotechniki dla działów (opracowanie własne aplikacji, na podstawie
// typowych uwag z zasad oceniania CKE i sprawozdań egzaminacyjnych). Pokazywane na karcie
// odpowiedzi w sesji powtórek i na mapie pamięci.

export interface TopicTips {
  bledy: string[];
  mnemo: { tytul: string; tekst: string }[];
}

export const TIPS: Record<string, TopicTips> = {
  potegi: {
    bledy: [
      'Mnożenie wykładników zamiast dodawania przy mnożeniu potęg o tej samej podstawie: aᵐ · aⁿ = aᵐ⁺ⁿ.',
      'Ujemny wykładnik traktowany jak liczba ujemna: 2⁻³ = 1/8, a nie −8.',
      'Pierwiastek z sumy rozbity na sumę pierwiastków: √(a + b) ≠ √a + √b.',
    ],
    mnemo: [
      { tytul: 'Minus w wykładniku = odwrotność', tekst: 'Minus „przewraca” ułamek: (2/3)⁻² = (3/2)² = 9/4.' },
      { tytul: 'Ułamek w wykładniku', tekst: '„Mianownik to stopień pierwiastka, licznik to potęga”: a^(m/n) = ⁿ√(aᵐ).' },
    ],
  },
  logarytmy: {
    bledy: [
      'log(a + b) zamieniany na log a + log b – ta własność dotyczy iloczynu, nie sumy.',
      'Pominięcie założeń: podstawa > 0 i ≠ 1, liczba logarytmowana > 0.',
      'Mylenie log_a b z log_b a przy zmianie podstawy.',
    ],
    mnemo: [
      { tytul: 'Logarytm to wykładnik', tekst: '„Do jakiej potęgi podnieść podstawę, żeby dostać liczbę?” log₂ 8 = 3, bo 2³ = 8.' },
      { tytul: 'Iloczyn → suma, iloraz → różnica', tekst: 'Logarytm „obniża” działanie o stopień: mnożenie staje się dodawaniem, potęga – mnożeniem.' },
    ],
  },
  procenty: {
    bledy: [
      'Zmiany procentowe nie znoszą się: obniżka o 20%, a potem podwyżka o 20% nie wraca do ceny początkowej.',
      'Mylenie punktów procentowych z procentami.',
      'Liczenie procentu od złej wielkości (od nowej ceny zamiast od starej).',
    ],
    mnemo: [
      { tytul: 'Mnożnik zamiast procentów', tekst: 'Podwyżka o p% to ·(1 + p/100), obniżka – ·(1 − p/100). Kolejne zmiany = mnożenie mnożników.' },
    ],
  },
  wielomiany: {
    bledy: [
      'Zły wzór skróconego mnożenia: (a − b)² = a² − 2ab + b², nie a² − b².',
      'Gubienie pierwiastków wielokrotnych przy rozkładzie na czynniki.',
      'Błąd znaku przy dzieleniu wielomianu przez (x − a): pierwiastkiem jest a, nie −a.',
    ],
    mnemo: [
      { tytul: 'Twierdzenie Bézouta', tekst: 'W(a) = 0 ⇔ (x − a) dzieli W(x). Pierwiastków całkowitych szukaj wśród dzielników wyrazu wolnego.' },
      { tytul: 'Kwadrat różnicy', tekst: '„Kwadrat pierwszego, minus podwojony iloczyn, plus kwadrat drugiego.”' },
    ],
  },
  rownania: {
    bledy: [
      'Mnożenie nierówności przez liczbę ujemną bez zmiany zwrotu.',
      'Dzielenie obu stron przez wyrażenie z niewiadomą – można zgubić rozwiązanie x = 0.',
      'Zapis odpowiedzi do nierówności kwadratowej bez szkicu paraboli (zły przedział).',
    ],
    mnemo: [
      { tytul: 'Nierówność kwadratowa', tekst: 'Narysuj parabolę: ramiona w górę (a > 0) – „> 0” na zewnątrz pierwiastków, „< 0” między nimi.' },
    ],
  },
  'wartosc-bezwzgledna': {
    bledy: [
      '|x − 3| < 2 rozwiązane jako x − 3 < 2 bez drugiej nierówności.',
      'Pominięcie, że |x| = −2 nie ma rozwiązań.',
    ],
    mnemo: [
      { tytul: 'Odległość na osi', tekst: '|x − a| to odległość x od a. |x − 3| < 2: punkty bliżej niż 2 od trójki → (1; 5).' },
    ],
  },
  'kwadratowa-parametr': {
    bledy: [
      'Zapomniany warunek a ≠ 0, gdy parametr stoi przy x².',
      'Wzory Viète’a użyte bez sprawdzenia, czy Δ ≥ 0.',
      'Mylenie współrzędnych wierzchołka: p = −b/(2a), q = −Δ/(4a).',
    ],
    mnemo: [
      { tytul: 'Ile rozwiązań?', tekst: 'Δ > 0 – dwa, Δ = 0 – jedno, Δ < 0 – zero. Dwa różne dodatnie: Δ > 0, x₁ + x₂ > 0, x₁x₂ > 0.' },
    ],
  },
  wymierne: {
    bledy: ['Brak dziedziny (mianownik ≠ 0) i pozostawienie rozwiązania, które ją łamie.', 'Mnożenie nierówności wymiernej przez mianownik o nieznanym znaku.'],
    mnemo: [{ tytul: 'Nierówność wymierna', tekst: 'Zamień na iloczyn: P/Q > 0 ⇔ P·Q > 0 (i Q ≠ 0). Potem metoda „wężyka”.' }],
  },
  ciagi: {
    bledy: [
      'Wzór na n-ty wyraz z n zamiast (n − 1): aₙ = a₁ + (n − 1)r.',
      'Pomylenie sumy ciągu geometrycznego z arytmetycznym.',
      'Iloraz q wyliczany jako a₁/a₂ zamiast a₂/a₁.',
    ],
    mnemo: [
      { tytul: 'Środkowy wyraz', tekst: 'Arytmetyczny: środkowy = średnia sąsiadów. Geometryczny: środkowy² = iloczyn sąsiadów.' },
      { tytul: 'Suma arytmetycznego', tekst: '„Pierwszy plus ostatni, razy ile, przez dwa”: Sₙ = (a₁ + aₙ)·n/2.' },
    ],
  },
  'granice-ciagow': {
    bledy: ['Dzielenie licznika i mianownika przez złą potęgę n.', 'Uznanie symbolu ∞ − ∞ albo ∞/∞ za konkretną wartość.'],
    mnemo: [{ tytul: 'Iloraz wielomianów', tekst: 'Porównaj najwyższe potęgi: równe – iloraz współczynników, wyższa w mianowniku – 0, wyższa w liczniku – ±∞.' }],
  },
  trygonometria: {
    bledy: [
      'Mylenie sinusa z cosinusem w trójkącie prostokątnym.',
      'Pominięcie okresowości przy równaniach (brak „+ 2kπ”).',
      'Zły znak funkcji w II–IV ćwiartce.',
    ],
    mnemo: [
      { tytul: 'Znaki w ćwiartkach', tekst: '„W pierwszej wszystkie są dodatnie, w drugiej tylko sinus, w trzeciej tangens i cotangens, a w czwartej cosinus.”' },
      { tytul: 'Sinus naprzeciw', tekst: 'sin = przyprostokątna naprzeciw kąta / przeciwprostokątna; cos = przyległa / przeciwprostokątna.' },
    ],
  },
  planimetria: {
    bledy: ['Mylenie wysokości z bokiem w trójkącie nieprostokątnym.', 'Pole trapezu bez dzielenia przez 2.', 'Twierdzenie Pitagorasa użyte w trójkącie, który nie jest prostokątny.'],
    mnemo: [{ tytul: 'Trójkąty „magiczne”', tekst: 'Boki 3-4-5 i 5-12-13; trójkąt 30-60-90: a, a√3, 2a; 45-45-90: a, a, a√2.' }],
  },
  podobienstwo: {
    bledy: ['Stosunek pól równy skali – a powinien być kwadratem skali.', 'Złe dopasowanie odpowiadających sobie boków.'],
    mnemo: [{ tytul: 'Skala k', tekst: 'Długości ·k, pola ·k², objętości ·k³.' }],
  },
  okrag: {
    bledy: ['Mylenie kąta środkowego z wpisanym (wpisany jest dwa razy mniejszy).', 'Promień do stycznej nie jest prostopadły w rysunku – a musi być.'],
    mnemo: [{ tytul: 'Kąt wpisany', tekst: 'Oparty na tym samym łuku co środkowy: połowa środkowego. Oparty na średnicy: zawsze 90°.' }],
  },
  'geometria-analityczna': {
    bledy: ['Współczynnik prostej prostopadłej: −1/a, a nie −a.', 'Środek odcinka liczony jako różnica współrzędnych.', 'Znak w równaniu okręgu: (x − a)² + (y − b)² = r², środek to (a, b).'],
    mnemo: [{ tytul: 'Równoległe i prostopadłe', tekst: 'Równoległe – te same a. Prostopadłe – a₁ · a₂ = −1 („odwrotne i przeciwne”).' }],
  },
  stereometria: {
    bledy: ['Objętość ostrosłupa bez 1/3.', 'Mylenie wysokości ściany bocznej z wysokością bryły.', 'Zły kąt nachylenia (między krawędzią a płaszczyzną, nie dwiema krawędziami).'],
    mnemo: [{ tytul: 'Jedna trzecia', tekst: 'Wszystko „szpiczaste” (ostrosłup, stożek) ma objętość 1/3 · Pp · H.' }],
  },
  kombinatoryka: {
    bledy: ['Mylenie wariacji z kombinacjami – czy kolejność ma znaczenie?', 'Liczby czterocyfrowe z zerem na początku liczone jako poprawne.'],
    mnemo: [{ tytul: 'Kolejność?', tekst: 'Ma znaczenie (kod, podium) – wariacje. Nie ma (drużyna, zestaw) – kombinacje, czyli dziel przez k!.' }],
  },
  prawdopodobienstwo: {
    bledy: ['Liczenie zdarzeń sprzyjających inną metodą niż Ω (np. kolejność w Ω, bez kolejności w A).', 'Prawdopodobieństwo większe od 1 – sygnał błędu.'],
    mnemo: [{ tytul: '„Co najmniej jeden”', tekst: 'Licz przez zdarzenie przeciwne: P(co najmniej jeden) = 1 − P(żaden).' }],
  },
  pochodne: {
    bledy: ['Pochodna iloczynu jako iloczyn pochodnych.', 'Brak sprawdzenia znaku pochodnej wokół miejsca zerowego (to nie zawsze ekstremum).', 'W optymalizacji brak dziedziny zmiennej.'],
    mnemo: [{ tytul: 'Ekstremum', tekst: 'f′ zmienia znak z + na − – maksimum, z − na + – minimum. Samo f′ = 0 to za mało.' }],
  },
  dowody: {
    bledy: ['Dowód „na przykładach” zamiast ogólnego.', 'Zaczynanie od tezy i dochodzenie do prawdy bez równoważności przekształceń.', 'Brak zakończenia (co z tego wynika).'],
    mnemo: [{ tytul: 'Schemat dowodu', tekst: 'Założenie → przekształcenia (każde uzasadnione) → teza. Na końcu zdanie: „co należało udowodnić”.' }],
  },
  'pol-rozumienie': {
    bledy: ['Odpowiedź z własnej wiedzy, a nie z tekstu.', 'Za ogólna odpowiedź bez odwołania do konkretnego fragmentu.', 'Pominięcie drugiej części polecenia („uzasadnij”).'],
    mnemo: [{ tytul: 'Polecenie na trzy', tekst: 'Podkreśl czasownik (wyjaśnij, uzasadnij), przedmiot i liczbę elementów, których żąda polecenie.' }],
  },
  'pol-jezyk': {
    bledy: ['Mylenie funkcji środków językowych z ich nazwą.', 'Przecinek przed „który” i „że” pominięty.', 'Błędne związki frazeologiczne (np. „ponieść sukces” zamiast „odnieść sukces”).'],
    mnemo: [{ tytul: 'Przecinek', tekst: 'Przecinek stawiamy przed: że, który, ponieważ, aby, gdy, lecz, ale (gdy łączą zdania).' }],
  },
  'pol-historycznoliteracki': {
    bledy: ['Mylenie epok i ich cech (np. barok a renesans).', 'Przypisanie motywu do złej lektury.', 'Ogólnik zamiast konkretnej sceny lub bohatera.'],
    mnemo: [
      { tytul: 'Kolejność epok', tekst: 'Antyk – Średniowiecze – Renesans – Barok – Oświecenie – Romantyzm – Pozytywizm – Młoda Polska – Dwudziestolecie – Wojna – Współczesność.' },
      { tytul: 'Daty-kotwice', tekst: '1822 Ballady i romanse (romantyzm), 1864 upadek powstania (pozytywizm), 1918 niepodległość (dwudziestolecie).' },
    ],
  },
  'pol-wyp-kompetencje': {
    bledy: ['Brak tezy albo teza niezgodna z tematem.', 'Streszczenie zamiast argumentu.', 'Lektura obowiązkowa tylko wspomniana, bez funkcjonalnego wykorzystania.'],
    mnemo: [{ tytul: 'Argument = teza + przykład + wniosek', tekst: 'Każdy akapit: myśl (argument), dowód z lektury (scena, bohater), wniosek wiążący z tezą.' }],
  },
  'pol-wyp-kompozycja': {
    bledy: ['Brak podziału na akapity.', 'Zakończenie, które nie odnosi się do tezy.'],
    mnemo: [{ tytul: 'Układ 1–3–1', tekst: 'Wstęp z tezą, trzy akapity z argumentami, zakończenie potwierdzające tezę.' }],
  },
  'pol-wyp-jezyk': {
    bledy: ['Powtórzenia i potoczne słownictwo.', 'Błędy ortograficzne w nazwiskach i tytułach.', 'Zbyt długie, niejasne zdania.'],
    mnemo: [{ tytul: 'Tytuły', tekst: 'Tytuł utworu w cudzysłowie, bez przypadkowej wielkiej litery: „Lalka”, „Pan Tadeusz”.' }],
  },
  'ang-sluchanie': {
    bledy: ['Wybór odpowiedzi tylko dlatego, że padło w nagraniu to samo słowo.', 'Brak przeczytania pytań przed nagraniem.'],
    mnemo: [{ tytul: 'Pułapka słów', tekst: 'Powtórzone słowo z nagrania to często dystraktor – szukaj tego samego sensu innymi słowami.' }],
  },
  'ang-czytanie': {
    bledy: ['Odpowiedź z ogólnej wiedzy, a nie z tekstu.', 'Pominięcie słów: only, never, not – zmieniają sens zdania.'],
    mnemo: [{ tytul: 'Słowa-sygnały', tekst: 'however, but, although – zmiana kierunku; because, so – przyczyna i skutek.' }],
  },
  'ang-srodki': {
    bledy: ['Zła forma czasownika po: enjoy, avoid, suggest (+ -ing).', 'Present Perfect z określeniem czasu przeszłego (yesterday, ago).', 'Literówka – w zadaniach otwartych CKE liczy się poprawna pisownia.'],
    mnemo: [
      { tytul: 'Czasownik + -ing', tekst: 'enjoy, avoid, mind, suggest, finish, can’t stand – „lubię, unikam, nie znoszę… robienia”.' },
      { tytul: 'Ago = Past Simple', tekst: 'ago, yesterday, last week, in 2020 → Past Simple. Ever, never, just, already, yet → Present Perfect.' },
    ],
  },
  'ang-pisanie': {
    bledy: ['Pominięcie jednego z trzech punktów polecenia.', 'Za mało albo za dużo słów (80–130).', 'Brak formy listu/e-maila (zwrot na początku i na końcu).'],
    mnemo: [{ tytul: 'Trzy punkty = trzy akapity', tekst: 'Każdy punkt polecenia w osobnym akapicie, rozwinięty jednym-dwoma zdaniami.' }],
  },
};
