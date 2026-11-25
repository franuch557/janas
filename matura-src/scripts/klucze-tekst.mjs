// Klucze do oceny przybliżonej (src/logic/keyGrade.ts) dla zadań otwartych, których nie sprawdza
// dokładniejszy oceniacz: matematyka bez klucza w klucze-matematyka.json, angielski bez klucze-angielski.json,
// polski bez wzorce-polski.json. Źródło: data/klucze.json (zasady oceniania CKE).
// Użycie: node scripts/klucze-tekst.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const exams = read('data/exams.json').exams;
const keys = read('data/klucze.json');
const km = read('src/data/klucze-matematyka.json');
const ka = read('src/data/klucze-angielski.json');
const kp = read('src/data/wzorce-polski.json');
const id = (e, nr) => `${e.id}-n${nr.replace(/[^A-Za-z0-9]+/g, '-')}`;
const out = {};
for (const e of exams)
  for (const t of e.tasks) {
    if (t.essay) continue;
    if (t.type === 'zamknięte' && t.answer?.items?.every((i) => i.correct != null)) continue;
    const k = id(e, t.nr);
    if (e.family === 'matematyka' ? km[k] : e.family === 'angielski' ? ka[k] : (kp.keys ?? kp)[k]) continue;
    const src = keys[e.id]?.[t.nr];
    if (!src) continue;
    const entry = { max: t.maxPoints };
    if (src.answer?.length) entry.answer = src.answer;
    else if (src.solution) entry.solution = src.solution.slice(0, 1500);
    if (src.levels?.length) entry.levels = src.levels.map((l) => ({ points: l.points, alts: l.alts.map((a) => a.slice(0, 300)) }));
    if (entry.answer || entry.solution || entry.levels?.some((l) => l.points > 0)) out[k] = entry;
  }
writeFileSync('src/data/klucze-tekst.json', JSON.stringify(out) + '\n');
console.log(`Klucze do oceny przybliżonej: ${Object.keys(out).length} zadań`);
