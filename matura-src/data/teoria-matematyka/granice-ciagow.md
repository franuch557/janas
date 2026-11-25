# Granice ciągów

Dział z poziomu rozszerzonego. Granica mówi, do jakiej liczby zbliżają się wyrazy ciągu, gdy $n$ rośnie nieograniczenie.

## Granica ilorazu wielomianów
Najczęstszy typ: ułamek, w którym licznik i mianownik to wielomiany od $n$. **Dzielimy licznik i mianownik przez najwyższą potęgę $n$ z mianownika** i korzystamy z tego, że $\frac{c}{n^k} \to 0$.

Szybka reguła:
- stopień licznika < stopnia mianownika → granica $0$,
- stopnie równe → granica to iloraz współczynników przy najwyższych potęgach,
- stopień licznika > stopnia mianownika → granica nieskończona ($\pm\infty$).

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

## Granica z pierwiastkami
Gdy mamy różnicę pierwiastków typu $\sqrt{n^2 + an} - n$, mnożymy i dzielimy przez **sumę** (jak przy usuwaniu niewymierności), by skorzystać ze wzoru $(a - b)(a + b) = a^2 - b^2$.

### Przykład: różnica z pierwiastkiem
Oblicz $\lim\limits_{n \to \infty} \left(\sqrt{n^2 + 4n} - n\right)$.
1. Mnożymy przez $\frac{\sqrt{n^2 + 4n} + n}{\sqrt{n^2 + 4n} + n}$: licznik $= n^2 + 4n - n^2 = 4n$.
2. Mamy $\dfrac{4n}{\sqrt{n^2 + 4n} + n}$. Dzielimy przez $n$: $\dfrac{4}{\sqrt{1 + \frac4n} + 1}$.
3. $\frac{4}{n} \to 0$, więc granica: $\frac{4}{1 + 1} = 2$.
Odpowiedź: $2$

## Liczba e i granice z potęgami
Ważne granice:
- $\left(1 + \dfrac{1}{n}\right)^n \to e \approx 2{,}718$,
- $q^n \to 0$ dla $|q| < 1$,
- w ilorazach z potęgami dzielimy przez potęgę o **największej podstawie**.

### Przykład: potęgi w ilorazie
Oblicz $\lim\limits_{n \to \infty} \dfrac{3^n + 2^n}{3^{n+1}}$.
1. $3^{n+1} = 3 \cdot 3^n$. Dzielimy licznik i mianownik przez $3^n$: $\dfrac{1 + \left(\frac23\right)^n}{3}$.
2. $\left(\frac{2}{3}\right)^n \to 0$.
Odpowiedź: $\frac{1}{3}$
