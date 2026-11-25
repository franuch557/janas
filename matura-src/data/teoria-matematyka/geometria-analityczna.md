# Geometria analityczna

Punkty, odcinki, proste i okręgi w układzie współrzędnych. Większość zadań to zastosowanie kilku wzorów.

## Odcinek: długość i środek
Dla punktów $A = (x_A, y_A)$ i $B = (x_B, y_B)$:
- długość: $|AB| = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$,
- środek: $S = \left(\dfrac{x_A + x_B}{2}, \dfrac{y_A + y_B}{2}\right)$.

### Przykład: długość i środek
Oblicz długość odcinka i środek dla $A = (-1, 2)$, $B = (5, 10)$.
1. $|AB| = \sqrt{6^2 + 8^2} = \sqrt{100} = 10$.
2. $S = \left(\frac{-1 + 5}{2}, \frac{2 + 10}{2}\right) = (2, 6)$.
Odpowiedź: $|AB| = 10$, $S = (2, 6)$

### Przykład: brakujący koniec
Punkt $S = (3, -1)$ jest środkiem odcinka $AB$, $A = (1, 4)$. Wyznacz $B$.
1. $\frac{1 + x_B}{2} = 3$, więc $x_B = 5$.
2. $\frac{4 + y_B}{2} = -1$, więc $y_B = -6$.
Odpowiedź: $B = (5, -6)$

## Prosta
Postać kierunkowa: $y = ax + b$, gdzie $a$ to **współczynnik kierunkowy**, $b$ – punkt przecięcia z osią $OY$.

Współczynnik przez dwa punkty: $a = \dfrac{y_B - y_A}{x_B - x_A}$.
- proste **równoległe**: $a_1 = a_2$,
- proste **prostopadłe**: $a_1 \cdot a_2 = -1$.

### Przykład: prosta przez dwa punkty
Wyznacz równanie prostej przez $A = (1, 3)$ i $B = (3, 7)$.
1. $a = \frac{7 - 3}{3 - 1} = 2$.
2. Wstawiamy $A$: $3 = 2 \cdot 1 + b$, więc $b = 1$.
Odpowiedź: $y = 2x + 1$

### Przykład: prosta prostopadła
Wyznacz prostą prostopadłą do $y = 2x + 1$ przechodzącą przez $P = (4, 1)$.
1. $2 \cdot a = -1$, więc $a = -\frac12$.
2. $1 = -\frac12 \cdot 4 + b$, więc $b = 3$.
Odpowiedź: $y = -\frac{1}{2}x + 3$

## Okrąg
Okrąg o środku $S = (a, b)$ i promieniu $r$:
$$(x - a)^2 + (y - b)^2 = r^2$$

Odległość punktu $P = (x_0, y_0)$ od prostej $Ax + By + C = 0$: $d = \dfrac{|Ax_0 + By_0 + C|}{\sqrt{A^2 + B^2}}$. Prosta jest styczna do okręgu, gdy $d = r$.

### Przykład: odczytanie środka i promienia
Podaj środek i promień okręgu $(x - 2)^2 + (y + 3)^2 = 16$.
1. $(y + 3) = (y - (-3))$, więc $S = (2, -3)$.
2. $r^2 = 16$, $r = 4$.
Odpowiedź: $S = (2, -3)$, $r = 4$

### Przykład: równanie okręgu ze średnicy
Wyznacz równanie okręgu o średnicy $AB$, $A = (0, 0)$, $B = (6, 8)$.
1. Środek to środek odcinka: $S = (3, 4)$.
2. Promień to połowa $|AB| = \frac{10}{2} = 5$.
Odpowiedź: $(x - 3)^2 + (y - 4)^2 = 25$
