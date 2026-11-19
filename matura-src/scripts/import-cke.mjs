// Import arkuszy CKE z lokalnego katalogu PDF do data/exams.json.
//
// Użycie:  npm run import-cke -- <katalog z PDF> [--obrazy]
//
// Pliki muszą mieć oryginalne nazwy CKE, np. MMAP-R0-100-A-2505-arkusz.pdf,
// MMAP-R0-100-2505-zasady.pdf. Importuję tylko wariant 100 (arkusze dostosowane
// pomijam i wypisuję). Z opcją --obrazy skrypt wycina obraz każdego zadania
// programem pdftoppm (pakiet poppler) i pakuje je do cke-obrazy.zip, który
// importujesz w aplikacji: Ustawienia → Dane → Obrazy arkuszy.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseFileName, tasksFromPages, findMeta } from './cke-parse.mjs';
import { issuesMarkdown } from './validate-exams.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const withImages = args.includes('--obrazy');
if (!dir || !existsSync(dir)) {
  console.error('Błąd: podaj katalog z plikami PDF, np. npm run import-cke -- ~/Pobrane/cke');
  process.exit(1);
}

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

async function readPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    // grupowanie elementów w linie po współrzędnej y
    const rows = new Map();
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const y = Math.round(vp.height - it.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ x: it.transform[4], s: it.str });
    }
    const lines = [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([y, parts]) => ({ y, text: parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ').replace(/\s+/g, ' ').trim() }));
    pages.push({ page: i, height: vp.height, width: vp.width, lines });
  }
  return pages;
}

const examsPath = new URL('../data/exams.json', import.meta.url);
const data = JSON.parse(readFileSync(examsPath, 'utf8'));
const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf'));
const skipped = [];
const imported = [];
const crops = [];

for (const f of files.sort()) {
  const info = parseFileName(f);
  if (!info) { skipped.push(`${f}: nieznana nazwa pliku`); continue; }
  if (info.adapted) { skipped.push(`${f}: arkusz dostosowany (wariant ${info.variant})`); continue; }
  if (info.year < 2023) { skipped.push(`${f}: rok ${info.year} przed formułą 2023 (import starej formuły nie jest obsługiwany)`); continue; }
  const pages = await readPages(join(dir, f));
  let e = data.exams.find((x) => x.id === info.examId);
  if (!e) {
    e = { id: info.examId, family: info.family, level: info.level, year: info.year, session: info.session ?? 'maj', formula: '2023',
      maxPoints: null, minutes: null, urls: { arkusz: [], zasady: [] }, status: 'tylko metadane', tasks: [], groups: [], sources: [] };
    data.exams.push(e);
  }
  const src = `PDF ${f} (import lokalny)`;
  if (info.kind === 'arkusz') {
    const meta = findMeta(pages);
    if (meta.minutes && info.family !== 'polski') e.minutes = meta.minutes;
    if (meta.maxPoints && info.family !== 'polski') e.maxPoints = meta.maxPoints;
    const parsed = tasksFromPages(info, pages);
    for (const t of parsed) {
      const { _crop, ...task } = t;
      const old = e.tasks.find((x) => x.nr === task.nr);
      if (old && old.source.startsWith('ręcznie')) continue; // ręcznych poprawek nie nadpisuję
      if (old) Object.assign(old, task); else e.tasks.push(task);
      crops.push({ kind: 'zad', examId: e.id, nr: task.nr, file: join(dir, f), height: pages[_crop.page - 1].height, width: pages[_crop.page - 1].width, ..._crop });
    }
    if (parsed.length) {
      // grupy z łączną punktacją zastępuje dokładna punktacja z arkusza;
      // w polskim arkusz 1 zastępuje grupę testów, arkusz 2 grupę wypracowania
      const marker = info.part === 2 ? 'pol-wyp-kompetencje' : 'pol-rozumienie';
      e.groups = info.family === 'polski' ? e.groups.filter((g) => !g.topics.includes(marker)) : [];
      e.status = e.groups.length ? 'częściowy' : 'pełny';
    }
    e.tasks.sort((a, b) => a.nr.localeCompare(b.nr, 'pl', { numeric: true }));
    imported.push(`${f}: ${parsed.length} zadań${meta.maxPoints ? `, maks. ${meta.maxPoints} pkt` : ''}${meta.minutes ? `, ${meta.minutes} min` : ''}`);
  } else {
    // zasady oceniania: tylko porównanie punktacji
    const parsed = tasksFromPages(info, pages);
    for (const t of parsed) {
      crops.push({ kind: 'odp', examId: e.id, nr: t.nr, file: join(dir, f), height: pages[t._crop.page - 1].height, width: pages[t._crop.page - 1].width, ...t._crop });
      const ex = e.tasks.find((x) => x.nr === t.nr);
      if (ex && ex.maxPoints != null && t.maxPoints != null && ex.maxPoints !== t.maxPoints) {
        e.sources.push(`Rozbieżność: zad. ${t.nr} w arkuszu ${ex.maxPoints} pkt, w zasadach ${t.maxPoints} pkt`);
      }
    }
    imported.push(`${f}: zasady oceniania, porównano ${parsed.length} zadań`);
  }
  if (!e.sources.includes(src)) e.sources.push(src);
}

writeFileSync(examsPath, JSON.stringify(data, null, 2) + '\n');
writeFileSync(new URL('../data/exams-issues.md', import.meta.url), issuesMarkdown(data));
console.log('Zaimportowano:\n  ' + (imported.join('\n  ') || 'nic'));
if (skipped.length) console.log('Pominięto:\n  ' + skipped.join('\n  '));

if (withImages && crops.length) {
  const out = new URL('../cke-obrazy/', import.meta.url).pathname;
  const DPI = 96;
  const k = DPI / 72;
  const { zipSync } = await import('fflate');
  const zip = {};
  for (const c of crops) {
    const top = Math.max(0, c.y - 14);
    const bottom = c.nextPage === c.page && c.nextY ? c.nextY - 6 : c.height - 40;
    const d = join(out, c.kind, c.examId);
    mkdirSync(d, { recursive: true });
    const base = join(d, c.nr);
    try {
      execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=62', '-gray', '-singlefile', '-r', String(DPI), '-f', String(c.page), '-l', String(c.page),
        '-x', '0', '-y', String(Math.round(top * k)), '-W', String(Math.round(c.width * k)), '-H', String(Math.max(40, Math.round((bottom - top) * k))), c.file, base]);
      zip[`${c.kind === 'odp' ? 'odp/' : ''}${c.examId}/${c.nr}.jpg`] = new Uint8Array(readFileSync(`${base}.jpg`));
    } catch {
      console.error('Błąd: nie udało się uruchomić pdftoppm. Zainstaluj poppler (np. brew install poppler) albo pomiń --obrazy.');
      break;
    }
  }
  const zipPath = new URL('../cke-obrazy.zip', import.meta.url).pathname;
  writeFileSync(zipPath, zipSync(zip));
  console.log(`Obrazy: ${Object.keys(zip).length} (zadania i odpowiedzi) w ${zipPath}. Zadania wielostronicowe mają obraz tylko pierwszej strony.`);
  console.log('Wbudowanie obrazów w plik jednoplikowy: npm run embed-images && npm run build:jeden-plik');
}
