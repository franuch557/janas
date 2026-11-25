# Funkcja kwadratowa i parametr

Funkcja kwadratowa to jeden z najważniejszych działów: postacie wzoru, wierzchołek, monotoniczność, największa i najmniejsza wartość, a na rozszerzeniu – zadania z parametrem i wzory Viète'a.

## Trzy postacie funkcji kwadratowej
- **ogólna:** $f(x) = ax^2 + bx + c$,
- **kanoniczna:** $f(x) = a(x - p)^2 + q$, gdzie $W = (p, q)$ to wierzchołek,
- **iloczynowa:** $f(x) = a(x - x_1)(x - x_2)$, gdzie $x_1, x_2$ to miejsca zerowe (gdy $\Delta \ge 0$).

Wierzchołek: $p = \dfrac{-b}{2a}$, $q = \dfrac{-\Delta}{4a}$ (albo po prostu $q = f(p)$).

Wartość $a$ decyduje o ramionach: $a > 0$ – w górę, $a < 0$ – w dół.

### Przykład: postać kanoniczna
Zapisz $f(x) = 2x^2 - 8x + 3$ w postaci kanonicznej.
1. $p = \frac{-(-8)}{2 \cdot 2} = 2$.
2. $q = f(2) = 2 \cdot 4 - 16 + 3 = -5$.
3. $f(x) = 2(x - 2)^2 - 5$.
Odpowiedź: $f(x) = 2(x - 2)^2 - 5$

### Przykład: wzór z miejsc zerowych
Funkcja kwadratowa ma miejsca zerowe $-1$ i $3$, a jej wykres przechodzi przez punkt $(0, 6)$. Wyznacz wzór.
1. Postać iloczynowa: $f(x) = a(x + 1)(x - 3)$.
2. Podstawiamy $(0, 6)$: $6 = a \cdot 1 \cdot (-3)$, więc $a = -2$.
3. $f(x) = -2(x + 1)(x - 3)$.
Odpowiedź: $f(x) = -2(x + 1)(x - 3)$

## Monotoniczność i wartość największa / najmniejsza
Dla $a > 0$ funkcja maleje na $(-\infty, p]$ i rośnie na $[p, +\infty)$, a najmniejsza wartość to $q$. Dla $a < 0$ odwrotnie, a $q$ jest wartością największą.

**W przedziale domkniętym** $[m, n]$ wartości największej i najmniejszej szukamy wśród: $f(m)$, $f(n)$ i $f(p)$ – ale $f(p)$ tylko wtedy, gdy $p \in [m, n]$.

### Przykład: przedział domknięty
Wyznacz najmniejszą i największą wartość $f(x) = x^2 - 4x + 1$ w przedziale $[0, 5]$.
1. $p = \frac{4}{2} = 2$ – należy do przedziału.
2. $f(2) = 4 - 8 + 1 = -3$, $f(0) = 1$, $f(5) = 25 - 20 + 1 = 6$.
3. Najmniejsza: $-3$, największa: $6$.
Odpowiedź: $f_{\min} = -3$, $f_{\max} = 6$

### Przykład: zadanie optymalizacyjne
Suma dwóch liczb wynosi $10$. Dla jakich liczb ich iloczyn jest największy?
1. Liczby: $x$ i $10 - x$, iloczyn $P(x) = x(10 - x) = -x^2 + 10x$.
2. $a = -1 < 0$, więc największa wartość w wierzchołku: $p = \frac{-10}{-2} = 5$.
3. Liczby to $5$ i $5$, iloczyn $25$.
Odpowiedź: $5$ i $5$ (iloczyn $25$)

## Wzory Viète'a i parametr
Gdy $\Delta \ge 0$:
$$x_1 + x_2 = \frac{-b}{a}, \qquad x_1 \cdot x_2 = \frac{c}{a}$$

Typowe wyrażenia: $x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1x_2$, $\dfrac{1}{x_1} + \dfrac{1}{x_2} = \dfrac{x_1 + x_2}{x_1 x_2}$.

**Zadanie z parametrem** – schemat:
1. Warunek istnienia rozwiązań (np. $a \neq 0$, $\Delta > 0$ albo $\Delta \ge 0$).
2. Warunek z treści zapisany wzorami Viète'a.
3. Część wspólna warunków.

### Przykład: dwa różne pierwiastki dodatnie
Dla jakich $m$ równanie $x^2 - 2mx + m + 6 = 0$ ma dwa różne pierwiastki dodatnie?
1. $\Delta > 0$: $4m^2 - 4(m + 6) > 0$, czyli $m^2 - m - 6 > 0$, $(m - 3)(m + 2) > 0$, więc $m \in (-\infty, -2) \cup (3, +\infty)$.
2. Suma dodatnia: $x_1 + x_2 = 2m > 0$, więc $m > 0$.
3. Iloczyn dodatni: $x_1 x_2 = m + 6 > 0$, więc $m > -6$.
4. Część wspólna: $m > 3$.
Odpowiedź: $m \in (3, +\infty)$

### Przykład: suma kwadratów pierwiastków
Równanie $x^2 - 4x + m = 0$ ma dwa pierwiastki. Dla jakiego $m$ zachodzi $x_1^2 + x_2^2 = 10$?
1. Warunek $\Delta \ge 0$: $16 - 4m \ge 0$, czyli $m \le 4$.
2. Viète: $x_1 + x_2 = 4$, $x_1 x_2 = m$.
3. $x_1^2 + x_2^2 = 16 - 2m = 10$, więc $m = 3$.
4. $3 \le 4$ – warunek spełniony.
Odpowiedź: $m = 3$
