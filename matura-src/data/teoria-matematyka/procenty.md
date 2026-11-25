# Procenty i ciągi finansowe

Procenty są w prawie każdym arkuszu: obniżki, podwyżki, lokaty, punkty procentowe. Najwygodniej liczyć je **mnożnikami**.

## Procent liczby i mnożnik
$p\%$ liczby $x$ to $\frac{p}{100} \cdot x$. Np. $15\%$ z $80$ to $0{,}15 \cdot 80 = 12$.

**Mnożniki:**
- podwyżka o $p\%$: nowa wartość $= x \cdot \left(1 + \frac{p}{100}\right)$,
- obniżka o $p\%$: nowa wartość $= x \cdot \left(1 - \frac{p}{100}\right)$.

Np. podwyżka o $20\%$ to mnożenie przez $1{,}2$, obniżka o $30\%$ to mnożenie przez $0{,}7$. Kilka zmian po kolei = mnożymy mnożniki.

### Przykład: dwie zmiany ceny
Cenę towaru podniesiono o $20\%$, a potem obniżono o $20\%$. O ile procent zmieniła się cena?
1. Mnożniki: $1{,}2$ i $0{,}8$.
2. Łączny mnożnik: $1{,}2 \cdot 0{,}8 = 0{,}96$.
3. $0{,}96$ to $96\%$ ceny początkowej, czyli spadek o $4\%$.
Odpowiedź: cena zmalała o $4\%$

### Przykład: cena przed obniżką
Po obniżce o $15\%$ kurtka kosztuje $340$ zł. Ile kosztowała przed obniżką?
1. Cena po obniżce to $0{,}85$ ceny początkowej: $0{,}85x = 340$.
2. $x = \frac{340}{0{,}85} = 400$.
Odpowiedź: $400$ zł

## Jakim procentem jest liczba, punkty procentowe
Jakim procentem liczby $b$ jest liczba $a$? Liczymy $\frac{a}{b} \cdot 100\%$.

O ile procent $a$ jest większe od $b$? Liczymy $\frac{a - b}{b} \cdot 100\%$ – zawsze dzielimy przez wartość, **z którą porównujemy**.

**Punkty procentowe** to różnica dwóch procentów: jeśli oprocentowanie wzrosło z $4\%$ do $5\%$, to wzrosło o $1$ punkt procentowy, ale o $25\%$.

### Przykład: o ile procent więcej
Liczba $a = 60$, liczba $b = 48$. O ile procent $a$ jest większa od $b$?
1. Różnica: $60 - 48 = 12$.
2. Dzielimy przez $b$ (porównujemy z $b$): $\frac{12}{48} = 0{,}25$.
Odpowiedź: o $25\%$

### Przykład: punkty procentowe
Poparcie partii wzrosło z $20\%$ do $25\%$. O ile punktów procentowych i o ile procent wzrosło?
1. Punkty procentowe: $25 - 20 = 5$ p.p.
2. Procentowo: $\frac{25 - 20}{20} = \frac{5}{20} = 0{,}25$, czyli $25\%$.
Odpowiedź: o $5$ punktów procentowych, czyli o $25\%$

## Procent składany – lokaty i kredyty
Kapitał $K$ na lokacie z oprocentowaniem $p\%$ rocznie, z kapitalizacją co rok, po $n$ latach wynosi:

$$K_n = K \cdot \left(1 + \frac{p}{100}\right)^n$$

To ciąg geometryczny o ilorazie $q = 1 + \frac{p}{100}$. Jeśli kapitalizacja jest $k$ razy w roku, to w każdym okresie oprocentowanie wynosi $\frac{p}{k}\%$, a okresów jest $n \cdot k$.

### Przykład: lokata na 2 lata
Wpłacamy $5000$ zł na lokatę $4\%$ w skali roku z kapitalizacją roczną. Ile będzie po 2 latach?
1. Mnożnik roczny: $1 + 0{,}04 = 1{,}04$.
2. $K_2 = 5000 \cdot 1{,}04^2 = 5000 \cdot 1{,}0816$.
3. $K_2 = 5408$.
Odpowiedź: $5408$ zł

### Przykład: kapitalizacja kwartalna
Lokata $1000$ zł, $8\%$ w skali roku, kapitalizacja co kwartał. Jaki będzie stan po roku?
1. W kwartale oprocentowanie: $8\% : 4 = 2\%$, mnożnik $1{,}02$.
2. W roku są $4$ kwartały: $K = 1000 \cdot 1{,}02^4$.
3. $1{,}02^4 = 1{,}08243216$, więc $K \approx 1082{,}43$.
Odpowiedź: około $1082{,}43$ zł
