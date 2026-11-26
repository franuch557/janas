# Dowody i rozumowanie

Dowód to ciąg logicznych kroków, który pokazuje, że twierdzenie jest prawdziwe **zawsze**, a nie tylko dla przykładów. Przykład liczbowy nie jest dowodem.

## Dowody algebraiczne – przekształcenia równoważne
Typowe zadanie: „Wykaż, że dla każdej liczby rzeczywistej… zachodzi nierówność…”.

Schemat:
1. Przenieś wszystko na jedną stronę.
2. Przekształcaj do postaci, o której wiadomo, że jest prawdziwa – najczęściej **kwadrat jest nieujemny**: $(\dots)^2 \ge 0$.
3. Zapisz wniosek: „Otrzymaliśmy nierówność prawdziwą, a przekształcenia były równoważne, co kończy dowód”.

> Uwaga: nie zaczynaj od tezy i nie dochodź do $0 = 0$ bez komentarza. Zapisz, że przekształcenia były **równoważne**, albo prowadź rachunek od prawdziwej nierówności do tezy.

### Przykład: nierówność z kwadratem
Wykaż, że dla każdej liczby rzeczywistej $x$ zachodzi $x^2 + 9 \ge 6x$.
1. Przenosimy $6x$: $x^2 - 6x + 9 \ge 0$.
2. Lewa strona to kwadrat różnicy: $(x - 3)^2 \ge 0$.
3. Kwadrat liczby rzeczywistej jest zawsze nieujemny – nierówność jest prawdziwa.
4. Przekształcenia były równoważne, więc wyjściowa nierówność też jest prawdziwa.
Odpowiedź: teza udowodniona

### Przykład: dwie zmienne
Wykaż, że dla dowolnych $a, b$ zachodzi $a^2 + b^2 \ge 2ab$.
1. Przenosimy: $a^2 - 2ab + b^2 \ge 0$.
2. $(a - b)^2 \ge 0$ – prawda dla każdych $a, b$.
3. Przekształcenia równoważne, co kończy dowód.
Odpowiedź: teza udowodniona

### Sprawdź się: najmniejsza wartość
Wyrażenie $x^2 - 8x + 20$ zapisano jako $(x - 4)^2 + c$. Ile wynosi $c$? (Z tego wynika, że wyrażenie jest zawsze nie mniejsze niż $c$.)
1. $(x - 4)^2 = x^2 - 8x + 16$.
2. $x^2 - 8x + 20 = (x-4)^2 + 4$, więc $c = 4$.
Odpowiedź: $c = 4$, czyli $x^2 - 8x + 20 \ge 4$
Wynik: 4

## Dowody z liczbami całkowitymi
Zapisuj liczby za pomocą zmiennej:
- liczba parzysta: $2k$, nieparzysta: $2k + 1$ ($k$ – liczba całkowita),
- kolejne liczby: $n$, $n + 1$, $n + 2$,
- liczba podzielna przez $3$: $3k$, dająca resztę $1$: $3k + 1$.

Na końcu pokaż, że wyrażenie da się zapisać jako np. $3 \cdot (\text{liczba całkowita})$.

> Uwaga: sprawdzenie kilku przykładów nie jest dowodem. Liczby zapisz literami ($n$, $2k+1$) i przekształcaj ogólnie.

### Przykład: suma trzech kolejnych liczb
Wykaż, że suma trzech kolejnych liczb całkowitych jest podzielna przez $3$.
1. Liczby: $n$, $n + 1$, $n + 2$, gdzie $n$ jest całkowite.
2. Suma: $3n + 3 = 3(n + 1)$.
3. $n + 1$ jest liczbą całkowitą, więc suma jest podzielna przez $3$.
Odpowiedź: teza udowodniona

### Przykład: kwadrat liczby nieparzystej
Wykaż, że kwadrat liczby nieparzystej pomniejszony o $1$ jest podzielny przez $8$.
1. Liczba nieparzysta: $2k + 1$. $(2k + 1)^2 - 1 = 4k^2 + 4k = 4k(k + 1)$.
2. $k$ i $k + 1$ to kolejne liczby całkowite, więc jedna z nich jest parzysta: $k(k + 1) = 2m$.
3. $4k(k + 1) = 8m$ – podzielne przez $8$.
Odpowiedź: teza udowodniona

### Sprawdź się: suma kolejnych liczb nieparzystych
Suma trzech kolejnych liczb nieparzystych $2k+1$, $2k+3$, $2k+5$ jest podzielna przez pewną stałą liczbę większą od $1$. Przez jaką?
1. Suma: $6k + 9 = 3(2k + 3)$.
2. $2k + 3$ jest całkowite, więc suma dzieli się przez $3$.
Odpowiedź: przez $3$
Wynik: 3

## Dowody geometryczne
Opieraj się na znanych twierdzeniach i zapisuj uzasadnienia: „bo kąty wpisane oparte na tym samym łuku są równe”, „z cechy kąt-kąt-kąt trójkąty są podobne”. Rysunek z oznaczeniami jest bardzo ważny.

> Metoda:
> 1. Narysuj rysunek i oznacz wszystko, co znasz.
> 2. Do każdego kroku dopisz uzasadnienie (nazwę twierdzenia albo własności).
> 3. Zakończ wnioskiem, który powtarza tezę.

### Przykład: równoległobok
Wykaż, że przekątne równoległoboku dzielą go na cztery trójkąty o równych polach.
1. Przekątne równoległoboku przecinają się w połowie, w punkcie $S$.
2. Trójkąty $ABS$ i $BCS$ mają wspólną wysokość z wierzchołka $B$, a ich podstawy $AS$ i $SC$ są równe – mają równe pola.
3. Tak samo dla pozostałych par sąsiednich trójkątów.
4. Wszystkie cztery trójkąty mają więc równe pola.
Odpowiedź: teza udowodniona

### Sprawdź się: kąt w trójkącie równoramiennym
W trójkącie równoramiennym kąt między ramionami ma $40^\circ$. Ile stopni ma kąt przy podstawie? (Uzasadnienie: kąty przy podstawie są równe, a suma kątów to $180^\circ$.)
1. $180^\circ - 40^\circ = 140^\circ$ zostaje na dwa równe kąty.
2. $140^\circ : 2 = 70^\circ$.
Odpowiedź: $70^\circ$
Wynik: 70
