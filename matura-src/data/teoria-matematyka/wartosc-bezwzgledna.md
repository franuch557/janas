# Wartość bezwzględna

Wartość bezwzględna to odległość liczby od zera na osi liczbowej. Dzięki tej interpretacji większość zadań rozwiązuje się szybko, bez rozpatrywania przypadków.

## Definicja i interpretacja

> $$|x| = \begin{cases} x, & \text{gdy } x \ge 0 \\ -x, & \text{gdy } x < 0 \end{cases}$$

Wartość bezwzględna nigdy nie jest ujemna: $|3| = 3$, $|-3| = 3$, $|0| = 0$.

**Interpretacja:** $|x - a|$ to odległość liczby $x$ od liczby $a$ na osi. Np. $|x - 2| = 5$ znaczy: „$x$ jest odległe od $2$ o $5$”.

Przydatne: $\sqrt{x^2} = |x|$.

> Uwaga: $|x - a|$ to odległość $x$ od $a$ na osi. Zapis $|x + 3|$ to odległość od $-3$.

### Przykład: wyrażenie z pierwiastkiem
Oblicz $|\sqrt{3} - 2| + |\sqrt{3} + 1|$.
1. $\sqrt3 \approx 1{,}73$, więc $\sqrt3 - 2 < 0$ i $|\sqrt3 - 2| = 2 - \sqrt3$.
2. $\sqrt3 + 1 > 0$, więc $|\sqrt3 + 1| = \sqrt3 + 1$.
3. Suma: $2 - \sqrt3 + \sqrt3 + 1 = 3$.
Odpowiedź: $3$

### Sprawdź się: wartość wyrażenia
Oblicz $|3 - 7| - |{-5}|$.
1. $|3 - 7| = |-4| = 4$, $|-5| = 5$.
2. $4 - 5 = -1$.
Odpowiedź: $-1$
Wynik: -1

## Równania z wartością bezwzględną

> $|x - a| = r$ (dla $r > 0$) ma dwa rozwiązania: $x = a - r$ lub $x = a + r$
> $|x - a| = 0$ ma jedno rozwiązanie $x = a$
> $|x - a| = r$ dla $r < 0$ nie ma rozwiązań.

> Metoda:
> 1. $|x - a| = b$ dla $b > 0$ ma dwa rozwiązania: $x = a + b$ i $x = a - b$.
> 2. Dla $b = 0$ jedno, dla $b < 0$ żadnego.

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

### Sprawdź się: suma rozwiązań
Rozwiąż równanie $|x - 4| = 6$. Podaj sumę rozwiązań.
1. $x - 4 = 6$ lub $x - 4 = -6$.
2. $x = 10$ lub $x = -2$, suma $8$.
Odpowiedź: $x = 10$ lub $x = -2$, suma $8$
Wynik: 8

## Nierówności z wartością bezwzględną

> $|x - a| < r$ – liczby **bliżej** niż $r$ od $a$: $x \in (a - r, a + r)$
> $|x - a| > r$ – liczby **dalej** niż $r$ od $a$: $x \in (-\infty, a - r) \cup (a + r, +\infty)$.

Dla $\le$ i $\ge$ końce przedziałów należą do rozwiązania.

> $|x - a| < b \iff a - b < x < a + b$ – punkty **blisko** $a$
> $|x - a| > b \iff x < a - b$ lub $x > a + b$ – punkty **daleko** od $a$

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

### Sprawdź się: liczby całkowite
Ile liczb całkowitych spełnia nierówność $|x - 2| < 3$?
1. $-1 < x < 5$.
2. Liczby całkowite: $0, 1, 2, 3, 4$ – jest ich $5$.
Odpowiedź: $5$
Wynik: 5

## Dwie wartości bezwzględne (rozszerzenie)
Gdy w równaniu są dwie wartości bezwzględne, np. $|x - 1| + |x + 3| = 6$, nie da się użyć interpretacji „odległość od jednego punktu”. Dzielimy oś na przedziały, w których każde wyrażenie ma stały znak.

> Metoda:
> 1. Znajdź miejsca zerowe wyrażeń w modułach – dzielą oś na przedziały.
> 2. W każdym przedziale opuść moduły ze znakiem $+$ albo $-$.
> 3. Rozwiąż równanie i sprawdź, czy wynik **należy do przedziału**.
> 4. Zbierz rozwiązania ze wszystkich przedziałów.

> Uwaga: rozwiązanie spoza przedziału, w którym je liczysz, odrzucasz – nawet jeśli „wyszło ładnie”.

### Przykład: suma dwóch modułów
Rozwiąż równanie $|x - 1| + |x + 3| = 6$.
1. Punkty podziału: $x = -3$ i $x = 1$.
2. Dla $x < -3$: $-(x - 1) - (x + 3) = 6$, czyli $-2x - 2 = 6$, $x = -4$ – należy do przedziału.
3. Dla $-3 \le x \le 1$: $-(x - 1) + (x + 3) = 4 = 6$ – sprzeczność.
4. Dla $x > 1$: $(x - 1) + (x + 3) = 6$, czyli $2x + 2 = 6$, $x = 2$ – należy.
Odpowiedź: $x = -4$ lub $x = 2$

### Sprawdź się: większe rozwiązanie
Rozwiąż równanie $|x| + |x - 4| = 10$. Podaj większe rozwiązanie.
1. Dla $x > 4$: $x + x - 4 = 10$, więc $x = 7$.
2. Dla $x < 0$: $-x - x + 4 = 10$, więc $x = -3$; dla $0 \le x \le 4$ wychodzi $4 = 10$ – sprzeczność.
Odpowiedź: $x = -3$ lub $x = 7$, większe: $7$
Wynik: 7
