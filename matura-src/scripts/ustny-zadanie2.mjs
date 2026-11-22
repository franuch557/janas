// Zbiór CKE „Zadanie 2. w części ustnej egzaminu maturalnego” (materiał dodatkowy) dla widoku
// „Ustny polski”: polecenie, materiał (tekst literacki, ikoniczny albo językowy) i przykładowe realizacje.
//
// Użycie:  npm run ustny:zadanie2 [-- <katalog z PDF>]   (domyślnie cke-pdf/)
// Plik: polski-ustny-zadanie-2-zbior.pdf. Tworzy data/ustny/zadanie2.json (bez obrazów, w repo)
// i cke-obrazy/ustny/{zad,odp}/<id>.jpg (obrazy CKE poza repo; do pakietu: npm run cke:pakiet).
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPdf, renderGray, cutFragment, composeJpeg } from './cke-pdf.mjs';
import { pageLimits } from './cke-parse.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const srcDir = resolve(root, process.argv[2] ?? 'cke-pdf');
const FILE = 'polski-ustny-zadanie-2-zbior.pdf';
const file = join(srcDir, FILE);
if (!existsSync(file)) {
  console.log(`Brak ${FILE} w ${srcDir}: pomijam.`);
  process.exit(0);
}
const TYPES = { 1: 'literacki', 2: 'ikoniczny', 3: 'językowy' };
const COL = [40, 575];
const WIDTH = 900;

const { doc, pages } = await loadPdf(file);
// pierwsza strona każdego zadania i strony przykładowych realizacji
const starts = [];
const kindOf = new Map(); // strona → { id, realizacja }
for (const p of pages) {
  // nagłówek „Zadanie 1.1.” albo rozbity na dwie linie („Zadanie” / „2.7. Teksty ikoniczne”)
  const top = p.lines.filter((l) => l.y < 112);
  const one = top.find((l) => /^Zadanie(\d)\.(\d+)\.$/.test(l.n));
  const two = top.findIndex((l) => l.n === 'Zadanie');
  const m = one ? /^Zadanie(\d)\.(\d+)\.$/.exec(one.n) : two >= 0 ? /^()(\d)\.(\d+)\./.exec(top[two + 1]?.n ?? '')?.slice(1) : null;
  if (!m) continue;
  const [, a, b] = one ? m : [null, m[1], m[2]];
  const id = `${a}.${b}`;
  const real = p.lines.some((l) => l.y < 130 && /^Przykładowarealizacja/.test(l.n));
  kindOf.set(p.page, { id, real });
  if (!starts.some((s) => s.id === id)) starts.push({ id, czesc: Number(a), page: p.page });
}
// koniec zbioru: część 4 (materiał dydaktyczny) albo koniec PDF
const end = pages.find((p) => p.lines.some((l) => /^O czytaniu tekstów ikonicznych|^Oczytaniutekstówikonicznych/.test(l.n)) && p.page > (starts.at(-1)?.page ?? 0))?.page ?? pages.length + 1;
const sectionStarts = pages.filter((p) => p.page > 5 && p.lines.some((l, i) => l.n === 'Część' && /^Zadaniazawierające/.test(p.lines[i + 1]?.n ?? ''))).map((p) => p.page);

const out = [];
const img = join(root, 'cke-obrazy/ustny');
rmSync(img, { recursive: true, force: true });
for (const k of ['zad', 'odp']) mkdirSync(join(img, k), { recursive: true });
const scale = WIDTH / (COL[1] - COL[0]);
for (let i = 0; i < starts.length; i++) {
  const s = starts[i];
  const stop = Math.min(starts[i + 1]?.page ?? end, end, ...sectionStarts.filter((x) => x > s.page));
  const zad = [];
  const odp = [];
  for (let n = s.page; n < stop; n++) {
    const k = kindOf.get(n);
    // strona bez nagłówka zadania to ciąg dalszy poprzedniej (materiału albo realizacji)
    const real = k ? k.real : odp.length > 0;
    (real ? odp : zad).push(n);
  }
  const p0 = pages[s.page - 1];
  // polecenie: od linii po typie materiału do końca zdania z „Omów”
  const ls = p0.lines.filter((l) => l.y > 95);
  const typeLine = ls.findIndex((l) => /Tekst(y)?(literackie|ikoniczne|językowe|literacki|ikoniczny|językowy)$/.test(l.n));
  const rest = ls.slice(typeLine + 1);
  let polecenie = '';
  for (const l of rest) {
    polecenie += (polecenie ? ' ' : '') + l.text.trim();
    if (/Omów/.test(polecenie) && /\.$/.test(l.text.trim())) break;
    if (polecenie.length > 500) break;
  }
  polecenie = polecenie.replace(/\s+/g, ' ').trim();
  const pytanie = polecenie.replace(/\s*Omów zagadnienie.*$/, '').trim();
  const render = async (list) => {
    const frs = [];
    for (const n of list) {
      const r = await renderGray(doc, n, scale);
      const lim = pageLimits(pages[n - 1]);
      const f = cutFragment(r, { page: n, y0: lim.top, y1: lim.bottom, x0: COL[0], x1: COL[1] });
      if (f) frs.push(f);
    }
    return frs.length ? composeJpeg(frs, { width: WIDTH, quality: 55, sep: 24 }) : null;
  };
  const zj = await render(zad);
  const oj = await render(odp);
  if (zj) writeFileSync(join(img, 'zad', `${s.id}.jpg`), zj);
  if (oj) writeFileSync(join(img, 'odp', `${s.id}.jpg`), oj);
  out.push({ id: s.id, czesc: s.czesc, typ: TYPES[s.czesc] ?? 'literacki', pytanie, polecenie, strony: zad, realizacje: odp.length ? odp : [], obraz: !!zj, realizacja: !!oj });
}
await doc.destroy();
mkdirSync(join(root, 'data/ustny'), { recursive: true });
writeFileSync(join(root, 'data/ustny/zadanie2.json'), JSON.stringify({ zrodlo: 'CKE, materiał dodatkowy „Zadanie 2. w części ustnej egzaminu maturalnego. Literatura. Sztuka. Język”', zadania: out }, null, 1) + '\n');
console.log(`Zadania 2: ${out.length} (literackie ${out.filter((x) => x.czesc === 1).length}, ikoniczne ${out.filter((x) => x.czesc === 2).length}, językowe ${out.filter((x) => x.czesc === 3).length}); bez realizacji: ${out.filter((x) => !x.realizacja).map((x) => x.id).join(', ') || 'brak'}`);
