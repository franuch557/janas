# Równania i nierówności

Równania i nierówności liniowe, kwadratowe i układy równań pojawiają się w każdym arkuszu, także jako część większych zadań.

## Równania i nierówności liniowe
Równanie liniowe $ax + b = 0$ rozwiązujemy, przenosząc wyrazy: $x = -\frac{b}{a}$ (dla $a \neq 0$).

W nierównościach pamiętaj o jednej zasadzie: **mnożąc lub dzieląc przez liczbę ujemną, zmieniamy znak nierówności** na przeciwny.

> Uwaga: mnożąc albo dzieląc nierówność przez liczbę **ujemną**, zmieniamy zwrot nierówności.

### Przykład: nierówność z ułamkami
Rozwiąż nierówność $\dfrac{x - 1}{2} - \dfrac{x}{3} \ge 1$.
1. Mnożymy obie strony przez $6$ (liczba dodatnia, znak się nie zmienia): $3(x - 1) - 2x \ge 6$.
2. $3x - 3 - 2x \ge 6$, czyli $x - 3 \ge 6$.
3. $x \ge 9$.
Odpowiedź: $x \in [9, +\infty)$

### Przykład: dzielenie przez liczbę ujemną
Rozwiąż $5 - 2x > 11$.
1. $-2x > 6$.
2. Dzielimy przez $-2$, więc zmieniamy znak: $x < -3$.
Odpowiedź: $x \in (-\infty, -3)$

### Sprawdź się: nierówność liniowa
Rozwiąż nierówność $5 - 2x > 11$. Podaj największą liczbę całkowitą, która ją spełnia.
1. $-2x > 6$, dzielimy przez $-2$ i zmieniamy zwrot: $x < -3$.
2. Największa liczba całkowita mniejsza od $-3$ to $-4$.
Odpowiedź: $x < -3$, największa całkowita: $-4$
Wynik: -4

## Układy równań
Najczęściej stosujemy **metodę podstawiania** (z jednego równania wyznaczamy niewiadomą i wstawiamy do drugiego) albo **metodę przeciwnych współczynników** (dodajemy równania tak, by jedna niewiadoma zniknęła).

Interpretacja: rozwiązanie układu to punkt przecięcia dwóch prostych. Układ może mieć jedno rozwiązanie, nie mieć rozwiązań (proste równoległe) albo mieć ich nieskończenie wiele (ta sama prosta).

> Metoda:
> 1. Wybierz metodę: podstawianie (gdy łatwo wyznaczyć jedną niewiadomą) albo przeciwne współczynniki.
> 2. Wyznacz jedną niewiadomą, potem drugą.
> 3. Sprawdź wynik w obu równaniach.

### Przykład: przeciwne współczynniki
Rozwiąż układ $\begin{cases} 2x + 3y = 7 \\ 4x - 3y = 5 \end{cases}$
1. Dodajemy równania stronami – $y$ się redukuje: $6x = 12$.
2. $x = 2$.
3. Wstawiamy do pierwszego: $4 + 3y = 7$, więc $y = 1$.
Odpowiedź: $x = 2$, $y = 1$

### Przykład: podstawianie
Rozwiąż układ $\begin{cases} y = 2x - 1 \\ 3x + y = 9 \end{cases}$
1. Wstawiamy $y$ do drugiego równania: $3x + 2x - 1 = 9$.
2. $5x = 10$, $x = 2$.
3. $y = 2 \cdot 2 - 1 = 3$.
Odpowiedź: $x = 2$, $y = 3$

### Sprawdź się: układ równań
Rozwiąż układ $x + y = 10$, $x - y = 4$. Podaj $x$.
1. Dodajemy równania: $2x = 14$, więc $x = 7$.
2. $y = 10 - 7 = 3$.
Odpowiedź: $x = 7$, $y = 3$
Wynik: 7

## Równanie kwadratowe
Równanie $ax^2 + bx + c = 0$ ($a \neq 0$) rozwiązujemy przez wyróżnik:

> $$\Delta = b^2 - 4ac$$

> $\Delta > 0$: dwa rozwiązania $x_1 = \dfrac{-b - \sqrt{\Delta}}{2a}$, $x_2 = \dfrac{-b + \sqrt{\Delta}}{2a}$
> $\Delta = 0$: jedno rozwiązanie $x_0 = \dfrac{-b}{2a}$
> $\Delta < 0$: brak rozwiązań.

Gdy brakuje $b$ lub $c$, licz szybciej: $x^2 - 9 = 0 \Rightarrow x = \pm 3$, a $x^2 - 5x = 0 \Rightarrow x(x - 5) = 0$.

> $\Delta = b^2 - 4ac$
> $x_{1,2} = \dfrac{-b \pm \sqrt{\Delta}}{2a}$ (dla $\Delta \ge 0$)
> $\Delta < 0$ – brak pierwiastków, $\Delta = 0$ – jeden, $\Delta > 0$ – dwa

> Uwaga: równania bez wyrazu wolnego ($x^2 - 5x = 0$) rozwiązuj przez wyłączenie $x$ przed nawias – szybciej i bez błędów.

### Przykład: z deltą
Rozwiąż $2x^2 - 3x - 2 = 0$.
1. $a = 2$, $b = -3$, $c = -2$.
2. $\Delta = 9 - 4 \cdot 2 \cdot (-2) = 9 + 16 = 25$, $\sqrt{\Delta} = 5$.
3. $x_1 = \frac{3 - 5}{4} = -\frac12$, $x_2 = \frac{3 + 5}{4} = 2$.
Odpowiedź: $x \in \left\{-\frac{1}{2}, 2\right\}$

### Sprawdź się: większy pierwiastek
Rozwiąż równanie $x^2 - 2x - 15 = 0$. Podaj większy pierwiastek.
1. $\Delta = 4 + 60 = 64$, $\sqrt\Delta = 8$.
2. $x_1 = \frac{2 - 8}{2} = -3$, $x_2 = \frac{2 + 8}{2} = 5$.
Odpowiedź: $x = -3$ lub $x = 5$
Wynik: 5

## Nierówność kwadratowa
Kroki:
1. Liczymy miejsca zerowe (jak w równaniu).
2. Rysujemy parabolę: ramiona w górę, gdy $a > 0$, w dół, gdy $a < 0$.
3. Odczytujemy, gdzie wykres jest nad osią ($> 0$) albo pod osią ($< 0$).

> Metoda:
> 1. Znajdź miejsca zerowe (deltą albo z postaci iloczynowej).
> 2. Naszkicuj parabolę: ramiona w górę dla $a > 0$, w dół dla $a < 0$.
> 3. Odczytaj, gdzie wykres jest nad osią (znak $>$) albo pod nią (znak $<$).

### Przykład: ramiona w górę
Rozwiąż nierówność $x^2 - x - 6 \le 0$.
1. $\Delta = 1 + 24 = 25$, miejsca zerowe: $x_1 = \frac{1 - 5}{2} = -2$, $x_2 = \frac{1 + 5}{2} = 3$.
2. $a = 1 > 0$ – ramiona w górę, więc parabola jest pod osią między miejscami zerowymi.
3. Znak $\le$ – końce należą do rozwiązania.
Odpowiedź: $x \in [-2, 3]$

### Przykład: ramiona w dół
Rozwiąż $-x^2 + 4x > 0$.
1. $-x(x - 4) = 0$, miejsca zerowe: $0$ i $4$.
2. $a = -1 < 0$ – ramiona w dół, parabola jest nad osią między miejscami zerowymi.
3. Nierówność ostra – końce nie należą.
Odpowiedź: $x \in (0, 4)$

### Sprawdź się: liczby całkowite w rozwiązaniu
Ile liczb całkowitych spełnia nierówność $x^2 - 4x - 5 \le 0$?
1. Miejsca zerowe: $x = -1$ i $x = 5$; ramiona w górę, więc $x \in [-1, 5]$.
2. Liczby całkowite: $-1, 0, 1, 2, 3, 4, 5$ – jest ich $7$.
Odpowiedź: $7$
Wynik: 7
