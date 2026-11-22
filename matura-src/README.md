# Matura 2027: aplikacja do nauki

Aplikacja po polsku do przygotowania do matury 2027: matematyka podstawowa
(5 maja), matematyka rozszerzona (11 maja), język polski podstawowy (4 maja)
i język angielski podstawowy (6 maja). Uczeń rozwiązuje prawdziwe zadania
z arkuszy CKE 2023–2026 jako obrazy, zamknięte sprawdzają się same, otwarte
porównuje z obrazem z zasad oceniania. Plan dnia proponuje aplikacja, a uczeń
może go zmieniać. Działa jako artefakt claude.ai z synchronizacją telefon–komputer.

## Uruchomienie

Wymagany Node.js 20 lub nowszy.

```bash
cd matura-src
npm install
npm run cke:pakiet        # obrazy zadań i nagrania do public/cke/ (z cke-obrazy/ i cke-pdf/)
npm run dev               # http://localhost:5173
npm test                  # testy logiki (Vitest)
npx tsc --noEmit          # sprawdzenie typów
npm run build:jeden-plik  # artefakt: dist-jeden-plik/matura2027.html
```

Bez pakietu `public/cke/` aplikacja działa, ale pokazuje „Ładowanie zadań…”,
a przy błędzie sieci baner z przyciskiem „Spróbuj ponownie”. Zadanie bez
obrazu nie trafia do planu ani do banku.

Plan na inny dzień: `http://localhost:5173/?dzis=2027-04-05`.

Testy w przeglądarce: `E2E_SKIP_BUILD=1 node tools/e2e-z-serwerem.mjs` (uruchamia
serwer Vite na porcie 5191 i zamyka go po testach; samo `npm run e2e` wymaga
działającego serwera na tym porcie, inaczej proces pierwszego pliku się nie kończy).

Zrzuty ekranu (Playwright, 390 px i 1280 px, jasny i ciemny):
`node tools/zrzuty.mjs <katalog> [filtr]`. Skrypt sam uruchamia serwer Vite
i wstrzykuje stan ucznia do localStorage.

## Widoki

Nawigacja: Start, Plan, Zadania, Arkusze, Postęp (dolny pasek na telefonie,
pasek boczny od 720 px) i Ustawienia. Zadanie, arkusz, diagnoza i wypracowanie
otwierają się w trybie skupienia bez nawigacji.

| Widok (adres) | Co robi |
|---|---|
| Start (`#start`) | Dni do każdego egzaminu, taśma dni, seria, prognoza (po diagnozie), plan na dziś z „Zacznij naukę”, zamianą, przeniesieniem na jutro i usunięciem z cofnięciem. Baner przypomnienia po ustawionej godzinie. |
| Plan (`#plan`) | Tydzień: lista dni na telefonie, siatka 7 kolumn na komputerze. Tryb edycji: wyżej, niżej, zamień, na jutro, usuń, dodaj zadanie, „Przelicz plan od dziś”. |
| Zadania (`#zadania`, `#zadania-mat-r-logarytmy`) | Przedmiot → temat → lista z filtrami, wyszukiwanie po temacie, roku i numerze, „Ćwicz ten temat”, „Dodaj do planu”, „Dodaj zadanie” (link i zrzut ekranu z zadania.info). |
| Zadanie (`#zadanie-<id>`) | Kartka z obrazem CKE (powiększanie), karta odpowiedzi A–D / P/F z automatycznym sprawdzeniem według `answer.scoring`, „Pokaż odpowiedź” z obrazem z zasad oceniania, samoocena 0..max dla otwartych, stoper, odtwarzacz nagrania. |
| Arkusze (`#arkusze`, `#arkusz-<id>`) | Pełne arkusze CKE: odliczanie, spis zadań, oznaczanie do powrotu, zapis postępu, po zakończeniu samoocena otwartych i wynik „X z Y, ocenione A z B”, czas z sekundami. Polski: dwie części. |
| Diagnoza (`#diagnoza-mat-p`) | 6–12 zadań CKE z różnych tematów, ok. 30 min, ekran arkusza z odliczaniem, wynik na temat. |
| Wypracowanie (`#wypracowanie-<id>`) | Temat z obrazu CKE, pole pisania, licznik słów jak CKE z minimum z danych, autozapis co 5 s, stoper, samoocena według `data/kryteria.json`. |
| Postęp (`#postep`) | Seria, liczba zadań, czas nauki, wykres prognozy, tematy, do powtórki, historia arkuszy, diagnoz i wypracowań, szacunek punktów rekrutacyjnych. |
| Ustawienia (`#ustawienia`) | Przedmioty, minuty nauki w każdym dniu, daty egzaminów, korepetycje (sobota 15:15–16:15), przypomnienie (domyślnie 18:00), motyw, rozmiar tekstu, synchronizacja, kopia, usunięcie danych. |
| Pierwsze uruchomienie (`#powitanie`) | Cztery kroki: przedmioty, czas nauki (domyślnie 45 min pn–pt, 90 min w weekend), przypomnienie, diagnoza. |

## Jak działa plan

Kod: `src/logic/planner.ts`, testy: `tests/planner.test.ts`.

- **Fazy** każdego przedmiotu liczone od daty jego egzaminu: nowe tematy do
  70 dni przed egzaminem, potem powtórka całości z arkuszem raz w tygodniu,
  od 21 dni przed egzaminem arkusz co kilka dni, dzień przed egzaminem przegląd
  tylko tego przedmiotu. W dniu egzaminu nie ma innych zadań.
- **Tylko to, co da się zrobić**: zadania z obrazem, pełne arkusze z pakietem,
  diagnoza, gdy da się złożyć co najmniej 6 zadań. Przedmiot bez zadań aplikacja
  nazywa wprost („Polski: brak zadań, plan go pomija”).
- **Bez powtarzania**: to samo zadanie najwyżej co 3 dni; po słabym wyniku
  powtórka tematu innym zadaniem; arkusz nie wraca, dopóki są nierozwiązane.
  Polski arkusz jest dzielony na arkusz 1 i arkusz 2 w osobne dni.
- **Priorytet tematu** = waga z punktów CKE × (1,5 − biegłość) × (1 + premia za
  powtarzające się słabe wyniki). Biegłość to punkty z sześciu ostatnich wyników.
- **Powtórki** co 1, 3, 7 albo 14 dni zależnie od wyniku.
- **Ręczne zmiany** (usuń, dodaj, zamień, na jutro, kolejność) są nadpisaniami
  dnia (`stan.overrides`); planer stosuje je przy każdym przeliczeniu jako
  edycję gotowego dnia: pozycje automatyczne liczą się bez nadpisań, więc
  zamiana zmienia tylko jedną pozycję, a usunięcie niczego nie dokłada.
- **Wyczerpana pula**: gdy przedmiot nie ma nowych zadań, wracają zadania
  zrobione najdawniej; w ostatnich tygodniach może wrócić najdawniej robiony arkusz.
  Dzisiejsza lista liczy się ze stanu sprzed dziś, więc nie zmienia się
  w trakcie dnia; wykonane pozycje odhaczają się po zdarzeniach z dzisiejszą datą.
- **Prognoza** pojawia się po diagnozie albo przy co najmniej 8 wynikach
  z tematów o łącznej wadze 40%.

## Zapis i synchronizacja

Szczegóły: `docs/kontrakt-danych.md`, kod: `src/store/`.

- Artefakt deklaruje `capabilities: { db: {}, user: {}, downloads: true, sample: { images: true } }`
  (`downloads` – „Eksportuj kopię”; `sample` – funkcje z Claude'em, opis niżej). Dokumenty ucznia
  są w `data/users/<id>/`: `stan`, `wyniki-RRRR-MM` (zdarzenia), `sesja-<id>`
  (trwający arkusz, diagnoza, wypracowanie), `wypracowania`, `obraz-<id>`
  (zrzuty ekranu, JPEG ≤ 150 KB). Każdy dokument ≤ 256 KiB (wyniki dzielone
  na części, gdy miesiąc jest duży).
- Jedna subskrypcja `onSnapshot` na kolekcję ucznia (bez obrazów). Zapis tylko
  po zmianie, jeden naraz na dokument, po krótkiej przerwie; przed pierwszą
  odpowiedzią serwera nic nie jest zapisywane. Po 10 s bez odpowiedzi
  aplikacja pokazuje stan offline.
- Wynik zadania to zdarzenie z id; cofnięcie to osobne zdarzenie. Wyniki zadań
  z arkusza mają pole `sev` (zdarzenie zakończenia), więc ponowne zakończenie
  („Oceń pozostałe”) cofa tylko stary komplet. Scalanie: zdarzenia po id, sesje
  według `updatedAt`, a `stan` po polach (`fieldAt`): ustawienia według czasu
  zmiany pola, nadpisania planu według dnia (pole `at`, usunięty dzień zostaje
  pustym wpisem), zadania własne jako suma po id, `resetAt` jako maksimum. „Usuń wszystkie dane”
  zapisuje `resetAt`, więc stare wyniki nie wracają z drugiego urządzenia.
- Decyzja o ekranie powitania zapada dopiero po pierwszej odpowiedzi serwera
  (albo po 10 s / bez chmury), żeby drugie urządzenie dostało stan z pierwszego.
- Błędy zapisu: utrata dostępu (`revoked`, `not_granted`) przełącza na zapis
  lokalny do końca wizyty; dokument odrzucony (`invalid_argument`, `quota_exceeded`)
  nie jest ponawiany do „Spróbuj ponownie”; `resource_exhausted` – ponowienie
  z rosnącą przerwą.
- Zrzuty ekranu zadań własnych: localStorage, a gdy pełny – IndexedDB; pełna
  pamięć przeglądarki pokazuje baner.
- Kopia w `localStorage` (`matura2027-v3`) zawsze; poza artefaktem (`db` = null)
  to jedyny zapis. Każdy dostęp do `localStorage` jest w try/catch.
- Wskaźnik w nagłówku i pasku bocznym: chmura („Zapisano 2 min temu”),
  urządzenie (zapis lokalny), chmura w czerwieni i baner przy błędzie.

## Funkcje z Claude'em (capability `sample`)

Działają tylko, gdy `window.claude.use('sample')` zwraca funkcję, a wywołania nie są
odrzucane jako `not_granted` (wtedy funkcje znikają do końca wizyty i zostaje
samoocena). Każde wywołanie idzie wyłącznie po kliknięciu, z „Myślę…” i przyciskiem
Stop (osobny AbortController), błędy mają polskie komunikaty, bez ponawiania.
Obrazy zadań i kluczy z pakietu są wysyłane jako Blob w `options.images`
(najwyżej `limits().images.maxCount`). Prompty i odczyt odpowiedzi: `src/logic/ai.ts`.

- **Sprawdź z kluczem** (zadanie otwarte): wpisany wynik / kroki albo zdjęcie z kartki
  (JPEG do 1600 px); odpowiedź JSON {points, max, verdict, feedback, mistakes} jest
  przycinana do zakresu; pod oceną zawsze obraz z zasad oceniania; uczeń może
  zmienić punkty. Zdarzenie wyniku ma `by: 'claude' | 'samoocena'` i `feedback`.
  W arkuszu: na ekranie samooceny po zakończeniu, także „Sprawdź wszystkie z Claude'em”
  (zadania z wpisanym wynikiem).
- **Wyjaśnij**: podpowiedź → pełne rozwiązanie → „Dopytaj” (cache: false, ostatnie tury);
  wzory w $…$ renderuje KaTeX (CSS i fonty w pliku artefaktu). Zapis w dokumentach
  `wyjasnienia-<examId>` (≤ 256 KiB, najstarsze odpadają).
- **Pamięć** (`pamiec`): notatki o błędach według tematu (z ocen, błędnych zamkniętych
  i dopytań), najwyżej 40 na przedmiot; trafiają do promptów i podnoszą priorytet
  tematu z błędami koncepcyjnymi. Postęp → „Co mi sprawia trudność”.
- **Ocena wypracowania / wypowiedzi pisemnej** według `data/kryteria.json` (polski: model
  `complex`); wartości dopasowane do dozwolonych, uczeń może je zmienić.
- **Fiszki** (`fiszki`, widok `#fiszki`): z zadania z angielskiego, z „tego, co mi słabo
  idzie”, z lektury; powtórki 1/3/7/14 dni; pozycja „Fiszki” w planie dnia.
- **5 minut** (`#piec-minut`): 3 krótkie zamknięte z najsłabszych tematów + 3 fiszki.
- **Twój tydzień**: na Starcie w niedzielę i do środy; „Podsumowanie od Claude'a”
  (cache 24 h); historia w Postępie (`raporty`).
- **Karta wzorów**: przycisk „Wzory” przy matematyce, gdy pakiet ma `cke/wzory.json`.
- **Lektury** (`#lektury`, dane `data/lektury/`) i **Ustny polski** (`#ustny`, dane
  `data/ustny/pytania-jawne.json`): gdy plików brak, sekcje pokazują jedno zdanie.
- **Rekrutacja**: szacunek W = 0,5·JP + 0,5·JO + 2,5·M + 2·X, X = egzamin zawodowy
  (ustawienia, domyślnie 70%).

Testy w przeglądarce z atrapą `sample`: `tests-e2e/fake-sample.mjs`, `tests-e2e/09-claude.e2e.mjs`.

## Artefakt claude.ai

`npm run build:jeden-plik` buduje `dist-jeden-plik/matura2027.html`: jeden plik
z JS, CSS, fontem Atkinson Hyperlegible Next (data URI) i danymi
`exams.json` i `kryteria.json`. Plik nie ma `<!doctype>`, `<html>`, `<head>`
ani `<body>`: zaczyna się od `<title>Matura 2027</title>` i
`<meta name="claude:viewport-fit-sides" content="cover">`.

Lista pakietów z `public/cke/` jest wbudowywana przy budowaniu (wtyczka
`virtual:cke-manifest` w `vite.config.ts`), więc aplikacja nie sprawdza każdego
arkusza osobnym żądaniem; w pamięci trzyma najwyżej 3 pakiety.

Obrazy zadań i nagrania nie są w pliku. Aplikacja pobiera je adresem względnym
`cke/<examId>.json` i `cke/<examId>.mp3`, więc pliki z `public/cke/` trzeba
opublikować obok strony (w artefakcie jako `files` pod ścieżkami `cke/…`).
Routing wyłącznie przez `location.hash` (`#start`, `#zadanie-MMAP-R0-100-2505-n6-1`),
bez `alert`, `confirm`, `print`; dźwięk tylko po kliknięciu.

`npm run build` buduje też zwykłą stronę do `../matura/` (bez obrazów CKE).

## Strona na GitHub Pages (z obrazami CKE)

```
npm run cke:pakiet      # public/cke/ (obrazy i nagrania)
npm run build:pages     # dist-pages/matura-2027/
npm run pages:publish   # wypycha stronę do franuch557/matura-2027 (main)
```

Adres: https://franuch557.github.io/matura-2027/. Strona ma obrazy i nagrania CKE,
więc jest w osobnym repo, a nie w repo z kodem.

### Konta (Supabase, projekt `matura-2027`)

- Logowanie nazwą użytkownika i hasłem (`src/views/Login.tsx`, `src/store/supabase.ts`).
  Supabase Auth wymaga e-maila, więc nazwa jest zapisana jako `<nazwa>@konto.matura2027.app`;
  konto tworzy funkcja `rejestracja` (od razu potwierdzone, bez wysyłania poczty).
  Hasła nie da się odzyskać e-mailem; zmiana hasła jest w Ustawieniach → Konto.
- Dane konta: tabela `docs (user_id, id, typ, data jsonb)` z RLS (każdy widzi tylko swoje),
  te same dokumenty co capability `db` artefaktu (`supaDb` w `src/store/supabase.ts`, używa go `Sync`).
  Zmiany z innego urządzenia przychodzą przez Realtime.
- Kopia lokalna jest osobna dla każdego konta (`setStorageScope`).
- Logowanie działa tylko w buildzie `pages`; serwer deweloperski i testy działają bez kont.

### Plan matematyki

Priorytety działów uwzględniają tier-listy matemaks.pl 2027 (`src/logic/tiers.ts`): tier S+…D
jako mnożnik i etapy (S+ i S → A → B → C i D); następny etap dostaje pełną wagę po opanowaniu
poprzedniego na 60%.

### Ładowanie obrazów na stronie

`npm run build:pages` po zbudowaniu dzieli pakiety (`tools/pakiety-na-pliki.mjs`): obrazy z base64
idą do `cke/img/<arkusz>/<zad|odp|ctx>/<klucz>.webp`, a `cke/<arkusz>.json` ma same ścieżki (ok. 1–5 KB).
Otwarcie zadania pobiera jeden obraz (zwykle 10–300 KB) zamiast całego pakietu (do 8 MB).
`npm run pages:publish` wysyła najpierw obrazy partiami do ok. 40 MB, potem resztę strony.
Serwer deweloperski i artefakt dalej używają pakietów base64 z `public/cke/`.

### Tryby

- **W tramwaju** (`#tramwaj`, `src/views/Commute.tsx`): jedno szybkie zadanie (zamknięte do 4 min,
  otwarte za 1–2 pkt, warianty), losowanie z przedmiotu i tematu, „Sprawdź” albo „Pokaż klucz”.
- **Wyjaśnienia z materiałów CKE** (`src/views/explainParts.tsx`, `scripts/wyjasnienia.mts`):
  matematyka – wzorcowe rozwiązanie, polski – przykładowe odpowiedzi CKE, angielski – odpowiedzi
  akceptowane i błędne. Bez modelu i bez API.

### Metody nauki

- **Warianty zadań** (`src/logic/variants.ts`, ekran `#cwiczenie-<przedmiot>-<temat>`): 22 typy zadań
  z działów S+ i S (podstawa i rozszerzenie) z losowanymi danymi, kluczem w formacie CKE i krokami
  rozwiązania. Plan daje „ćwiczenie”, gdy zadania CKE z tematu się skończą (raz dziennie na przedmiot).
- **Przykład → luki → samodzielnie**: pierwszy wariant typu to pełne rozwiązanie, drugi z lukami
  w krokach, kolejne samodzielnie z podpowiedziami krok po kroku.
- **Podpowiedzi do zadań CKE** (`src/views/hintParts.tsx`): kolejne kroki wzorcowego rozwiązania CKE;
  każda podpowiedź obniża wkład wyniku w biegłość (−20%, najwyżej −60%, pole `hints` wyniku).
- **Poziomy opanowania** (`src/logic/levels.ts`): nowy → poznany → ćwiczony → opanowany; „opanowany”
  po bezbłędnym zadaniu z tematu w sprawdzianie mieszanym (`#sprawdzian`, wyniki `src: 'sprawdzian'`).
- **Cel dnia i zamrożenie serii** (`streakInfo` w `src/logic/events.ts`): jeden opuszczony dzień
  w środku serii nie przerywa jej, najwyżej raz na 7 dni nauki. Tryb „Mam 10 minut” (`#dziesiec-minut`).
- **Fiszki „Ucz się”** (`src/logic/learn.ts`): wybór z 4 odpowiedzi, potem wpisywanie z pamięci.
- **Cel procentowy** (`targets` w stanie, `targetTopics` w `src/logic/tiers.ts`): działy spoza celu ×0,3.
- **Zeszyt błędów** (`#bledy`): zadania z wynikiem poniżej maksimum, z „Podobne zadanie” (wariant).

### Ocena bez Claude'a

- zadania zamknięte: klucz CKE;
- matematyka, zadania otwarte (`src/logic/mathGrade.ts`, `mathExpr.ts`): z każdego poziomu
  punktacji i wariantu „ALBO” biorę wyniki pośrednie i równania; w rozwiązaniu ucznia szukam
  tych samych wartości (liczonych numerycznie: √52 = 2√13) i równań równoważnych
  (4x + 6y = 36 ≡ 2x + 3y = 18). Najwyższy pokryty poziom = punkty. Sam wynik bez rozwiązania
  nie daje maksimum. Progi: `npx tsx scripts/trenuj-ocene.mts` (na wzorcowych rozwiązaniach CKE).
- polski, zadania otwarte (`src/logic/textGrade.ts`): sens odpowiedzi porównany z przykładowymi
  odpowiedziami CKE modelem `paraphrase-multilingual-MiniLM-L12-v2` w przeglądarce (ok. 118 MB,
  pobierany raz z Hugging Face). Wektory przykładów i progi: `npx tsx scripts/trenuj-polski.mts`.
- matematyka: także krótkie odpowiedzi z pola „Rozwiązanie” (przedziały z rodzajem nawiasu, liczby,
  uzupełnienia zdań) i dowody (postać „do postaci …” z klucza, porównana tożsamościowo i z tym
  samym działaniem głównym; maksimum po wszystkich krokach i wniosku);
- angielski, zadania otwarte (`src/logic/englishGrade.ts`, klucze `scripts/klucze-angielski.mts`):
  poprawne i błędne odpowiedzi z tabel zasad, warianty „a/b”, „(a/an)”, skróty równoważne;
  odpowiedź spoza klucza jest „niepewna” (CKE uznaje też inne poprawne);
- zadania bez klucza do automatycznego sprawdzenia (część dowodów i zbiorów, 3 zadania z angielskiego):
  poziomy punktacji CKE do wyboru (`rubric`) i porównanie wyniku z kluczem (`src/logic/rubric.ts`);
- fiszki ze zdjęcia: OCR w przeglądarce (tesseract.js) (`src/logic/ocr.ts`);
- plan wypowiedzi ustnej: lista kontrolna według kryteriów CKE (`src/logic/oralCheck.ts`).

Dane kluczy: `data/klucze.json` (z importu: poziomy z wariantami, wzorcowe rozwiązania,
przykładowe odpowiedzi; ułamki i potęgi odtworzone z położenia znaków w PDF, `mathLines`).

## Dodawanie zadań z zadania.info

Aplikacja niczego nie pobiera z zadania.info. W banku „Dodaj zadanie”: wklejony
link (numer zadania z adresu), zrzut ekranu (Ctrl+V albo wybór pliku), treść
z dopiskiem „Materiał pobrany z portalu zadania.info”. Zadanie bez zrzutu
i bez treści się nie zapisze; do planu trafiają tylko zadania ze zrzutem.

## Struktura

```
matura-src/
  data/exams.json, data/kryteria.json  arkusze CKE i kryteria (agent danych)
  public/cke/                          pakiet obrazów i nagrań (npm run cke:pakiet, poza repozytorium)
  scripts/                             import PDF, pakiet, walidacja
  tools/jeden-plik.mjs                 składanie pliku artefaktu
  tools/zrzuty.mjs                     zrzuty ekranu Playwrightem
  src/model.ts                         typy stanu ucznia, zdarzeń, sesji, planu
  src/logic/                           planer, wagi, powtórki, biegłość, diagnoza,
                                       sprawdzanie i wynik arkusza, sesje, formaty
  src/store/                           katalog, stan, scalanie, synchronizacja db, localStorage
  src/ui/                              komponenty: kartka CKE, karta A–D, odtwarzacz, router
  src/views/                           ekrany
  tests/                               testy Vitest
  docs/projekt-v3.md                   projekt wyglądu
```
