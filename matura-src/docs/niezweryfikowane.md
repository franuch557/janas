# Czego nie udało się zweryfikować

Stan na 21 listopada 2026.

## Dane arkuszy CKE

Stan po imporcie z plików PDF/MP3 CKE (`cke-pdf/`, 47 plików, wariant 100, maj 2023–2026).
Zadania, punktacja, czasy i maksima pochodzą z arkuszy, odpowiedzi zamknięte z zasad
oceniania (kolumna „Wersja A”). Szczegóły i lista braków: `data/exams-issues.md`.

- **Polski 2023, arkusz 1: brak zasad oceniania** (`MPOP-P1-100-2305-zasady.pdf` nie było
  w katalogu). Zadania zamknięte A1.4, A1.11 i A1.16.1 mają `answer: null`; nie ma też
  obrazów odpowiedzi dla zadań A1.x z 2023 r.
- **Polski: czas arkuszy 1 i 2.** Strony tytułowe wszystkich lat podają 240 min łącznie
  na testy i wypracowanie, bez osobnego czasu arkuszy. `parts[].minutes` = null.
- **Zadania „wybierz dwie odpowiedzi” bez kolejności** (mat. PP 2023 zad. 11, 2024 zad. 18):
  dwie pozycje z literami zapisanymi alfabetycznie; aplikacja porównuje pozycje po kolei.
- **Angielski, zadanie 5:** dzielę na „5.1-5.3” (zamknięte) i „5.4-5.7” (otwarte), wspólne
  teksty A–D są w `ctx/5`. Teksty innych zadań czytania są w obrazie zadania, nie w ctx.
- **Angielski, obrazy odpowiedzi:** tabela zadań zamkniętych bez kolumn wymagań
  (kolumna numerów + odpowiedzi). Dla zadań otwartych, których odpowiedzi są wpisane
  w tabelę wymagań (np. 2024 zad. 10), obraz zawiera całą tabelę, także wymagania.
  Odpowiedź do zadania 12 to uszczegółowienia oceny treści dla tematu; ogólne kryteria
  są w `data/kryteria.json`.
- **Matematyka, obrazy odpowiedzi:** pomijam sekcje dla osób z dyskalkulią
  („Kryteria uwzględniające specyficzne trudności…”, „Ocena prac osób ze stwierdzoną
  dyskalkulią”).
- **Tematy:** przejrzane ręcznie z treścią każdego zadania (`data/tematy-recznie.json`),
  ale taksonomia nie ma tematów „statystyka” ani „funkcje (ogólnie/liniowa)”: statystykę
  przypisałem do „prawdopodobienstwo”, funkcję liniową i odczyt wykresów do
  „geometria-analityczna”.
- **Czasy nagrań (`audio.start/end`)** ustalone automatycznie: cisza (ffmpeg silencedetect)
  + rozpoznanie zapowiedzi „Zadanie …” (whisper, model small). Przedział obejmuje zapowiedź,
  czas na zapoznanie się z zadaniem i oba odtworzenia. Granic nie odsłuchałem w całości.
- **Adresy PDF w `urls`** są tylko tam, gdzie były wcześniej; import z plików lokalnych
  ich nie uzupełnia.

## Taksonomia

- Podział tematów polskiego i angielskiego opiera się na fragmentach informatorów CKE
  (części arkusza, kryteria). Pełnych informatorów nie przeczytałem.
- Oznaczenie „Granice ciągów” i „Pochodne i optymalizacja” jako tylko poziom
  rozszerzony wynika z podstawy programowej, nie z analizy arkuszy.
- Automatyczne tematy w skrypcie importu to słowa kluczowe; w danych zastąpiłem je ręcznym przeglądem (`data/tematy-recznie.json`).

## Książka

- Numery stron działu 1 („Liczby rzeczywiste”) odczytałem z nieostrego zdjęcia.
- Ostatnia strona książki jest nieznana (odpowiedzi zaczynają się na s. 385).
- Przypisanie tematów do podrozdziałów zrobiłem na podstawie tytułów.

## Harmonogram i rekrutacja

- Daty egzaminów pochodzą z PDF komunikatu CKE z 20 sierpnia 2026. Tabela ma scalone
  komórki; daty angielskiego (6 i 7 maja) odczytałem z układu tekstu, zgadzają się
  z portalami edukacyjnymi.
- Wzór rekrutacyjny Politechniki Poznańskiej (W = 0,5·JP + 0,5·JO + 2,5·M + 2·X)
  i progi pochodzą z otouczelnie.pl, nie ze strony uczelni. Przedmiot X
  (prawdopodobnie fizyka albo informatyka) nie jest ustawiony.
- Godziny nauki w weekend to założenie (nie zostały podane); są w ustawieniach.

## zadania.info

- Regulamin, `robots.txt` i cennik odczytałem bezpośrednio. Nie sprawdzałem
  struktury adresów zadań poza przykładami z wyników wyszukiwania; aplikacja
  odczytuje numer z ostatniego segmentu adresu złożonego z cyfr.

## Aplikacja

- Działanie offline sprawdzałem tylko przez build bez zewnętrznych zasobów; nie ma
  service workera, więc praca bez sieci zależy od pamięci podręcznej przeglądarki.
- Skrypt `import-cke.mjs` testowałem na sztucznych liniach tekstu, nie na prawdziwych
  PDF CKE (nie miałem plików). Pierwszy import trzeba sprawdzić w `exams-issues.md`.
