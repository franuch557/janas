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
