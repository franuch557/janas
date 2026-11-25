// Import arkuszy CKE z lokalnego katalogu PDF do data/exams.json.
//
// Użycie:  npm run import-cke -- <katalog z PDF> [--obrazy] [--tylko <examId>]
//
// Pliki muszą mieć oryginalne nazwy CKE (np. MMAP-R0-100-A-2505-arkusz.pdf, MMAP-P0-100-2305.pdf,
// MMAP-R0-100-2505-zasady.pdf, MJAP-P0-100-200-660-2505_MJAU-P0-100-2505-zasady.pdf, nagrania mp3).
// Importuję tylko wariant 100 (arkusze dostosowane pomijam i wypisuję).
//
// Z opcją --obrazy skrypt wycina obraz każdego zadania (cke-obrazy/zad/<examId>/<nr>.jpg),
// odpowiedzi z zasad oceniania (cke-obrazy/odp/…) i wspólnych materiałów (cke-obrazy/ctx/…).
// Renderuje pdfjs-dist + @napi-rs/canvas, bez programów zewnętrznych. Pakiet dla aplikacji
// tworzy potem `npm run cke:pakiet`.
//
// Poprawki ręczne: zadanie, którego pole `source` zaczyna się od „ręcznie”, zachowuje tematy
// i opis. Tematy przejrzane ręcznie są w data/tematy-recznie.json, a struktury odpowiedzi
// zamkniętych, których skrypt nie rozpoznaje sam, w data/odpowiedzi-recznie.json.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFileName, planSheet, planRules, findMeta, isClosed, needsProof, needsCases, guessTopics, summarize } from './cke-parse.mjs';
import { rubricFrom, buildAnswer, keyDetails, saveKeys, englishItems } from './cke-answers.mjs';
const keysOut = {};
import { issuesMarkdown, imagesLookup } from './validate-exams.mjs';
import { oldClosedKeys } from './stara-formula.mjs';
import { optionLetters } from './cke-answers.mjs';

const args = process.argv.slice(2);
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--tylko');
const withImages = args.includes('--obrazy');
const only = args.includes('--tylko') ? args[args.indexOf('--tylko') + 1] : null;
if (!dir || !existsSync(dir)) {
  console.error('Błąd: podaj katalog z plikami PDF, np. npm run import-cke -- cke-pdf');
  process.exit(1);
}

const { loadPdf, renderGray, cutFragment, composeJpeg } = await import('./cke-pdf.mjs');
const { englishSection } = await import('./cke-parse.mjs');
const { whiteouts } = await import('./cke-parse.mjs');

const root = fileURLToPath(new URL('../', import.meta.url));
const examsPath = join(root, 'data/exams.json');
const data = JSON.parse(readFileSync(examsPath, 'utf8'));
const readJson = (p, d) => (existsSync(join(root, p)) ? JSON.parse(readFileSync(join(root, p), 'utf8')) : d);
const manualTopics = readJson('data/tematy-recznie.json', {});
const manualAnswers = readJson('data/odpowiedzi-recznie.json', {});
const audioTimes = readJson('data/audio-czasy.json', {});

// formuła 2015: arkusze z lat 2015–2022 (arkusze pokazowe z marca 2022 są już w formule 2023)
const oldFormula = (info) => info.year < 2023 && info.session !== 'marzec';

// ---------- pliki ----------
const groups = new Map();
const skipped = [];
for (const f of readdirSync(dir).sort()) {
  if (!/\.(pdf|mp3)$/i.test(f)) continue;
  const info = parseFileName(f);
  if (!info) { skipped.push(`${f}: nieznana nazwa pliku`); continue; }
  if (info.adapted) { skipped.push(`${f}: arkusz dostosowany (wariant ${info.variant})`); continue; }
  if (oldFormula(info) && info.family !== 'matematyka') { skipped.push(`${f}: rok ${info.year} przed formułą 2023`); continue; }
  if (only && info.examId !== only) continue;
  if (!groups.has(info.examId)) groups.set(info.examId, { info, arkusz: [], zasady: [], transkrypcja: [], nagranie: [] });
  groups.get(info.examId)[info.kind].push({ file: join(dir, f), name: f, info });
}

const issues = []; // { examId, text }
const report = [];
const imgOut = join(root, 'cke-obrazy');
const ODP_WIDTH = Number(process.env.ODP_WIDTH ?? 900);
const ODP_QUALITY = Number(process.env.ODP_QUALITY ?? 55);
let imgCount = 0;

const sortNr = (a, b) => a.nr.localeCompare(b.nr, 'pl', { numeric: true });

for (const [examId, g] of groups) {
  const { info } = g;
  let e = data.exams.find((x) => x.id === examId);
  if (!e) {
    e = { id: examId, family: info.family, level: info.level, year: info.year, session: info.session ?? 'maj', formula: oldFormula(info) ? '2015' : '2023',
      maxPoints: null, minutes: null, urls: { arkusz: [], zasady: [] }, status: 'tylko metadane', tasks: [], groups: [], sources: [] };
    data.exams.push(e);
  }
  const issue = (text) => issues.push({ examId, text });
  if (!g.arkusz.length) { issue('Brak PDF arkusza w katalogu importu.'); continue; }
  const sheets = [];
  for (const a of g.arkusz.sort((x, y) => x.info.part - y.info.part)) sheets.push({ ...a, pdf: await loadPdf(a.file) });
  const rules = [];
  for (const z of g.zasady.sort((x, y) => x.info.part - y.info.part)) rules.push({ ...z, pdf: await loadPdf(z.file) });
  // formuła 2015 (2015–2017): lewy margines 57 pt zamiast 62 pt (arkusz i zasady)
  if (oldFormula(info)) for (const s of [...sheets, ...rules]) {
    const xs = s.pdf.pages.flatMap((p) => p.lines.filter((l) => /^Zadanie\s+\d/.test(l.text)).map((l) => l.x0));
    if (xs.length && Math.min(...xs) < 62) for (const p of s.pdf.pages) p.col = [50, 540];
  }

  // ---------- metadane ----------
  const metas = sheets.map((s) => findMeta(s.pdf.pages));
  const maxPts = metas.every((m) => m.maxPoints != null) ? metas.reduce((t, m) => t + m.maxPoints, 0) : null;
  if (maxPts != null) e.maxPoints = maxPts;
  const minutes = metas[0].minutes;
  if (minutes != null) e.minutes = minutes;

  // ---------- zadania ----------
  const old = new Map(e.tasks.map((t) => [t.nr, t]));
  const tasks = [];
  const images = []; // { kind, key, sheet|rule, frags }
  const parts = [];
  for (const s of sheets) {
    const plan = planSheet(s.info, s.pdf.pages);
    const rulesDoc = info.family === 'polski' ? rules.find((r) => r.info.part === s.info.part) : rules[0];
    const rPlan = rulesDoc ? planRules(rulesDoc.info, rulesDoc.pdf.pages) : [];
    if (!rulesDoc) issue(`Brak zasad oceniania dla arkusza ${s.name}: odpowiedzi zadań zamkniętych = null.`);
    for (const c of plan.contexts) images.push({ kind: 'ctx', key: c.key, src: s, frags: c.frags });
    const partTasks = [];
    // formuła 2015: klucz zadań zamkniętych w innym układzie niż od 2023
    const oldKeys = oldFormula(info) && rulesDoc ? oldClosedKeys(rulesDoc.pdf.pages) : null;
    for (const w of oldKeys?.issues ?? []) issue(`Klucz starej formuły: ${w}`);
    for (const t of plan.tasks) {
      const body = t.text.replace(/^Zadanie[^\n]*\n?/, '');
      const full = [t.stem, t.text].filter(Boolean).join('\n');
      let r = info.family === 'angielski' ? rPlan.find((x) => x.main === Number(t.sheetNr)) : rPlan.find((x) => x.nr === t.sheetNr);
      const oldKey = oldKeys?.keys[t.sheetNr ?? t.nr];
      if (oldKey && optionLetters(body).length >= 4) r = { ...(r ?? { frags: [] }), tokens: [oldKey] };
      if (rulesDoc && !r) issue(`Zadanie ${t.nr}: nie znalazłem go w zasadach oceniania.`);
      if (r && r.points != null && r.points !== t.maxPoints && info.family !== 'angielski' && !t.alternative) issue(`Zadanie ${t.nr}: w arkuszu ${t.maxPoints} pkt, w zasadach ${r.points} pkt.`);
      const ans = t.essay ? { type: 'otwarte', answer: null } : buildAnswer({ info, examId, task: t, body, rule: r, manual: manualAnswers[examId]?.[t.nr] });
      for (const w of ans.issues ?? []) issue(`Zadanie ${t.nr}: ${w}`);
      const prev = old.get(t.nr);
      const mt = manualTopics[examId]?.[t.nr];
      const topics = mt?.topics ?? (prev?.source?.startsWith('ręcznie') ? prev.topics : guessTopics(info.family, full, { level: info.level, part: s.info.part, section: t.section, points: t.maxPoints }));
      const task = {
        nr: t.nr,
        maxPoints: t.maxPoints,
        type: ans.type ?? (isClosed(body) ? 'zamknięte' : 'otwarte'),
        topics,
        summary: summarize(info.family === 'polski' && s.info.part === 2 ? t.text.replace(/^Temat\s*\d+\s*\.?\s*/, '') : body),
        proof: info.family === 'matematyka' ? (mt?.proof ?? needsProof(full)) : null,
        cases: info.family === 'matematyka' ? (mt?.cases ?? needsCases(full)) : null,
        page: t.page,
        source: mt ? `ręcznie: ${mt.note ?? 'tematy sprawdzone z treścią zadania'}; reszta z PDF ${examId}` : prev?.source?.startsWith('ręcznie') ? prev.source : `import z PDF ${examId}; tematy rozpoznane automatycznie, do sprawdzenia`,
        answer: ans.answer ?? null,
        context: t.context ?? null,
        audio: null,
        alternative: t.alternative ?? null,
        rubric: rubricFrom(ans, r, t),
        essay: t.essay ?? null,
      };
      if (info.family === 'angielski' && /Usłyszysz/.test(t.text)) {
        const at = audioTimes[examId]?.[t.nr];
        task.audio = { start: at?.start ?? null, end: at?.end ?? null };
      }
      if (r && task.type === 'otwarte' && !task.essay) {
        const kd = keyDetails(r.mtext ?? r.text, t.maxPoints);
        if (info.family === 'angielski') kd.english = englishItems(r.openKey, t, (id) => englishSection(rulesDoc.pdf.pages.flatMap((p) => p.lines), id));
        (keysOut[examId] ??= {})[t.nr] = kd;
      }
      tasks.push(task);
      partTasks.push(task.nr);
      images.push({ kind: 'zad', key: t.nr, src: s, frags: t.frags });
      if (r && rulesDoc) {
        let frags = r.frags;
        if (info.family === 'angielski' && t.itemIds) {
          // część zamknięta: tabela odpowiedzi; część otwarta: uszczegółowienia
          const closed = t.itemIds.some((id) => r.closedIds.includes(id));
          frags = closed ? r.frags : r.openFrags.length ? r.openFrags : r.frags;
          if (t.essay) frags = r.frags;
        }
        if (t.alternative && r.temats?.length) frags = r.temats[Number(t.nr.split('.').pop()) - 1]?.frags ?? frags;
        images.push({ kind: 'odp', key: t.nr, src: rulesDoc, frags });
      }
    }
    if (info.family === 'polski') {
      parts.push({ id: `A${s.info.part}`, name: s.info.part === 1 ? 'Arkusz 1. (testy)' : 'Arkusz 2. (wypracowanie)', minutes: metas[0].jointTime ? null : metas[sheets.indexOf(s)].minutes, maxPoints: metas[sheets.indexOf(s)].maxPoints, tasks: partTasks });
    }
  }
  tasks.sort(sortNr);
  e.tasks = tasks;
  if (e.maxPoints == null && tasks.length) {
    // strona tytułowa nie podaje maksimum (arkusz pokazowy z polskiego, 2022): suma punktów zadań
    e.maxPoints = tasks.filter((t, i, a) => !t.alternative || a.findIndex((x) => x.alternative === t.alternative) === i).reduce((s, t) => s + t.maxPoints, 0);
    issue(`Strona tytułowa nie podaje maksimum punktów: przyjęto sumę punktów zadań (${e.maxPoints}).`);
  }
  e.groups = [];
  e.status = 'pełny';
  e.audio = info.family === 'angielski' ? (g.nagranie.length ? `${examId}.mp3` : null) : null;
  if (info.family === 'angielski' && !g.nagranie.length) issue('Brak nagrania mp3 w katalogu importu.');
  if (info.family === 'polski') {
    e.parts = parts;
    if (metas[0].jointTime) issue(`Arkusze 1 i 2 nie mają osobnego czasu: strona tytułowa podaje ${minutes} min łącznie na testy i wypracowanie (parts[].minutes = null).`);
  } else delete e.parts;
  for (const s of [...sheets, ...rules]) {
    const src = `PDF ${s.name} (import lokalny)`;
    if (!e.sources.includes(src)) e.sources.push(src);
  }
  e.sources = e.sources.filter((x) => !/^Rozbieżność/.test(x));
  const closed = tasks.filter((t) => t.type === 'zamknięte');
  const known = closed.filter((t) => t.answer && t.answer.items.every((i) => i.correct != null)).length;
  report.push(`${examId}: ${tasks.length} zadań, ${e.maxPoints} pkt, ${e.minutes} min; zamknięte ${closed.length}, odpowiedzi odczytane ${known}`);

  // ---------- obrazy ----------
  if (withImages) {
    for (const kind of ['zad', 'odp', 'ctx']) rmSync(join(imgOut, kind, examId), { recursive: true, force: true });
    const cache = new Map();
    const pageImg = async (src, page, family) => {
      const k = `${src.file}#${page}`;
      if (!cache.has(k)) {
        if (cache.size > 6) cache.delete(cache.keys().next().value);
        const p = src.pdf.pages[page - 1];
        const col = (await import('./cke-parse.mjs')).columnFor(family, p);
        // obrazy odpowiedzi (zasady oceniania) węższe: 900 px, żeby pakiety mieściły się w limicie
        const width = src.info.kind === 'zasady' ? ODP_WIDTH : 1000;
        cache.set(k, await renderGray(src.pdf.doc, page, width / (col[1] - col[0])));
      }
      return cache.get(k);
    };
    for (const im of images.sort((a, b) => (a.src.file < b.src.file ? -1 : 1))) {
      const frs = [];
      for (const f of im.frags) {
        const r = await pageImg(im.src, f.page, info.family);
        const white = whiteouts(im.src.pdf.pages[f.page - 1], info.family);
        frs.push(cutFragment(r, { ...f, white }));
      }
      const jpg = im.kind === 'odp' ? await composeJpeg(frs, { width: ODP_WIDTH, quality: ODP_QUALITY, sep: 14 }) : await composeJpeg(frs);
      if (!jpg) { issue(`Obraz ${im.kind}/${im.key}: pusty wycinek.`); continue; }
      const d = join(imgOut, im.kind, examId);
      mkdirSync(d, { recursive: true });
      writeFileSync(join(d, `${im.key}.jpg`), jpg);
      imgCount++;
    }
  }
  for (const s of [...sheets, ...rules]) await s.pdf.doc.destroy();
}

data.version = 3;
writeFileSync(examsPath, JSON.stringify(data, null, 2) + '\n');
await saveKeys(root, keysOut);
// uwagi z importu: zastępuję wpisy importowanych arkuszy, pozostałe zostawiam
const notesPath = join(root, 'data/exams-import-uwagi.json');
const prevNotes = existsSync(notesPath) ? JSON.parse(readFileSync(notesPath, 'utf8')) : [];
const notes = [...prevNotes.filter((n) => !groups.has(n.examId)), ...issues];
writeFileSync(notesPath, JSON.stringify(notes, null, 1) + '\n');
writeFileSync(join(root, 'data/exams-issues.md'), issuesMarkdown(data, notes, await imagesLookup(new URL('../', import.meta.url))));
console.log('Zaimportowano:\n  ' + (report.join('\n  ') || 'nic'));
if (skipped.length) console.log('Pominięto:\n  ' + skipped.join('\n  '));
if (withImages) console.log(`Obrazy: ${imgCount} plików w ${imgOut} (zad/, odp/, ctx/). Pakiet dla aplikacji: npm run cke:pakiet`);
process.exit(0);
