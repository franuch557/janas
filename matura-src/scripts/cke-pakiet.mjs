// Pakiet obrazów i nagrań CKE dla aplikacji (docs/kontrakt-danych.md, punkt 3).
//
// Użycie:  npm run cke:pakiet [-- <katalog z PDF/MP3>]   (domyślnie cke-pdf/)
//
// Z cke-obrazy/{zad,odp,ctx}/<examId>/*.jpg (tworzy je `npm run import-cke -- cke-pdf --obrazy`)
// powstaje public/cke/<examId>.json = { zad: { nr: dataURL }, odp: {…}, ctx: {…} }.
// Nagranie arkusza angielskiego jest kompresowane ffmpegiem do public/cke/<examId>.mp3
// (mono, 48 kb/s). Brak obrazu zadania z data/exams.json przerywa skrypt błędem.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseFileName } from './cke-parse.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const srcDir = join(root, process.argv[2] ?? 'cke-pdf');
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
const read = (kind, id) => {
  const d = join(imgDir, kind, id);
  if (!existsSync(d)) return {};
  return Object.fromEntries(readdirSync(d).filter((f) => f.endsWith('.jpg')).sort((a, b) => a.localeCompare(b, 'pl', { numeric: true }))
    .map((f) => [f.slice(0, -4), `data:image/jpeg;base64,${readFileSync(join(d, f)).toString('base64')}`]));
};

// najpierw sprawdzenie kompletności, żeby nie zostawić połowicznego pakietu
const packs = [];
for (const e of exams) {
  const pack = { zad: read('zad', e.id), odp: read('odp', e.id), ctx: read('ctx', e.id) };
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
console.log(lines.join('\n'));
console.log(`Razem public/cke/: ${(total / 1048576).toFixed(1)} MB w ${readdirSync(out).length} plikach.`);
if (errors.length) {
  console.error(`Błąd:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
