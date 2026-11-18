# Czego nie udało się zweryfikować

Stan na 18 listopada 2026.

## Dane arkuszy CKE

- **Treść, punktacja i tematy zadań z lat 2023–2026.** Pobieranie PDF z cke.gov.pl
  zostało zablokowane w tej sesji, a `robots.txt` CKE zabrania automatycznego
  przeglądania serwisu. `exams.json` ma tylko metadane. Pełne dane trzeba
  zaimportować skryptem z pobranych samodzielnie plików (README).
- **Arkusz referencyjny MMAP-R0-100-2505.** Rozkład punktów pochodzi z założeń
  projektu, nie z PDF. Podział punktów w parach zad. 1–2 (5 pkt) i 3–7 (7 pkt)
  jest nieznany. Typy zadań (zamknięte, otwarte) są nieznane. Adresu PDF nie widziałem.
- **Matematyka podstawowa 2026: 50 pkt.** Wartość z informatora; arkusza 2026 nie sprawdziłem.
  Arkusze 2023 i 2024 mają 46 pkt (komunikat CKE i arkusze), 2025 ma 50 pkt.
- **Matematyka rozszerzona 2024 i 2026: 50 pkt, 180 min.** Wartości z informatora.
- **Język polski: 60 pkt.** Suma 25 pkt (arkusz 1, widoczne w arkuszach 2024 i 2026)
  i 35 pkt (wypracowanie, informator). Fragment informatora mówił o „70 pkt i 50%”;
  ta rozbieżność nie jest wyjaśniona. Kryteria wypracowania 16 + 7 + 11 = 34 pkt;
  brakuje 1 pkt, którego kryterium nie sprawdziłem.
- **Język angielski, poziom podstawowy: czas arkusza i maksimum punktów.** Brak w
  sprawdzonych fragmentach. Znane są tylko maksima zadań 2–6, 11 i 12 z karty
  odpowiedzi 2025. Czas arkusza próbnego z angielskiego trzeba wpisać w ustawieniach.
- **Kryteria wypowiedzi pisemnej z angielskiego.** Widoczne nazwy: treść, spójność
  i logika, poprawność. Czwarte kryterium (zakres środków językowych) i maksima
  punktów są niesprawdzone; użytkownik wpisuje je z zasad oceniania.
- **Wariant arkusza.** Importuję tylko wariant 100. Nie sprawdziłem, czy wszystkie
  lata mają wariant 100 dla każdego przedmiotu.

## Taksonomia

- Podział tematów polskiego i angielskiego opiera się na fragmentach informatorów CKE
  (części arkusza, kryteria). Pełnych informatorów nie przeczytałem.
- Oznaczenie „Granice ciągów” i „Pochodne i optymalizacja” jako tylko poziom
  rozszerzony wynika z podstawy programowej, nie z analizy arkuszy.
- Automatyczne tematy w skrypcie importu to słowa kluczowe, nie ocena treści.

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
