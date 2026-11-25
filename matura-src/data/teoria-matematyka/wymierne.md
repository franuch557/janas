# Funkcje wymierne

Funkcje wymierne to ułamki, w których zmienna jest w mianowniku. Najważniejsze jest ustalenie dziedziny – **mianownik nie może być zerem**.

## Wyrażenia wymierne
Dziedzina: wykluczamy liczby, dla których mianownik jest zerem.

Działania jak na zwykłych ułamkach: skracamy po rozłożeniu na czynniki, dodajemy po sprowadzeniu do wspólnego mianownika.

### Przykład: skracanie
Uprość wyrażenie $\dfrac{x^2 - 9}{x^2 + 3x}$ i podaj dziedzinę.
1. Mianownik: $x^2 + 3x = x(x + 3)$, więc $x \neq 0$ i $x \neq -3$.
2. Licznik: $x^2 - 9 = (x - 3)(x + 3)$.
3. Skracamy $(x + 3)$: $\dfrac{x - 3}{x}$.
Odpowiedź: $\dfrac{x - 3}{x}$ dla $x \in \mathbb{R} \setminus \{-3, 0\}$

### Przykład: dodawanie ułamków
Wykonaj działanie $\dfrac{2}{x - 1} + \dfrac{3}{x + 1}$.
1. Wspólny mianownik: $(x - 1)(x + 1)$, dziedzina $x \neq \pm 1$.
2. $\dfrac{2(x + 1) + 3(x - 1)}{(x - 1)(x + 1)} = \dfrac{5x - 1}{x^2 - 1}$.
Odpowiedź: $\dfrac{5x - 1}{x^2 - 1}$

## Równania wymierne
Kroki:
1. Wyznacz dziedzinę.
2. Pomnóż przez mianownik (albo zastosuj „na krzyż”, gdy jest ułamek = ułamek).
3. Rozwiąż równanie i **sprawdź, czy rozwiązania należą do dziedziny**.

### Przykład: na krzyż
Rozwiąż $\dfrac{x + 2}{x - 3} = 2$.
1. Dziedzina: $x \neq 3$.
2. Mnożymy przez $(x - 3)$: $x + 2 = 2x - 6$.
3. $x = 8$ – należy do dziedziny.
Odpowiedź: $x = 8$

### Przykład: rozwiązanie spoza dziedziny
Rozwiąż $\dfrac{x^2 - 4}{x - 2} = 0$.
1. Dziedzina: $x \neq 2$.
2. Ułamek jest zerem, gdy licznik jest zerem: $x^2 - 4 = 0$, czyli $x = 2$ lub $x = -2$.
3. $x = 2$ nie należy do dziedziny – odrzucamy.
Odpowiedź: $x = -2$

## Funkcja homograficzna
$f(x) = \dfrac{a}{x - p} + q$ to hiperbola $y = \frac{a}{x}$ przesunięta o $p$ w prawo i o $q$ w górę.
- **asymptota pionowa:** $x = p$,
- **asymptota pozioma:** $y = q$,
- dziedzina: $\mathbb{R} \setminus \{p\}$, zbiór wartości: $\mathbb{R} \setminus \{q\}$.

Dla $a > 0$ funkcja maleje w każdym z przedziałów $(-\infty, p)$ i $(p, +\infty)$, dla $a < 0$ rośnie.

### Przykład: asymptoty
Podaj dziedzinę, zbiór wartości i asymptoty funkcji $f(x) = \dfrac{3}{x + 2} - 1$.
1. $x + 2 = x - (-2)$, więc $p = -2$, a $q = -1$.
2. Asymptoty: $x = -2$ i $y = -1$.
3. Dziedzina: $\mathbb{R} \setminus \{-2\}$, zbiór wartości: $\mathbb{R} \setminus \{-1\}$.
Odpowiedź: $D = \mathbb{R} \setminus \{-2\}$, $ZW = \mathbb{R} \setminus \{-1\}$, asymptoty $x = -2$, $y = -1$

### Przykład: nierówność wymierna
Rozwiąż $\dfrac{x - 1}{x + 3} < 0$.
1. Dziedzina: $x \neq -3$.
2. Ułamek ma ten sam znak co iloczyn $(x - 1)(x + 3)$.
3. $(x - 1)(x + 3) < 0$ – parabola ramionami w górę, ujemna między $-3$ a $1$.
Odpowiedź: $x \in (-3, 1)$
