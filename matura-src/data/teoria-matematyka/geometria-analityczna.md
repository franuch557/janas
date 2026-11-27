# Geometria analityczna

Punkty, odcinki, proste i okręgi w układzie współrzędnych. Większość zadań to zastosowanie kilku wzorów.

## Odcinek: długość i środek
Dla punktów $A = (x_A, y_A)$ i $B = (x_B, y_B)$:
- długość: $|AB| = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$,
- środek: $S = \left(\dfrac{x_A + x_B}{2}, \dfrac{y_A + y_B}{2}\right)$.

> Uwaga: przy długości odcinka różnice współrzędnych podnosimy do kwadratu, więc kolejność odejmowania nie ma znaczenia. Przy środku dodajemy współrzędne.

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

### Sprawdź się: długość odcinka
Oblicz długość odcinka o końcach $A = (1, 2)$ i $B = (7, 10)$.
1. $|AB| = \sqrt{(7-1)^2 + (10-2)^2} = \sqrt{36 + 64}$.
2. $\sqrt{100} = 10$.
Odpowiedź: $10$
Wynik: 10

## Prosta
Postać kierunkowa: $y = ax + b$, gdzie $a$ to **współczynnik kierunkowy**, $b$ – punkt przecięcia z osią $OY$.

Współczynnik przez dwa punkty: $a = \dfrac{y_B - y_A}{x_B - x_A}$.
- proste **równoległe**: $a_1 = a_2$,
- proste **prostopadłe**: $a_1 \cdot a_2 = -1$.

> Metoda:
> 1. Proste równoległe mają ten sam współczynnik $a$.
> 2. Proste prostopadłe: $a_1 \cdot a_2 = -1$.
> 3. Żeby znaleźć $b$, podstaw do $y = ax + b$ współrzędne punktu, przez który przechodzi prosta.

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

### Sprawdź się: prosta przez dwa punkty
Wyznacz współczynnik kierunkowy prostej przechodzącej przez punkty $(1, 3)$ i $(4, 12)$.
1. $a = \frac{12 - 3}{4 - 1} = \frac{9}{3}$.
2. $a = 3$.
Odpowiedź: $a = 3$
Wynik: 3

## Okrąg
Okrąg o środku $S = (a, b)$ i promieniu $r$:

> $$(x - a)^2 + (y - b)^2 = r^2$$

Odległość punktu $P = (x_0, y_0)$ od prostej $Ax + By + C = 0$: $d = \dfrac{|Ax_0 + By_0 + C|}{\sqrt{A^2 + B^2}}$. Prosta jest styczna do okręgu, gdy $d = r$.

> Uwaga: w równaniu $(x-a)^2 + (y-b)^2 = r^2$ środek to $(a, b)$ – znaki są **przeciwne** niż w nawiasach. Z $(x+2)^2$ wynika $a = -2$.

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

### Sprawdź się: promień okręgu
Okrąg ma równanie $(x - 3)^2 + (y + 1)^2 = 49$. Podaj jego promień.
1. Po prawej stronie jest $r^2 = 49$.
2. $r = 7$.
Odpowiedź: $r = 7$, środek $(3, -1)$
Wynik: 7

## Odległość punktu od prostej (rozszerzenie)
Odległość punktu od prostej to długość odcinka prostopadłego poprowadzonego z punktu do prostej. Nie trzeba go wyznaczać – jest gotowy wzór.

> $d = \dfrac{|Ax_0 + By_0 + C|}{\sqrt{A^2 + B^2}}$ – odległość punktu $(x_0, y_0)$ od prostej $Ax + By + C = 0$
> Odległość prostych równoległych $Ax + By + C_1 = 0$ i $Ax + By + C_2 = 0$: $\dfrac{|C_1 - C_2|}{\sqrt{A^2 + B^2}}$

> Uwaga: wzór działa dla prostej w postaci **ogólnej**. Prostą $y = 2x + 3$ najpierw przepisz jako $2x - y + 3 = 0$.

> Metoda:
> 1. Zapisz prostą w postaci $Ax + By + C = 0$.
> 2. Wstaw współrzędne punktu do licznika i weź wartość bezwzględną.
> 3. Podziel przez $\sqrt{A^2 + B^2}$.

### Przykład: punkt i prosta
Oblicz odległość punktu $P = (2, 5)$ od prostej $y = \frac34 x - 1$.
1. Postać ogólna: mnożymy przez $4$: $4y = 3x - 4$, czyli $3x - 4y - 4 = 0$.
2. Licznik: $|3 \cdot 2 - 4 \cdot 5 - 4| = |-18| = 18$.
3. $\sqrt{9 + 16} = 5$, więc $d = \frac{18}{5}$.
Odpowiedź: $\frac{18}{5}$

### Przykład: wysokość trójkąta
Wierzchołki trójkąta to $A = (0, 0)$, $B = (8, 6)$, $C = (1, 7)$. Oblicz wysokość opuszczoną z $C$ na bok $AB$.
1. Prosta $AB$: $y = \frac34 x$, czyli $3x - 4y = 0$.
2. $d = \frac{|3 \cdot 1 - 4 \cdot 7|}{5} = \frac{25}{5} = 5$.
Odpowiedź: $h = 5$

### Sprawdź się: odległość
Oblicz odległość punktu $(1, 2)$ od prostej $6x + 8y + 8 = 0$.
1. Licznik: $|6 + 16 + 8| = 30$.
2. $\sqrt{36 + 64} = 10$, więc $d = 3$.
Odpowiedź: $3$
Wynik: 3
