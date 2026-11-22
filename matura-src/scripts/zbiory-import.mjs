// Zbiory zadań CKE z matematyki (materiał dodatkowy z 2022 r.) jako „arkusze” z sesją „zbiór”.
//
// Użycie:  npm run zbiory:import [-- <katalog z PDF>]   (domyślnie cke-pdf/)
//
// W katalogu muszą być pliki zbior-zadan-matematyka-pp.pdf i/lub zbior-zadan-matematyka-pr.pdf.
// Zbiór ma dwie części w jednym PDF: zadania (działy I–XIII) i „Zasady oceniania”.
// Skrypt dzieli PDF na te części, wycina obrazy zadań i odpowiedzi tak jak import arkuszy
// (cke-obrazy/zad|odp/<id>/<nr>.jpg) i dopisuje wpis do data/exams.json. Zadania ze zbioru
// trafiają do banku zadań i planu, ale nie do arkuszy próbnych ani wag tematów.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planSheet, planRules, linesBetween, isClosed, needsProof, needsCases, guessTopics, summarize, whiteouts, columnFor } from './cke-parse.mjs';
import { buildAnswer } from './cke-answers.mjs';
import { loadPdf, renderGray, cutFragment, composeJpeg } from './cke-pdf.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const srcDir = resolve(root, process.argv[2] ?? 'cke-pdf');
const examsPath = join(root, 'data/exams.json');
const imgOut = join(root, 'cke-obrazy');
const manualAnswers = existsSync(join(root, 'data/odpowiedzi-recznie.json')) ? JSON.parse(readFileSync(join(root, 'data/odpowiedzi-recznie.json'), 'utf8')) : {};

const ZBIORY = [
  { file: 'zbior-zadan-matematyka-pp.pdf', id: 'ZBIOR-MMAP-P0', level: 'podstawowy', name: 'Zbiór zadań CKE z matematyki, poziom podstawowy (7 października 2022 r.)' },
  { file: 'zbior-zadan-matematyka-pr.pdf', id: 'ZBIOR-MMAP-R0', level: 'rozszerzony', name: 'Zbiór zadań CKE z matematyki, poziom rozszerzony (2022 r.)' },
  // informator: zasady i rozwiązanie są pod każdym zadaniem
  { file: 'informator-matematyka-pp-2024.pdf', id: 'INF-MMAP-P0', level: 'podstawowy', informator: true, name: 'Informator CKE o egzaminie maturalnym z matematyki, poziom podstawowy (od roku szkolnego 2024/2025)' },
  { file: 'informator-matematyka-pr-2024.pdf', id: 'INF-MMAP-R0', level: 'rozszerzony', informator: true, name: 'Informator CKE o egzaminie maturalnym z matematyki, poziom rozszerzony (od roku szkolnego 2024/2025)' },
];

// dział zbioru (nagłówek „V. Funkcje”) → temat z taksonomii
const SECTIONS = [
  [/^I\.Liczbyrzeczywiste/, 'potegi'],
  [/^II\.Wyrażeniaalgebraiczne/, 'wielomiany'],
  [/^III\.Równaniainierówności/, 'rownania'],
  [/^IV\.Układyrównań/, 'rownania'],
  [/^V\.Funkcje/, 'kwadratowa-parametr'],
  [/^VI\.Ciągi/, 'ciagi'],
  [/^VII\.Trygonometria/, 'trygonometria'],
  [/^VIII\.Planimetria/, 'planimetria'],
  [/^IX\.Geometriaanalityczna/, 'geometria-analityczna'],
  [/^X\.Stereometria/, 'stereometria'],
  [/^XI\.Kombinatoryka/, 'kombinatoryka'],
  [/^XII\.Rachunekprawdopodobieństwa/, 'prawdopodobienstwo'],
  [/^XIII\.Optymalizacja/, 'pochodne'],
];
const sectionOf = (n) => SECTIONS.find(([re]) => re.test(n))?.[1] ?? null;

const data = JSON.parse(readFileSync(examsPath, 'utf8'));
const report = [];
const issues = [];

for (const z of ZBIORY) {
  const file = join(srcDir, z.file);
  if (!existsSync(file)) { report.push(`${z.id}: brak pliku ${z.file}, pomijam`); continue; }
  const { doc, pages } = await loadPdf(file);
  const scratch = (p) => ({ ...p, lines: [{ n: 'BRUDNOPIS', text: 'BRUDNOPIS', items: [], y: 100, top: 90, bottom: 110, x0: 0, x1: 0 }] });
  let taskPages, rulePages, rulesStart = null;
  const pageSection = new Map();
  if (z.informator) {
    // zadania od „Przykładowe zadania z rozwiązaniami” do informacji dla absolwentów niesłyszących
    const from = pages.find((p) => p.page > 4 && p.lines.some((l) => /^\d?\.?Przykładowezadaniazrozwiązaniami$/.test(l.n)))?.page ?? 11;
    const to = pages.find((p) => p.page > from && p.lines.some((l) => /^\d\.Informacjaoegzaminie/.test(l.n)))?.page ?? pages.length + 1;
    taskPages = pages.map((p) => (p.page < from || p.page >= to ? scratch(p) : { ...p, col: [40, 575] }));
    rulePages = taskPages;
  } else {
  // strona tytułowa części „Zasady oceniania” (sama ta linia poza nagłówkiem i stopką)
  rulesStart = pages.find((p) => p.page > 5 && p.lines.some((l) => l.n === 'Zasadyoceniania') && p.lines.filter((l) => !/^(Strona\d|Materiałdodatkowy|Zbiórzadań)/.test(l.n)).length <= 2)?.page;
  if (!rulesStart) { report.push(`${z.id}: nie znalazłem części „Zasady oceniania”, pomijam`); continue; }
  // część z zadaniami: strony wprowadzenia działów („Wymagania szczegółowe z zakresu obszaru…”) i zasady jako brudnopis,
  // żeby wycinek zadania nie przechodził przez nie
  const intro = (p) => p.lines.some((l) => /^Wymaganiaszczegółowezzakresuobszaru|^Spistreści|^Wprowadzenie$|^Celekształcenia/.test(l.n));
  taskPages = pages.map((p) => (p.page >= rulesStart || p.page < 7 || intro(p) ? scratch(p) : p));
  // część z zasadami: nagłówki działów („III. Równania i nierówności”) kończą wycinek poprzedniego zadania
  rulePages = pages.map((p) => (p.page <= rulesStart ? { ...p, lines: [] } : { ...p, lines: p.lines.map((l) => (sectionOf(l.n) ? { ...l, n: 'Wypowiedźpisemna' } : l)) }));
  // dział każdej strony z zadaniami (z ostatniego nagłówka działu przed nią)
  let cur = null;
  for (const p of pages) {
    if (p.page >= rulesStart) break;
    for (const l of p.lines) cur = sectionOf(l.n) ?? cur;
    pageSection.set(p.page, cur);
  }
  }
  const info = { family: 'matematyka', level: z.level, part: 1, kind: 'arkusz', taskPrefix: '' };
  const plan = planSheet(info, taskPages);
  const rules = planRules({ ...info, kind: 'zasady' }, rulePages);
  const tasks = [];
  const images = [];
  for (const t of plan.tasks) {
    if (z.informator) {
      // obraz i treść zadania kończą się przed tabelą wymagań
      // od nagłówka tego zadania (polecenie wspólne „Zadanie 27.” przed nim zostaje bez zmian)
      const own = plan.heads.find((h) => h.nr === t.sheetNr);
      const from = own ? { page: own.page, y: own.top - 6 } : { page: t.frags[0].page, y: t.frags[0].y0 };
      const ls = linesBetween(taskPages, from, null);
      const req = ls.find((l, i) => i > 0 && /^Wymagani[ae]/.test(l.n));
      if (req) {
        const cut = { page: req.page, y: req.top - 6 };
        const before = (f) => f.page < from.page || (f.page === from.page && f.y1 <= from.y + 1);
        t.frags = t.frags.flatMap((f) => (before(f) || f.page < cut.page ? [f] : f.page === cut.page && cut.y > f.y0 + 6 ? [{ ...f, y1: Math.min(f.y1, cut.y) }] : []));
        const tl = ls.slice(0, ls.indexOf(req));
        t.text = tl.map((l) => l.text).join('\n');
      } else issues.push(`${z.id} zadanie ${t.nr}: nie znalazłem tabeli wymagań`);
    }
    const body = t.text.replace(/^Zadanie[^\n]*\n?/, '');
    const full = [t.stem, t.text].filter(Boolean).join('\n');
    const r = rules.find((x) => x.nr === t.sheetNr);
    if (!r) issues.push(`${z.id} zadanie ${t.nr}: brak w zasadach oceniania`);
    const ans = buildAnswer({ info, examId: z.id, task: t, body, rule: r, manual: manualAnswers[z.id]?.[t.nr] });
    for (const w of ans.issues ?? []) issues.push(`${z.id} zadanie ${t.nr}: ${w}`);
    const sec = pageSection.get(t.page);
    const guessed = guessTopics('matematyka', full, { level: z.level });
    let topics = [...new Set([sec, ...guessed].filter(Boolean))];
    // na poziomie podstawowym optymalizacja to funkcja kwadratowa (bez pochodnych)
    if (z.level === 'podstawowy') topics = topics.map((x) => (x === 'pochodne' ? 'kwadratowa-parametr' : x)).filter((x) => x !== 'granice-ciagow');
    topics = [...new Set(topics)];
    if (!topics.length) topics = guessed.length ? guessed : ['rownania'];
    tasks.push({
      nr: t.nr,
      maxPoints: t.maxPoints,
      type: ans.type ?? (isClosed(body) ? 'zamknięte' : 'otwarte'),
      topics: topics.slice(0, 3),
      summary: summarize(body),
      proof: needsProof(full),
      cases: needsCases(full),
      page: t.page,
      source: `import z PDF ${z.file}; tematy z działu zbioru i rozpoznane automatycznie`,
      answer: ans.answer ?? null,
      context: null,
      audio: null,
      alternative: null,
      essay: null,
    });
    images.push({ kind: 'zad', key: t.nr, pages: taskPages, frags: t.frags, width: 1000 });
    if (r) images.push({ kind: 'odp', key: t.nr, pages: rulePages, frags: r.frags, width: 900 });
  }
  tasks.sort((a, b) => a.nr.localeCompare(b.nr, 'pl', { numeric: true }));
  const maxPoints = tasks.reduce((s, t) => s + t.maxPoints, 0);
  const entry = {
    id: z.id, family: 'matematyka', level: z.level, year: z.informator ? 2024 : 2022, session: 'zbiór', formula: '2023',
    maxPoints, minutes: null, urls: { arkusz: [], zasady: [] }, status: 'pełny', tasks, groups: [],
    sources: [z.name, `PDF ${z.file} (import lokalny)`],
  };
  const at = data.exams.findIndex((e) => e.id === z.id);
  if (at >= 0) data.exams[at] = entry;
  else data.exams.push(entry);

  // obrazy
  for (const kind of ['zad', 'odp']) rmSync(join(imgOut, kind, z.id), { recursive: true, force: true });
  const cache = new Map();
  let n = 0;
  for (const im of images) {
    const frs = [];
    for (const f of im.frags) {
      const k = `${im.kind}#${f.page}`;
      if (!cache.has(k)) {
        if (cache.size > 6) cache.delete(cache.keys().next().value);
        const p = im.pages[f.page - 1];
        const col = columnFor('matematyka', p);
        cache.set(k, await renderGray(doc, f.page, im.width / (col[1] - col[0])));
      }
      frs.push(cutFragment(cache.get(k), { ...f, white: whiteouts(im.pages[f.page - 1], 'matematyka') }));
    }
    const jpg = im.kind === 'odp' ? await composeJpeg(frs, { width: 900, quality: 55, sep: 14 }) : await composeJpeg(frs);
    if (!jpg) { issues.push(`${z.id} obraz ${im.kind}/${im.key}: pusty wycinek`); continue; }
    const d = join(imgOut, im.kind, z.id);
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, `${im.key}.jpg`), jpg);
    n++;
  }
  await doc.destroy();
  const closed = tasks.filter((t) => t.type === 'zamknięte');
  report.push(`${z.id}: ${tasks.length} zadań, ${maxPoints} pkt, zamknięte ${closed.length} (z kluczem ${closed.filter((t) => t.answer).length}), obrazów ${n}, ${rulesStart ? `zasady od strony ${rulesStart}` : 'zasady pod zadaniami'}`);
}

writeFileSync(examsPath, JSON.stringify(data, null, 2) + '\n');
console.log(report.join('\n'));
if (issues.length) console.log(`Uwagi (${issues.length}):\n  ${issues.join('\n  ')}`);
