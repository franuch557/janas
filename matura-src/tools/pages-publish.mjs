// Publikacja strony na GitHub Pages w osobnym repo (franuch557/matura-2027, gałąź main).
// Strona ma obrazy zadań i nagrania CKE, więc nie trafia do repo z kodem.
//
// Użycie: npm run build:pages && npm run pages:publish
// Wynik budowania (dist-pages/matura-2027) jest wypychany jako jeden commit (--force):
// to tylko zbudowana strona, historia nie jest potrzebna.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
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
git('add', '-A');
git('commit', '-q', '-m', `Strona Matura 2027 (${new Date().toISOString().slice(0, 10)})`);
git('push', '-q', '--force', REPO, 'main');
rmSync(join(dir, '.git'), { recursive: true, force: true });
console.log('Wypchnięto. Strona: https://franuch557.github.io/matura-2027/');
