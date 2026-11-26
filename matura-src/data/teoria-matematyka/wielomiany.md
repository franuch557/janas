# Wielomiany i wzory skróconego mnożenia

Wzory skróconego mnożenia to narzędzie, które przydaje się w prawie każdym zadaniu algebraicznym. Wielomiany na maturze to głównie rozkładanie na czynniki i rozwiązywanie równań.

## Wzory skróconego mnożenia

> $(a + b)^2 = a^2 + 2ab + b^2$
> $(a - b)^2 = a^2 - 2ab + b^2$
> $a^2 - b^2 = (a - b)(a + b)$
> $(a + b)^3 = a^3 + 3a^2b + 3ab^2 + b^3$, $(a - b)^3 = a^3 - 3a^2b + 3ab^2 - b^3$
> $a^3 - b^3 = (a - b)(a^2 + ab + b^2)$, $a^3 + b^3 = (a + b)(a^2 - ab + b^2)$

> Uwaga: $(a + b)^2 \neq a^2 + b^2$. Środkowy wyraz $2ab$ jest najczęściej gubionym elementem na maturze.

### Przykład: kwadrat różnicy z pierwiastkiem
Oblicz $(3 - \sqrt{2})^2$.
1. Wzór $(a - b)^2 = a^2 - 2ab + b^2$ dla $a = 3$, $b = \sqrt2$.
2. $3^2 - 2 \cdot 3 \cdot \sqrt2 + (\sqrt2)^2 = 9 - 6\sqrt2 + 2$.
3. $= 11 - 6\sqrt2$.
Odpowiedź: $11 - 6\sqrt{2}$

### Przykład: usuwanie niewymierności
Usuń niewymierność z mianownika: $\dfrac{4}{\sqrt{5} - 1}$.
1. Mnożymy licznik i mianownik przez $\sqrt5 + 1$, żeby skorzystać z różnicy kwadratów.
2. Mianownik: $(\sqrt5 - 1)(\sqrt5 + 1) = 5 - 1 = 4$.
3. $\dfrac{4(\sqrt5 + 1)}{4} = \sqrt5 + 1$.
Odpowiedź: $\sqrt{5} + 1$

### Sprawdź się: wartość wyrażenia
Oblicz $(\sqrt5 + 2)(\sqrt5 - 2)$.
1. Różnica kwadratów: $(\sqrt5)^2 - 2^2$.
2. $5 - 4 = 1$.
Odpowiedź: $1$
Wynik: 1

## Rozkład wielomianu na czynniki
Sposoby, od najprostszego:
1. **wyłączenie wspólnego czynnika** przed nawias, np. $x^3 - 4x = x(x^2 - 4)$,
2. **wzory skróconego mnożenia**, np. $x^2 - 4 = (x - 2)(x + 2)$,
3. **grupowanie wyrazów**, np. $x^3 + 2x^2 - x - 2 = x^2(x + 2) - (x + 2) = (x + 2)(x^2 - 1)$.

Gdy wielomian jest rozłożony, łatwo znaleźć jego **pierwiastki**: iloczyn jest równy zero, gdy któryś czynnik jest zerem.

> Metoda:
> 1. Wyłącz wspólny czynnik przed nawias (np. $x$ albo $x^2$).
> 2. Spróbuj grupowania wyrazów parami.
> 3. Rozłóż trójmiany kwadratowe deltą i użyj wzorów skróconego mnożenia.

### Przykład: grupowanie
Rozwiąż równanie $x^3 - 3x^2 - 4x + 12 = 0$.
1. Grupujemy: $x^2(x - 3) - 4(x - 3) = 0$.
2. Wspólny czynnik: $(x - 3)(x^2 - 4) = 0$.
3. Różnica kwadratów: $(x - 3)(x - 2)(x + 2) = 0$.
4. Pierwiastki: $x = 3$, $x = 2$, $x = -2$.
Odpowiedź: $x \in \{-2, 2, 3\}$

### Przykład: wspólny czynnik
Rozwiąż równanie $2x^3 - 8x = 0$.
1. Wyłączamy $2x$: $2x(x^2 - 4) = 0$.
2. $2x(x - 2)(x + 2) = 0$.
3. $x = 0$ lub $x = 2$ lub $x = -2$.
Odpowiedź: $x \in \{-2, 0, 2\}$

### Sprawdź się: pierwiastki wielomianu
Rozłóż $W(x) = x^3 - 9x$ i podaj największy pierwiastek.
1. $W(x) = x(x^2 - 9) = x(x - 3)(x + 3)$.
2. Pierwiastki: $-3, 0, 3$; największy to $3$.
Odpowiedź: $3$
Wynik: 3

## Twierdzenie o pierwiastkach całkowitych i dzielenie
Jeśli wielomian o współczynnikach całkowitych ma pierwiastek całkowity, to jest on **dzielnikiem wyrazu wolnego**. Sprawdzamy dzielniki, a gdy znajdziemy pierwiastek $x_0$, dzielimy wielomian przez $(x - x_0)$, np. schematem Hornera.

**Twierdzenie Bézouta:** liczba $x_0$ jest pierwiastkiem wielomianu $W(x)$ wtedy i tylko wtedy, gdy $W(x)$ dzieli się przez $(x - x_0)$. Reszta z dzielenia $W(x)$ przez $(x - x_0)$ jest równa $W(x_0)$.

> Pierwiastki całkowite wielomianu o współczynnikach całkowitych są dzielnikami wyrazu wolnego
> $W(a) = 0 \iff$ wielomian dzieli się przez $(x - a)$
> Reszta z dzielenia $W(x)$ przez $(x - a)$ równa się $W(a)$

### Przykład: szukanie pierwiastka
Rozwiąż $x^3 - 2x^2 - 5x + 6 = 0$.
1. Dzielniki wyrazu wolnego $6$: $\pm1, \pm2, \pm3, \pm6$.
2. Sprawdzamy $x = 1$: $1 - 2 - 5 + 6 = 0$ – jest pierwiastkiem.
3. Dzielimy przez $(x - 1)$ (schemat Hornera, współczynniki $1, -2, -5, 6$): wynik $x^2 - x - 6$.
4. $x^2 - x - 6 = (x - 3)(x + 2)$.
5. Pierwiastki: $1$, $3$, $-2$.
Odpowiedź: $x \in \{-2, 1, 3\}$

### Przykład: reszta z dzielenia
Oblicz resztę z dzielenia $W(x) = x^4 - 3x + 5$ przez $(x - 2)$.
1. Z twierdzenia o reszcie: reszta $= W(2)$.
2. $W(2) = 16 - 6 + 5 = 15$.
Odpowiedź: $15$

### Sprawdź się: reszta z dzielenia
Oblicz resztę z dzielenia $W(x) = x^3 - 2x + 5$ przez $(x - 2)$.
1. Reszta to $W(2)$.
2. $W(2) = 8 - 4 + 5 = 9$.
Odpowiedź: $9$
Wynik: 9
