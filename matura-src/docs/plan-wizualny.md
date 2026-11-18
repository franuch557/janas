# Plan wizualny

Kierunek: zeszyt w kratkę oglądany wieczorem przy lampce. Domyślny tryb
ciemny (decyzja 18), jasny jako przełącznik. Kratka jest rysowana wzorem SVG
z cienkich linii, bez gradientów i tekstur.

## Paleta

| Nazwa | Ciemny | Jasny | Użycie |
|---|---|---|---|
| Kartka | `#131a26` | `#fbfbf9` | tło strony |
| Kratka | `#1c2534` | `#e6ebf2` | linie kratki, 5 mm ≈ 20 px |
| Linia | `#3a4862` | `#aeb9cc` | obramowania dni, zadań, tabel |
| Atrament | `#dde4f0` | `#1a2b4c` | tekst, granat w trybie jasnym |
| Ołówek | `#97a3ba` | `#56627a` | tekst drugorzędny, osie wykresów |
| Zakreślacz | `#f1d54b` | `#f6df5a` | tylko „do zrobienia” i „do powtórki” |

Kontrast (WCAG AA): atrament na kartce ok. 13:1 (ciemny) i 13:1 (jasny),
ołówek na kartce ok. 6,5:1 i 5,9:1. Na zakreślaczu zawsze tekst w kolorze
`#1a2b4c`, kontrast ok. 10:1. Błędy nie mają osobnego koloru: pokazuję je
pogrubionym tekstem w ramce z podwójną linią i słowem „Błąd:”.

## Typografia

- Nagłówki: Source Serif 4, 600, wielkość 1.35–1.9 rem, zwykła wielkość liter.
- Tekst: Source Sans 3, 400/600, 1 rem, interlinia 1.5.
- Liczby w tabelach i timerze: Source Sans 3 z `font-variant-numeric: tabular-nums`.
- Szerokość tekstu ciągłego: `max-width: 68ch`.
- Fonty z pakietów `@fontsource`, wbudowane w build. Bez Google Fonts.

## Zasady

- Linie oddzielają dni, zadania i wyniki. Bez cieni i bez kart z zaokrągleniem.
  Narożniki 2 px tylko na przyciskach i polach.
- Przyciski: tekst + obramowanie. Główne działanie ma pełne tło atramentu.
- Jedna animacja przy starcie (kratka pojawia się w 300 ms), potem tylko
  reakcje na działania. `prefers-reduced-motion` wyłącza obie.
- Focus: obwódka 2 px w kolorze atramentu z odstępem 2 px (zakreślacz zostaje tylko dla stanów).

## Widoki

Nawigacja: na komputerze pionowa lista po lewej, na telefonie pasek u dołu
z pięcioma pozycjami i „Więcej”.

### Dziś

```
Środa, 18 listopada 2026          Faza 1 · 132 dni do matematyki rozsz.
Dostępne 120 min · zaplanowane 105 min
──────────────────────────────────────────────────────────────
[ ] Matematyka rozsz. · Logarytmy               25 min  ▢ do powtórki
    CKE 2025, zad. 2 · str. 3 PDF                [start] [pauza] 00:00
    wynik: [___] / 3 pkt     notatka o błędzie: [____________]
──────────────────────────────────────────────────────────────
[ ] Język polski · Test historycznoliteracki     20 min
    zadania.info #12345 · zrzut ekranu
──────────────────────────────────────────────────────────────
Przesunięte: 1 zadanie (brak czasu) → czwartek
```

### Plan (tydzień)

```
 pon 16   | wt 17    | śr 18    | czw 19   | pt 20    | sob 21        | nd 22
 90 min   | 90 min   | 120 min  | 90 min   | 90 min   | 180−60 min    | 180 min
 M-R ×3   | P ×2     | M-R ×2   | A ×3     | M-P ×3   | Korepetycje   | Arkusz próbny
 M-P ×2   | A ×2     | P ×2     | M-R ×2   | P ×1     | 15:15–16:15   | M-R 180 min
          |          |          |          |          | M-R ×2        | Podsumowanie
```

Na telefonie te same dni jeden pod drugim.

### Diagnoza

```
Diagnoza · Matematyka rozszerzona            test 30 min · 15 zadań
Wynik poprzedni: 12.11.2026, 46 %     [Rozpocznij]  [Samoocena 1–5]
──────────────────────────────────────────────────────────────
Temat                        wynik   samoocena   waga po diagnozie
Logarytmy                    33 %       –          ▲ wyższy priorytet
```

### Zadania z tematu

```
Przedmiot [Matematyka rozsz. ▾]   Temat [Stereometria ▾]
Filtry: źródło [wszystkie] status [nowe] trudność [1–3]
──────────────────────────────────────────────────────────────
CKE 2024 zad. 10       otwarte  5 pkt  nowe
Książka s. 273         otwarte         do powtórki · 24.11
zadania.info #...      zamknięte       zrobione 80 %
[Dodaj zadanie]  [Wklej zrzut ekranu]  [Import listy linków]
```

### Analiza

```
Matematyka rozsz. · lata 2023–2026 · tryb [bazowo|trend|mocno trend]
Pochodne i optymalizacja   ████████████ 12 pkt  9,6 %  4/4 arkusze  ↑
Planimetria                ████████      8 pkt  ...
```

### Arkusze próbne

```
Wybór: [Matematyka rozsz.] [2025]   180 min        [Start]
W trakcie: 02:41:13 pozostało · zadania 1–12 · rozwiązania ukryte
Po zakończeniu: wynik 31/50 (62 %) · tematy · do powtórki · dziennik błędów
```

### Postęp

```
Cel: Politechnika Poznańska, AiR
Prognoza mat. rozsz.: 58 % (zakres 44–72 %)   cel 70 %
[wykres liniowy wyników w czasie]
[mapa tematów: kratki z biegłością z 3 ostatnich wyników]
```

### Dziennik błędów, Ustawienia

Tabele z obramowaniem wierszy. Ustawienia w sekcjach: Egzaminy, Tydzień,
Zajęcia stałe, Wagi, Dane (eksport, import, obrazy arkuszy).
