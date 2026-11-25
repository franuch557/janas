# Potęgi i funkcja wykładnicza

Ten dział to podstawa całej matury. Musisz umieć sprawnie liczyć potęgi o wykładnikach całkowitych i wymiernych, zamieniać pierwiastki na potęgi i znać wykres funkcji wykładniczej.

## Działania na potęgach
Potęga $a^n$ to iloczyn $n$ czynników równych $a$, np. $2^3 = 2 \cdot 2 \cdot 2 = 8$.

**Wzory, które musisz znać** (dla $a, b > 0$):
- $a^m \cdot a^n = a^{m+n}$ – przy mnożeniu wykładniki **dodajemy**,
- $a^m : a^n = a^{m-n}$ – przy dzieleniu wykładniki **odejmujemy**,
- $(a^m)^n = a^{m \cdot n}$ – potęga potęgi: wykładniki **mnożymy**,
- $(a \cdot b)^n = a^n \cdot b^n$ oraz $\left(\frac{a}{b}\right)^n = \frac{a^n}{b^n}$,
- $a^0 = 1$ (dla $a \neq 0$).

Najważniejsza sztuczka: sprowadź wszystkie liczby do **tej samej podstawy**, np. $4 = 2^2$, $8 = 2^3$, $27 = 3^3$.

### Przykład: ta sama podstawa
Oblicz $\dfrac{4^3 \cdot 8^2}{2^{10}}$.
1. Zapisujemy wszystko jako potęgi dwójki: $4^3 = (2^2)^3 = 2^6$ oraz $8^2 = (2^3)^2 = 2^6$.
2. Licznik: $2^6 \cdot 2^6 = 2^{12}$.
3. Dzielimy: $2^{12} : 2^{10} = 2^{2} = 4$.
Odpowiedź: $4$

### Przykład: wyłączanie wspólnego czynnika
Oblicz $\dfrac{3^{20} + 3^{18}}{3^{18}}$.
1. Wyłączamy w liczniku najmniejszą potęgę: $3^{20} + 3^{18} = 3^{18}(3^2 + 1) = 3^{18} \cdot 10$.
2. Skracamy $3^{18}$: zostaje $10$.
Odpowiedź: $10$

## Wykładnik ujemny i wymierny
**Wykładnik ujemny** oznacza odwrotność: $a^{-n} = \dfrac{1}{a^n}$, np. $2^{-3} = \frac{1}{8}$, a $\left(\frac{2}{3}\right)^{-2} = \left(\frac{3}{2}\right)^2 = \frac{9}{4}$.

**Wykładnik wymierny** to pierwiastek: $a^{\frac{m}{n}} = \sqrt[n]{a^m}$. Mianownik to stopień pierwiastka, licznik to potęga. Np. $8^{\frac{2}{3}} = \left(\sqrt[3]{8}\right)^2 = 2^2 = 4$.

Pierwiastki zamieniamy na potęgi: $\sqrt{a} = a^{\frac12}$, $\sqrt[3]{a} = a^{\frac13}$.

### Przykład: pierwiastki jako potęgi
Zapisz $\sqrt[3]{9} \cdot 3^{\frac{1}{3}}$ w postaci jednej potęgi liczby $3$.
1. $\sqrt[3]{9} = 9^{\frac13} = (3^2)^{\frac13} = 3^{\frac23}$.
2. Mnożymy: $3^{\frac23} \cdot 3^{\frac13} = 3^{\frac23 + \frac13} = 3^1$.
Odpowiedź: $3^1 = 3$

### Przykład: wykładnik ujemny i ułamkowy
Oblicz $\left(\frac{1}{16}\right)^{-\frac{3}{4}}$.
1. Minus w wykładniku odwraca ułamek: $\left(\frac{1}{16}\right)^{-\frac34} = 16^{\frac34}$.
2. $16^{\frac34} = \left(\sqrt[4]{16}\right)^3 = 2^3$.
3. $2^3 = 8$.
Odpowiedź: $8$

## Notacja wykładnicza
Bardzo duże i bardzo małe liczby zapisujemy jako $a \cdot 10^k$, gdzie $1 \le a < 10$, a $k$ jest liczbą całkowitą. Np. $45\,000 = 4{,}5 \cdot 10^4$, a $0{,}0032 = 3{,}2 \cdot 10^{-3}$.

### Przykład: iloczyn w notacji wykładniczej
Oblicz $(3 \cdot 10^5) \cdot (4 \cdot 10^{-2})$ i zapisz wynik w notacji wykładniczej.
1. Mnożymy osobno liczby i potęgi dziesiątki: $3 \cdot 4 = 12$, $10^5 \cdot 10^{-2} = 10^3$.
2. Mamy $12 \cdot 10^3$, ale $12 \ge 10$, więc $12 = 1{,}2 \cdot 10^1$.
3. Wynik: $1{,}2 \cdot 10^1 \cdot 10^3 = 1{,}2 \cdot 10^4$.
Odpowiedź: $1{,}2 \cdot 10^4$

## Funkcja wykładnicza
Funkcja $f(x) = a^x$, gdzie $a > 0$ i $a \neq 1$.
- Dziedzina: wszystkie liczby rzeczywiste, zbiór wartości: $(0, +\infty)$.
- Wykres zawsze przechodzi przez punkt $(0, 1)$, bo $a^0 = 1$, i nigdy nie dotyka osi $OX$.
- Dla $a > 1$ funkcja jest **rosnąca**, dla $0 < a < 1$ – **malejąca**.

Przesunięcie wykresu: $f(x) = a^{x-p} + q$ to wykres $a^x$ przesunięty o $p$ w prawo i o $q$ w górę. Wtedy zbiór wartości to $(q, +\infty)$.

### Przykład: odczytywanie podstawy
Wykres funkcji $f(x) = a^x$ przechodzi przez punkt $(2, 9)$. Wyznacz $a$ i oblicz $f(-1)$.
1. Podstawiamy punkt: $a^2 = 9$.
2. Ponieważ $a > 0$, to $a = 3$.
3. $f(-1) = 3^{-1} = \frac13$.
Odpowiedź: $a = 3$, $f(-1) = \frac{1}{3}$

### Przykład: zbiór wartości po przesunięciu
Podaj zbiór wartości funkcji $g(x) = 2^{x+1} - 5$.
1. Funkcja $2^{x+1}$ przyjmuje wszystkie wartości dodatnie: $(0, +\infty)$.
2. Odejmujemy $5$, czyli przesuwamy wykres o $5$ w dół.
Odpowiedź: $(-5, +\infty)$
