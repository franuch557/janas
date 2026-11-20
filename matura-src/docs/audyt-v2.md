# Audyt aplikacji Matura 2027 (wersja obecna) – materiał do przebudowy

Stan na 20 listopada 2026. Aplikację uruchomiłem (`npx vite --port 5181`) i przeszedłem ją
Playwrightem jak uczeń na szerokości 390 px i 1280 px: pierwsze uruchomienie bez danych,
potem Ustawienia → „Wczytaj przykładowe dane” (z przykładowymi wynikami), a dalej zapis
wyniku, cofnięcie wyniku, diagnoza (test i samoocena), arkusz próbny CKE, zestaw z banku,
dodanie zadania, plan tygodnia, postęp, przeładowanie strony w trakcie arkusza i podgląd
przyszłych dni (`?dzis=2027-04-10`, `2027-05-02`, `2027-05-03`, `2026-11-22`).
Dodatkowo puściłem planer na całym okresie do matury (173 dni) skryptem `vite-node`, żeby
sprawdzić, co uczeń dostałby przez pół roku.

Zrzuty ekranu i log przejścia leżą w katalogu sesji
`/tmp/claude-0/-home-user-janas/8ec4d456-ef72-5018-ba4e-d18e8dedb365/scratchpad/audyt/`
(pliki `390-*.png`, `1280-*.png`, `log.txt`). Ten katalog jest tymczasowy.

Testy jednostkowe: 79/79 przechodzi, `tsc --noEmit` bez błędów, w konsoli przeglądarki
nie było błędów ani ostrzeżeń, a na 390 px nic nie wychodzi poza ekran w poziomie.
Kod jest więc technicznie poprawny. Aplikacja zawodzi jako produkt: uczeń prawie nigdzie
nie dostaje czegoś, co da się rozwiązać.

---

## A. Problemy od najpoważniejszych

### 1. W aplikacji nie ma treści zadań. Uczeń nie ma czego rozwiązywać
- **Co widzi uczeń:** po rozwinięciu zadania z planu widzi tytuł („Język angielski,
  wypowiedź pisemna, CKE 2025 zad. 12”), link „Arkusz PDF”, „Pokaż odpowiedź” i stoper.
  Nie ma treści zadania ani obrazu. W arkuszu próbnym widzi listę „Zadanie 1 … Zadanie 12”
  bez treści i bez linku do PDF (zrzuty `390-05-dzis-rozwiniete.png`, `390-14-arkusz-trwa.png`).
  „Pokaż odpowiedź” pokazuje tylko tekst „Jeśli nie widać obrazu odpowiedzi, otwórz zasady
  oceniania…”.
- **Przyczyna:**
  - `data/exams.json` ma listę zadań tylko dla dwóch z 16 arkuszy: MMAP-R0-100-2505
    (12 zadań) i MJAP-P0-100-2505 (7 zadań, z czego tylko jedno ma temat). Pozostałe mają
    status „tylko metadane”.
  - Akurat MMAP-R0-100-2505 ma puste `urls.arkusz` i `urls.zasady`, więc w arkuszu
    z matematyki rozszerzonej nie ma nawet linku do PDF (`views/Mock.tsx:246`,
    `views/Today.tsx:333`).
  - Obrazy zadań mają być w IndexedDB pod kluczami `cke/<arkusz>/<nr>`
    (`store/bank.ts:104`), ale nic ich tam nie wkłada, dopóki uczeń nie zaimportuje ZIP-a
    ze skryptu. W zwykłym buildzie `EMBEDDED_IMAGES` jest pusty (`src/data/obrazy-puste.ts:3`).
    `TaskImage` przy braku obrazu po cichu nic nie rysuje (`components/common.tsx`, `if (!url) return null`).
  - Katalog `cke-pdf/` jest pusty.
- **Zalecenie:** nowa wersja musi od pierwszego uruchomienia mieć wbudowane obrazy zadań
  z arkuszy CKE (wycinki z treścią i z zasadami oceniania) dla każdego zdawanego przedmiotu
  i z kilku lat. Brak obrazu traktować jako błąd danych, który widać w trakcie budowania,
  a nie jako pusty element na ekranie. Zadanie bez treści nie może trafić do planu.

### 2. Polski i matematyka podstawowa nie mają żadnych zadań, a plan na pół roku to prawie wyłącznie matematyka rozszerzona
- **Co widzi uczeń:** plan na każdy dzień to „M-R: Książka s. 13”, „M-R: CKE 2025 zad. 1”
  i jedno zadanie z angielskiego. Polskiego nie ma wcale. Pod planem stale wisi komunikat
  „Planer chciał dać zadania z tematów, dla których bank jest pusty”.
- **Przyczyna:** symulacja planu od 20.11.2026 do egzaminów (logika z `logic/planner.ts`):
  - bez przykładowych danych: 5747 min matematyki rozszerzonej, 495 min angielskiego,
    **0 min polskiego, 0 min matematyki podstawowej**, 406 pozycji „brak zadań”;
  - z przykładowymi danymi: 9326 min matematyki rozszerzonej, 495 min angielskiego,
    nadal 0 min polskiego i matematyki podstawowej.
  
  Przedmiot bez zadań dostaje mnożnik 0,01 (`logic/planner.ts:324-325`), więc wypada z planu
  bez żadnego ostrzeżenia na poziomie przedmiotu. Przykładowe dane dodają zadania tylko do
  `mat-r` (`store/demo.ts:15`).
- **Zalecenie:** każdy zdawany przedmiot musi mieć bazę zadań przed startem. Jeżeli dla
  przedmiotu nie ma materiału, aplikacja ma to powiedzieć wprost („Polski: brak zadań,
  plan go pomija”), a nie chować przedmiot za mnożnikiem.

### 3. Planer każe codziennie robić te same zadania, a arkusz próbny to w kółko ten sam CKE 2025
- **Co widzi uczeń:** na planie tygodnia „A: CKE 2025 zad. 12” stoi w poniedziałek, wtorek,
  środę i czwartek (`390-21-plan-nastepny.png`). Co drugą niedzielę ma „Arkusz próbny:
  Matematyka rozszerzona, CKE 2025”.
- **Przyczyna:**
  - Symulacja przyszłych wyników przyjmuje, że uczeń w ogóle się nie poprawia:
    `simResult` zwraca aktualną biegłość (`logic/planner.ts:481-484`). Zadanie ze słabym
    wynikiem dostaje więc co dzień kolejną powtórkę z odstępem 1 dnia (`logic/srs.ts:11-16`).
    W symulacji to samo zadanie pojawia się 33-34 razy (`cke:MJAP-P0-100-2505:12`,
    `cke:MMAP-R0-100-2505:11`).
  - `pickExam` daje 2 punkty arkuszowi z listą zadań i tylko 1 punkt za to, że jeszcze go nie
    rozwiązano (`logic/planner.ts:496`). Arkusz 2025 wygrywa więc zawsze, także po rozwiązaniu.
    W symulacji wszystkie 12 arkuszy matematyki rozszerzonej to 2025.
- **Zalecenie:** to samo zadanie najwyżej raz na kilka dni. Po nieudanej powtórce
  wybierać inne zadanie z tego samego tematu. Arkusz próbny nie może się powtarzać, dopóki
  są nierozwiązane. Do planu brać tylko arkusze, które da się w aplikacji otworzyć.

### 4. Plan proponuje arkusze i diagnozy, których nie da się uruchomić
- **Co widzi uczeń:**
  - „Arkusz próbny: Matematyka podstawowa, CKE 2026”: po kliknięciu „Otwórz arkusz” przycisk
    „Rozpocznij arkusz” jest nieaktywny i pojawia się napis „Ten arkusz nie ma jeszcze listy
    zadań… Zaimportuj PDF skryptem (README)”.
  - „Diagnoza: Matematyka podstawowa”: „W banku jest 0 zadań”, a „Rozpocznij test” jest wyłączony.
  - „Diagnoza: Język polski”: 0 zadań, przycisk „Rozpocznij test” jest aktywny, a test nie
    zawiera żadnego zadania, tylko pole na plan rozprawki.
- **Przyczyna:** `pickExam` bierze arkusze bez zadań, gdy nie ma lepszych
  (`logic/planner.ts:486-498`). Diagnoza trafia do planu dla każdego przedmiotu bez
  diagnozy, niezależnie od tego, czy bank ma zadania (`logic/planner.ts:136-141, 229-246`).
  Przycisk testu blokuje się tylko dla matematyki (`views/Diagnosis.tsx:52`).
  Teksty „Zaimportuj… (README)” są instrukcją dla programisty.
- **Zalecenie:** planer planuje tylko to, co da się zrobić od razu w aplikacji. Żadnych
  komunikatów odsyłających do README ani skryptów.

### 5. Diagnoza to w praktyce jedno zadanie, a jego wynik nadpisuje wagi
- **Co widzi uczeń:** napis „Test: do 15 zadań, 30 min”, a obok „W banku jest 1 zadań
  pasujących do diagnozy”, chociaż bank ma 12 zadań CKE i 47 przykładowych z matematyki
  rozszerzonej. Test składa się z jednego zadania („Funkcja kwadratowa i parametr · CKE 2025
  zad. 11”). Po wpisaniu 0 pkt tabela pokazuje „Funkcja kwadratowa i parametr 0%”,
  a przy pozostałych 20 tematach „–”. Zapisany czas wynosi 0 min.
- **Przyczyna:**
  - `selectDiagnosisTasks` pomija zadanie, które przekroczyłoby `diagnosisMinutes`
    (`logic/diagnosis.ts:49`). Pierwsze zadanie CKE ma 22 min czasu wzorcowego
    (`store/bank.ts:96`: punkty × tempo arkusza), więc w 30 minutach mieści się jedno.
  - Zadania z książki w przykładowych danych mają 20 min i też się nie mieszczą.
  - Wynik zapisuje się jako diagnoza testowa i od razu wpływa na biegłość
    (`logic/mastery.ts:65-69`). Do tego diagnoza nie zaznacza się jako wykonana w „Dziś”,
    bo dzień jest zamrożony z pozycją „Diagnoza” (`store/actions.ts:5-9`,
    `logic/planner.ts:171-186`).
- **Zalecenie:** diagnoza z krótkich zadań CKE, zamkniętych (A/B/C/D) i sprawdzanych
  automatycznie, po jednym z każdego głównego tematu. Odpowiedzi klikane, bez wpisywania
  punktów. Wynik pokazuje, które tematy są słabe, a w „Dziś” pozycja diagnozy zmienia się
  na wykonaną.

### 6. Uczeń musi sam wszystko oceniać i wpisywać punkty. Nie ma zadań klikanych ani automatycznego sprawdzania
- **Co widzi uczeń:** po każdym zadaniu pole „Punkty (z 12)” albo „Wynik w %”, typ błędu
  i notatka. Po arkuszu 12 pól punktów i 4 pola „Maks.”, w których uczeń ma sam podać, ile
  punktów było za zadania 1, 2, 3 i 7, bo aplikacja tego nie wie. Zapis jest zablokowany
  komunikatem „Zadanie 1: podaj maksimum punktów”.
- **Przyczyna:** model danych nie przechowuje poprawnych odpowiedzi (`types.ts`,
  `ExamTask` nie ma pola `answer`). W `exams.json` zadania 1-3 i 7 z 2025 mają
  `maxPoints: null`; znane są tylko sumy grup („5 pkt łącznie za zad. 1 i 2”). Obsługa
  w `views/Mock.tsx:158-168`.
- **Zalecenie:** zgodnie z decyzją użytkownika: zadania zamknięte jako przyciski A/B/C/D
  z natychmiastowym sprawdzeniem. Zadania otwarte: „Pokaż odpowiedź” z obrazem z zasad
  oceniania i samoocena kilkoma przyciskami (np. 0/1/2/3 pkt, z maksimum podanym
  w danych). Każde zadanie w bazie musi mieć znane maksimum punktów.

### 7. Wynik arkusza próbnego jest zaniżony i mylący
- **Co widzi uczeń:** po wpisaniu punktów do 4 z 12 zadań widzi „Wynik: 4/50 pkt (8%)”
  i „0 z 180 min”. W sekcji „Do powtórki” etykieta „do powtórki” powtarza się przy każdej
  pozycji pod nagłówkiem o tej samej treści (`390-16-arkusz-wynik.png`).
- **Przyczyna:**
  - `maxPoints: run.exam?.maxPoints ?? max` (`views/Mock.tsx:183`) zawsze liczy się do
    pełnych 50 pkt, także gdy część zadań zostawiono pustą.
  - Zadania z ręcznie wpisanym maksimum liczą się do rozbicia na tematy, chociaż ich
    punktacja jest zgadywana.
  - Czas to `Math.min(limit, zaokrąglone minuty)`, więc szybkie zakończenie daje 0 min
    (`views/Mock.tsx:150`).
  - Wynik arkusza nie odhacza pozycji „Arkusz próbny” w planie dnia.
- **Zalecenie:** wynik liczony tylko z ocenionych zadań, z jasnym „ocenione 4 z 12”.
  Pozycja w planie zaznacza się po zapisie. Czas zapisywany w minutach z sekundami.

### 8. Arkusz próbny i diagnoza giną po przeładowaniu albo po wyjściu do innego widoku
- **Co widzi uczeń:** po trzech godzinach arkusza na telefonie wystarczy, że przeglądarka
  przeładuje kartę albo uczeń kliknie „Dziś”, i wraca do listy arkuszy. Czas i wpisane
  punkty przepadają (sprawdzone: `page.reload()` w trakcie arkusza → widok listy).
- **Przyczyna:** stan arkusza jest tylko w `useState` komponentu (`views/Mock.tsx:30`,
  `views/Diagnosis.tsx:96-103`). Widoki są remontowane przy każdej zmianie adresu
  (`App.tsx:87`, `key={key}`). Odliczanie liczy się co prawda od `startedAt`, ale
  `startedAt` nigdzie się nie zapisuje.
- **Zalecenie:** trwający arkusz zapisywać w trwałym stanie (start, odpowiedzi, czas)
  i po powrocie wznawiać go z ostrzeżeniem. To samo dla wypracowania i diagnozy.

### 9. Brak synchronizacji telefon/komputer
- **Co widzi uczeń:** komunikat „Dane są tylko w tej przeglądarce. Telefon i komputer mają
  osobne dane; przenoś je eksportem i importem” (`views/Settings.tsx:167`). Import zastępuje
  wszystkie dane bez łączenia (`views/Settings.tsx:213`).
- **Przyczyna:** stan jest w `localStorage` (`store/persist.ts:5`), a obrazy w IndexedDB
  (`store/images.ts`).
- **Zalecenie:** zgodnie z decyzją: artefakt claude.ai ze wspólnym, trwałym stanem
  (capability bazy danych / stanu współdzielonego), jeden zapis dla telefonu i komputera.
  Bez eksportu do pliku jako głównej drogi.

### 10. Przykładowe dane mieszają się z prawdziwymi wynikami i nic nie daje znać, że się wczytały
- **Co widzi uczeń:**
  - Po kliknięciu „Wczytaj przykładowe dane” nic się nie dzieje na ekranie: nie ma
    komunikatu, a ekran „Dziś” wygląda tak samo (wcześniej i później „Dziś 45 z 90 min”).
  - Krok „Dodaj zadania… Masz 47” zostaje skreślony, chociaż żadne z tych zadań nie zawiera
    treści.
  - W „Postępie” matematyka rozszerzona pokazuje „Wyniki: 31”, biegłości i piłokształtny
    wykres z 24 wymyślonych wyników (35, 60, 80, 45, 90…).
  - Przykładowe zadania z książki to tylko „Książka s. 13” z notatką „Wybierz konkretne
    zadanie z tej strony”.
- **Przyczyna:** `withDemo` zapisuje przykładowe wyniki do historii zadań
  (`store/demo.ts:24-33`), a ta historia trafia do biegłości, priorytetów, prognozy
  i propozycji wag tak samo jak prawdziwe wyniki (`logic/mastery.ts:46-49`). Intro liczy
  zadania demo jako „Twoje” (`views/Today.tsx:162, 165`). Zadania mają `ref = ''`
  (`store/demo.ts:18`).
- **Zalecenie:** nie robić trybu przykładowych danych. Aplikacja ma mieć prawdziwe zadania
  od startu. Jeśli trzeba coś pokazać na start, to wyraźnie oddzielony podgląd, który
  nie zapisuje się do stanu ucznia.

### 11. Cofnięcie wyniku nie cofa wyniku
- **Co widzi uczeń:** odznacza checkbox zadania i zadanie wraca do „do zrobienia”, ale
  harmonogram powtórek, status w banku i historia zostają. Ponowny zapis dodaje drugi wpis
  w historii z tą samą datą (sprawdzone: liczba wpisów w historii 25 przed odznaczeniem
  i 25 po nim).
- **Przyczyna:** `undoItem` usuwa tylko wpis w `dayLog.done` (`store/actions.ts:42-48`),
  a `recordItem` zmienił też `bank` przez `applyResult` (`store/actions.ts:19-40`).
  Wpis w dzienniku błędów także zostaje.
- **Zalecenie:** jedna operacja zapisu wyniku z pełnym cofnięciem (historia, powtórka,
  błąd). Najprościej: wynik jako zdarzenie z identyfikatorem, a stan zadania liczony
  ze zdarzeń.

### 12. Planu nie da się edytować
- **Co widzi uczeń:** „Plan tygodnia” jest listą tylko do odczytu. Nie można przenieść
  zadania na inny dzień, usunąć go ani dodać. Jedyna akcja to „Zatwierdź plan dnia”, która
  zamraża dzień bez możliwości odmrożenia.
- **Przyczyna:** `views/Week.tsx` nie ma żadnych akcji. `freezeDay` nie ma odwrotności
  (`store/actions.ts:5-9`). Plan jest przeliczany od zera przy każdej zmianie stanu
  (`store/context.tsx`, `useMemo` z `buildPlan`), więc ręczne zmiany nie miałyby gdzie się
  zapisać.
- **Zalecenie:** zgodnie z decyzją: plan proponowany, ale edytowalny (przenieś na jutro,
  zamień, usuń, dodaj). Ręczne zmiany zapisywać jako nadpisania, które planer szanuje przy
  przeliczaniu.

### 13. Kalendarz faz jest źle ustawiony: faza arkuszy zaczyna się 3 dni przed pierwszym egzaminem, a arkusze nie mieszczą się w dniu
- **Co widzi uczeń:** 1-3 maja dostaje „Etap: arkusze”, a dzień przed polskim (3.05) ma
  „45 z 90 min”: przegląd polskiego i nic z innych przedmiotów, chociaż matematyka jest
  dzień później. W weekendowe dni planu pojawiają się notatki „Arkusz Matematyka
  rozszerzona (180 min) nie mieści się w 90 min”, a arkusz polskiego (240 min) nie mieści się
  nigdy (maksimum to 210 min w niedzielę). Angielski nie ma czasu arkusza (`mockMinutes: null`),
  więc arkusza próbnego z angielskiego w planie nie ma nigdy.
- **Przyczyna:** `mockPhaseStart: '2027-05-01'`, a pierwszy egzamin jest 4.05
  (`store/defaults.ts:101`). Dzień przed jakimkolwiek egzaminem kończy planowanie dla
  wszystkich przedmiotów (`logic/planner.ts:202-220`). `mockMinutes` dla angielskiego jest
  `null` (`store/defaults.ts:62`), a polski ma 240 min jako jeden blok (`store/defaults.ts`,
  `pol-p`).
- **Zalecenie:** fazy liczone od dat egzaminów, z sensownym okresem arkuszy (np. od marca).
  Arkusz dzielony na części, jeśli nie mieści się w dniu (polski: dwie części). Dzień przed
  egzaminem blokuje tylko ten przedmiot. Czas arkusza z angielskiego wziąć z informatora CKE.

### 14. „Dziś” nie jest podsumowaniem. Nie ma postępu, serii ani przypomnienia
- **Co widzi uczeń:** data, jedno zdanie „Do pierwszego egzaminu (język polski) zostało
  165 dni”, „Dziś 45 z 90 min” i lista. Nie widzi postępu, liczby zrobionych zadań, serii
  dni, terminów wszystkich egzaminów ani tego, co jest następne.
- **Przyczyna:** `views/Today.tsx:29-89`. Funkcja serii i przypomnienia nie istnieje.
  Przy 1 dniu do egzaminu tekst brzmi „zostało 1 dni” (brak odmiany, `views/Today.tsx:33`).
- **Zalecenie:** zgodnie z decyzją: ekran główny z podsumowaniem (postęp na przedmiot, dni
  do każdej matury, seria dni) i zadaniami na dziś. Przypomnienie o nauce. Odmiana
  liczebników.

### 15. Brak audio do angielskiego i brak pisania wypracowania z licznikiem słów
- **Co widzi uczeń:** temat „Rozumienie ze słuchu” bez żadnego nagrania. W „Dziś” pod listą
  wisi „Dodaj… Rozumienie ze słuchu”. Wypowiedź pisemną z angielskiego da się napisać tylko
  w diagnozie, w polu tekstowym z licznikiem wyrazów. Polskie wypracowanie: tylko „plan
  rozprawki” w diagnozie, licznik słów tylko dla angielskiego (`views/Diagnosis.tsx:197`).
  Tekst nie zapisuje się nigdzie poza stanem komponentu (`views/Diagnosis.tsx:103`), choć
  etykieta mówi „zostaje tylko w tej przeglądarce”.
- **Zalecenie:** zgodnie z decyzją: odtwarzacz nagrań CKE w aplikacji. Edytor wypracowania
  z licznikiem słów, limitem z polecenia, autozapisem i samooceną według kryteriów CKE.

### 16. Teksty dla programisty i niedokończone miejsca widoczne dla ucznia
Przykłady z interfejsu:
- „Zaimportuj arkusze CKE (README)”, „Zaimportuj PDF skryptem (README)”
  (`views/Diagnosis.tsx:56`, `views/Mock.tsx:94`);
- „Szczegóły braków: data/exams-issues.md. Dane zadań dodaje skrypt importu z PDF (README)”
  (`views/Analysis.tsx:338`);
- „Czas arkusza z angielskiego jest pusty, bo nie potwierdziłem go w źródle CKE”,
  „Godziny weekendu ustawiłem jako przykład (nie podałeś ich); popraw je”,
  „Źródło: kalkulator otouczelnie.pl” (`views/Settings.tsx:57, 96, 164`);
- przycisk „Obrazy arkuszy CKE (ZIP)” w Ustawieniach (`views/Settings.tsx:189-207`);
- etykieta checkboxa „wzór sprawdzony na stronie uczelni” (`views/Settings.tsx:162`).

Aplikacja mówi o sobie w pierwszej osobie („nie potwierdziłem”, „ustawiłem”), jak
notatka dewelopera. Widok „Analiza” (trend, priorytet 0,003, wagi ręczne w %) jest
narzędziem do strojenia algorytmu, nie widokiem dla ucznia.
- **Zalecenie:** w nowej wersji żadnych odwołań do README, skryptów, plików `.md` ani
  niezweryfikowanych źródeł. Analizę wag schować albo usunąć z menu ucznia.

### 17. Prognoza punktów rekrutacyjnych bez danych udaje precyzję
- **Co widzi uczeń:** na pustej aplikacji „Punkty rekrutacyjne: 300.0 (zakres 0.0–600.0)”
  i prognozy „50%” dla każdego przedmiotu (`390-01-fresh-postep.png`).
- **Przyczyna:** tematy bez danych liczą się jako 50% (`logic/mastery.ts:130`).
  Wzór jest zaszyty na stałe pod Politechnikę Poznańską i klucze `pol-p`, `ang-p`, `mat-p`,
  `mat-r` (`views/Progress.tsx:50-57`). Kropka zamiast przecinka dziesiętnego
  (`toFixed(1)`, `views/Progress.tsx:89`).
- **Zalecenie:** nie pokazywać prognozy, dopóki nie ma minimum wyników. Pokazywać
  „za mało danych” i co zrobić, żeby się pojawiła. Liczby w polskim formacie.

### 18. Mniejsze błędy logiczne
- **Temat notatki z korepetycji zawsze „ang-srodki”.** Zapis tematu lekcji tworzy zadanie
  z tematem `ang-srodki` niezależnie od przedmiotu zajęć (`views/Today.tsx:266`).
- **Krok „Ustaw, kiedy się uczysz” skreśla się po zapisaniu dowolnego wyniku**, a nie po
  ustawieniu godzin (`views/Today.tsx:164`).
- **Dodanie zadania „własne” bez żadnych danych zapisuje puste zadanie** („Zadanie własne”,
  bez treści). Licznik tematu wzrósł z 6 do 7 (`views/Bank.tsx:277-280`, brak walidacji).
- **Zestaw z banku** zawsze dostaje pełny czas arkusza (3:00:00 dla 10 zadań,
  `views/Mock.tsx:48-58`).
- **Odrzucenie wyników arkusza („Odrzuć”) działa bez potwierdzenia** (`views/Mock.tsx:290`).
- **Wagi ręczne** zastępują wyliczoną wagę bez normalizacji, więc „Zastosuj” w propozycjach
  (×1,3) zmienia sumę wag (`views/Progress.tsx:125`, `logic/weights.ts:135`).
- **Diagnoza: zakres „Ostatnia (test)”** pokazuje „–” dla 20 z 21 tematów i nie odróżnia
  „nie badano” od „0%”.
- **„Nie zmieściło się: 18”** na dzień w planie tygodnia: planer wrzuca do `shifted` każdą
  powtórkę, która się nie mieści, także te, które i tak wrócą (`logic/planner.ts:357-359`).
  Liczba straszy, a nic nie wynika.
- **Dzień zamrożony** (po pierwszym zapisie wyniku) nie przyjmuje nowych zadań ani zmian,
  nawet po dodaniu zadań do banku (`store/actions.ts:19-20`, `logic/planner.ts:171-186`).

### 19. Wygląd i nawigacja
- Na 390 px dolne menu ma 5 pozycji („Dziś, Plan, Zadania, Postęp, Więcej”). „Więcej”
  otwiera listę 5 kolejnych widoków nad paskiem (`390-02-menu-wiecej.png`). Razem
  9 widoków, z czego „Diagnoza”, „Dziennik błędów” i „Analiza” są dla ucznia mało czytelne.
- Wszystkie akcje wyglądają jak podkreślony tekst („Zacznij diagnozę”, „Wpisz wynik”,
  „Start”, „Stop”). Na telefonie trudno trafić, a ekran wygląda jak dokument, nie aplikacja.
  Jedyny wyraźny element to żółte podkreślenie „do zrobienia”.
- Nie ma stanów wykonania ani informacji zwrotnej: po zapisie wyniku pojawia się tylko
  „42%” po prawej. Po wczytaniu danych, dodaniu zadania czy zapisaniu diagnozy nie ma
  żadnego potwierdzenia.
- Na 1280 px treść zajmuje wąską kolumnę po lewej, a prawa połowa ekranu jest pusta
  (`1280-04-demo-dzis.png`).
- Plan tygodnia na telefonie to bardzo długa lista z „0/90 min –” dla minionych dni.
- **Zalecenie:** 4-5 widoków dla ucznia (Dziś, Plan, Ćwicz/Arkusz, Postęp, Ustawienia).
  Wyraźne przyciski z dużym polem dotyku. Karty zadań z obrazem. Potwierdzenia
  akcji (toast) i animacja odhaczenia. Na komputerze układ dwukolumnowy (podsumowanie
  i lista).

---

## B. Co warto zachować

1. **Logika dostępnego czasu dnia**: okna nauki na dzień tygodnia, godziny zakazane,
   zajęcia stałe i korepetycje odejmowane od czasu (`logic/planner.ts:40-75`). Daty jako
   napisy lokalne bez stref czasowych (`logic/dates.ts`).
2. **Wagi tematów z punktów CKE** (`logic/weights.ts`): dzielenie punktów zadania
   wielotematycznego po równo, grupy z łączną punktacją, trend z dwóch ostatnich lat,
   tryby „bazowo/trend/mocno trend”, minimalna waga dla tematu bez punktów, wagi
   sumujące się do 1. Formuła 2015 osobno, bez wpływu na wagi (`logic/exams.ts:17-30`).
3. **Priorytet tematu** = waga × (1,5 − biegłość) × (1 + premia za błędy koncepcyjne)
   (`logic/weights.ts:129-138`, `logic/mastery.ts:98-109`). Prosta, wytłumaczalna formuła.
4. **Powtórki rozłożone w czasie** z odstępem zależnym od wyniku: 1/3/7/14 dni
   i „zrobione” po ≥90% przy długim odstępie (`logic/srs.ts`). Trzeba dodać rotację zadań
   w temacie (punkt A.3).
5. **Struktura planera**: fazy przedmiotu, dzień przed egzaminem jako przegląd, dzień
   egzaminu bez innych zadań, limit przedmiotów i zadań dziennie, podział czasu według
   ważności przedmiotu, „każdy temat raz w tygodniu” w fazie powtórki, notatka z korepetycji
   zmniejszająca ilość zadań z przedmiotu (`logic/planner.ts:116-454`). Do poprawy są
   symulacja wyników, wybór arkusza i daty faz.
6. **Daty matur 2027** z komunikatu CKE z 20.08.2026 (`store/defaults.ts`) i dane
   z `data/exams.json` (kody arkuszy, czasy, maksima, adresy PDF, źródła). Plik
   `docs/niezweryfikowane.md` uczciwie opisuje, czego nie sprawdzono, i warto go trzymać
   jako listę rzeczy do uzupełnienia danych.
7. **Taksonomia tematów** dla matematyki P/R, polskiego i angielskiego
   (`data/taxonomy.ts`) oraz kryteria oceniania wypracowania i wypowiedzi pisemnej.
8. **Walidacja arkuszy** (`logic/exams.ts:56-98`, `npm run validate`): suma punktów zadań
   względem maksimum, brakujące tematy, duplikaty. W nowej wersji uruchamiać ją przy
   budowaniu bazy zadań.
9. **Parser PDF CKE** (`scripts/cke-parse.mjs`, `scripts/import-cke.mjs`, testy
   `tests/cke-parse.test.ts`) jako narzędzie do przygotowania bazy zadań i wycinków obrazów,
   ale po stronie budowania, nie u ucznia.
10. **Testy**: 79 testów jednostkowych planera, wag, powtórek, diagnozy i arkuszy
    (`tests/*.test.ts`, `tests/helpers.ts`). Przenieść je razem z logiką i dopisać testy
    na powtarzanie zadań, wybór arkusza i plan bez pustych przedmiotów.
11. **Drobne dobre rozwiązania**: parametr `?dzis=RRRR-MM-DD` do sprawdzania planu na
    dowolny dzień (`store/context.tsx`), migracja zapisanego stanu (`store/persist.ts:32-49`),
    KaTeX lokalnie do wzorów, potwierdzenie usunięcia w miejscu (`ConfirmButton`),
    odliczanie liczone od czasu startu, a nie przez sumowanie ticków (`Countdown`),
    dostępność (etykiety pól, `aria-current`, link „Przejdź do treści”).
12. **Kierunek wizualny** z `docs/plan-wizualny.md` (jasne tło, jedna rodzina pisma,
    zakreślacz dla „do zrobienia”) jako punkt wyjścia. Trzeba jednak dodać wyraźne
    przyciski, karty i informację zwrotną, bo obecna wersja wygląda jak dokument.
