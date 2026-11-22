// Publikacja strony na GitHub Pages w osobnym repo (franuch557/matura-2027, gałąź main).
// Strona ma obrazy zadań i nagrania CKE, więc nie trafia do repo z kodem.
//
// Użycie: npm run build:pages && npm run pages:publish
// Wynik budowania (dist-pages/matura-2027) idzie jako nowy commit na wierzch gałęzi main repo strony,
// więc wysyłane są tylko zmienione pliki (cała strona naraz przekracza limit czasu GitHuba).
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'https://github.com/franuch557/matura-2027.git';
const dir = fileURLToPath(new URL('../dist-pages/matura-2027/', import.meta.url));
if (!existsSync(join(dir, 'index.html'))) {
  console.error('Brak dist-pages/matura-2027/index.html. Najpierw: npm run build:pages');
  process.exit(1);
}
const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'inherit' });
writeFileSync(join(dir, '.nojekyll'), '');
rmSync(join(dir, '.git'), { recursive: true, force: true });
git('init', '-q', '-b', 'main');
let base = true;
try {
  git('fetch', '-q', '--depth', '1', REPO, 'main');
  git('reset', '-q', '--soft', 'FETCH_HEAD');
} catch {
  base = false; // repo strony jest puste: pierwszy commit
}
// obrazy (cke/img) wysyłam najpierw, partiami do ok. 40 MB: jeden duży push przekracza limit czasu
// GitHuba, a strona w tym czasie dalej działa na poprzednich plikach (nowe pliki niczego nie psują)
const PUSH = ['-c', 'http.postBuffer=524288000', 'push', '-q'];
const imgRoot = join(dir, 'cke', 'img');
if (base && existsSync(imgRoot)) {
  const dirSize = (p) => readdirSync(p, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? dirSize(join(p, e.name)) : statSync(join(p, e.name)).size), 0);
  const changed = (rel) => execFileSync('git', ['status', '--porcelain', '--', rel], { cwd: dir }).toString().trim().length > 0;
  let acc = 0;
  let part = 0;
  const flush = () => {
    if (!acc) return;
    part++;
    git('commit', '-q', '-m', `Obrazy zadań, część ${part}`);
    git(...PUSH, REPO, 'main');
    console.log(`Wysłano obrazy, część ${part} (${(acc / 1e6).toFixed(0)} MB).`);
    acc = 0;
  };
  for (const e of readdirSync(imgRoot)) {
    const rel = join('cke', 'img', e);
    if (!changed(rel)) continue;
    git('add', '-A', '--', rel);
    acc += dirSize(join(dir, rel));
    if (acc > 40e6) flush();
  }
  flush();
}
git('add', '-A');
try {
  git('commit', '-q', '-m', `Strona Matura 2027 (${new Date().toISOString().slice(0, 10)})`);
} catch {
  console.log('Bez zmian od ostatniej publikacji.');
}
git('-c', 'http.postBuffer=524288000', 'push', '-q', ...(base ? [] : ['--force']), REPO, 'main');
rmSync(join(dir, '.git'), { recursive: true, force: true });
console.log('Wypchnięto. Strona: https://franuch557.github.io/matura-2027/');
