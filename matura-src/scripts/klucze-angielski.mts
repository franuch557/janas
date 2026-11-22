// Klucze zadań otwartych z angielskiego dla aplikacji (z data/klucze.json, pole `english`)
// → src/data/klucze-angielski.json. Użycie: npx tsx scripts/klucze-angielski.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { taskIdFor } from '../src/logic/cke';
import { expandVariants, gradeEnglish } from '../src/logic/englishGrade';

const keys = JSON.parse(readFileSync('data/klucze.json', 'utf8'));
const out: Record<string, { id: string; ok: string[]; bad: string[] }[]> = {};
let self = 0, total = 0;
for (const [examId, tasks] of Object.entries(keys) as [string, Record<string, { english?: { id: string; ok: string[]; bad: string[] }[] }>][]) {
  for (const [nr, k] of Object.entries(tasks)) {
    if (!k.english) continue;
    out[taskIdFor(examId, nr)] = k.english;
    // sprawdzenie: pierwszy wariant każdej pozycji z klucza musi być uznany za poprawny
    total++;
    const g = gradeEnglish(k.english, k.english.map((x) => expandVariants(x.ok[0])[0] ?? '').join('\n'));
    if (g && g.points === g.max) self++;
  }
}
writeFileSync('src/data/klucze-angielski.json', JSON.stringify(out) + '\n');
console.log(`Zadania z kluczem: ${Object.keys(out).length}; odpowiedzi z klucza uznane: ${self}/${total}`);
