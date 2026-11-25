# Kombinatoryka

Kombinatoryka odpowiada na pytanie „na ile sposobów?”. Najważniejsza jest reguła mnożenia – większość zadań na podstawie rozwiązuje się samą nią.

## Reguła mnożenia i dodawania
**Reguła mnożenia:** jeśli wybór składa się z kilku etapów, a w kolejnych etapach mamy $n_1, n_2, \dots$ możliwości, to wszystkich wyborów jest $n_1 \cdot n_2 \cdot \dots$

**Reguła dodawania:** jeśli wybory się wykluczają (albo to, albo tamto), dodajemy liczby możliwości.

### Przykład: liczby czterocyfrowe
Ile jest liczb czterocyfrowych o cyfrach parzystych?
1. Cyfry parzyste: $0, 2, 4, 6, 8$ – jest ich $5$.
2. Pierwsza cyfra nie może być zerem: $4$ możliwości.
3. Pozostałe trzy cyfry: po $5$ możliwości.
4. $4 \cdot 5 \cdot 5 \cdot 5 = 500$.
Odpowiedź: $500$

### Przykład: różne cyfry
Ile jest liczb trzycyfrowych o różnych cyfrach?
1. Pierwsza cyfra: $9$ możliwości ($1$–$9$).
2. Druga: $9$ (dowolna poza pierwszą, zero już można).
3. Trzecia: $8$.
4. $9 \cdot 9 \cdot 8 = 648$.
Odpowiedź: $648$

## Permutacje, wariacje, kombinacje
- **Permutacje** – ustawienia $n$ elementów w kolejności: $n! = 1 \cdot 2 \cdot \dots \cdot n$.
- **Wariacje bez powtórzeń** – wybór $k$ z $n$ elementów, kolejność ważna: $\dfrac{n!}{(n - k)!}$.
- **Kombinacje** – wybór $k$ z $n$ elementów, kolejność nieważna: $\binom{n}{k} = \dfrac{n!}{k!(n - k)!}$.

Jak rozpoznać: jeśli zamiana miejscami daje **inny** wynik (np. podium, kod) – kolejność ważna. Jeśli to ta sama grupa (np. delegacja, zestaw kart) – kombinacje.

### Przykład: delegacja
Z klasy liczącej $20$ osób wybieramy $3$-osobową delegację. Na ile sposobów?
1. Kolejność nieważna – kombinacje.
2. $\binom{20}{3} = \frac{20 \cdot 19 \cdot 18}{3 \cdot 2 \cdot 1} = 1140$.
Odpowiedź: $1140$

### Przykład: podium
W biegu startuje $8$ zawodników. Na ile sposobów mogą zostać przyznane medale złoty, srebrny i brązowy?
1. Kolejność ważna (złoto to nie srebro).
2. $8 \cdot 7 \cdot 6 = 336$.
Odpowiedź: $336$

### Przykład: ustawienie w rzędzie
Na ile sposobów można ustawić $5$ osób w rzędzie tak, by Ania i Bartek stali obok siebie?
1. Traktujemy Anię i Bartka jako jeden „blok” – mamy $4$ elementy: $4! = 24$ ustawień.
2. W bloku mogą się zamienić miejscami: $2$ sposoby.
3. $24 \cdot 2 = 48$.
Odpowiedź: $48$
