# Wartość bezwzględna

Wartość bezwzględna to odległość liczby od zera na osi liczbowej. Dzięki tej interpretacji większość zadań rozwiązuje się szybko, bez rozpatrywania przypadków.

## Definicja i interpretacja
$$|x| = \begin{cases} x, & \text{gdy } x \ge 0 \\ -x, & \text{gdy } x < 0 \end{cases}$$

Wartość bezwzględna nigdy nie jest ujemna: $|3| = 3$, $|-3| = 3$, $|0| = 0$.

**Interpretacja:** $|x - a|$ to odległość liczby $x$ od liczby $a$ na osi. Np. $|x - 2| = 5$ znaczy: „$x$ jest odległe od $2$ o $5$”.

Przydatne: $\sqrt{x^2} = |x|$.

### Przykład: wyrażenie z pierwiastkiem
Oblicz $|\sqrt{3} - 2| + |\sqrt{3} + 1|$.
1. $\sqrt3 \approx 1{,}73$, więc $\sqrt3 - 2 < 0$ i $|\sqrt3 - 2| = 2 - \sqrt3$.
2. $\sqrt3 + 1 > 0$, więc $|\sqrt3 + 1| = \sqrt3 + 1$.
3. Suma: $2 - \sqrt3 + \sqrt3 + 1 = 3$.
Odpowiedź: $3$

## Równania z wartością bezwzględną
- $|x - a| = r$ (dla $r > 0$) ma dwa rozwiązania: $x = a - r$ lub $x = a + r$,
- $|x - a| = 0$ ma jedno rozwiązanie $x = a$,
- $|x - a| = r$ dla $r < 0$ nie ma rozwiązań.

### Przykład: odległość na osi
Rozwiąż $|x + 3| = 4$.
1. Zapisujemy $|x - (-3)| = 4$: $x$ jest odległe od $-3$ o $4$.
2. $x = -3 - 4 = -7$ lub $x = -3 + 4 = 1$.
Odpowiedź: $x \in \{-7, 1\}$

### Przykład: współczynnik przy x
Rozwiąż $|2x - 6| = 8$.
1. $2x - 6 = 8$ lub $2x - 6 = -8$.
2. $2x = 14$, $x = 7$ lub $2x = -2$, $x = -1$.
Odpowiedź: $x \in \{-1, 7\}$

## Nierówności z wartością bezwzględną
- $|x - a| < r$ – liczby **bliżej** niż $r$ od $a$: $x \in (a - r, a + r)$,
- $|x - a| > r$ – liczby **dalej** niż $r$ od $a$: $x \in (-\infty, a - r) \cup (a + r, +\infty)$.

Dla $\le$ i $\ge$ końce przedziałów należą do rozwiązania.

### Przykład: mniejsze od
Rozwiąż $|x - 1| \le 3$.
1. Liczby oddalone od $1$ o co najwyżej $3$.
2. Od $1 - 3 = -2$ do $1 + 3 = 4$, z końcami.
Odpowiedź: $x \in [-2, 4]$

### Przykład: większe od
Rozwiąż $|x + 2| > 5$.
1. Liczby oddalone od $-2$ o więcej niż $5$.
2. $x < -2 - 5 = -7$ lub $x > -2 + 5 = 3$.
Odpowiedź: $x \in (-\infty, -7) \cup (3, +\infty)$
