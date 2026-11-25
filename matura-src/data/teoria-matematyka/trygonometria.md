# Trygonometria

Na poziomie podstawowym: funkcje trygonometryczne w trójkącie prostokątnym, wartości dla kątów $30°, 45°, 60°$ i podstawowe tożsamości. Na rozszerzeniu: radiany, wzory redukcyjne i równania trygonometryczne.

## Funkcje w trójkącie prostokątnym
Dla kąta ostrego $\alpha$ w trójkącie prostokątnym:
- $\sin\alpha = \dfrac{\text{przyprostokątna naprzeciw}}{\text{przeciwprostokątna}}$,
- $\cos\alpha = \dfrac{\text{przyprostokątna przy kącie}}{\text{przeciwprostokątna}}$,
- $\text{tg}\,\alpha = \dfrac{\text{przyprostokątna naprzeciw}}{\text{przyprostokątna przy kącie}}$.

Wartości do zapamiętania:
- $\sin 30° = \frac12$, $\cos 30° = \frac{\sqrt3}{2}$, $\text{tg}\,30° = \frac{\sqrt3}{3}$,
- $\sin 45° = \cos 45° = \frac{\sqrt2}{2}$, $\text{tg}\,45° = 1$,
- $\sin 60° = \frac{\sqrt3}{2}$, $\cos 60° = \frac12$, $\text{tg}\,60° = \sqrt3$.

### Przykład: długość boku
W trójkącie prostokątnym przeciwprostokątna ma długość $10$, a kąt ostry $\alpha = 30°$. Oblicz przyprostokątną leżącą naprzeciw kąta $\alpha$.
1. $\sin 30° = \frac{a}{10}$.
2. $\frac12 = \frac{a}{10}$, więc $a = 5$.
Odpowiedź: $5$

### Przykład: tangens z boków
Przyprostokątne trójkąta mają długości $5$ i $12$. Oblicz $\sin\alpha$, gdzie $\alpha$ leży naprzeciw boku $5$.
1. Przeciwprostokątna z twierdzenia Pitagorasa: $\sqrt{25 + 144} = 13$.
2. $\sin\alpha = \frac{5}{13}$.
Odpowiedź: $\sin\alpha = \frac{5}{13}$

## Tożsamości trygonometryczne
- **jedynka trygonometryczna:** $\sin^2\alpha + \cos^2\alpha = 1$,
- $\text{tg}\,\alpha = \dfrac{\sin\alpha}{\cos\alpha}$,
- $\sin(90° - \alpha) = \cos\alpha$, $\cos(90° - \alpha) = \sin\alpha$.

Dla kąta ostrego wszystkie funkcje są dodatnie. Dla kąta rozwartego ($90° < \alpha < 180°$) sinus jest dodatni, a cosinus i tangens ujemne.

### Przykład: z jedynki
Kąt $\alpha$ jest ostry i $\sin\alpha = \frac{3}{5}$. Oblicz $\cos\alpha$ i $\text{tg}\,\alpha$.
1. $\cos^2\alpha = 1 - \frac{9}{25} = \frac{16}{25}$.
2. Kąt ostry, więc $\cos\alpha > 0$: $\cos\alpha = \frac45$.
3. $\text{tg}\,\alpha = \frac{3/5}{4/5} = \frac34$.
Odpowiedź: $\cos\alpha = \frac{4}{5}$, $\text{tg}\,\alpha = \frac{3}{4}$

### Przykład: z tangensa
Kąt $\alpha$ jest ostry i $\text{tg}\,\alpha = 2$. Oblicz $\sin\alpha$.
1. $\frac{\sin\alpha}{\cos\alpha} = 2$, więc $\sin\alpha = 2\cos\alpha$.
2. Jedynka: $4\cos^2\alpha + \cos^2\alpha = 1$, $\cos^2\alpha = \frac15$, $\cos\alpha = \frac{1}{\sqrt5}$.
3. $\sin\alpha = \frac{2}{\sqrt5} = \frac{2\sqrt5}{5}$.
Odpowiedź: $\sin\alpha = \frac{2\sqrt{5}}{5}$

## Równania trygonometryczne (rozszerzenie)
Miara łukowa: $180° = \pi$ rad, więc $30° = \frac{\pi}{6}$, $45° = \frac{\pi}{4}$, $60° = \frac{\pi}{3}$, $90° = \frac{\pi}{2}$.

Funkcje są okresowe: $\sin$ i $\cos$ mają okres $2\pi$, $\text{tg}$ – okres $\pi$.
- $\sin x = a$: $x = x_0 + 2k\pi$ lub $x = \pi - x_0 + 2k\pi$,
- $\cos x = a$: $x = x_0 + 2k\pi$ lub $x = -x_0 + 2k\pi$,
- $\text{tg}\,x = a$: $x = x_0 + k\pi$, gdzie $k \in \mathbb{Z}$.

### Przykład: równanie z sinusem
Rozwiąż $\sin x = \frac{1}{2}$.
1. Podstawowe rozwiązanie: $x_0 = \frac{\pi}{6}$.
2. Drugie: $\pi - \frac{\pi}{6} = \frac{5\pi}{6}$.
3. Dodajemy okres $2k\pi$.
Odpowiedź: $x = \frac{\pi}{6} + 2k\pi$ lub $x = \frac{5\pi}{6} + 2k\pi$, $k \in \mathbb{Z}$

### Przykład: równanie kwadratowe z cosinusem
Rozwiąż $2\cos^2 x - \cos x = 0$ w przedziale $[0, 2\pi]$.
1. $\cos x(2\cos x - 1) = 0$, więc $\cos x = 0$ lub $\cos x = \frac12$.
2. $\cos x = 0$: $x = \frac{\pi}{2}$ lub $x = \frac{3\pi}{2}$.
3. $\cos x = \frac12$: $x = \frac{\pi}{3}$ lub $x = \frac{5\pi}{3}$.
Odpowiedź: $x \in \left\{\frac{\pi}{3}, \frac{\pi}{2}, \frac{3\pi}{2}, \frac{5\pi}{3}\right\}$
