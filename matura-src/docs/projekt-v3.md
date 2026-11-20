# Projekt wizualny i interakcji, wersja 3

Ten dokument zastępuje `docs/plan-wizualny.md` (wersja 2). Opisuje wygląd i działanie
aplikacji budowanej od nowa: tokeny, komponenty, nawigację i każdy ekran.

## 1. Kierunek

### Dlaczego poprzednie wersje nie zadziałały

- Wersja 1 (ciemny zeszyt w kratkę) była ozdobna i ciężka. Kratka konkurowała z obrazami
  zadań CKE, a ciemne tło utrudniało czytanie skanów.
- Wersja 2 (biała kartka) wyglądała jak dokument tekstowy. Akcje były podkreślonymi
  linkami („Szczegóły”, „Dodaj”, „Ukryj”), więc nic nie wyglądało na klikalne. Brakowało
  granic między obiektami: zadanie, lista i komunikat miały tę samą wagę. Na telefonie
  cele dotyku miały ok. 24 px wysokości.

### Pomysł wersji 3: arkusz w aplikacji

Aplikacja ma chłodne, jasnoszare tło i białe powierzchnie, na których leżą obiekty
nauki. Najważniejszym obiektem jest arkusz CKE: wycięty obraz zadania pokazany jak kartka
papieru, a pod nim karta odpowiedzi z polami A, B, C, D wzorowana na karcie odpowiedzi
z prawdziwego egzaminu. Uczeń rozpoznaje ten układ z próbnych matur, więc aplikacja
mówi jego językiem.

Jedna rzecz ma charakter: **taśma dni** na ekranie startowym. To rząd małych komórek
od pierwszego dnia nauki do 4 maja 2027. Komórki dni z nauką są wypełnione, dzisiejsza
ma obrys, dni egzaminów mają znacznik. Taśma łączy trzy informacje w jedną: ile dni
zostało, jak wygląda seria i gdzie są egzaminy. Wszystko wokół niej jest spokojne.

### Zasady

1. Każda akcja wygląda jak przycisk. Podkreślony tekst służy tylko do linków
   zewnętrznych (CKE, źródła).
2. Na ekranie jest jeden główny przycisk w kolorze atramentu. Reszta jest drugorzędna.
3. Karta oznacza obiekt, który można otworzyć albo który ma własny stan (zadanie, dzień
   planu, arkusz). Tekst objaśniający nie dostaje karty.
4. Kolor niesie znaczenie: atrament to akcja, zielony to poprawnie, czerwony to błąd,
   bursztyn to seria i przypomnienia. Kolory przedmiotów pojawiają się tylko w małych
   znacznikach.
5. Cele dotyku mają co najmniej 48 px na telefonie i 40 px na komputerze.
6. Liczby zawsze cyframi tabelarycznymi, żeby kolumny wyników się nie przesuwały.

## 2. Paleta

Sześć kolorów rdzenia. Każdy ma odpowiednik w trybie ciemnym. Tryb domyślny: zgodny
z systemem, przełącznik w ustawieniach (jasny, ciemny, systemowy).

| Token | Nazwa | Jasny | Ciemny | Użycie |
|---|---|---|---|---|
| `--tlo` | tło | `#F3F5F9` | `#10141C` | tło aplikacji pod kartami |
| `--powierzchnia` | powierzchnia | `#FFFFFF` | `#182030` | karty, pasek nawigacji, okna |
| `--tekst` | tusz | `#17202E` | `#E8ECF3` | tekst główny, ikony |
| `--atrament` | atrament | `#3346D3` | `#8E9CFF` | główny przycisk, zaznaczenie, postęp, aktywna zakładka |
| `--dobrze` | zieleń | `#12805C` | `#46C892` | poprawna odpowiedź, zaliczony temat |
| `--zle` | czerwień | `#C2372F` | `#FF8077` | błędna odpowiedź, błąd zapisu |

Kolory pomocnicze, wyprowadzone z rdzenia:

| Token | Jasny | Ciemny | Użycie |
|---|---|---|---|
| `--tekst-2` | `#556070` | `#9AA6B8` | tekst drugorzędny, opisy, meta |
| `--linia` | `#DDE2EA` | `#2C3749` | obrysy kart, podziały list (dekoracyjne) |
| `--obrys-pola` | `#7F8A9C` | `#6B788C` | obrys pól formularza i pól A–D (min. 3:1) |
| `--powierzchnia-2` | `#EEF1F6` | `#212B3D` | tło paska postępu, nieaktywne segmenty, wiersze listy po najechaniu |
| `--atrament-tlo` | `#E8EBFC` | `#252F5C` | zaznaczona opcja, aktywna pozycja menu |
| `--na-atramencie` | `#FFFFFF` | `#10163A` | tekst na przycisku głównym |
| `--dobrze-tlo` / `--dobrze-tekst` | `#E3F4EC` / `#0E6B4C` | `#16352B` / `#46C892` | tło i tekst stanu poprawnego |
| `--zle-tlo` / `--zle-tekst` | `#FCE9E7` / `#A8302A` | `#3D1E1F` / `#FF8077` | tło i tekst stanu błędnego |
| `--seria` | `#A85A00` | `#F0A649` | seria dni, przypomnienia, ostrzeżenie o czasie |
| `--seria-tlo` / `--seria-tekst` | `#FDF0DC` / `#8A4A00` | `#3A2A12` / `#F0A649` | tło komunikatów ostrzegawczych |
| `--kartka` | `#FFFFFF` | `#FFFFFF` | tło obrazu zadania CKE, także w trybie ciemnym |

Obraz zadania zawsze leży na białej kartce, bo skany CKE mają białe tło. W trybie ciemnym
kartka ma obrys `--linia` i 12 px marginesu wewnętrznego, więc wygląda jak położona na
ciemnym biurku, a nie jak rażąca dziura w ekranie. Obrazów nie odwracamy kolorystycznie,
bo wykresy i rysunki geometryczne tracą wtedy czytelność.

### Znaczniki przedmiotów

Każdy przedmiot ma kolor używany wyłącznie w małym znaczniku (kropka 8 px i skrót) oraz
w obrysie taśmy przedmiotu na ekranie postępu. Znacznik ma zawsze tekst, więc kolor
nie jest jedynym nośnikiem informacji.

| Przedmiot | Skrót w znaczniku | Jasny | Ciemny |
|---|---|---|---|
| matematyka podstawowa | mat. p. | `#0F766E` | `#5EC9BE` |
| matematyka rozszerzona | mat. r. | `#5B3CC4` | `#B9A6FF` |
| język polski | pol. | `#B0306A` | `#FF8CBD` |
| język angielski | ang. | `#8A6100` | `#E3B341` |

### Kontrast (WCAG 2.1)

Zmierzone współczynniki. Tekst wymaga 4,5:1, elementy interfejsu i duży tekst 3:1.

| Para | Jasny | Ciemny |
|---|---|---|
| tusz na powierzchni | 16,4 | 13,8 |
| tusz na tle | 15,0 | 15,6 |
| tekst-2 na powierzchni | 6,4 | 6,6 |
| tekst-2 na tle | 5,8 | 7,5 |
| tekst przycisku na atramencie | 7,1 | 7,0 |
| atrament jako tekst na powierzchni | 7,1 | 6,5 |
| atrament na atrament-tlo | 6,0 | 5,1 |
| zieleń jako tekst na powierzchni | 4,9 | 7,7 |
| dobrze-tekst na dobrze-tlo | 5,7 | 6,3 |
| czerwień jako tekst na powierzchni | 5,4 | 6,7 |
| zle-tekst na zle-tlo | 5,8 | 6,1 |
| seria na powierzchni | 5,1 | 8,0 |
| obrys pola na powierzchni | 3,5 | 3,6 |
| znaczniki przedmiotów na powierzchni | 5,5 do 7,3 | 7,6 do 8,4 |

`--linia` (1,3:1) służy tylko do podziałów dekoracyjnych. Każdy element, który trzeba
zauważyć, żeby go użyć (pole formularza, pole A–D, przełącznik), ma `--obrys-pola`.

## 3. Typografia

**Krój: Atkinson Hyperlegible Next**, pakiet `@fontsource-variable/atkinson-hyperlegible-next`
(wersja zmienna, oś wagi 200–800, podzbiory `latin` i `latin-ext` z pełnym kompletem
polskich znaków; sprawdzone w plikach pakietu). Zastępuje Source Sans 3, który można
odinstalować razem z Source Serif 4.

Uzasadnienie:

- Krój zaprojektowano dla czytelności w małych rozmiarach i dla osób słabiej widzących.
  Rozróżnia znaki, które w nauce matematyki są źródłem błędów: `1`, `l`, `I`, `0`, `O`,
  `5` i `S`, `6` i `b`. Uczeń wpisuje wyniki i czyta je z ekranu telefonu.
- Ma cyfry tabelaryczne (`tnum`) i ułamki (`frac`), potrzebne w wynikach, licznikach
  i odliczaniu czasu.
- Ma wyraźny, nieco szkolny charakter bez dekoracji. Source Sans 3 był poprawny, ale
  bezosobowy i kojarzy się z wersją 2, którą uczeń odrzucił.
- Jedna rodzina na całą aplikację. Charakter nagłówków budują waga i rozmiar.

Wzory w treściach (opisy tematów, podpowiedzi) dalej renderuje KaTeX swoją czcionką.

### Skala

Podstawa 16 px na telefonie i komputerze. Skala oparta na proporcji ok. 1,25.

| Styl | Rozmiar / interlinia | Waga | Użycie |
|---|---|---|---|
| liczba duża | 40 / 44 | 700 | dni do matury, prognoza procentowa, wynik arkusza |
| tytuł ekranu | 28 / 34 | 700 | nagłówek ekranu |
| nagłówek sekcji | 20 / 26 | 650 | „Na dziś”, „Ten tydzień” |
| tytuł karty | 17 / 24 | 650 | nazwa zadania, nazwa dnia |
| tekst | 16 / 24 | 400 | treść, opisy |
| tekst mały | 14 / 20 | 400 | meta, podpisy pod liczbami |
| znacznik | 13 / 16 | 600 | znaczniki przedmiotów, stany |
| przycisk | 16 / 20 | 650 | wszystkie przyciski |
| licznik czasu | 22 / 28 | 650, `tnum` | stoper i odliczanie |
| wypracowanie | 18 / 30 | 400 | pole pisania wypracowania, max 68 znaków w linii |

Zasady: wielkie litery tylko na początku zdania i w nazwach własnych. Bez rozstrzelonych
etykiet nad nagłówkami. Długość linii tekstu do 72 znaków. Liczby w tabelach,
licznikach i postępie mają `font-variant-numeric: tabular-nums`.

## 4. Odstępy, siatka, kształty, ruch

### Skala odstępów (bazowa jednostka 4 px)

| Token | Wartość | Przykład |
|---|---|---|
| `--o-1` | 4 px | odstęp ikony od tekstu w znaczniku |
| `--o-2` | 8 px | odstęp między znacznikami, między liczbą a podpisem |
| `--o-3` | 12 px | odstęp między kartami na liście, wnętrze znacznika |
| `--o-4` | 16 px | wnętrze karty na telefonie, margines boczny ekranu na telefonie |
| `--o-5` | 24 px | wnętrze karty na komputerze, odstęp między sekcjami w karcie |
| `--o-6` | 32 px | odstęp między sekcjami ekranu |
| `--o-7` | 48 px | odstęp nad stopką, margines boczny na komputerze |

### Siatka

- Telefon (do 719 px): jedna kolumna, margines 16 px, dolny pasek nawigacji 64 px plus
  bezpieczny obszar systemu.
- Tablet i małe okno (720–1079 px): jedna kolumna treści do 720 px, nawigacja jako
  wąski pasek boczny z ikonami i podpisami (80 px).
- Komputer (od 1080 px): boczny pasek nawigacji 240 px, treść do 960 px, na ekranie
  startowym i w planie dwie kolumny (2/3 i 1/3). Ekran zadania ma własny układ, opisany
  niżej.
- Wyrównanie do lewej wszędzie. Do środka wyrównujemy tylko liczby w kafelkach statystyk
  i pola A–D.

### Kształty i głębia

Promień rośnie z wielkością obiektu, żeby hierarchia była widoczna:

| Element | Promień |
|---|---|
| znacznik, pole wyboru | 6 px |
| przycisk, pole formularza, pole A–D | 10 px |
| karta | 14 px |
| okno dialogowe, dolny arkusz na telefonie | 20 px (tylko górne rogi dla dolnego arkusza) |
| kartka z zadaniem CKE | 4 px, bo to papier |

Karty nie mają cienia: oddziela je biała powierzchnia na szarym tle i obrys `--linia`.
Cień (`0 4px 16px rgb(23 32 46 / 0.12)`, w ciemnym `0 4px 16px rgb(0 0 0 / 0.4)`) mają
tylko elementy unoszące się nad treścią: dolny pasek nawigacji, okna, dolne arkusze,
powiadomienia. Bez gradientów, bez przezroczystych rozmyć.

### Ruch

- Ruch odpowiada na działanie ucznia: zaznaczenie odpowiedzi (100 ms), rozwinięcie
  odpowiedzi (200 ms, wysokość i przezroczystość), przesunięcie zadania w planie
  (150 ms), wypełnienie paska postępu po zapisaniu wyniku (400 ms).
- Jedyny ruch bez działania ucznia: po wejściu na start dzisiejsza komórka taśmy dni
  wypełnia się raz, jeśli dziś zrobiono już zadanie.
- `prefers-reduced-motion: reduce` wyłącza wszystkie przejścia poza zmianą koloru.

### Fokus

Obrys 2 px w kolorze `--atrament` z odstępem 2 px, na każdym elemencie interaktywnym,
widoczny tylko przy nawigacji klawiaturą (`:focus-visible`).

## 5. Komponenty

### 5.1 Przyciski

| Rodzaj | Wygląd | Użycie |
|---|---|---|
| główny | tło `--atrament`, tekst `--na-atramencie`, wysokość 48 px (telefon) / 44 px (komputer), szerokość pełna na telefonie | jedna główna akcja ekranu: „Zacznij naukę”, „Sprawdź”, „Zapisz wynik” |
| drugorzędny | tło `--powierzchnia`, obrys 1,5 px `--obrys-pola`, tekst `--tekst` | „Pokaż odpowiedź”, „Pomiń”, „Zamień” |
| cichy | bez tła i obrysu, tekst `--atrament`, tło `--atrament-tlo` po najechaniu | akcje w kartach: „Zmień”, „Usuń z planu” |
| ikonowy | 48 × 48 px na telefonie, 40 × 40 px na komputerze, ikona 24 px, zawsze z `aria-label` i podpowiedzią | zamknij, menu karty, odtwórz |
| niszczący | jak drugorzędny, tekst i obrys `--zle` | „Usuń dane”, „Przerwij arkusz” |

Stany: najechanie przyciemnia tło o 8% (w ciemnym rozjaśnia), naciśnięcie o 14%
i przesuwa treść o 1 px w dół, wyłączony ma przezroczystość 40% i kursor
`not-allowed`, ładowanie zamienia tekst na wskaźnik i zachowuje szerokość. Tekst
przycisku to czasownik i dopełnienie, bez strzałek i bez wykrzykników.

### 5.2 Znacznik

Wysokość 24 px, promień 6 px, tło `--powierzchnia-2`, tekst 13 px 600. Rodzaje:
przedmiot (kropka w kolorze przedmiotu i skrót), źródło („CKE 2025, maj”), typ
(„zamknięte”, „otwarte, 3 pkt”), stan („zrobione” w zieleni, „do powtórki”
w bursztynie).

### 5.3 Karta zadania na liście

```
┌───────────────────────────────────────────────┐
│ ● mat. r.   CKE 2025, maj, zad. 4     15 min  │
│ Logarytmy: równanie z parametrem              │
│ otwarte, 3 pkt                                │
│                                               │
│ [ Rozwiąż ]                         ( ⋯ )     │
└───────────────────────────────────────────────┘
```

- Cała karta jest klikalna i otwiera ekran zadania. Przycisk „Rozwiąż” to ten sam cel,
  widoczny dla jasności. Menu `⋯` (ikonowy) otwiera: „Zamień na inne”, „Przenieś na
  jutro”, „Usuń z planu”.
- Wysokość minimalna 96 px na telefonie.
- Stan zrobione: na lewym brzegu pasek 4 px w zieleni, tytuł zostaje czarny, w miejscu
  przycisku wynik „2 z 3 pkt” i cichy przycisk „Zobacz”.
- Stan w trakcie (rozpoczęte, niezapisane): pasek 4 px w atramencie, przycisk
  „Wróć do zadania”.

### 5.4 Kartka z zadaniem CKE

Obraz na tle `--kartka`, promień 4 px, obrys `--linia`, margines wewnętrzny 12 px.
Pod obrazem mały podpis `--tekst-2`: „Arkusz CKE, maj 2025, poziom rozszerzony,
zadanie 4”. Dotknięcie obrazu otwiera podgląd na pełnym ekranie z przybliżaniem
gestem i przyciskami „Powiększ” i „Pomniejsz”. Szerokość obrazu nie przekracza
720 px, żeby tekst arkusza miał rozmiar zbliżony do papieru.

### 5.5 Karta odpowiedzi A–D

Wzorowana na karcie odpowiedzi CKE: cztery kwadratowe pola w rzędzie.

```
Zaznacz odpowiedź
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  A   │ │  B   │ │  C   │ │  D   │
└──────┘ └──────┘ └──────┘ └──────┘
[            Sprawdź            ]
```

- Pole ma 64 × 64 px na telefonie i 56 × 56 px na komputerze, odstęp 12 px, litera
  22 px 700. Grupa to `radiogroup`, strzałki przesuwają wybór, klawisze A, B, C, D
  wybierają bezpośrednio.
- Stany:

| Stan | Wygląd |
|---|---|
| spoczynek | tło `--powierzchnia`, obrys 1,5 px `--obrys-pola` |
| najechanie | tło `--powierzchnia-2` |
| wybrane | tło `--atrament-tlo`, obrys 2 px `--atrament`, litera w atramencie |
| poprawna (wybrana) | tło `--dobrze-tlo`, obrys 2 px `--dobrze`, pod literą ikona ✓, pod grupą komunikat „Dobrze. Odpowiedź B.” |
| błędna (wybrana) | tło `--zle-tlo`, obrys 2 px `--zle`, ikona ✕ |
| poprawna (niewybrana, po błędzie) | obrys 2 px przerywany `--dobrze`, ikona ✓, komunikat „Twoja odpowiedź: C. Poprawna: B.” |
| zablokowane po sprawdzeniu | pozostałe pola mają przezroczystość 50% |

- Przycisk „Sprawdź” jest wyłączony, dopóki nic nie zaznaczono. Po sprawdzeniu zamienia
  się w „Dalej” (następne zadanie z planu), a obok pojawia się drugorzędny „Pokaż
  rozwiązanie”, jeśli w zasadach oceniania jest komentarz.
- Wynik zapisuje się od razu po sprawdzeniu. Komunikat ma `aria-live="polite"`. Kolor
  zawsze idzie w parze z ikoną i tekstem.

### 5.6 Samoocena zadania otwartego

```
Ile punktów przyznajesz sobie?
( 0 ) ( 1 ) ( 2 ) ( 3 )      z 3 pkt
[          Zapisz wynik          ]
```

Segmentowany wybór (pola 48 × 48 px, promień 10 px), liczba segmentów równa liczbie
punktów za zadanie. Wybór jest możliwy dopiero po odsłonięciu odpowiedzi; wcześniej
w tym miejscu stoi drugorzędny „Pokaż odpowiedź”. Pod wyborem pole „Notatka do błędu”
(opcjonalne, jedna linia, rozwija się po dotknięciu).

### 5.7 Odpowiedź z zasad oceniania

Przycisk drugorzędny „Pokaż odpowiedź” rozwija pod zadaniem drugą kartkę z obrazem
z zasad oceniania CKE i podpisem „Zasady oceniania CKE, maj 2025”. Przycisk zmienia
etykietę na „Ukryj odpowiedź”. W arkuszu próbnym ten przycisk nie istnieje do końca
arkusza.

### 5.8 Odtwarzacz nagrania (angielski, słuchanie)

```
┌───────────────────────────────────────────────┐
│ (▶)  Nagranie do zadania 2         0:42 / 3:10 │
│      ━━━━━━━━━━●───────────────────────────    │
│      [ cofnij 5 s ]  [ 1× ]   odtworzono 1 z 2 │
└───────────────────────────────────────────────┘
```

- Przycisk odtwórz i wstrzymaj: okrąg 56 px w atramencie. Suwak postępu: wysokość toru
  6 px, uchwyt 20 px, cel dotyku 44 px wysokości. Spacja odtwarza i wstrzymuje.
- „cofnij 5 s” i prędkość (0,75×, 1×) są dostępne w trybie nauki.
- Na egzaminie nagranie słychać dwa razy. W arkuszu próbnym odtwarzacz liczy
  odtworzenia, blokuje przewijanie i po dwóch odtworzeniach pokazuje „Nagranie
  odtworzone 2 razy, jak na egzaminie.” W trybie nauki licznik jest tylko informacją.
- Odtwarzacz jest przyklejony do górnej krawędzi ekranu zadania podczas przewijania,
  żeby uczeń widział obraz zadania i sterował nagraniem jednocześnie.

### 5.9 Licznik czasu

- Stoper w zadaniu: znacznik w nagłówku ekranu zadania, „12:04”, 22 px `tnum`, ikona
  zegara, dotknięcie wstrzymuje („wstrzymano”). Porównuje się z zalecanym czasem
  zadania: po jego przekroczeniu liczby zmieniają kolor na `--seria` bez dźwięku.
- Odliczanie w arkuszu próbnym: w nagłówku „1:47:12 do końca”. Przy 15 minutach do
  końca nagłówek dostaje tło `--seria-tlo` i komunikat „Zostało 15 minut.” Przy końcu
  czasu arkusz się zamyka i przechodzi do podsumowania. Licznik ma `role="timer"`,
  komunikaty ostrzegawcze `aria-live="assertive"` tylko dwa razy (15 i 5 minut).

### 5.10 Pasek postępu

- Liniowy: tor 8 px `--powierzchnia-2`, wypełnienie `--atrament`, promień pełny. Nad nim
  etykieta i wartość („Plan na dziś, 2 z 4 zadań”). Używany w planie dnia i w arkuszu.
- Segmentowany: w arkuszu próbnym rząd segmentów, jeden na zadanie. Kolory: puste
  `--powierzchnia-2`, odpowiedziane `--atrament`, oznaczone do powrotu obrys
  `--seria`, bieżące obrys 2 px `--tekst`. Segmenty są przyciskami do skoku do zadania
  (na telefonie otwierają spis zadań zamiast mikroskopijnych celów).
- Postęp tematu: ten sam pasek liniowy, ale wypełnienie w kolorze przedmiotu i podpis
  „opanowane 62%”.

### 5.11 Taśma dni

Rząd komórek 6 × 18 px z odstępem 2 px (na telefonie przewijana poziomo, widok
ustawiony na dziś). Komórka dnia z nauką: `--atrament`; bez nauki: `--powierzchnia-2`;
dziś: obrys 2 px `--tekst`; dzień egzaminu: wyższa komórka 6 × 28 px w kolorze
przedmiotu, z podpisem pod spodem przy pierwszym egzaminie („4 maja, polski”).
Pod taśmą: „Seria: 6 dni” w kolorze `--seria`. Dotknięcie komórki pokazuje dzień
i co zrobiono. Dla czytników ekranu taśma ma opis tekstowy: „Uczysz się 6 dni z rzędu.
Do pierwszego egzaminu 165 dni.”

### 5.12 Kafelek statystyki

Liczba duża (40 px), pod nią tekst mały `--tekst-2`. Bez ikon i kolorowych akcentów.
Używany tylko na starcie i w postępie, maksymalnie trzy w rzędzie.

### 5.13 Pola formularza

Wysokość 48 px, promień 10 px, obrys 1,5 px `--obrys-pola`, etykieta nad polem
(14 px 600), podpowiedź pod polem (14 px `--tekst-2`), błąd pod polem w `--zle-tekst`
z ikoną. Przełączniki 52 × 32 px. Listy wyboru jako natywny `select` w tym samym
stylu, na telefonie jako dolny arkusz z listą pozycji po 52 px.

### 5.14 Komunikaty

- Powiadomienie (toast): na dole nad paskiem nawigacji, tło `--tekst`, tekst
  `--powierzchnia`, 4 s, z akcją cofnięcia przy usuwaniu („Usunięto z planu.
  Cofnij”).
- Baner w treści: karta z tłem `--seria-tlo` albo `--zle-tlo`, ikona, jedno zdanie
  i przycisk działania, np. „Nie udało się zapisać na serwerze. Wyniki są na tym
  urządzeniu. Spróbuj ponownie”.
- Stan synchronizacji: w nagłówku mała ikona chmury z podpowiedzią „Zapisano 2 min
  temu”; przy błędzie ikona w czerwieni i baner.

### 5.15 Puste stany

Jedno zdanie, co tu będzie, i główny przycisk, co zrobić. Przykład w banku: „Brak
zadań w tym temacie w arkuszach z lat 2023–2025.” i przycisk „Pokaż sąsiedni temat”.

## 6. Nawigacja

Pięć miejsc pierwszego poziomu: **Start, Plan, Zadania, Arkusze, Postęp**.
Ustawienia są ikoną w nagłówku (telefon) i na dole paska bocznego (komputer).
Wypracowanie jest otwierane z planu i z banku (polski, wypowiedź pisemna), a nie jako
osobna zakładka, bo to rodzaj zadania. Diagnoza jest częścią pierwszego uruchomienia
i dostępna później z ekranu Postęp. Dawny „Dziennik błędów” i „Analiza” są sekcjami
ekranu Postęp.

### Telefon

```
┌──────────────────────────────┐
│ Matura 2027          (☁)(⚙) │  nagłówek 56 px, tytuł ekranu na starcie
├──────────────────────────────┤
│                              │
│           treść              │
│                              │
├──────────────────────────────┤
│  ⌂      ▦      ☰      ◫     ▲│  dolny pasek 64 px, ikona 24 px
│ Start  Plan  Zadania Arkusze Postęp
└──────────────────────────────┘
```

Każda pozycja: ikona i podpis 12 px 600, cel 64 × 64 px. Aktywna pozycja ma ikonę
i podpis w atramencie oraz kapsułę `--atrament-tlo` 56 × 32 px za ikoną. Pasek znika
na ekranie zadania, arkusza i wypracowania (tryb skupienia), gdzie nagłówek ma
przycisk „Zamknij” po lewej.

### Komputer

```
┌──────────────┬──────────────────────────────────────────┐
│ Matura 2027  │                                          │
│              │                                          │
│ ⌂ Start      │                                          │
│ ▦ Plan       │               treść                      │
│ ☰ Zadania    │                                          │
│ ◫ Arkusze    │                                          │
│ ▲ Postęp     │                                          │
│              │                                          │
│ seria 6 dni  │                                          │
│ ☁ zapisano   │                                          │
│ ⚙ Ustawienia │                                          │
└──────────────┴──────────────────────────────────────────┘
```

Pasek boczny 240 px, tło `--powierzchnia`, pozycje 44 px, aktywna z tłem
`--atrament-tlo` i tekstem w atramencie. Skróty: `g s` start, `g p` plan, `g z` zadania,
`g a` arkusze, `g o` postęp, `?` lista skrótów.

Adresy (hash, bo aplikacja działa jako artefakt): `#start`, `#plan`, `#zadania/mat-r/logarytmy`,
`#zadanie/<id>`, `#arkusze/<id>`, `#wypracowanie/<id>`, `#postep`, `#ustawienia`.
Przycisk wstecz przeglądarki zawsze działa.

## 7. Ekrany

### 7.1 Start (podsumowanie i plan na dziś)

Cel: w 3 sekundy wiedzieć, ile zostało i co robić dziś, i jednym dotknięciem zacząć.

Telefon:

```
┌──────────────────────────────┐
│ Piątek, 20 listopada  (☁)(⚙)│
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ 165 dni                  │ │
│ │ do pierwszego egzaminu,  │ │
│ │ polski 4 maja            │ │
│ │ ▮▮▮▮▮▯▮▮▮▮▮▮[ ]▯▯▯▯▯▯▯▯▯ │ │  taśma dni
│ │ Seria: 6 dni             │ │
│ │ ──────────────────────── │ │
│ │ Prognoza                 │ │
│ │ mat. p.  ━━━━━━━━── 74%  │ │
│ │ mat. r.  ━━━━────── 41%  │ │
│ │ pol.     ━━━━━━──── 58%  │ │
│ │ ang.     ━━━━━━━━━─ 86%  │ │
│ │ [ Zobacz postęp ]        │ │ cichy
│ └──────────────────────────┘ │
│                              │
│ Na dziś         2 z 4, 35 min│
│ ━━━━━━━━━━━━━───────────────  │
│ [      Zacznij naukę       ] │ główny, otwiera pierwsze niezrobione
│ ┌──────────────────────────┐ │
│ │▌● mat. r.  CKE 2025 z. 4 │ │ zrobione, pasek zielony
│ │▌Logarytmy     2 z 3 pkt  │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ● ang.  CKE 2024 z. 2    │ │
│ │ Rozumienie ze słuchu     │ │
│ │ zamknięte, 5 pkt  10 min │ │
│ │ [ Rozwiąż ]        ( ⋯ ) │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ● pol.  wypracowanie     │ │
│ │ Plan wypracowania        │ │
│ │ ... 20 min               │ │
│ └──────────────────────────┘ │
│ [ Dodaj zadanie ]            │ drugorzędny
├──────────────────────────────┤
│ Start Plan Zadania Arkusze Postęp
└──────────────────────────────┘
```

Komputer: dwie kolumny. Lewa (2/3): „Na dziś” z paskiem, głównym przyciskiem i kartami.
Prawa (1/3): karta podsumowania (dni, taśma, seria, prognoza). Na telefonie podsumowanie
jest nad planem, zgodnie z decyzją ucznia, ale jest zwarte (ok. 320 px), żeby pierwsza
karta zadania była widoczna bez przewijania na ekranie 844 px.

Działanie:
- Prognoza to szacowany wynik procentowy z każdego przedmiotu, liczony z wyników zadań
  ważonych udziałem tematów w arkuszach. Dotknięcie wiersza otwiera przedmiot w Postępie.
  Przed diagnozą zamiast pasków jest karta „Zrób diagnozę, żeby zobaczyć prognozę.”
  z głównym przyciskiem „Zacznij diagnozę”.
- „Zacznij naukę” otwiera pierwsze niezrobione zadanie i prowadzi przez kolejne
  („Dalej” w ekranie zadania). Gdy wszystko zrobione: „Plan na dziś zrobiony.
  Seria: 7 dni.” i drugorzędny „Dodaj zadanie”.
- Menu `⋯` karty: „Zamień na inne” (dolny arkusz z 3 propozycjami z tego samego tematu
  i przyciskiem „Inny temat”), „Przenieś na jutro”, „Usuń z planu” (z cofnięciem
  w powiadomieniu). Na komputerze karty można przeciągać, żeby zmienić kolejność;
  na telefonie kolejność zmienia się w trybie edycji planu.
- Przypomnienie: jeśli o ustawionej godzinie nic nie zrobiono, na górze startu pojawia
  się baner bursztynowy „Dziś jeszcze nic. 15 minut wystarczy, żeby utrzymać serię.”
  z przyciskiem „Zacznij naukę”.

### 7.2 Zadanie (pełny ekran rozwiązywania)

Cel: skupienie na arkuszu. Brak nawigacji głównej, jedna oczywista akcja.

Telefon, zadanie zamknięte:

```
┌──────────────────────────────┐
│ (✕)   2 z 4      ⏱ 03:12  (⋯)│  nagłówek 56 px
├──────────────────────────────┤
│ ● mat. p.  CKE 2025, maj,    │
│ zad. 7, zamknięte, 1 pkt     │
│ ┌──────────────────────────┐ │
│ │                          │ │
│ │  [obraz zadania z        │ │  kartka, biała
│ │   arkusza CKE]           │ │
│ │                          │ │
│ └──────────────────────────┘ │
│ Arkusz CKE, maj 2025, zad. 7 │
│                              │
│ Zaznacz odpowiedź            │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │ A  │ │ B  │ │ C  │ │ D  │  │
│ └────┘ └────┘ └────┘ └────┘  │
├──────────────────────────────┤
│ [         Sprawdź          ] │  przyklejony do dołu
└──────────────────────────────┘
```

Po sprawdzeniu (błędnie):

```
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │ A  │ ┆ B ✓┆ │ C ✕│ │ D  │  │
│ └────┘ └────┘ └────┘ └────┘  │
│ ┌──────────────────────────┐ │
│ │ ✕ Twoja odpowiedź: C.    │ │  tło zle-tlo
│ │   Poprawna: B.           │ │
│ └──────────────────────────┘ │
│ [ Pokaż rozwiązanie ]        │
├──────────────────────────────┤
│ [          Dalej           ] │
```

Zadanie otwarte:

```
│ [obraz zadania]              │
│ Rozwiąż na kartce, potem     │
│ porównaj z zasadami oceniania│
│ [     Pokaż odpowiedź      ] │  drugorzędny, pełna szerokość
│ ── po odsłonięciu ──         │
│ [obraz z zasad oceniania]    │
│ Ile punktów przyznajesz sobie?
│ (0) (1) (2) (3)    z 3 pkt   │
│ Notatka do błędu (opcjonalnie)
├──────────────────────────────┤
│ [       Zapisz wynik       ] │  wyłączony do wyboru punktów
```

Komputer (od 1080 px): dwie kolumny. Lewa (ok. 60%): kartka z zadaniem, przewijana.
Prawa (ok. 40%), przyklejona: znaczniki, karta odpowiedzi albo samoocena, główny
przycisk, a po odsłonięciu kartka z zasad oceniania. Dzięki temu treść zadania
i odpowiedź są widoczne jednocześnie.

Szczegóły:
- `(✕)` zamyka i wraca tam, skąd uczeń przyszedł. Jeśli zadanie jest rozpoczęte, stan
  zostaje zapisany jako „w trakcie”.
- „2 z 4” to pozycja w planie dnia; w banku zamiast tego jest nazwa tematu.
- Menu `(⋯)`: „Zamień na inne”, „Pomiń na dziś”, „Zgłoś błąd w zadaniu”.
- Stoper rusza przy otwarciu, zatrzymuje się przy sprawdzeniu lub zapisie. Czas zapisuje
  się z wynikiem.
- Angielski, słuchanie: odtwarzacz (5.8) nad kartką, przyklejony podczas przewijania.
- Klawiatura: A–D wybór, Enter sprawdź lub dalej, O pokaż odpowiedź, 0–9 punkty, Esc
  zamknij.

### 7.3 Plan tygodnia z edycją

Cel: zobaczyć tydzień, poprawić propozycję aplikacji, nie tracić czasu na planowanie.

Telefon:

```
┌──────────────────────────────┐
│ Plan                 [Edytuj]│
├──────────────────────────────┤
│ (‹)  16–22 listopada    (›)  │
│ ┌──┬──┬──┬──┬──┬──┬──┐       │
│ │Pn│Wt│Śr│Cz│Pt│So│Nd│       │  pasek dni 56 px, kropka pod dniem
│ │✓ │✓ │✓ │✓ │● │  │  │       │  = stan dnia
│ └──┴──┴──┴──┴──┴──┴──┘       │
│ Piątek, dziś      4 zadania, 45 min
│ ┌──────────────────────────┐ │
│ │ ● mat. r. Logarytmy 15 min│ │
│ │ ● ang.  Słuchanie   10 min│ │
│ │ ● pol.  Wypracowanie 20 min│ │
│ │ [ Dodaj zadanie ]         │ │
│ └──────────────────────────┘ │
│ Sobota          2 zadania, 30 min
│ ┌──────────────────────────┐ │
│ │ ...                       │ │
│ └──────────────────────────┘ │
│ Niedziela        wolne       │
└──────────────────────────────┘
```

Tryb edycji (po „Edytuj”, przycisk zmienia się w „Gotowe”):

```
│ ┌──────────────────────────┐ │
│ │ ≡ ● mat. r. Logarytmy  (⇄)(🗑)│  uchwyt, zamień, usuń
│ │ ≡ ● ang.  Słuchanie    (⇄)(🗑)│
│ └──────────────────────────┘ │
│ [ Przelicz plan od dziś ]    │
```

Komputer: siedem kolumn dni obok siebie (siatka tygodnia), każda kolumna to karta dnia
z listą zadań w zwartej formie (znacznik, tytuł, czas). Zadania przeciąga się między
dniami. Prawa kolumna znika; nad siatką pasek: zakres tygodnia, „Edytuj”, „Przelicz
plan od dziś”.

Szczegóły:
- Dni przeszłe są zwinięte i pokazują wynik („3 z 3 zrobione, 82%”).
- „Zamień” (`⇄`) otwiera dolny arkusz z propozycjami z tego samego tematu. „Usuń”
  usuwa z cofnięciem. Uchwyt `≡` na telefonie działa przytrzymaniem i przeciągnięciem;
  alternatywą bez gestów są przyciski „Wyżej” i „Niżej” w menu zadania.
- „Przelicz plan od dziś” pyta: „Przeliczyć plan od dziś? Twoje ręczne zmiany w
  przyszłych dniach zostaną zastąpione.” z przyciskami „Przelicz” i „Anuluj”.
- Ręcznie zmienione zadania mają mały znacznik „zmienione przez ciebie”, żeby było
  widać, co aplikacja zaproponowała, a co uczeń.
- Dzień z większym obciążeniem niż dostępny czas pokazuje „50 z 45 min” w bursztynie.

### 7.4 Bank zadań (przedmiot, temat, lista)

Cel: znaleźć zadania z konkretnego tematu w trzech dotknięciach.

Poziom 1, przedmioty:

```
┌──────────────────────────────┐
│ Zadania                  (⌕) │
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │ ● Matematyka podstawowa  │ │
│ │ 412 zadań, 18 tematów    │ │
│ │ ━━━━━━━━━━──── 64% zrobione│
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ● Matematyka rozszerzona │ │
│ │ ...                      │ │
│ └──────────────────────────┘ │
│ (polski, angielski)          │
└──────────────────────────────┘
```

Poziom 2, tematy przedmiotu (lista w jednej karcie, wiersze 64 px):

```
│ (‹) Matematyka rozszerzona   │
│ ┌──────────────────────────┐ │
│ │ Logarytmy         24 zad.│ │
│ │ ━━━━────── 41%  słabe    │ │  słabe = bursztyn
│ │──────────────────────────│ │
│ │ Ciągi             31 zad.│ │
│ │ ━━━━━━━━── 78%           │ │
│ │──────────────────────────│ │
│ │ ...                      │ │
│ └──────────────────────────┘ │
│ Sortuj: (według arkuszy) (najsłabsze) │ segmenty
```

Poziom 3, lista zadań tematu:

```
│ (‹) Logarytmy                │
│ (wszystkie)(niezrobione)(do powtórki)(zamknięte)(otwarte) │ chipy filtrów, przewijane
│ ┌──────────────────────────┐ │
│ │ CKE 2025, maj, zad. 4    │ │
│ │ otwarte, 3 pkt  2 z 3 pkt│ │
│ │──────────────────────────│ │
│ │ CKE 2024, maj, zad. 9    │ │
│ │ zamknięte, 1 pkt  nowe   │ │
│ └──────────────────────────┘ │
│ [ Ćwicz ten temat ]          │ główny, przyklejony: seria 5 zadań
```

Komputer: układ trzech paneli obok siebie (przedmioty 220 px, tematy 300 px, lista
reszta). Wybór w lewym panelu aktualizuje prawe, bez przeładowania. Wiersz zadania
na komputerze ma po prawej przycisk cichy „Dodaj do planu”.

Szczegóły:
- Wyszukiwanie (`⌕`) szuka po nazwie tematu, roku i numerze zadania („2024 9”).
- Filtry to chipy wielokrotnego wyboru, wysokość 36 px, cel dotyku 48 px; aktywny ma
  tło `--atrament-tlo` i obrys atramentu.
- Wiersz zadania otwiera ekran zadania (7.2). Menu wiersza: „Dodaj do planu na dziś”,
  „Dodaj do planu na inny dzień”.
- Puste wyniki filtrów: „Brak zadań dla tych filtrów.” i przycisk „Wyczyść filtry”.

### 7.5 Arkusz próbny

Cel: odtworzyć warunki egzaminu: czas, kolejność, brak podglądu odpowiedzi.

Lista arkuszy:

```
│ Arkusze                      │
│ ┌──────────────────────────┐ │
│ │ ● mat. p.  CKE maj 2025  │ │
│ │ 180 min, 46 pkt          │ │
│ │ Twój wynik: 31 z 46, 67% │ │
│ │ [ Zobacz wynik ] [ Powtórz ]│
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ ● ang.  CKE maj 2024     │ │
│ │ 120 min, 50 pkt, nagrania│ │
│ │ [ Zacznij arkusz ]       │ │
│ └──────────────────────────┘ │
```

Ekran przed startem: nazwa arkusza, czas, liczba zadań, zasady jednym akapitem
(„Odpowiedzi zobaczysz po zakończeniu. Możesz wracać do zadań. Nagrania odtworzą się
dwa razy.”), przełącznik „Odliczaj czas” (domyślnie włączony), główny „Zacznij arkusz”.

W trakcie, telefon:

```
┌──────────────────────────────┐
│ (✕)  Zad. 7 z 31   1:47:12   │  odliczanie
│ ▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯ (spis)   │  segmenty, przycisk spisu
├──────────────────────────────┤
│ [obraz zadania]              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │ A  │ │ B  │ │ C  │ │ D  │  │  tylko wybór, bez sprawdzania
│ └────┘ └────┘ └────┘ └────┘  │
│ [ Oznacz do powrotu ]        │  cichy
├──────────────────────────────┤
│ [ Poprzednie ] [ Następne  ] │  następne = główny
└──────────────────────────────┘
```

Zadania otwarte w arkuszu mają pole „Zrobione na kartce” (przełącznik) zamiast
samooceny; samoocena przychodzi po zakończeniu. Spis zadań to dolny arkusz z siatką
numerów (48 × 48 px): odpowiedziane wypełnione, oznaczone obrysem bursztynowym.
Ostatnie zadanie ma główny przycisk „Zakończ arkusz”, który pyta: „Zakończyć arkusz?
Bez odpowiedzi: 3 zadania.” z przyciskami „Zakończ” i „Wróć do arkusza”.

Po zakończeniu:
1. Wynik zadań zamkniętych od razu („Zamknięte: 18 z 24 pkt”).
2. Samoocena otwartych zadanie po zadaniu: kartka zadania, kartka z zasad oceniania,
   wybór punktów, „Dalej”.
3. Podsumowanie: liczba duża „31 z 46, 67%”, porównanie z prognozą, lista tematów
   z największą stratą punktów i główny przycisk „Dodaj słabe tematy do planu”.

Komputer: ten sam układ dwóch kolumn co ekran zadania; segmenty widoczne w całości
w nagłówku, klikalne. Wyjście (`✕`) w trakcie pyta „Przerwać arkusz? Odpowiedzi
zostaną zapisane i możesz wrócić później.” z przyciskami „Przerwij” i „Wróć do
arkusza”; czas zatrzymuje się na czas przerwy.

### 7.6 Wypracowanie (polski)

Cel: napisać tekst w warunkach zbliżonych do egzaminu i ocenić go według kryteriów CKE.

Telefon:

```
┌──────────────────────────────┐
│ (✕)  Wypracowanie  ⏱ 41:20 (⋯)│
├──────────────────────────────┤
│ (Temat) (Tekst) (Ocena)      │  segmenty 44 px
├──────────────────────────────┤
│ Temat: [obraz tematu z       │  zakładka Temat
│ arkusza CKE]                 │
├──────────────────────────────┤
│ Zakładka Tekst:              │
│ ┌──────────────────────────┐ │
│ │ Pole pisania, 18/30 px,  │ │
│ │ bez obramowania w środku │ │
│ │ karty                    │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ 287 z min. 300 słów  zapisano│  pasek dolny, przyklejony nad
│ ━━━━━━━━━━━━━━━━━━━━━━━━━──  │  klawiaturą
└──────────────────────────────┘
```

Zakładka Ocena (lista kontrolna):

```
│ Samoocena według kryteriów CKE           │
│ ┌──────────────────────────────────────┐ │
│ │ Wypracowanie jest na temat i ma      │ │
│ │ formę zgodną z poleceniem            │ │
│ │ (tak) (częściowo) (nie)              │ │
│ │──────────────────────────────────────│ │
│ │ Stanowisko jest uzasadnione          │ │
│ │ argumentami z lektury obowiązkowej   │ │
│ │ ...                                  │ │
│ │──────────────────────────────────────│ │
│ │ Kompozycja, styl, język, ortografia, │ │
│ │ interpunkcja ...                     │ │
│ └──────────────────────────────────────┘ │
│ Szacowany wynik: 24 z 35 pkt             │
│ [ Zapisz ocenę ]                         │
```

Komputer: dwie kolumny. Lewa: kartka z tematem (przewijana). Prawa: pole pisania
o szerokości do 68 znaków, pod nim licznik słów. Ocena otwiera się jako panel z prawej
zamiast tekstu, z możliwością powrotu do tekstu.

Szczegóły:
- Licznik słów liczy słowa jak CKE (wyrazy rozdzielone spacją, liczby jako słowa).
  Kolory: poniżej minimum `--tekst-2` z podpisem „z min. 300 słów”, od minimum
  `--dobrze` z ikoną ✓. Minimum wynika z arkusza (np. 300 słów na poziomie
  podstawowym), nie jest wpisane na sztywno.
- Zapis automatyczny co 5 sekund i przy wyjściu; stan „zapisano” obok licznika.
- Stoper opcjonalny, domyślnie odlicza czas zalecany dla wypracowania; uczeń może
  go wyłączyć w menu `(⋯)`.
- Lista kontrolna ma kryteria z zasad oceniania CKE dla danej formuły egzaminu,
  pogrupowane jak w zasadach. Każde kryterium to wybór segmentowy z wartościami
  punktowymi; suma liczy się na bieżąco. Przycisk „Pokaż opis kryterium” rozwija
  pełny opis z zasad oceniania.
- Wypracowania zapisują się w historii w Postępie z liczbą słów i oceną.

### 7.7 Postęp

Cel: zobaczyć, czy nauka działa i co poprawić.

```
┌──────────────────────────────┐
│ Postęp                       │
├──────────────────────────────┤
│ ┌────────┐┌────────┐┌────────┐│
│ │ 6 dni  ││ 142    ││ 23 h   ││  kafelki: seria, zadania, czas
│ │ seria  ││ zadania││ nauki  ││
│ └────────┘└────────┘└────────┘│
│ (mat. p.)(mat. r.)(pol.)(ang.)│  segmenty przedmiotów
│ ┌──────────────────────────┐ │
│ │ Prognoza 41%             │ │
│ │ wykres tygodniowy:       │ │
│ │ linia prognozy od        │ │
│ │ diagnozy do dziś         │ │
│ └──────────────────────────┘ │
│ Tematy                       │
│ ┌──────────────────────────┐ │
│ │ Logarytmy  ━━━━──── 41%  │ │
│ │ Ciągi      ━━━━━━━─ 78%  │ │
│ │ ...                       │ │
│ └──────────────────────────┘ │
│ Do powtórki       12 zadań   │
│ ┌──────────────────────────┐ │
│ │ lista zadań z błędem,    │ │
│ │ z notatką do błędu       │ │
│ └──────────────────────────┘ │
│ [ Powtórz błędy ]            │  główny
│ Historia: arkusze, wypracowania, diagnoza │
└──────────────────────────────┘
```

Komputer: kafelki w rzędzie, pod nimi dwie kolumny: wykres prognozy i tematy (lewa),
do powtórki i historia (prawa).

Szczegóły:
- Wykres prognozy: jedna linia w kolorze przedmiotu, oś Y 0–100%, poziome linie
  pomocnicze co 20%, przerywana linia 30% (próg zdania). Punkty: diagnoza, arkusze
  próbne (większe). Etykieta wartości tylko przy ostatnim punkcie.
- Tematy sortowane według wagi w arkuszach i słabości; słabe tematy mają znacznik
  „słabe” w bursztynie. Dotknięcie otwiera temat w banku.
- „Powtórz diagnozę” jest w historii, jako drugorzędny przycisk.

### 7.8 Ustawienia

Lista sekcji w kartach, wiersze 56 px, wartość po prawej.

```
│ Ustawienia                   │
│ Nauka                        │
│ ┌──────────────────────────┐ │
│ │ Przedmioty     4 wybrane (›)│
│ │ Czas nauki w dni  pn–pt 45 min, (›)
│ │                   sb 60, nd wolne
│ │ Data egzaminów  harmonogram CKE 2027 (›)
│ └──────────────────────────┘ │
│ Przypomnienie                │
│ ┌──────────────────────────┐ │
│ │ Przypominaj o nauce  [●─]│ │
│ │ Godzina          18:00 (›)│ │
│ └──────────────────────────┘ │
│ Wygląd                       │
│ ┌──────────────────────────┐ │
│ │ Motyw (jasny)(ciemny)(systemowy)│
│ │ Rozmiar tekstu (normalny)(duży) │
│ └──────────────────────────┘ │
│ Dane                         │
│ ┌──────────────────────────┐ │
│ │ Synchronizacja  zapisano 2 min temu│
│ │ Eksportuj kopię      (›) │ │
│ │ Importuj kopię       (›) │ │
│ └──────────────────────────┘ │
│ [ Usuń wszystkie dane ]      │  niszczący
```

Szczegóły:
- Czas nauki: siedem wierszy dni z wyborem minut (0, 15, 30, 45, 60, 90) jako
  segmenty. Zmiana proponuje „Przelicz plan od dziś”.
- Przypomnienie: w artefakcie przypomnienie działa przez baner przy otwarciu aplikacji
  po ustawionej godzinie oraz, jeśli przeglądarka pozwala, powiadomienie systemowe.
  Pod przełącznikiem zdanie wyjaśniające, jak działa na tym urządzeniu.
- Rozmiar tekstu „duży” mnoży skalę przez 1,125.
- Usunięcie danych pyta: „Usunąć wszystkie dane? Wyniki znikną ze wszystkich
  urządzeń.” z przyciskami „Usuń dane” i „Anuluj”.

### 7.9 Pierwsze uruchomienie (onboarding)

Cel: w 2 minuty ustawić plan, potem przejść do diagnozy. Kroki to rzeczywista sekwencja,
więc mają numerację i pasek kroków.

```
┌──────────────────────────────┐
│ Krok 1 z 4          [Pomiń]  │
│ ━━━━━━━──────────────────────│
├──────────────────────────────┤
│ Z czego zdajesz maturę?      │  tytuł 28 px
│ ┌──────────────────────────┐ │
│ │ [✓] Matematyka podstawowa│ │  wiersze-pola wyboru 64 px
│ │ [✓] Matematyka rozszerzona│ │
│ │ [✓] Język polski         │ │
│ │ [✓] Język angielski      │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [          Dalej           ] │
└──────────────────────────────┘
```

Kroki:
1. **Przedmioty**: lista z polami wyboru (jak wyżej).
2. **Czas nauki**: „Ile czasu możesz się uczyć?” Segmenty dla dni powszednich i dla
   weekendu (15, 30, 45, 60, 90 min), pod spodem zdanie wynikowe „Około 5 godzin
   tygodniowo.”
3. **Przypomnienie**: „Kiedy ci przypominać?” Wybór godziny i przełącznik.
   Przycisk „Dalej” oraz cichy „Bez przypomnień”.
4. **Diagnoza**: „Zacznij od diagnozy.” Opis: „Około 30 minut na przedmiot,
   prawdziwe zadania CKE. Wynik ustawi plan i prognozę. Przedmioty możesz robić
   osobno, w różne dni.” Lista przedmiotów jako karty z czasem i przyciskiem
   „Zacznij”. Główny przycisk „Zacznij od matematyki podstawowej”, cichy „Zrobię
   później”.

Diagnoza korzysta z ekranu arkusza próbnego (7.5) z odliczaniem 30 minut i bez
podglądu odpowiedzi. Po każdym przedmiocie: „Diagnoza z matematyki podstawowej
zapisana. Prognoza: 62%.” i przyciski „Następny przedmiot” oraz „Przejdź do planu”.

Komputer: ten sam przebieg w karcie 560 px na środku ekranu, bez paska nawigacji.
Kroki można cofać przyciskiem „Wstecz” obok „Dalej”.

## 8. Słownik działań

Ta sama akcja ma tę samą nazwę wszędzie, a komunikat po niej używa tego samego słowa.

| Działanie | Przycisk | Komunikat po |
|---|---|---|
| rozpoczęcie nauki z planu | Zacznij naukę | brak, otwiera zadanie |
| otwarcie zadania | Rozwiąż | brak |
| sprawdzenie zamkniętego | Sprawdź | Dobrze. Odpowiedź B. / Twoja odpowiedź: C. Poprawna: B. |
| odsłonięcie odpowiedzi | Pokaż odpowiedź / Ukryj odpowiedź | brak |
| zapis punktów | Zapisz wynik | Zapisano wynik: 2 z 3 pkt. |
| zamiana zadania | Zamień na inne | Zamieniono zadanie. |
| usunięcie z planu | Usuń z planu | Usunięto z planu. Cofnij |
| przeniesienie | Przenieś na jutro | Przeniesiono na jutro. |
| arkusz | Zacznij arkusz / Zakończ arkusz | Arkusz zakończony. |
| wypracowanie | Zapisz ocenę | Zapisano ocenę: 24 z 35 pkt. |

## 9. Czego nie robimy

- Podkreślonych linków jako przycisków, przycisków bez obrysu lub tła poza „cichymi”
  w kartach.
- Gradientów, rozmyć, cieni pod kartami, ozdobnych teł (kratka, linie zeszytu).
- Etykiet wielkimi literami, wykrzykników, strzałek w przyciskach, kropek jako
  separatorów meta (używamy przecinków).
- Koloru jako jedynego nośnika informacji: każdy stan ma też ikonę lub tekst.
- Celów dotyku mniejszych niż 48 px na telefonie.
- Odwracania kolorów skanów CKE w trybie ciemnym.

## 10. Porównanie z wersją 2

| Obszar | Wersja 2 | Wersja 3 |
|---|---|---|
| akcje | podkreślony tekst | przyciski z tłem lub obrysem, jeden główny na ekran |
| struktura | tekst rozdzielony liniami | karty dla obiektów na szarym tle |
| nawigacja | 9 pozycji tekstowych u góry | 5 pozycji z ikonami, pasek dolny lub boczny |
| zadanie | rozwijane w liście | pełny ekran skupienia, karta odpowiedzi A–D |
| motywacja | zdanie z liczbą dni | taśma dni, seria, prognoza z paskami |
| krój | Source Sans 3 | Atkinson Hyperlegible Next |
| kolor | grafit i żółty zakreślacz | atrament, zieleń, czerwień, bursztyn, znaczniki przedmiotów |
