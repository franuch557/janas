# Prawdopodobieństwo i statystyka

Prawdopodobieństwo klasyczne to iloraz liczby zdarzeń sprzyjających przez liczbę wszystkich możliwych. Do tego statystyka: średnia, mediana, dominanta i odchylenie.

## Prawdopodobieństwo klasyczne

> $$P(A) = \frac{|A|}{|\Omega|}$$

gdzie $|\Omega|$ – liczba wszystkich zdarzeń elementarnych, $|A|$ – liczba zdarzeń sprzyjających.

Zawsze $0 \le P(A) \le 1$, a zdarzenie przeciwne: $P(A') = 1 - P(A)$.

> Metoda:
> 1. Policz wszystkie wyniki $|\Omega|$ (często regułą mnożenia).
> 2. Policz wyniki sprzyjające $|A|$ – wypisz je, jeśli jest ich mało.
> 3. Podziel i skróć ułamek.

> Uwaga: przy rzucie dwiema kostkami $(2, 5)$ i $(5, 2)$ to **dwa różne** wyniki.

### Przykład: dwie kostki
Rzucamy dwa razy kostką. Oblicz prawdopodobieństwo, że suma oczek wynosi $8$.
1. $|\Omega| = 6 \cdot 6 = 36$.
2. Sumę $8$ dają pary: $(2,6), (3,5), (4,4), (5,3), (6,2)$ – $5$ par.
3. $P = \frac{5}{36}$.
Odpowiedź: $\frac{5}{36}$

### Przykład: zdarzenie przeciwne
Rzucamy trzy razy monetą. Oblicz prawdopodobieństwo, że wypadnie co najmniej jeden orzeł.
1. „Co najmniej jeden” – łatwiej policzyć zdarzenie przeciwne: same reszki.
2. $|\Omega| = 2^3 = 8$, same reszki: $1$ wynik, $P(A') = \frac18$.
3. $P(A) = 1 - \frac18 = \frac78$.
Odpowiedź: $\frac{7}{8}$

### Sprawdź się: suma oczek
Rzucamy dwa razy kostką. Oblicz prawdopodobieństwo, że suma oczek wynosi $7$.
1. $|\Omega| = 36$. Sumę $7$ dają: $(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)$ – $6$ wyników.
2. $P = \frac{6}{36} = \frac16$.
Odpowiedź: $\frac{1}{6}$
Wynik: 1/6

## Losowanie bez zwracania i drzewko
Przy losowaniu kilku elementów naraz liczymy kombinacjami. Gdy losujemy po kolei i warunki się zmieniają, rysujemy **drzewko**: prawdopodobieństwa na gałęziach mnożymy, a wyniki różnych gałęzi dodajemy.

> Uwaga: bez zwracania w drugim losowaniu zmienia się liczba wszystkich kul (w mianowniku jest o $1$ mniej).

### Przykład: kule z urny
W urnie są $5$ białych i $3$ czarne kule. Losujemy jednocześnie dwie. Oblicz prawdopodobieństwo, że obie są białe.
1. $|\Omega| = \binom{8}{2} = 28$.
2. $|A| = \binom{5}{2} = 10$.
3. $P = \frac{10}{28} = \frac{5}{14}$.
Odpowiedź: $\frac{5}{14}$

### Przykład: drzewko
Z tej samej urny losujemy kolejno dwie kule bez zwracania. Oblicz prawdopodobieństwo, że będą różnych kolorów.
1. Biała, potem czarna: $\frac58 \cdot \frac37 = \frac{15}{56}$.
2. Czarna, potem biała: $\frac38 \cdot \frac57 = \frac{15}{56}$.
3. Dodajemy gałęzie: $\frac{30}{56} = \frac{15}{28}$.
Odpowiedź: $\frac{15}{28}$

### Sprawdź się: dwie czerwone
W urnie są $4$ kule czerwone i $6$ niebieskich. Losujemy dwie bez zwracania. Oblicz prawdopodobieństwo, że obie są czerwone.
1. $\frac{4}{10} \cdot \frac{3}{9} = \frac{12}{90}$.
2. $\frac{12}{90} = \frac{2}{15}$.
Odpowiedź: $\frac{2}{15}$
Wynik: 2/15

## Statystyka
- **średnia arytmetyczna:** suma wartości podzielona przez ich liczbę,
- **mediana:** wartość środkowa po uporządkowaniu (przy parzystej liczbie danych – średnia dwóch środkowych),
- **dominanta:** wartość występująca najczęściej,
- **odchylenie standardowe:** $\sigma = \sqrt{\dfrac{(x_1 - \bar{x})^2 + \dots + (x_n - \bar{x})^2}{n}}$ – mówi, jak bardzo dane są rozrzucone wokół średniej.

> Uwaga: medianę liczymy **po uporządkowaniu** danych. Bez sortowania wynik zwykle wychodzi zły.

### Przykład: średnia i mediana
Dane: $3, 7, 2, 9, 4, 5$. Oblicz średnią i medianę.
1. Średnia: $\frac{3 + 7 + 2 + 9 + 4 + 5}{6} = \frac{30}{6} = 5$.
2. Porządkujemy: $2, 3, 4, 5, 7, 9$. Środkowe: $4$ i $5$.
3. Mediana: $\frac{4 + 5}{2} = 4{,}5$.
Odpowiedź: średnia $5$, mediana $4{,}5$

### Przykład: odchylenie standardowe
Oblicz odchylenie standardowe danych $2, 4, 4, 6$.
1. Średnia: $\frac{16}{4} = 4$.
2. Kwadraty odchyleń: $(2-4)^2 = 4$, $0$, $0$, $(6-4)^2 = 4$; suma $8$.
3. $\sigma = \sqrt{\frac{8}{4}} = \sqrt2$.
Odpowiedź: $\sqrt{2}$

### Sprawdź się: mediana
Wyznacz medianę danych: $7, 2, 9, 4, 4, 10, 1$.
1. Porządkujemy: $1, 2, 4, 4, 7, 9, 10$.
2. Środkowa (czwarta) wartość: $4$.
Odpowiedź: $4$
Wynik: 4
