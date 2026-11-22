// Wyjaśnienia bez modelu, z danych CKE (data/klucze.json): przykładowe odpowiedzi z polskiego
// ocenione przez CKE (najwyżej 3 na zadanie) → src/data/wyjasnienia-polski.json.
// Matematyka ma kroki wzorcowych rozwiązań (src/data/rozwiazania-matematyka.json, trenuj-ocene),
// angielski odpowiedzi akceptowane i błędne (src/data/klucze-angielski.json).
// Użycie: npx tsx scripts/wyjasnienia.mts
import { readFileSync, writeFileSync } from 'node:fs';
import { taskIdFor } from '../src/logic/cke';

const keys = JSON.parse(readFileSync('data/klucze.json', 'utf8')) as Record<string, Record<string, { examples?: { points: number; text: string }[] }>>;
const exams = JSON.parse(readFileSync('data/exams.json', 'utf8')).exams as { id: string; family: string; tasks: { nr: string; maxPoints: number; essay: unknown }[] }[];
const out: Record<string, { p: number; t: string }[]> = {};
for (const e of exams) {
  if (e.family !== 'polski') continue;
  for (const t of e.tasks) {
    const ex = keys[e.id]?.[t.nr]?.examples;
    if (t.essay || !ex?.length) continue;
    out[taskIdFor(e.id, t.nr)] = [...ex].sort((a, b) => b.points - a.points).slice(0, 3).map((x) => ({ p: Math.min(t.maxPoints, x.points), t: x.text.slice(0, 900) }));
  }
}
writeFileSync('src/data/wyjasnienia-polski.json', JSON.stringify(out) + '\n');
console.log(`Polski: przykładowe odpowiedzi CKE do ${Object.keys(out).length} zadań`);
