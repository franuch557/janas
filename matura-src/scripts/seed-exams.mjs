// Jednorazowy generator początkowego data/exams.json.
// Zawiera tylko dane, które zostały sprawdzone albo podane przez użytkownika.
// Pełne dane zadań powstają skryptem import-cke.mjs z plików PDF CKE.
import { readFileSync, writeFileSync } from 'node:fs';

const base = 'https://cke.gov.pl/images/_EGZAMIN_MATURALNY_OD_2023/Arkusze_egzaminacyjne';
const list2026 = readFileSync(new URL('./cke-2026-adresy.txt', import.meta.url), 'utf8').split('\n').filter(Boolean);
const pick = (re) => list2026.filter((u) => re.test(u));

const exam = (o) => ({
  session: 'maj', formula: '2023', status: 'tylko metadane', tasks: [], groups: [], ...o,
});

const SRC_INF_M = 'Informator CKE matematyka (PP/PR) od 2023: 180 min; PR 50 pkt; PP 50 pkt od 2025 (fragment w wyszukiwarce)';
const SRC_KOM_2324 = 'Komunikat CKE z 19.08.2022 (zmiany w latach 2023 i 2024): PP 180 min, 46 pkt (fragment w wyszukiwarce)';
const SRC_POL = 'Informator CKE j. polski PP: arkusz 1 (część 1 i 2) + arkusz 2 (wypracowanie), 240 min łącznie, wypracowanie 35 pkt; arkusze 2024 i 2026: arkusz 1 = 25 pkt (fragmenty w wyszukiwarce)';

const exams = [];
// Matematyka podstawowa
exams.push(exam({ id: 'MMAP-P0-100-2305', family: 'matematyka', level: 'podstawowy', year: 2023, maxPoints: 46, minutes: 180,
  urls: { arkusz: [`${base}/2023/Matematyka/poziom_podstawowy/MMAP-P0-100-2305.pdf`], zasady: [] }, sources: [SRC_KOM_2324] }));
exams.push(exam({ id: 'MMAP-P0-100-2405', family: 'matematyka', level: 'podstawowy', year: 2024, maxPoints: 46, minutes: 180,
  urls: { arkusz: [`${base}/2024/Matematyka/poziom_podstawowy/MMAP-P0-100-A-2405-arkusz.pdf`], zasady: [] }, sources: [SRC_KOM_2324] }));
exams.push(exam({ id: 'MMAP-P0-100-2505', family: 'matematyka', level: 'podstawowy', year: 2025, maxPoints: 50, minutes: 180,
  urls: { arkusz: [`${base}/2025/Matematyka/poziom_podstawowy/MMAP-P0-100-A-2505-arkusz.pdf`], zasady: [] }, sources: [SRC_INF_M, 'Arkusz 2025 (fragment): 50 pkt, 180 min'] }));
exams.push(exam({ id: 'MMAP-P0-100-2605', family: 'matematyka', level: 'podstawowy', year: 2026, maxPoints: 50, minutes: 180,
  urls: { arkusz: pick(/MMAP-P0-100-A-2605-arkusz/), zasady: pick(/MMAP-P0-100-2605-zasady/) }, sources: [SRC_INF_M + ' — liczby punktów w arkuszu 2026 nie sprawdzono'] }));
// Matematyka rozszerzona
exams.push(exam({ id: 'MMAP-R0-100-2305', family: 'matematyka', level: 'rozszerzony', year: 2023, maxPoints: 50, minutes: 180,
  urls: { arkusz: [`${base}/2023/Matematyka/poziom_rozszerzony/MMAP-R0-100-2305.pdf`], zasady: [] }, sources: [SRC_INF_M, 'Arkusz 2023 (fragment): 50 pkt, 180 min'] }));
exams.push(exam({ id: 'MMAP-R0-100-2405', family: 'matematyka', level: 'rozszerzony', year: 2024, maxPoints: 50, minutes: 180,
  urls: { arkusz: [`${base}/2024/Matematyka/poziom_rozszerzony/MMAP-R0-100-A-2405-arkusz.pdf`], zasady: [] }, sources: [SRC_INF_M] }));

// Arkusz referencyjny 2025: rozkład punktów podany przez użytkownika w założeniach projektu.
const U = 'założenia projektu (rozkład punktów podany przez użytkownika); nie porównano z PDF';
const t = (nr, maxPoints, topics, extra = {}) => ({ nr, maxPoints, type: null, topics, summary: null, proof: null, cases: null, page: null, source: U, ...extra });
exams.push(exam({ id: 'MMAP-R0-100-2505', family: 'matematyka', level: 'rozszerzony', year: 2025, maxPoints: 50, minutes: 180,
  urls: { arkusz: [], zasady: [] }, status: 'częściowy',
  tasks: [
    t('1', null, ['potegi']), t('2', null, ['potegi']),
    t('3', null, ['planimetria', 'dowody']),
    t('4', 3, ['kombinatoryka', 'prawdopodobienstwo']),
    t('5', 4, ['wartosc-bezwzgledna', 'rownania']),
    t('6', 4, ['ciagi']),
    t('7', null, ['planimetria', 'dowody']),
    t('8', 5, ['geometria-analityczna']),
    t('9', 5, ['trygonometria']),
    t('10', 5, ['stereometria']),
    t('11', 6, ['kwadratowa-parametr']),
    t('12', 6, ['pochodne']),
  ],
  groups: [
    { tasks: ['1', '2'], points: 5, topics: ['potegi'], note: 'Potęgi i funkcja wykładnicza: 5 pkt łącznie za zad. 1 i 2; podział między zadania nieznany.' },
    { tasks: ['3', '7'], points: 7, topics: ['planimetria', 'dowody'], note: 'Planimetria i dowody: 7 pkt łącznie za zad. 3 i 7; podział nieznany.' },
  ],
  sources: [U, SRC_INF_M] }));
exams.push(exam({ id: 'MMAP-R0-100-2605', family: 'matematyka', level: 'rozszerzony', year: 2026, maxPoints: 50, minutes: 180,
  urls: { arkusz: pick(/MMAP-R0-100-A-2605-arkusz/), zasady: pick(/MMAP-R0-100-2605-zasady/) }, sources: [SRC_INF_M] }));
// Język polski podstawowy (arkusz 1 + arkusz 2 jako jeden egzamin)
for (const y of [2023, 2024, 2025, 2026]) {
  const yy = String(y).slice(2);
  const urls = { arkusz: [], zasady: [] };
  if (y === 2023) urls.zasady.push(`${base}/2023/Jezyk_polski/poziom_podstawowy/MPOP-P2-100-2305-zasady.pdf`);
  if (y === 2026) { urls.arkusz.push(...pick(/MPOP-P1-100-A-2605-arkusz|MPOP-P2-100-A-2605-arkusz/)); urls.zasady.push(...pick(/MPOP-P1-100-2605-zasady|MPOP-P2-100-2605-zasady/)); }
  exams.push(exam({ id: `MPOP-P1-P2-${yy}05`, family: 'polski', level: 'podstawowy', year: y, maxPoints: 60, minutes: 240, urls,
    groups: [
      { tasks: [], points: 25, topics: ['pol-rozumienie', 'pol-jezyk', 'pol-historycznoliteracki'], note: 'Arkusz 1 (części 1 i 2): 25 pkt; podział 10 + 15 widoczny w arkuszu pokazowym 2022.' },
      { tasks: [], points: 35, topics: ['pol-wyp-kompetencje', 'pol-wyp-kompozycja', 'pol-wyp-jezyk'], note: 'Arkusz 2 (wypracowanie): 35 pkt według informatora.' },
    ],
    sources: [SRC_POL] }));
}
// Język angielski podstawowy
for (const y of [2023, 2024, 2025, 2026]) {
  const yy = String(y).slice(2);
  const urls = { arkusz: [], zasady: [] };
  if (y === 2023) urls.zasady.push(`${base}/2023/Jezyk_angielski/poziom_podstawowy/MJAP-P0-100-2305-zasady.pdf`);
  if (y === 2025) {
    urls.arkusz.push('https://cke.gov.pl/EGZAMIN_MATURALNY/2025/Jezyk_angielski/poziom_podstawowy/MJAP-P0-100-A-2505-arkusz.pdf');
    urls.zasady.push(`${base}/2025/zasady_oceniania/MJAP-P0-100-200-660-2505_MJAU-P0-100-2505-zasady.pdf`);
  }
  if (y === 2026) { urls.arkusz.push(...pick(/MJAP-P0-100-A-2605-arkusz/)); urls.zasady.push(...pick(/MJAP-P0-100-200-660-2605-zasady/)); }
  const e = exam({ id: `MJAP-P0-100-${yy}05`, family: 'angielski', level: 'podstawowy', year: y, maxPoints: null, minutes: null, urls,
    sources: ['Informator CKE j. angielski od 2023: części pisemne (fragment w wyszukiwarce); czas i suma punktów niezweryfikowane'] });
  if (y === 2025) {
    const K = 'Nagłówki zadań w karcie MJAP-P0-100-A-2505 (fragment w wyszukiwarce)';
    e.status = 'częściowy';
    e.tasks = [
      ['2', 6], ['3', 4], ['4', 4], ['5', 7], ['6', 5], ['11', 3], ['12', 12],
    ].map(([nr, p]) => ({ nr, maxPoints: p, type: nr === '12' ? 'otwarte' : null, topics: nr === '12' ? ['ang-pisanie'] : [], summary: null, proof: false, cases: false, page: null, source: K }));
    e.sources.push(K);
  }
  exams.push(e);
}

const out = { version: 1, note: 'Dane arkuszy CKE formuły 2023. Pola null oznaczają brak danych w sprawdzonych źródłach. Uzupełnianie: npm run import-cke -- <katalog z PDF>.', exams };
writeFileSync(new URL('../data/exams.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('Zapisano', exams.length, 'arkuszy');
