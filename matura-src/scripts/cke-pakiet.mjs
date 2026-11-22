// Pakiet obrazów i nagrań CKE dla aplikacji (docs/kontrakt-danych.md, punkt 3).
//
// Użycie:  npm run cke:pakiet [-- <katalog z PDF/MP3>]   (domyślnie cke-pdf/)
//
// Z cke-obrazy/{zad,odp,ctx}/<examId>/*.jpg (tworzy je `npm run import-cke -- cke-pdf --obrazy`)
// powstaje public/cke/<examId>.json = { zad: { nr: dataURL }, odp: {…}, ctx: {…} }.
// Nagranie arkusza angielskiego jest kompresowane ffmpegiem do public/cke/<examId>.mp3
// (mono, 48 kb/s). Brak obrazu zadania z data/exams.json przerywa skrypt błędem.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseFileName } from './cke-parse.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const srcDir = resolve(root, process.argv[2] ?? 'cke-pdf');
const imgDir = join(root, 'cke-obrazy');
const out = join(root, 'public/cke');
const LIMIT = 12 * 1024 * 1024;

const data = JSON.parse(readFileSync(join(root, 'data/exams.json'), 'utf8'));
if (!existsSync(imgDir)) {
  console.error('Błąd: brak katalogu cke-obrazy/. Najpierw: npm run import-cke -- cke-pdf --obrazy');
  process.exit(1);
}
const errors = [];
const exams = data.exams.filter((e) => e.tasks.length);
// obrazy w pakiecie jako WebP (ok. 25% mniejsze od JPEG przy tej samej czytelności tekstu);
// WEBP=0 zostawia JPEG
const WEBP = process.env.WEBP !== '0';
const WEBP_Q = Number(process.env.WEBP_Q ?? 55);
const { loadImage, createCanvas } = await import('@napi-rs/canvas');
async function toDataUrl(buf) {
  if (!WEBP) return `data:image/jpeg;base64,${buf.toString('base64')}`;
  const img = await loadImage(buf);
  // WebP ma limit 16383 px na bok: bardzo długie obrazy zostają w JPEG
  if (img.width > 16383 || img.height > 16383) return `data:image/jpeg;base64,${buf.toString('base64')}`;
  const c = createCanvas(img.width, img.height);
  c.getContext('2d').drawImage(img, 0, 0);
  let w;
  try {
    w = await c.encode('webp', WEBP_Q);
  } catch {
    return `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  return w.length < buf.length ? `data:image/webp;base64,${w.toString('base64')}` : `data:image/jpeg;base64,${buf.toString('base64')}`;
}
const read = async (kind, id) => {
  const d = join(imgDir, kind, id);
  if (!existsSync(d)) return {};
  const out = {};
  for (const f of readdirSync(d).filter((x) => x.endsWith('.jpg')).sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))) out[f.slice(0, -4)] = await toDataUrl(readFileSync(join(d, f)));
  return out;
};

// najpierw sprawdzenie kompletności, żeby nie zostawić połowicznego pakietu
const packs = [];
for (const e of exams) {
  const pack = { zad: await read('zad', e.id), odp: await read('odp', e.id), ctx: await read('ctx', e.id) };
  for (const t of e.tasks) {
    if (!pack.zad[t.nr]) errors.push(`${e.id}: zadanie ${t.nr} nie ma obrazu cke-obrazy/zad/${e.id}/${t.nr}.jpg`);
    if (t.context && !pack.ctx[t.context]) errors.push(`${e.id}: zadanie ${t.nr} wskazuje brakujący materiał ctx/${t.context}.jpg`);
  }
  packs.push({ e, pack });
}
if (errors.length) {
  console.error(`Błąd: brak obrazów (${errors.length}):\n  ${errors.slice(0, 40).join('\n  ')}`);
  process.exit(1);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let total = 0;
const lines = [];
for (const { e, pack } of packs) {
  const json = JSON.stringify(pack);
  const size = Buffer.byteLength(json);
  if (size > LIMIT) errors.push(`${e.id}.json ma ${(size / 1048576).toFixed(1)} MB (limit 12 MB)`);
  writeFileSync(join(out, `${e.id}.json`), json);
  total += size;
  let line = `${e.id}.json: ${(size / 1048576).toFixed(2)} MB (zad ${Object.keys(pack.zad).length}, odp ${Object.keys(pack.odp).length}, ctx ${Object.keys(pack.ctx).length})`;
  if (e.audio) {
    const mp3 = existsSync(srcDir) ? readdirSync(srcDir).find((f) => f.toLowerCase().endsWith('.mp3') && parseFileName(f)?.examId === e.id) : null;
    if (!mp3) errors.push(`${e.id}: brak nagrania mp3 w ${srcDir}`);
    else {
      const dst = join(out, `${e.id}.mp3`);
      execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', join(srcDir, mp3), '-ac', '1', '-b:a', '48k', '-ar', '44100', '-map_metadata', '-1', dst]);
      const ms = statSync(dst).size;
      if (ms > LIMIT) errors.push(`${e.id}.mp3 ma ${(ms / 1048576).toFixed(1)} MB (limit 12 MB)`);
      total += ms;
      line += `; ${e.id}.mp3: ${(ms / 1048576).toFixed(2)} MB`;
    }
  }
  lines.push(line);
}
// zadania 2 z matury ustnej (npm run ustny:zadanie2): materiał i przykładowe realizacje
const ustnyDir = join(imgDir, 'ustny');
if (existsSync(join(ustnyDir, 'zad'))) {
  const pick = async (k) => {
    const d = join(ustnyDir, k);
    const o = {};
    if (existsSync(d)) for (const f of readdirSync(d).filter((x) => x.endsWith('.jpg'))) o[f.slice(0, -4)] = await toDataUrl(readFileSync(join(d, f)));
    return o;
  };
  const json = JSON.stringify({ zad: await pick('zad'), odp: await pick('odp') });
  writeFileSync(join(out, 'ustny-zadanie2.json'), json);
  total += Buffer.byteLength(json);
  if (Buffer.byteLength(json) > LIMIT) errors.push(`ustny-zadanie2.json ma ${(Buffer.byteLength(json) / 1048576).toFixed(1)} MB (limit 12 MB)`);
  lines.push(`ustny-zadanie2.json: ${(Buffer.byteLength(json) / 1048576).toFixed(2)} MB`);
}
// karta „Wybrane wzory matematyczne” (jeśli jest w katalogu): strony jako obrazy → wzory.json
const wzory = existsSync(srcDir) ? readdirSync(srcDir).find((f) => /\.pdf$/i.test(f) && /wzory/i.test(f)) : null;
if (wzory) {
  const { loadPdf, renderGray, composeJpeg } = await import('./cke-pdf.mjs');
  const { doc, pages } = await loadPdf(join(srcDir, wzory));
  const strony = [];
  for (const p of pages) {
    const r = await renderGray(doc, p.page, 1000 / p.width);
    const jpg = await composeJpeg([{ w: r.w, h: r.h, data: r.gray }], { width: 1000, quality: 60 });
    strony.push(await toDataUrl(jpg));
  }
  await doc.destroy();
  const json = JSON.stringify({ zrodlo: wzory, strony });
  writeFileSync(join(out, 'wzory.json'), json);
  total += Buffer.byteLength(json);
  lines.push(`wzory.json: ${(Buffer.byteLength(json) / 1048576).toFixed(2)} MB (${strony.length} stron z ${wzory})`);
} else lines.push('wzory.json: pominięty (brak pliku z „wzory” w nazwie w katalogu PDF)');
console.log(lines.join('\n'));
console.log(`Razem public/cke/: ${(total / 1048576).toFixed(1)} MB w ${readdirSync(out).length} plikach.`);
if (errors.length) {
  console.error(`Błąd:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
