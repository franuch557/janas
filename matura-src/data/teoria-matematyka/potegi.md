# Potęgi i funkcja wykładnicza

Ten dział to podstawa całej matury. Musisz sprawnie liczyć potęgi o wykładnikach całkowitych i wymiernych, zamieniać pierwiastki na potęgi i znać wykres funkcji wykładniczej.

## Działania na potęgach
Potęga $a^n$ to iloczyn $n$ czynników równych $a$, np. $2^3 = 2 \cdot 2 \cdot 2 = 8$.

> $a^m \cdot a^n = a^{m+n}$ – mnożenie: wykładniki **dodajemy**
> $a^m : a^n = a^{m-n}$ – dzielenie: wykładniki **odejmujemy**
> $(a^m)^n = a^{m \cdot n}$ – potęga potęgi: wykładniki **mnożymy**
> $(a b)^n = a^n b^n$, $\left(\frac{a}{b}\right)^n = \frac{a^n}{b^n}$, $a^0 = 1$

> Metoda:
> 1. Zamień wszystkie liczby na potęgi **tej samej podstawy**: $4 = 2^2$, $8 = 2^3$, $9 = 3^2$, $27 = 3^3$, $25 = 5^2$.
> 2. Policz wykładniki według wzorów.
> 3. Dopiero na końcu oblicz wartość.

> Uwaga: wzory działają tylko przy mnożeniu i dzieleniu. $2^3 + 2^3 \neq 2^6$ – przy dodawaniu wyłączamy wspólny czynnik: $2^3 + 2^3 = 2 \cdot 2^3 = 2^4$.

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

### Sprawdź się: potęgi trójki
Oblicz $\dfrac{9^4 \cdot 27}{3^{9}}$.
1. $9^4 = (3^2)^4 = 3^8$, $27 = 3^3$.
2. Licznik: $3^8 \cdot 3^3 = 3^{11}$.
3. $3^{11} : 3^9 = 3^2 = 9$.
Odpowiedź: $9$
Wynik: 9

## Wykładnik ujemny i wymierny
> $a^{-n} = \dfrac{1}{a^n}$ – minus w wykładniku to **odwrotność**
> $a^{\frac{m}{n}} = \sqrt[n]{a^m}$ – mianownik to stopień pierwiastka, licznik to potęga
> $\sqrt{a} = a^{\frac12}$, $\sqrt[3]{a} = a^{\frac13}$

Np. $2^{-3} = \frac{1}{8}$, $\left(\frac{2}{3}\right)^{-2} = \left(\frac{3}{2}\right)^2 = \frac{9}{4}$, $8^{\frac{2}{3}} = \left(\sqrt[3]{8}\right)^2 = 2^2 = 4$.

> Uwaga: wykładnik ujemny nie zmienia znaku liczby. $2^{-3}$ to $\frac18$, a nie $-8$.

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

### Sprawdź się: potęga o wykładniku ułamkowym
Oblicz $27^{\frac{2}{3}} \cdot 9^{-1}$.
1. $27^{\frac23} = \left(\sqrt[3]{27}\right)^2 = 3^2 = 9$.
2. $9^{-1} = \frac19$.
3. $9 \cdot \frac19 = 1$.
Odpowiedź: $1$
Wynik: 1

## Notacja wykładnicza
> $a \cdot 10^k$, gdzie $1 \le a < 10$, a $k$ jest liczbą całkowitą
> $45\,000 = 4{,}5 \cdot 10^4$, $0{,}0032 = 3{,}2 \cdot 10^{-3}$

> Metoda:
> 1. Mnożąc albo dzieląc, licz osobno liczby i osobno potęgi dziesiątki.
> 2. Jeśli liczba przed potęgą wyjdzie $\ge 10$ albo $< 1$, popraw ją, przesuwając przecinek i zmieniając wykładnik.

### Przykład: iloczyn w notacji wykładniczej
Oblicz $(3 \cdot 10^5) \cdot (4 \cdot 10^{-2})$ i zapisz wynik w notacji wykładniczej.
1. Mnożymy osobno liczby i potęgi dziesiątki: $3 \cdot 4 = 12$, $10^5 \cdot 10^{-2} = 10^3$.
2. Mamy $12 \cdot 10^3$, ale $12 \ge 10$, więc $12 = 1{,}2 \cdot 10^1$.
3. Wynik: $1{,}2 \cdot 10^1 \cdot 10^3 = 1{,}2 \cdot 10^4$.
Odpowiedź: $1{,}2 \cdot 10^4$

### Sprawdź się: iloraz
Oblicz $\dfrac{8 \cdot 10^{6}}{2 \cdot 10^{2}}$. Podaj wynik jako liczbę.
1. $8 : 2 = 4$, $10^6 : 10^2 = 10^4$.
2. $4 \cdot 10^4 = 40\,000$.
Odpowiedź: $40\,000 = 4 \cdot 10^4$
Wynik: 40000

## Funkcja wykładnicza
> $f(x) = a^x$, gdzie $a > 0$, $a \neq 1$
> Dziedzina: $\mathbb{R}$, zbiór wartości: $(0, +\infty)$, wykres przechodzi przez $(0, 1)$
> $a > 1$ – funkcja **rosnąca**, $0 < a < 1$ – **malejąca**
> $f(x) = a^{x-p} + q$ – przesunięcie o $p$ w prawo i $q$ w górę, zbiór wartości $(q, +\infty)$

> Uwaga: wykres funkcji wykładniczej nigdy nie dotyka osi $OX$ – asymptotą jest prosta $y = q$.

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

### Sprawdź się: wartość funkcji
Dla funkcji $f(x) = 3^{x} - 2$ oblicz $f(2)$.
1. $3^2 = 9$.
2. $f(2) = 9 - 2 = 7$.
Odpowiedź: $7$
Wynik: 7
