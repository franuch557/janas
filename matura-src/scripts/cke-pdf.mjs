// Odczyt i renderowanie PDF CKE (pdfjs-dist 5, build legacy) oraz składanie wycinków JPEG
// (@napi-rs/canvas). Bez programów zewnętrznych (pdftoppm nie jest potrzebny).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Ścieżka bez %20: inaczej pdfjs nie znajduje fontów standardowych i giną pogrubione nagłówki.
const STANDARD_FONTS = fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url));

let pdfjs = null;
async function lib() {
  pdfjs ??= await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
}

/**
 * Otwiera PDF i zwraca strony z liniami tekstu. Współrzędne w punktach PDF, y od góry strony
 * (linia bazowa). Każda linia: { y, top, bottom, x0, x1, text, n (tekst bez spacji), items }.
 */
export async function loadPdf(file) {
  const { getDocument } = await lib();
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)), standardFontDataUrl: STANDARD_FONTS, verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = [];
    for (const it of content.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const h = Math.abs(it.transform[3]) || it.height || 10;
      items.push({ x: it.transform[4], x1: it.transform[4] + (it.width || 0), y: vp.height - it.transform[5], h, s: it.str });
    }
    pages.push({ page: i, width: vp.width, height: vp.height, lines: groupLines(items) });
  }
  return { doc, pages };
}

/** Grupowanie elementów tekstu w linie po linii bazowej (tolerancja 2,5 pt). */
export function groupLines(items) {
  const rows = [];
  for (const it of [...items].sort((a, b) => a.y - b.y)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= 2.5);
    if (row) row.items.push(it); else rows.push({ y: it.y, items: [it] });
  }
  return rows
    .map((r) => {
      const its = r.items.sort((a, b) => a.x - b.x);
      // spacja tylko przy wyraźnej przerwie między elementami (pdfjs dzieli wyrazy na kawałki,
      // np. „Us ł yszysz”, „Z adanie”, „202 5”)
      let text = '';
      its.forEach((p, k) => {
        const prev = its[k - 1];
        const gapX = prev ? p.x - prev.x1 : 0;
        const sep = !prev ? '' : /\s$/.test(prev.s) || /^\s/.test(p.s) || gapX > Math.min(p.h, prev.h) * 0.2 ? ' ' : '';
        text += sep + p.s;
      });
      text = text.replace(/\s+/g, ' ').trim();
      const hMax = Math.max(...its.map((p) => p.h));
      return {
        y: Math.round(r.y * 10) / 10,
        top: Math.min(...its.map((p) => p.y - p.h * 0.85)),
        bottom: Math.max(...its.map((p) => p.y + p.h * 0.25)),
        x0: its[0].x,
        x1: Math.max(...its.map((p) => p.x1)),
        h: hMax,
        text,
        n: text.replace(/\s+/g, ''),
        items: its,
      };
    })
    .sort((a, b) => a.y - b.y);
}

/** Renderuje stronę w skali szarości. Zwraca { gray: Uint8Array, w, h, scale }. */
export async function renderGray(doc, pageNo, scale) {
  const page = await doc.getPage(pageNo);
  const vp = page.getViewport({ scale });
  const w = Math.ceil(vp.width);
  const h = Math.ceil(vp.height);
  const cc = doc.canvasFactory.create(w, h);
  cc.context.fillStyle = '#fff';
  cc.context.fillRect(0, 0, w, h);
  await page.render({ canvasContext: cc.context, viewport: vp }).promise;
  const rgba = cc.context.getImageData(0, 0, w, h).data;
  const gray = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
  doc.canvasFactory.destroy(cc);
  page.cleanup();
  return { gray, w, h, scale };
}

const DARK = 150; // piksel „ciemny”: tekst, rysunek. Kratka na rozwiązanie jest jaśniejsza (≥ 180).

/**
 * Wycina z wyrenderowanej strony prostokąt (w punktach), zamalowuje na biało podane prostokąty
 * i usuwa puste pasy: wiersze bez ciemnych pikseli dłuższe niż `gap` px zastępuje białym
 * odstępem `gap` px (to usuwa kratkę na rozwiązanie i puste miejsca). Zwraca { w, h, data }
 * albo null, gdy w wycinku nie ma treści.
 */
export function cutFragment(r, frag, opts = {}) {
  const gap = opts.gap ?? 16;
  const s = r.scale;
  const cols = frag.cols ?? [[frag.x0, frag.x1]];
  const y0 = Math.max(0, Math.floor(frag.y0 * s));
  const y1 = Math.min(r.h, Math.ceil(frag.y1 * s));
  if (y1 - y0 < 4) return null;
  // kolumny składam obok siebie (np. tabela odpowiedzi bez kolumny wymagań)
  const parts = cols.map(([a, b]) => [Math.max(0, Math.floor(a * s)), Math.min(r.w, Math.ceil(b * s))]);
  const w = parts.reduce((t, [a, b]) => t + (b - a), 0) + (parts.length - 1) * 12;
  const hh = y1 - y0;
  const img = new Uint8Array(w * hh).fill(255);
  let ox = 0;
  for (const [a, b] of parts) {
    for (let y = 0; y < hh; y++) img.set(r.gray.subarray((y0 + y) * r.w + a, (y0 + y) * r.w + b), y * w + ox);
    ox += b - a + 12;
  }
  for (const wo of frag.white ?? []) {
    // prostokąt w punktach strony; przeliczenie na współrzędne wycinka (tylko pierwsza kolumna)
    const ax = Math.floor(wo.x0 * s) - parts[0][0];
    const bx = Math.ceil(wo.x1 * s) - parts[0][0];
    const ay = Math.floor(wo.y0 * s) - y0;
    const by = Math.ceil(wo.y1 * s) - y0;
    for (let y = Math.max(0, ay); y < Math.min(hh, by); y++) img.fill(255, y * w + Math.max(0, ax), y * w + Math.min(w, Math.max(0, bx)));
  }
  const dark = new Uint8Array(hh);
  for (let y = 0; y < hh; y++) {
    let c = 0;
    const row = y * w;
    for (let x = 0; x < w; x++) if (img[row + x] < DARK && ++c >= 2) break;
    dark[y] = c >= 2 ? 1 : 0;
  }
  let first = dark.indexOf(1);
  if (first < 0) return null;
  let last = dark.lastIndexOf(1);
  first = Math.max(0, first - 4);
  last = Math.min(hh - 1, last + 4);
  const rows = [];
  let run = [];
  for (let y = first; y <= last; y++) {
    if (dark[y]) {
      if (run.length > gap) rows.push(...Array(gap).fill(-1)); else rows.push(...run);
      run = [];
      rows.push(y);
    } else run.push(y);
  }
  rows.push(...run); // margines pod ostatnim ciemnym wierszem (np. jasna dolna krawędź tabeli)
  const out = new Uint8Array(w * rows.length).fill(255);
  rows.forEach((y, i) => { if (y >= 0) out.set(img.subarray(y * w, (y + 1) * w), i * w); });
  return { w, h: rows.length, data: out };
}

/** Składa fragmenty pionowo (odstęp `sep` px) w jeden obraz JPEG o szerokości `width` px. */
export async function composeJpeg(fragments, { width = 1000, quality = 60, sep = 18 } = {}) {
  const { createCanvas } = await import('@napi-rs/canvas');
  const fr = fragments.filter(Boolean);
  if (!fr.length) return null;
  const maxW = Math.max(...fr.map((f) => f.w));
  const W = Math.min(width, maxW);
  const H = fr.reduce((t, f) => t + f.h, 0) + sep * (fr.length - 1) + 16;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(W, H);
  id.data.fill(255);
  let oy = 8;
  for (const f of fr) {
    const k = f.w > W ? W / f.w : 1; // szerszy fragment skaluję w dół (najbliższy sąsiad)
    const fh = Math.round(f.h * k);
    for (let y = 0; y < fh; y++) {
      const sy = Math.min(f.h - 1, Math.floor(y / k));
      for (let x = 0; x < Math.min(W, Math.round(f.w * k)); x++) {
        const v = f.data[sy * f.w + Math.min(f.w - 1, Math.floor(x / k))];
        const j = ((oy + y) * W + x) * 4;
        id.data[j] = id.data[j + 1] = id.data[j + 2] = v;
      }
    }
    oy += fh + sep;
  }
  ctx.putImageData(id, 0, 0);
  const crop = createCanvas(W, Math.min(H, oy - sep + 8));
  crop.getContext('2d').drawImage(canvas, 0, 0);
  return crop.encode('jpeg', quality);
}
