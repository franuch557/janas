// Import wykazu pytań jawnych do matury ustnej z polskiego (PDF CKE) do data/ustny/pytania-jawne.json.
//
// Użycie:  node scripts/ustny-import.mjs [katalog]   (domyślnie cke-pdf/)
// Szuka PDF, którego nazwa zawiera „pytania” albo „jawne”. Gdy go nie ma, kończy bez zmian.
// Format: { zrodlo, rok, pytania: [{ nr, lektura, lekturaId: null, tresc }] } – treść z PDF,
// bez zmian merytorycznych; lekturaId uzupełnia się ręcznie (id lektury w aplikacji).
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePytania, yearOf } from './ustny-parse.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = join(root, process.argv[2] ?? 'cke-pdf');
const file = existsSync(dir) ? readdirSync(dir).find((f) => /\.pdf$/i.test(f) && /pytania|jawne/i.test(f)) : null;
if (!file) {
  console.log(`Brak PDF z pytaniami jawnymi w ${dir} (nazwa ma zawierać „pytania” albo „jawne”). Nic nie zmieniam.`);
  process.exit(0);
}
const { loadPdf } = await import('./cke-pdf.mjs');
const { pageLimits } = await import('./cke-parse.mjs');
const { doc, pages } = await loadPdf(join(dir, file));
const lines = pages.flatMap((p) => {
  const lim = pageLimits(p);
  return p.lines.filter((l) => l.top >= lim.top && l.bottom <= lim.bottom + 2).map((l) => l.text);
});
const pytania = parsePytania(lines);
const out = { zrodlo: file, rok: yearOf(file, lines.slice(0, 20).join(' ')), pytania };
mkdirSync(join(root, 'data/ustny'), { recursive: true });
writeFileSync(join(root, 'data/ustny/pytania-jawne.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`Zapisano data/ustny/pytania-jawne.json: ${pytania.length} pytań z ${file}, lektury: ${new Set(pytania.map((p) => p.lektura)).size}.`);
if (!pytania.length) console.error('Uwaga: nie rozpoznano żadnego pytania – sprawdź układ PDF.');
await doc.destroy();
process.exit(0);
