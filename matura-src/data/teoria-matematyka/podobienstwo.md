# Podobieństwo i twierdzenia w trójkącie

Podobieństwo trójkątów, twierdzenie Talesa oraz twierdzenia sinusów i cosinusów – to narzędzia do obliczania nieznanych boków i kątów.

## Trójkąty podobne
Trójkąty są podobne, gdy mają równe kąty (wystarczą dwa). Wtedy odpowiednie boki są proporcjonalne, a stosunek to **skala podobieństwa** $k$.
- obwody mają stosunek $k$,
- **pola mają stosunek $k^2$**.

> Skala podobieństwa $k$: boki $\times k$, obwód $\times k$, pole $\times k^2$
> Cechy podobieństwa: kąt-kąt-kąt, bok-bok-bok (proporcjonalne), bok-kąt-bok

> Uwaga: pole zmienia się o **kwadrat** skali. Gdy boki są $3$ razy dłuższe, pole jest $9$ razy większe.

### Przykład: skala i pole
Trójkąty $ABC$ i $DEF$ są podobne w skali $k = 3$. Pole trójkąta $ABC$ wynosi $4$. Oblicz pole $DEF$ (większego).
1. Stosunek pól to $k^2 = 9$.
2. $P_{DEF} = 9 \cdot 4 = 36$.
Odpowiedź: $36$

### Przykład: podobieństwo w trójkącie prostokątnym
W trójkącie prostokątnym wysokość opuszczona na przeciwprostokątną dzieli ją na odcinki $4$ i $9$. Oblicz wysokość.
1. Wysokość dzieli trójkąt na dwa trójkąty podobne, więc $\frac{h}{4} = \frac{9}{h}$.
2. $h^2 = 36$.
3. $h = 6$.
Odpowiedź: $6$

### Sprawdź się: pole w skali
Trójkąty są podobne w skali $k = 3$. Pole mniejszego wynosi $5$. Oblicz pole większego.
1. Pole zmienia się o $k^2 = 9$.
2. $5 \cdot 9 = 45$.
Odpowiedź: $45$
Wynik: 45

## Twierdzenie Talesa
Jeśli ramiona kąta przetniemy prostymi równoległymi, to odcinki na jednym ramieniu są proporcjonalne do odpowiadających im odcinków na drugim ramieniu:

> $$\frac{a}{b} = \frac{c}{d}$$

> Metoda:
> 1. Zaznacz na rysunku odcinki na jednym ramieniu kąta i odpowiadające im na drugim.
> 2. Ułóż proporcję: odcinki na jednym ramieniu mają się do siebie jak odpowiadające im odcinki na drugim.
> 3. Rozwiąż proporcję „na krzyż”.

### Przykład: odcinek równoległy do boku
W trójkącie $ABC$ odcinek $DE$ jest równoległy do $AB$, $D$ leży na $AC$, $E$ na $BC$. $|CD| = 4$, $|DA| = 6$, $|AB| = 15$. Oblicz $|DE|$.
1. Trójkąty $CDE$ i $CAB$ są podobne, bo $DE \parallel AB$.
2. Skala: $\frac{|CD|}{|CA|} = \frac{4}{10} = \frac25$.
3. $|DE| = \frac25 \cdot 15 = 6$.
Odpowiedź: $6$

### Sprawdź się: proporcja Talesa
Ramiona kąta przecięto dwiema prostymi równoległymi. Na jednym ramieniu odcinki od wierzchołka mają długości $4$ i $6$ (kolejne), a na drugim pierwszy odcinek ma długość $6$. Oblicz drugi odcinek na tym ramieniu.
1. $\frac{4}{6} = \frac{6}{x}$.
2. $4x = 36$, więc $x = 9$.
Odpowiedź: $9$
Wynik: 9

## Twierdzenie sinusów i cosinusów
**Twierdzenie sinusów:** $\dfrac{a}{\sin\alpha} = \dfrac{b}{\sin\beta} = \dfrac{c}{\sin\gamma} = 2R$, gdzie $R$ to promień okręgu opisanego.

**Twierdzenie cosinusów:** $c^2 = a^2 + b^2 - 2ab\cos\gamma$ – uogólnienie twierdzenia Pitagorasa.

Kiedy którego używać: znasz dwa boki i kąt między nimi → cosinusy; znasz bok i kąt naprzeciw → sinusy.

> $\dfrac{a}{\sin\alpha} = \dfrac{b}{\sin\beta} = \dfrac{c}{\sin\gamma} = 2R$
> $c^2 = a^2 + b^2 - 2ab\cos\gamma$

### Przykład: twierdzenie cosinusów
W trójkącie boki $a = 5$ i $b = 8$ tworzą kąt $60°$. Oblicz trzeci bok.
1. $c^2 = 25 + 64 - 2 \cdot 5 \cdot 8 \cdot \cos 60°$.
2. $c^2 = 89 - 80 \cdot \frac12 = 49$.
3. $c = 7$.
Odpowiedź: $7$

### Przykład: promień okręgu opisanego
W trójkącie bok $a = 6$ leży naprzeciw kąta $30°$. Oblicz promień okręgu opisanego.
1. $\frac{a}{\sin\alpha} = 2R$: $\frac{6}{\frac12} = 2R$.
2. $12 = 2R$.
Odpowiedź: $R = 6$

### Sprawdź się: twierdzenie cosinusów
W trójkącie $a = 5$, $b = 8$, a kąt między nimi ma $60^\circ$. Oblicz $c$.
1. $c^2 = 25 + 64 - 2 \cdot 5 \cdot 8 \cdot \frac12 = 89 - 40 = 49$.
2. $c = 7$.
Odpowiedź: $c = 7$
Wynik: 7
