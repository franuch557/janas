# Logarytmy

Logarytm to po prostu wykładnik. Na maturze trzeba umieć obliczyć logarytm z definicji, korzystać z trzech podstawowych wzorów i pamiętać o założeniach.

## Definicja logarytmu

> $\log_a b = c \iff a^c = b$

Czytamy: „do jakiej potęgi trzeba podnieść $a$, żeby otrzymać $b$?”.

**Założenia:** podstawa $a > 0$ i $a \neq 1$, liczba logarytmowana $b > 0$.

Ważne wartości: $\log_a 1 = 0$, $\log_a a = 1$, $\log_a a^n = n$. Zapis $\log b$ (bez podstawy) oznacza $\log_{10} b$.

> Założenia: $a > 0$, $a \neq 1$, $b > 0$
> $\log_a 1 = 0$, $\log_a a = 1$, $\log_a a^n = n$

> Metoda:
> 1. Zapisz $b$ jako potęgę podstawy $a$.
> 2. Wykładnik tej potęgi to szukany logarytm.

### Przykład: z definicji
Oblicz $\log_2 32$ i $\log_3 \frac{1}{9}$.
1. $2^c = 32 = 2^5$, więc $\log_2 32 = 5$.
2. $3^c = \frac19 = 3^{-2}$, więc $\log_3 \frac19 = -2$.
Odpowiedź: $5$ oraz $-2$

### Przykład: podstawa pod pierwiastkiem
Oblicz $\log_{\sqrt{2}} 8$.
1. Zapisujemy wszystko jako potęgi dwójki: $\sqrt2 = 2^{\frac12}$, $8 = 2^3$.
2. Szukamy $c$: $\left(2^{\frac12}\right)^c = 2^3$, czyli $2^{\frac{c}{2}} = 2^3$.
3. $\frac{c}{2} = 3$, więc $c = 6$.
Odpowiedź: $6$

### Sprawdź się: logarytm z definicji
Oblicz $\log_5 125$.
1. $125 = 5^3$.
2. $\log_5 5^3 = 3$.
Odpowiedź: $3$
Wynik: 3

## Wzory na działania
Dla $a > 0$, $a \neq 1$, $x, y > 0$:

> $\log_a x + \log_a y = \log_a (x \cdot y)$ – suma logarytmów to logarytm **iloczynu**
> $\log_a x - \log_a y = \log_a \frac{x}{y}$ – różnica to logarytm **ilorazu**
> $\log_a x^n = n \cdot \log_a x$ – wykładnik „wychodzi” przed logarytm.

> Uwaga: $\log_a(x + y)$ **nie** jest równe $\log_a x + \log_a y$.

### Przykład: suma i różnica
Oblicz $\log_6 4 + \log_6 9$.
1. Suma logarytmów o tej samej podstawie: $\log_6 (4 \cdot 9) = \log_6 36$.
2. $6^2 = 36$, więc $\log_6 36 = 2$.
Odpowiedź: $2$

### Przykład: wyciąganie wykładnika
Oblicz $2\log_5 10 - \log_5 4$.
1. Wykładnik wchodzi do logarytmu: $2\log_5 10 = \log_5 10^2 = \log_5 100$.
2. Różnica: $\log_5 100 - \log_5 4 = \log_5 \frac{100}{4} = \log_5 25$.
3. $\log_5 25 = 2$.
Odpowiedź: $2$

### Sprawdź się: różnica logarytmów
Oblicz $\log_3 54 - \log_3 2$.
1. $\log_3 \frac{54}{2} = \log_3 27$.
2. $27 = 3^3$, więc wynik to $3$.
Odpowiedź: $3$
Wynik: 3

## Zmiana podstawy i zadania z parametrem
Wzór na zmianę podstawy: $\log_a b = \dfrac{\log_c b}{\log_c a}$.

Przydaje się, gdy znamy np. $\log 2$ i $\log 3$, a mamy obliczyć coś innego. Często też trzeba wyrazić logarytm przez dane literki.

> $\log_a b = \dfrac{\log_c b}{\log_c a}$

### Przykład: wyrażanie przez dane
Wiadomo, że $\log 2 = a$ i $\log 3 = b$. Wyraź $\log 12$ za pomocą $a$ i $b$.
1. Rozkładamy liczbę na czynniki: $12 = 2^2 \cdot 3$.
2. $\log 12 = \log 2^2 + \log 3 = 2\log 2 + \log 3$.
3. Podstawiamy: $2a + b$.
Odpowiedź: $\log 12 = 2a + b$

### Przykład: założenia
Dla jakich $x$ wyrażenie $\log_{x-1} (5 - x)$ ma sens?
1. Podstawa dodatnia: $x - 1 > 0$, czyli $x > 1$.
2. Podstawa różna od $1$: $x - 1 \neq 1$, czyli $x \neq 2$.
3. Liczba logarytmowana dodatnia: $5 - x > 0$, czyli $x < 5$.
4. Część wspólna: $x \in (1, 2) \cup (2, 5)$.
Odpowiedź: $x \in (1, 2) \cup (2, 5)$

### Sprawdź się: iloczyn logarytmów
Oblicz $\log_2 9 \cdot \log_3 2$.
1. Zmieniamy podstawę: $\log_2 9 = \frac{\log_3 9}{\log_3 2} = \frac{2}{\log_3 2}$.
2. $\frac{2}{\log_3 2} \cdot \log_3 2 = 2$.
Odpowiedź: $2$
Wynik: 2
