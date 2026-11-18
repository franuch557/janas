# Matura 2027: plan nauki

Aplikacja webowa po polsku do przygotowania do matury 2027 z matematyki
(poziom podstawowy i rozszerzony), języka polskiego i języka angielskiego.
Sprawdza wiedzę diagnozą, codziennie podaje konkretne zadania z banku,
planuje powtórki i arkusze próbne oraz pokazuje postęp. Działa bez konta,
dane są tylko w przeglądarce.

## Uruchomienie

Wymagany Node.js 20 lub nowszy.

```bash
cd matura-src
npm install
npm run dev        # http://localhost:5173
npm test           # testy logiki (Vitest)
npm run build      # wersja do publikacji w katalogu ../matura
```

`npm run build` zapisuje stronę do katalogu `matura/` w głównym katalogu
repozytorium, z adresem bazowym `/janas/matura/`. Po scaleniu z gałęzią
`main` GitHub Pages pokaże ją pod `https://franuch557.github.io/janas/matura/`.
Strona nie ładuje nic z zewnątrz: fonty (Source Serif 4, Source Sans 3)
i KaTeX są w buildzie. Po pierwszym wczytaniu działa także bez internetu,
dopóki przeglądarka trzyma pliki w pamięci podręcznej (nie ma service workera).

Do sprawdzania planu na inny dzień: `http://localhost:5173/?dzis=2027-04-05`.

Przykładowe dane: Ustawienia → Przykładowe dane. To odwołania do stron
z zadaniami w książce „Jak zdać maturę. Matematyka rozszerzona 2027”
(ze spisu treści) i opcjonalnie przykładowe wyniki do obejrzenia wykresów.
Wszystkie mają identyfikator `demo-…` i usuwa je jeden przycisk.

## Widoki

| Widok | Co robi |
|---|---|
| Dziś | Zadania dnia z checkboxem, stoper (start, pauza, stop), wynik w punktach albo procentach, typ błędu i notatka. Wynik aktualizuje bank, wagi i powtórki. |
| Plan | Tydzień jako siedem kolumn. Dni minione pokazują zapis, przyszłe są przeliczane. |
| Diagnoza | Test z zadań z banku albo samoocena 1–5. Historia diagnoz. |
| Zadania z tematu | Przedmiot → temat → lista z filtrami. Dodawanie zadań, zrzuty ekranu, import linków. |
| Arkusze próbne | Arkusz CKE z bazy albo zestaw z banku. Odliczanie, punkty, rozbicie na tematy, zadania do powtórki. |
| Postęp | Prognoza z zakresem niepewności, wykres wyników, mapa tematów, punkty rekrutacyjne, propozycje zmian wag. |
| Dziennik błędów | Wpisy z typem błędu. Dwa błędy koncepcyjne w temacie w 30 dni podnoszą jego priorytet. |
| Analiza | Punkty tematów z arkuszy w zakresie lat, trend, średnie, wagi i wagi ręczne. |
| Ustawienia | Daty, przedmioty, tydzień, zajęcia, korepetycje, limity, motyw, rekrutacja, eksport i import. |

## Jak działa plan

- **Czas dnia**: okna godzin dla każdego dnia tygodnia, przycięte do godzin
  dozwolonych (domyślnie 6:00–22:00). Korepetycje (sobota 15:15, 60 min)
  odejmują pełny czas trwania. Inne zajęcia odejmują część wspólną z oknem.
- **Fazy** (osobno dla każdego przedmiotu): do 31 marca nowe tematy, od 1 do 30
  kwietnia powtórka całości (każdy temat co najmniej raz w tygodniu, najpierw
  najsłabsze wyniki), od 1 maja arkusz co dwa dni i przegląd błędów, wzorów
  i schematów. Dzień przed egzaminem tylko przegląd. Daty są w ustawieniach.
- **Diagnozy** na start: po jednej dziennie, od przedmiotu o największej ważności.
- **Arkusz próbny** w fazach 1 i 2 raz w tygodniu, w dniu z największą ilością
  czasu, przedmioty po kolei. Arkusz, który się nie mieści, jest opisany w notatce dnia.
- **Zadania dnia**: najpierw powtórki z terminem na dziś, potem tematy według
  priorytetu. Suma minut nie przekracza czasu dnia; to, co się nie mieści,
  jest w sekcji „Przesunięte”.
- **Priorytet tematu** = waga z arkuszy × (1,5 − biegłość) × (1 + błędy
  koncepcyjne). Biegłość to średnia trzech ostatnich wyników. Waga ręczna
  zastępuje wyliczoną.
- **Powtórki**: odstęp 1, 3, 7 albo 14 dni zależnie od wyniku (< 50%, 50–69%,
  70–89%, ≥ 90%). Zadanie z wynikiem ≥ 90% po powtórce 14-dniowej jest zrobione.
- **Przeliczanie**: każda zmiana ustawień przelicza plan od dziś. Dzień,
  w którym zapisano wynik albo kliknięto „Zatwierdź plan dnia”, zostaje bez zmian.
- **Opuszczony dzień**: domyślnie plan przelicza się sam (niezrobione zadania
  wracają). Do wyboru lista zaległych albo pytanie za każdym razem.
- **Notatka z korepetycji** (opcja w ustawieniach) trafia do banku i zmniejsza
  ilość angielskiego w dniach od piątku do niedzieli.

## Struktura danych

Stan aplikacji to jeden obiekt JSON w `localStorage` pod kluczem
`matura2027-stan` (typ `AppState` w `src/types.ts`). Obrazy zadań są w
IndexedDB (`matura2027-obrazy`), bo nie mieszczą się w `localStorage`.

| Pole | Zawartość |
|---|---|
| `settings` | przedmioty z datami i celami, daty faz, zakres lat, okna tygodnia, zajęcia, limity, tryb wag, wagi ręczne, motyw, rekrutacja |
| `bank` | zadania: przedmiot, źródło, adres lub strona, identyfikator, temat, typ, trudność, czas wzorcowy, status, data i wynik, termin powtórki, notatka, obraz, historia wyników |
| `diagnoses` | diagnozy (test albo samoocena) z wynikiem na temat; wszystkie zostają w historii |
| `dayLog` | zapisane dni: lista pozycji i wyniki; dzień zamrożony nie zmienia się |
| `mocks` | arkusze próbne z punktami za zadania |
| `errors` | dziennik błędów |
| `lessonNotes`, `backlog`, `missedHandled`, `weightSuggestionsSeen` | notatki z korepetycji, zaległe zadania, obsłużone dni, pominięte propozycje wag |

### `data/exams.json`

Każdy arkusz: `id` (kod CKE), `family`, `level`, `year`, `session`,
`formula`, `maxPoints`, `minutes`, `urls` (arkusz, zasady), `status`
(`pełny`, `częściowy`, `tylko metadane`), `tasks`, `groups`, `sources`.
Każde zadanie: `nr` (np. `6.1`; w polskim `A1.5` i `A2.1` dla arkuszy 1 i 2),
`maxPoints`, `type` (`zamknięte`, `otwarte`), `topics`, `summary` (początek
polecenia), `proof`, `cases`, `page`, `source`. `groups` to zadania, dla
których znana jest tylko łączna punktacja. `null` znaczy: brak danych
w sprawdzonym źródle. `data/exams-issues.md` zawiera rozbieżności i braki
(`npm run validate`).

Taksonomia tematów: `src/data/taxonomy.ts`. Spis treści książki z przypisaniem
tematów do stron: `src/data/book.ts`.

## Import arkuszy CKE

W tej sesji pobieranie z cke.gov.pl zostało zablokowane, a `robots.txt`
serwisu CKE zabrania automatycznego przeglądania. Dlatego `exams.json`
zawiera tylko metadane (lata 2023–2026, maksima punktów, czasy, adresy
plików, które widziałem) i rozkład punktów arkusza rozszerzonego 2025
z założeń projektu. Pełne dane powstają z plików PDF, które pobierasz sam:

1. Otwórz stronę „Arkusze” formuły 2023 na cke.gov.pl i pobierz dla każdego
   roku arkusz i zasady oceniania w wariancie 100, np.
   `MMAP-R0-100-A-2505-arkusz.pdf` i `MMAP-R0-100-2505-zasady.pdf`.
   Adresy plików z 2026 r. są w `scripts/cke-2026-adresy.txt`.
   Nie zmieniaj nazw plików.
2. Zapisz je w jednym katalogu, np. `matura-src/cke-pdf/` (jest w `.gitignore`).
3. Uruchom:
   ```bash
   npm run import-cke -- cke-pdf
   npm run import-cke -- cke-pdf --obrazy   # także wycinki zadań (wymaga pdftoppm z pakietu poppler)
   ```
4. Skrypt dopisze zadania z punktacją z nagłówków „Zadanie N. (0–k)”, typ,
   dowód, tematy z listy słów kluczowych, początek polecenia i numer strony.
   Tematy i „rozważenie przypadków” rozpoznaje automatycznie: sprawdź je
   i popraw w `exams.json`. Żeby skrypt nie nadpisał poprawki, zacznij pole
   `source` zadania od słowa `ręcznie`.
5. Sprawdź `data/exams-issues.md`, a potem uruchom `npm test` (test
   referencyjny arkusza 2025 nadal musi przechodzić) i `npm run build`.
6. Z opcją `--obrazy` powstaje `cke-obrazy.zip`. Zaimportuj go w aplikacji:
   Ustawienia → Dane → Obrazy arkuszy CKE. Obrazy nie trafiają do
   repozytorium, bo strona jest publiczna, a nie sprawdziłem zasad
   ponownego publikowania fragmentów arkuszy.

## Dodawanie zadań

Aplikacja nie tworzy treści zadań ani odpowiedzi.

- **zadania.info.** Regulamin serwisu (z 3 lipca 2025) zabrania pobierania
  zawartości bazy, a `robots.txt` wyklucza boty AI z całego serwisu. Dlatego
  aplikacja nic stamtąd nie pobiera. Możesz:
  - wkleić adres zadania (Zadania z tematu → Dodaj zadanie). Numer zadania
    aplikacja odczyta z adresu;
  - wkleić zrzut ekranu (Ctrl+V w formularzu albo wybór pliku);
  - wkleić listę adresów albo wybrać zapisaną w przeglądarce stronę działu
    (plik HTML). Aplikacja odczyta tylko adresy, które są w tekście;
  - wkleić treść zadania. Aplikacja dopisze „Materiał pobrany z portalu
    zadania.info”, bo treści zadań są na licencji CC BY-SA 4.0.
- **Książka.** Wybierz źródło „książka” i wpisz numer strony. Aplikacja pokaże
  dział i podrozdział ze spisu treści i zaproponuje temat.
- **Własne.** Dowolny opis, adres, zrzut ekranu albo treść (wzory w `$…$`).

## Eksport i import danych

Ustawienia → Dane → Eksportuj do pliku zapisuje cały stan, opcjonalnie
z obrazami, do pliku `matura2027-RRRR-MM-DD.json`. Import zastępuje wszystkie
dane w przeglądarce. Telefon i komputer mają osobne dane, więc przenoś je
tym plikiem.

## Struktura katalogów

```
matura-src/
  data/exams.json, data/exams-issues.md   dane arkuszy i rozbieżności
  scripts/                                import PDF, walidacja, generator metadanych
  src/logic/                              planer, wagi, diagnoza, powtórki, prognoza (bez React)
  src/store/                              stan, zapis, bank, obrazy, akcje
  src/views/, src/components/             widoki i wykresy SVG
  tests/                                  testy Vitest
  docs/plan-wizualny.md                   paleta, typografia, zarys widoków
  docs/niezweryfikowane.md                lista rzeczy niesprawdzonych
../research/aplikacje.md                  analiza istniejących narzędzi (etap 1)
../matura/                                zbudowana strona (npm run build)
```
