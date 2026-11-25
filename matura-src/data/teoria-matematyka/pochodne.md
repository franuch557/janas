# Pochodne i optymalizacja

Dział z poziomu rozszerzonego. Pochodna mówi, jak szybko zmienia się funkcja. Używamy jej do wyznaczania stycznych, monotoniczności, ekstremów i w zadaniach optymalizacyjnych.

## Wzory na pochodne
- $(c)' = 0$, $(x^n)' = n x^{n-1}$, np. $(x^3)' = 3x^2$, $(\sqrt{x})' = \frac{1}{2\sqrt{x}}$, $\left(\frac1x\right)' = -\frac{1}{x^2}$,
- $(f + g)' = f' + g'$, $(c \cdot f)' = c \cdot f'$,
- iloczyn: $(f \cdot g)' = f'g + fg'$,
- iloraz: $\left(\dfrac{f}{g}\right)' = \dfrac{f'g - fg'}{g^2}$.

### Przykład: wielomian
Oblicz pochodną $f(x) = 2x^3 - 5x^2 + 4x - 7$.
1. Różniczkujemy każdy wyraz osobno: $(2x^3)' = 6x^2$, $(-5x^2)' = -10x$, $(4x)' = 4$, $(-7)' = 0$.
2. $f'(x) = 6x^2 - 10x + 4$.
Odpowiedź: $f'(x) = 6x^2 - 10x + 4$

### Przykład: iloraz
Oblicz pochodną $f(x) = \dfrac{x^2}{x - 1}$.
1. $f' = \dfrac{2x(x - 1) - x^2 \cdot 1}{(x - 1)^2}$.
2. Licznik: $2x^2 - 2x - x^2 = x^2 - 2x$.
Odpowiedź: $f'(x) = \dfrac{x^2 - 2x}{(x - 1)^2}$

## Styczna do wykresu
Styczna w punkcie $x_0$ ma współczynnik kierunkowy $a = f'(x_0)$. Równanie:
$$y = f'(x_0)(x - x_0) + f(x_0)$$

### Przykład: równanie stycznej
Wyznacz styczną do wykresu $f(x) = x^2 - 3x$ w punkcie $x_0 = 2$.
1. $f(2) = 4 - 6 = -2$.
2. $f'(x) = 2x - 3$, $f'(2) = 1$.
3. $y = 1 \cdot (x - 2) - 2 = x - 4$.
Odpowiedź: $y = x - 4$

## Monotoniczność i ekstrema
- $f'(x) > 0$ w przedziale → funkcja **rośnie**, $f'(x) < 0$ → **maleje**.
- Ekstremum jest tam, gdzie pochodna jest zerem **i zmienia znak**: z $+$ na $-$ – maksimum, z $-$ na $+$ – minimum.

### Przykład: ekstrema
Wyznacz ekstrema funkcji $f(x) = x^3 - 3x$.
1. $f'(x) = 3x^2 - 3 = 3(x - 1)(x + 1)$, miejsca zerowe pochodnej: $-1$ i $1$.
2. Znak $f'$ (parabola ramionami w górę): $+$ dla $x < -1$, $-$ na $(-1, 1)$, $+$ dla $x > 1$.
3. W $x = -1$ maksimum: $f(-1) = -1 + 3 = 2$. W $x = 1$ minimum: $f(1) = 1 - 3 = -2$.
Odpowiedź: maksimum $2$ dla $x = -1$, minimum $-2$ dla $x = 1$

## Optymalizacja
Schemat:
1. Oznacz zmienną i zapisz wielkość, którą optymalizujesz, jako funkcję jednej zmiennej.
2. Ustal dziedzinę z warunków zadania.
3. Policz pochodną, znajdź miejsca zerowe i zbadaj znak.
4. Sprawdź, że znalezione ekstremum jest szukaną wartością największą/najmniejszą.

### Przykład: pudełko bez wieka
Z kwadratowego kartonu o boku $12$ wycinamy w rogach kwadraty o boku $x$ i składamy pudełko bez wieka. Dla jakiego $x$ objętość jest największa?
1. Podstawa: kwadrat o boku $12 - 2x$, wysokość $x$: $V(x) = x(12 - 2x)^2$, dziedzina $x \in (0, 6)$.
2. $V(x) = 4x^3 - 48x^2 + 144x$, $V'(x) = 12x^2 - 96x + 144 = 12(x^2 - 8x + 12) = 12(x - 2)(x - 6)$.
3. W dziedzinie zerem jest $x = 2$; dla $x < 2$ $V' > 0$, dla $2 < x < 6$ $V' < 0$ – maksimum.
4. $V(2) = 2 \cdot 8^2 = 128$.
Odpowiedź: $x = 2$, objętość $128$
