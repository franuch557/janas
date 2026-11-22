// Strona GitHub Pages: pakiety obrazów CKE (cke/<id>.json z obrazami base64, do 8 MB) dzielę
// na osobne pliki cke/img/<id>/<rodzaj>/<klucz>.webp, a w cke/<id>.json zostają same ścieżki.
// Aplikacja wstawia wartość jako src obrazu, więc przeglądarka pobiera tylko otwierane obrazy
// (jeden obraz to zwykle 50–300 KB) i trzyma je w pamięci podręcznej.
// Kod aplikacji, serwer deweloperski i artefakt (jeden plik) dalej używają pakietów base64.
//
// Użycie: node tools/pakiety-na-pliki.mjs [katalog strony]   (domyślnie dist-pages/matura-2027)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = process.argv[2] ?? fileURLToPath(new URL('../dist-pages/matura-2027/', import.meta.url));
const cke = join(site, 'cke');
const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const safe = (k) => k.replace(/[^A-Za-z0-9._-]/g, '_');
let files = 0;
let before = 0;
let after = 0;
for (const f of readdirSync(cke).filter((x) => x.endsWith('.json'))) {
  const path = join(cke, f);
  before += statSync(path).size;
  const id = f.slice(0, -5);
  const pack = JSON.parse(readFileSync(path, 'utf8'));
  const out = {};
  for (const [kind, map] of Object.entries(pack)) {
    if (!map || typeof map !== 'object') {
      out[kind] = map;
      continue;
    }
    out[kind] = {};
    for (const [key, val] of Object.entries(map)) {
      const m = typeof val === 'string' ? /^data:([^;]+);base64,(.*)$/s.exec(val) : null;
      if (!m) {
        out[kind][key] = val;
        continue;
      }
      const ext = EXT[m[1]] ?? 'bin';
      const rel = `img/${safe(id)}/${kind}/${safe(key)}.${ext}`;
      mkdirSync(join(cke, 'img', safe(id), kind), { recursive: true });
      writeFileSync(join(cke, rel), Buffer.from(m[2], 'base64'));
      // ścieżka względem strony (aplikacja ładuje cke/… względnie do index.html)
      out[kind][key] = `cke/${rel}`;
      files++;
    }
  }
  const json = JSON.stringify(out);
  writeFileSync(path, json);
  after += json.length;
}
console.log(`Obrazy w osobnych plikach: ${files}. Pakiety JSON: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e3).toFixed(0)} KB.`);
