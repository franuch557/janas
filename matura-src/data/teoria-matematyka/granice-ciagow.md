# Granice ciągów

Dział z poziomu rozszerzonego. Granica mówi, do jakiej liczby zbliżają się wyrazy ciągu, gdy $n$ rośnie nieograniczenie.

## Granica ilorazu wielomianów
Najczęstszy typ: ułamek, w którym licznik i mianownik to wielomiany od $n$. **Dzielimy licznik i mianownik przez najwyższą potęgę $n$ z mianownika** i korzystamy z tego, że $\frac{c}{n^k} \to 0$.

Szybka reguła:
- stopień licznika < stopnia mianownika → granica $0$,
- stopnie równe → granica to iloraz współczynników przy najwyższych potęgach,
- stopień licznika > stopnia mianownika → granica nieskończona ($\pm\infty$).

> Metoda:
> 1. Porównaj najwyższe potęgi $n$ w liczniku i mianowniku.
> 2. Równe stopnie: granica to iloraz współczynników przy najwyższych potęgach.
> 3. Wyższy stopień w mianowniku: granica $0$. Wyższy w liczniku: $\pm\infty$.

### Przykład: równe stopnie
Oblicz $\lim\limits_{n \to \infty} \dfrac{3n^2 - n + 1}{2n^2 + 5}$.
1. Dzielimy przez $n^2$: $\dfrac{3 - \frac1n + \frac{1}{n^2}}{2 + \frac{5}{n^2}}$.
2. Ułamki z $n$ w mianowniku dążą do $0$.
3. Granica: $\frac{3}{2}$.
Odpowiedź: $\frac{3}{2}$

### Przykład: niższy stopień licznika
Oblicz $\lim\limits_{n \to \infty} \dfrac{4n + 7}{n^2 - 3}$.
1. Dzielimy przez $n^2$: $\dfrac{\frac4n + \frac{7}{n^2}}{1 - \frac{3}{n^2}}$.
2. Licznik dąży do $0$, mianownik do $1$.
Odpowiedź: $0$

### Sprawdź się: granica ilorazu
Oblicz $\lim\limits_{n \to \infty} \dfrac{6n^2 - n + 1}{3n^2 + 5}$.
1. Stopnie równe (drugi), dzielimy licznik i mianownik przez $n^2$.
2. Granica: $\frac{6}{3} = 2$.
Odpowiedź: $2$
Wynik: 2

## Granica z pierwiastkami
Gdy mamy różnicę pierwiastków typu $\sqrt{n^2 + an} - n$, mnożymy i dzielimy przez **sumę** (jak przy usuwaniu niewymierności), by skorzystać ze wzoru $(a - b)(a + b) = a^2 - b^2$.

> Uwaga: przy różnicy pierwiastków typu $\sqrt{n^2 + n} - n$ wynik nie jest $0$. Pomnóż przez sprzężenie, zanim zaczniesz liczyć granicę.

### Przykład: różnica z pierwiastkiem
Oblicz $\lim\limits_{n \to \infty} \left(\sqrt{n^2 + 4n} - n\right)$.
1. Mnożymy przez $\frac{\sqrt{n^2 + 4n} + n}{\sqrt{n^2 + 4n} + n}$: licznik $= n^2 + 4n - n^2 = 4n$.
2. Mamy $\dfrac{4n}{\sqrt{n^2 + 4n} + n}$. Dzielimy przez $n$: $\dfrac{4}{\sqrt{1 + \frac4n} + 1}$.
3. $\frac{4}{n} \to 0$, więc granica: $\frac{4}{1 + 1} = 2$.
Odpowiedź: $2$

### Sprawdź się: różnica pierwiastka i $n$
Oblicz $\lim\limits_{n \to \infty} \left(\sqrt{n^2 + 6n} - n\right)$.
1. Mnożymy przez sprzężenie: $\frac{n^2 + 6n - n^2}{\sqrt{n^2+6n} + n} = \frac{6n}{\sqrt{n^2+6n}+n}$.
2. Dzielimy przez $n$: $\frac{6}{\sqrt{1 + \frac6n} + 1} \to \frac{6}{2} = 3$.
Odpowiedź: $3$
Wynik: 3

## Liczba e i granice z potęgami
Ważne granice:

> $\left(1 + \dfrac{1}{n}\right)^n \to e \approx 2{,}718$
> $q^n \to 0$ dla $|q| < 1$
> w ilorazach z potęgami dzielimy przez potęgę o **największej podstawie**.

> Uwaga: wyrażenie $\left(1 + \frac1n\right)^n$ nie dąży do $1$, tylko do $e \approx 2{,}718$.

### Przykład: potęgi w ilorazie
Oblicz $\lim\limits_{n \to \infty} \dfrac{3^n + 2^n}{3^{n+1}}$.
1. $3^{n+1} = 3 \cdot 3^n$. Dzielimy licznik i mianownik przez $3^n$: $\dfrac{1 + \left(\frac23\right)^n}{3}$.
2. $\left(\frac{2}{3}\right)^n \to 0$.
Odpowiedź: $\frac{1}{3}$

### Sprawdź się: granica z potęgą
Oblicz $\lim\limits_{n \to \infty} \dfrac{3^{n+1} + 2^n}{3^n}$.
1. Dzielimy: $\frac{3^{n+1}}{3^n} + \left(\frac23\right)^n = 3 + \left(\frac23\right)^n$.
2. $\left(\frac23\right)^n \to 0$, więc granica to $3$.
Odpowiedź: $3$
Wynik: 3
