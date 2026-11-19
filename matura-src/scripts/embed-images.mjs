// Zamienia obrazy z cke-obrazy/ (zad/ i odp/) w moduł src/data/obrazy.generated.ts
// z adresami data:. Używa go tylko build jednoplikowy (prywatny artefakt).
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../cke-obrazy/', import.meta.url).pathname;
if (!existsSync(root)) {
  console.error('Błąd: brak katalogu cke-obrazy/. Najpierw: npm run import-cke -- <katalog PDF> --obrazy');
  process.exit(1);
}
const map = {};
let bytes = 0;
for (const kind of ['zad', 'odp']) {
  const kdir = join(root, kind);
  if (!existsSync(kdir)) continue;
  for (const exam of readdirSync(kdir)) {
    for (const f of readdirSync(join(kdir, exam))) {
      if (!f.endsWith('.jpg')) continue;
      const data = readFileSync(join(kdir, exam, f));
      bytes += data.length;
      map[`${kind === 'odp' ? 'cke-odp' : 'cke'}/${exam}/${f.replace(/\.jpg$/, '')}`] = `data:image/jpeg;base64,${data.toString('base64')}`;
    }
  }
}
const out = new URL('../src/data/obrazy.generated.ts', import.meta.url);
writeFileSync(out, `// Plik generowany przez scripts/embed-images.mjs. Nie dodawać do repozytorium.\nexport const EMBEDDED_IMAGES: Record<string, string> = ${JSON.stringify(map)};\n`);
console.log(`Wbudowano ${Object.keys(map).length} obrazów (${Math.round(bytes / 1024)} kB przed kodowaniem base64).`);
