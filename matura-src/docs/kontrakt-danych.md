# Kontrakt danych wersji 3

Wspólna umowa między skryptami importu (dane) a aplikacją (widoki). Zmiany w tym pliku
uzgadnia koordynator.

## 1. `data/exams.json`

Typy w `src/types.ts` (`Exam`, `ExamTask`). Pola wersji 3 dopisane do zadania:

```ts
interface ExamTask {
  nr: string;                 // „5”, „6.1”; polski: „A1.5” (arkusz 1), „A2.1” (arkusz 2)
  maxPoints: number;          // po imporcie zawsze liczba
  type: 'zamknięte' | 'otwarte';
  topics: string[];           // id z src/data/taxonomy.ts
  summary: string | null;
  page: number | null;
  source: string;             // „ręcznie: …” = poprawione ręcznie, skrypt nie nadpisuje
  answer: ClosedAnswer | null; // tylko zamknięte; null = nie odczytano (opis w exams-issues.md)
  context?: string | null;    // klucz wspólnego materiału (tekst, rysunek) w ctx/ pakietu arkusza
  audio?: { start: number | null; end: number | null } | null; // angielski, słuchanie; sekundy w mp3 arkusza
  alternative?: string | null; // zadania do wyboru (np. dwa tematy wypracowania) mają ten sam klucz; liczy się jedno
  essay?: { minWords: number | null; maxWords: number | null; criteria: string } | null; // wypracowanie / wypowiedź pisemna
  proof?: boolean | null;
  cases?: boolean | null;
}

interface ClosedAnswer {
  // Każda pozycja to jedno pole wyboru na karcie odpowiedzi.
  items: { id: string; label: string | null; options: string[]; correct: string | null }[];
  // Jak liczyć punkty z liczby poprawnych pozycji:
  //  'each'  – 1 pkt za każdą poprawną pozycję (suma ≤ maxPoints)
  //  'all'   – maxPoints tylko, gdy wszystkie pozycje poprawne, inaczej 0
  //  { "4": 2, "3": 1 } – liczba poprawnych → punkty (brak klucza = 0), dokładnie wg zasad CKE
  scoring: 'each' | 'all' | Record<string, number>;
}
```

Przykłady:
- matematyka A–D: `items: [{id:'1', label:null, options:['A','B','C','D'], correct:'B'}]`, `scoring:'each'`.
- P/F z dwoma zdaniami za 1 pkt: dwie pozycje `options:['P','F']`, `scoring:'all'`.
- angielski „Zadanie 1 (0–5)”: pozycje `1.1 … 1.5`, `scoring:'each'`.
- wybór „A/B oraz 1/2/3”: dwie pozycje, `scoring:'all'`.

Poprawne odpowiedzi pochodzą wyłącznie z zasad oceniania (wersja A arkusza wariantu 100).
Arkusz z odpowiedziami `correct: null` w zadaniu zamkniętym jest w aplikacji traktowany
jak otwarty (samoocena).

Do arkusza (`Exam`) dochodzą:
- `audio: string | null`: nazwa pliku mp3 w pakiecie (`<examId>.mp3`), tylko angielski;
- `parts?: { id: string; name: string; minutes: number; tasks: string[] }[]`: części
  egzaminu (polski: arkusz 1 i arkusz 2), jeśli mają osobny czas.

Suma `maxPoints` zadań (każda grupa `alternative` liczona raz) = `maxPoints` arkusza.

## 2. `data/kryteria.json`

Kryteria samooceny wypracowania i wypowiedzi pisemnej, odczytane z zasad oceniania:

```json
{ "pol-2023": { "name": "…", "max": 35, "groups": [ { "name": "…", "criteria": [
  { "id": "…", "name": "…", "max": 16, "values": [0,1,2,…], "description": "…" } ] } ] } }
```

## 3. Pakiet obrazów i nagrań (nie trafia do repozytorium)

`npm run cke:pakiet` tworzy w `public/cke/` (w `.gitignore`):
- `<examId>.json` = `{ "zad": { "<nr>": "data:image/jpeg;base64,…" }, "odp": { … }, "ctx": { "<klucz>": "data:…" } }`,
  każdy plik ≤ 12 MB;
- `<examId>.mp3`: nagranie arkusza angielskiego, mono, ok. 48 kb/s, ≤ 12 MB.

- `wzory.json` = `{ "zrodlo": "<nazwa PDF>", "strony": ["data:image/jpeg;base64,…", …] }`: karta
  „Wybrane wzory matematyczne” CKE, tylko gdy jej PDF (nazwa zawiera „wzory”) jest w `cke-pdf/`;
  w przeciwnym razie pliku nie ma i widok musi to obsłużyć.

`odp[nr]` jest zawsze jednym obrazem (data URL). W matematyce obraz odpowiedzi zawiera zasady
oceniania i pierwszy sposób przykładowego rozwiązania (bez „Sposób II…”), szerokość 900 px.

Aplikacja pobiera je względnym adresem `cke/<examId>.json` i `cke/<examId>.mp3`
(działa w `npm run dev` i w artefakcie, gdzie te pliki są publikowane obok strony).
Każde zadanie w `exams.json` ma obraz w `zad`. Zadanie z zasadami ma obraz w `odp`.
Brak obrazu przerywa `npm run cke:pakiet` błędem.

## 4. Zapis stanu ucznia

Artefakt deklaruje `capabilities: { db: {}, user: {} }`. Dane prywatne w
`data/users/<id>/<dokument>` (`id = await user.id()`), dokumenty ≤ 256 KiB:
- `stan`: ustawienia, onboarding, przypomnienie, ręczne zmiany planu;
- `wyniki-RRRR-MM`: zdarzenia wyników (zapis z id, cofnięcie = zdarzenie usunięcia);
- `sesja-<id>`: trwający arkusz, diagnoza albo wypracowanie (start, odpowiedzi, czas);
- `wypracowania`: zapisane teksty i oceny.

Kopia w `localStorage` (`matura2027-v3`) zawsze; gdy `db` niedostępne, jedyny zapis.
Scalanie: zdarzenia łączone po id, dokumenty `stan` i `sesja-*` według pola `updatedAt`.

## 5. `data/ustny/pytania-jawne.json` (matura ustna z polskiego)

Tworzy `npm run ustny:import`, gdy w `cke-pdf/` jest PDF CKE z wykazem pytań jawnych (nazwa
zawiera „pytania” albo „jawne”):

```json
{ "zrodlo": "<nazwa PDF>", "rok": 2027, "pytania": [ { "nr": 1, "lektura": "…" , "lekturaId": null, "tresc": "…" } ] }
```

`lektura` = nagłówek grupy z wykazu (null, gdy wykaz go nie ma); `lekturaId` uzupełnia się ręcznie.


## 6. Zbiory zadań i informatory CKE (`session: "zbiór"`)

`npm run zbiory:import` dopisuje do `data/exams.json` cztery wpisy z sesją `"zbiór"`:
`ZBIOR-MMAP-P0`, `ZBIOR-MMAP-R0` (zbiory zadań CKE z 2022 r., rok 2022) oraz `INF-MMAP-P0`,
`INF-MMAP-R0` (informatory CKE od 2024/2025, rok 2024). Pliki w `cke-pdf/`:
`zbior-zadan-matematyka-pp.pdf`, `zbior-zadan-matematyka-pr.pdf`,
`informator-matematyka-pp-2024.pdf`, `informator-matematyka-pr-2024.pdf`.

- `minutes: null`, zadania mają ten sam format co w arkuszach (obrazy w `cke-obrazy/zad|odp/<id>/`).
- Aplikacja: `complete = false` (nie są arkuszami próbnymi), nie wchodzą do wag tematów ani do
  listy lat, ale trafiają do banku zadań, planu i diagnozy. Etykieta: „Zbiór zadań CKE” albo
  „Informator CKE” (`bookLabel` w `src/logic/cke.ts`).
- Tematy: dział zbioru (I–XIII) + słowa kluczowe; na poziomie podstawowym „Optymalizacja” = funkcja kwadratowa.
- Klucze zamkniętych, których skrypt nie rozpisuje, są w `data/odpowiedzi-recznie.json`.

## 7. Zadanie 2 z matury ustnej (`data/ustny/zadanie2.json`)

`npm run ustny:zadanie2` (plik `cke-pdf/polski-ustny-zadanie-2-zbior.pdf`, materiał dodatkowy CKE):

```json
{ "zrodlo": "…", "zadania": [ { "id": "2.7", "czesc": 2, "typ": "ikoniczny", "pytanie": "…?", "polecenie": "… Omów zagadnienie …", "strony": [68], "realizacje": [69, 70], "obraz": true, "realizacja": true } ] }
```

Obrazy (materiał i przykładowe realizacje) trafiają do `cke-obrazy/ustny/{zad,odp}/<id>.jpg`,
a `npm run cke:pakiet` składa z nich `public/cke/ustny-zadanie2.json` = `{ "zad": { id: dataURL }, "odp": { … } }`.
Notatki ucznia do zadania 2 są w dokumencie stanu pod kluczem `oral["z2-<id>"]`.

## 8. Format obrazów w pakiecie

Od wersji 3.3 `npm run cke:pakiet` koduje obrazy jako WebP (jakość 55, `WEBP_Q`), co daje ok. 25% mniej
niż JPEG. Obraz dłuższy niż 16 383 px albo taki, przy którym WebP nie jest mniejszy, zostaje w JPEG.
`WEBP=0` wyłącza konwersję. Aplikacja przyjmuje oba formaty (data URL).

## 9. Fiszki (powtórki jak w Anki)

Fiszka (`Flashcard` w `src/model.ts`) ma pola SM-2: `ease` (łatwość, start 2,5, min. 1,3), `ivl` (odstęp w
dniach, 0 = nowa albo w nauce), `lapses` (pomyłki), `firstOn` (dzień pierwszej nauki). Oceny: Nie umiem
(karta wraca w tej samej sesji, łatwość −0,2), Trudne (×1,2, −0,15), Dobrze (×łatwość), Łatwe (×łatwość×1,3, +0,15).
Najwyżej 20 nowych kart dziennie. Karta z co najmniej 4 pomyłkami jest „trudna”. Starsze karty (tylko `step`)
dostają odstęp z `INTERVALS[step]`.

## 10. Punktacja zadań otwartych (`rubric`)

Zadanie otwarte (bez `essay`) może mieć `rubric` z zasad oceniania CKE:

```json
"rubric": { "levels": [{ "points": 2, "text": "… obliczenie różnicy ciągu: r = −2." }, { "points": 1, "text": "…" }, { "points": 0, "text": "…" }], "result": "r = −2" }
```

- `levels` od najwyższego; pierwszy ma `points` równe `maxPoints`, ostatni 0
  (gdy zasady nie mają poziomu 0, skrypt dopisuje ogólny).
- Tekst z warstwy tekstowej PDF (NFKC), bez indeksów górnych i ułamków: dokładny zapis jest na obrazie zasad.
- `result`: tekst po ostatnim dwukropku najwyższego poziomu, gdy zawiera liczbę; inaczej null.
- Tworzą je `import-cke` i `zbiory:import` (`rubricFrom` w `scripts/cke-answers.mjs`).
