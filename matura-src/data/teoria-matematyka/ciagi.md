# Ciągi arytmetyczne i geometryczne

Ciąg to lista liczb ułożonych w kolejności: $a_1, a_2, a_3, \dots$. Na maturze najczęściej trzeba wyznaczyć wyraz ogólny, różnicę lub iloraz i policzyć sumę.

## Ciąg i jego wyraz ogólny
Wyraz ogólny $a_n$ to wzór, z którego liczymy dowolny wyraz. Np. dla $a_n = 3n - 1$: $a_1 = 2$, $a_2 = 5$, $a_{10} = 29$.

Ciąg jest **rosnący**, gdy $a_{n+1} - a_n > 0$ dla każdego $n$, a **malejący**, gdy $a_{n+1} - a_n < 0$.

> Metoda:
> 1. Żeby obliczyć wyraz $a_n$, wstaw numer $n$ do wzoru.
> 2. Żeby sprawdzić, który wyraz ma daną wartość, rozwiąż równanie $a_n = \text{wartość}$ – wynik musi być liczbą naturalną.

> Uwaga: $n$ to numer wyrazu, więc zawsze $n \ge 1$ i $n$ jest całkowite.

### Przykład: który wyraz
Który wyraz ciągu $a_n = n^2 - 2n$ jest równy $15$?
1. $n^2 - 2n = 15$, czyli $n^2 - 2n - 15 = 0$.
2. $\Delta = 4 + 60 = 64$, $n = \frac{2 + 8}{2} = 5$ albo $n = \frac{2 - 8}{2} = -3$.
3. $n$ musi być naturalne dodatnie, więc $n = 5$.
Odpowiedź: piąty wyraz

### Sprawdź się: numer wyrazu
Ciąg dany jest wzorem $a_n = 3n - 7$. Który wyraz tego ciągu jest równy $41$?
1. Rozwiązujemy $3n - 7 = 41$, czyli $3n = 48$.
2. $n = 16$ – liczba naturalna, więc taki wyraz istnieje.
Odpowiedź: $a_{16} = 41$
Wynik: 16

## Ciąg arytmetyczny
Każdy kolejny wyraz powstaje przez dodanie tej samej liczby $r$ (różnicy).
- wyraz ogólny: $a_n = a_1 + (n - 1)r$,
- suma $n$ wyrazów: $S_n = \dfrac{a_1 + a_n}{2} \cdot n$ albo $S_n = \dfrac{2a_1 + (n - 1)r}{2} \cdot n$,
- trzy liczby $x, y, z$ tworzą ciąg arytmetyczny, gdy $y = \dfrac{x + z}{2}$.

> Metoda:
> 1. Wypisz, co znasz: $a_1$, $r$ albo dwa wyrazy.
> 2. Każdy wyraz zapisz przez $a_1$ i $r$: $a_n = a_1 + (n-1)r$.
> 3. Rozwiąż układ równań albo podstaw do wzoru na sumę.

> Uwaga: we wzorze jest $(n-1)r$, a nie $nr$. Między $a_1$ a $a_5$ są cztery „kroki” różnicy.

### Przykład: z dwóch wyrazów
W ciągu arytmetycznym $a_3 = 7$ i $a_7 = 19$. Oblicz $a_1$, $r$ i $S_{10}$.
1. Między $a_3$ a $a_7$ są $4$ różnice: $19 - 7 = 4r$, więc $r = 3$.
2. $a_1 = a_3 - 2r = 7 - 6 = 1$.
3. $a_{10} = 1 + 9 \cdot 3 = 28$, $S_{10} = \frac{1 + 28}{2} \cdot 10 = 145$.
Odpowiedź: $a_1 = 1$, $r = 3$, $S_{10} = 145$

### Przykład: warunek na trzy liczby
Dla jakiego $x$ liczby $x - 1$, $5$, $2x + 3$ tworzą ciąg arytmetyczny?
1. Środkowa liczba jest średnią sąsiednich: $5 = \frac{(x - 1) + (2x + 3)}{2}$.
2. $10 = 3x + 2$.
3. $x = \frac{8}{3}$.
Odpowiedź: $x = \frac{8}{3}$

### Sprawdź się: suma wyrazów
W ciągu arytmetycznym $a_1 = 2$ i $r = 5$. Oblicz sumę ośmiu początkowych wyrazów.
1. $a_8 = 2 + 7 \cdot 5 = 37$.
2. $S_8 = \frac{a_1 + a_8}{2} \cdot 8 = \frac{2 + 37}{2} \cdot 8 = 156$.
Odpowiedź: $S_8 = 156$
Wynik: 156

## Ciąg geometryczny
Każdy kolejny wyraz powstaje przez pomnożenie przez tę samą liczbę $q$ (iloraz).
- wyraz ogólny: $a_n = a_1 \cdot q^{n-1}$,
- suma $n$ wyrazów: $S_n = a_1 \cdot \dfrac{1 - q^n}{1 - q}$ dla $q \neq 1$ (dla $q = 1$: $S_n = n \cdot a_1$),
- trzy liczby $x, y, z$ (niezerowe) tworzą ciąg geometryczny, gdy $y^2 = x \cdot z$.

> Metoda:
> 1. Każdy wyraz zapisz przez $a_1$ i $q$: $a_n = a_1 q^{n-1}$.
> 2. Iloraz dwóch wyrazów skraca $a_1$, np. $\frac{a_5}{a_2} = q^3$.
> 3. Pamiętaj o dwóch rozwiązaniach, gdy wychodzi $q^2 = \dots$

> Uwaga: z $q^2 = 4$ wynika $q = 2$ **albo** $q = -2$. Sprawdź warunki zadania, czy oba są dobre.

### Przykład: iloraz i suma
W ciągu geometrycznym $a_1 = 3$ i $a_4 = 24$. Oblicz $q$ i $S_5$.
1. $a_4 = a_1 q^3$: $24 = 3q^3$, więc $q^3 = 8$ i $q = 2$.
2. $S_5 = 3 \cdot \frac{1 - 2^5}{1 - 2} = 3 \cdot \frac{-31}{-1} = 93$.
Odpowiedź: $q = 2$, $S_5 = 93$

### Przykład: warunek geometryczny
Dla jakiego dodatniego $x$ liczby $2$, $x$, $18$ tworzą ciąg geometryczny?
1. $x^2 = 2 \cdot 18 = 36$.
2. $x = 6$ lub $x = -6$; szukamy dodatniego.
Odpowiedź: $x = 6$

### Sprawdź się: wyraz ciągu geometrycznego
W ciągu geometrycznym $a_1 = 3$ i $q = 2$. Oblicz $a_6$.
1. $a_6 = a_1 \cdot q^5 = 3 \cdot 2^5$.
2. $3 \cdot 32 = 96$.
Odpowiedź: $a_6 = 96$
Wynik: 96

## Szereg geometryczny (rozszerzenie)
Gdy $|q| < 1$, suma nieskończenie wielu wyrazów ciągu geometrycznego istnieje i wynosi:

> $$S = \frac{a_1}{1 - q}$$

> Uwaga: wzór $S = \frac{a_1}{1-q}$ działa tylko dla $|q| < 1$. Zawsze najpierw sprawdź ten warunek.

### Przykład: suma szeregu
Oblicz $8 + 4 + 2 + 1 + \dots$
1. $a_1 = 8$, $q = \frac12$, $|q| < 1$ – suma istnieje.
2. $S = \frac{8}{1 - \frac12} = \frac{8}{\frac12} = 16$.
Odpowiedź: $16$

### Sprawdź się: suma szeregu
Oblicz sumę szeregu $8 + 4 + 2 + 1 + \dots$
1. $a_1 = 8$, $q = \frac{4}{8} = \frac12$, $|q| < 1$.
2. $S = \frac{8}{1 - \frac12} = \frac{8}{\frac12} = 16$.
Odpowiedź: $16$
Wynik: 16
