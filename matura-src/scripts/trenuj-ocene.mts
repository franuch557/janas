// Trening progów automatycznej oceny matematyki na danych CKE (data/klucze.json):
// - wzorcowe rozwiązanie CKE powinno dostać maksimum,
// - pierwsza połowa rozwiązania nie powinna dostać maksimum,
// - rozwiązanie innego zadania powinno dostać 0 pkt,
// - sam wynik końcowy bez rozwiązania nie powinien dostać maksimum (zadania za 2+ pkt).
// Wybiera parametry z najlepszym wynikiem i zapisuje je do src/data/ocena-matematyka.json.
// Użycie: npx tsx scripts/trenuj-ocene.mts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { factsOf, gradeTask, type MathKey, type MathParams } from '../src/logic/mathGrade';
import { taskIdFor } from '../src/logic/cke';

type Key = { levels: { points: number; alts: string[] }[]; solution: string | null; examples: { points: number; text: string }[]; answer?: string[] };
const keys = JSON.parse(readFileSync('data/klucze.json', 'utf8')) as Record<string, Record<string, Key>>;
const exams = JSON.parse(readFileSync('data/exams.json', 'utf8')).exams as { id: string; family: string; tasks: { nr: string; maxPoints: number; proof: boolean | null }[] }[];

const appKey = (k: Key, proof: boolean | null): MathKey => ({
  levels: k.levels.map((l) => ({ points: l.points, alts: l.alts.filter((a) => factsOf(a).length) })).filter((l) => l.alts.length || l.points === 0),
  ...(k.answer?.length ? { answers: k.answer } : {}),
  ...(proof ? { proof: true } : {}),
});
const items: { id: string; max: number; key: Key; app: MathKey }[] = [];
for (const e of exams) {
  if (e.family !== 'matematyka') continue;
  for (const t of e.tasks) {
    const k = keys[e.id]?.[t.nr];
    if (!k?.solution || !k.levels.length) continue;
    items.push({ id: `${e.id}/${t.nr}`, max: t.maxPoints, key: k, app: appKey(k, t.proof) });
  }
}

function evaluate(p: MathParams) {
  let pos = 0, half = 0, neg = 0, checkable = 0, bare = 0, bareN = 0;
  items.forEach((it, i) => {
    const full = gradeTask(it.app, it.max, it.key.solution!, p);
    if (!full?.confident) return;
    checkable++;
    if (full.points === it.max) pos++;
    const lines = it.key.solution!.split('\n');
    const h = gradeTask(it.app, it.max, lines.slice(0, Math.max(1, Math.floor(lines.length / 2))).join('\n'), p);
    if (h && h.points < it.max) half++;
    const other = items[(i + 7) % items.length];
    const n = gradeTask(it.app, it.max, other.key.solution!, p);
    if (n && n.points === 0) neg++;
    if (it.max > 1) {
      const top = it.key.levels.find((l) => l.points === it.max);
      const last = (top?.alts ?? []).map((a) => factsOf(a)).find((f) => f.length)?.at(-1);
      if (last) {
        bareN++;
        const b = gradeTask(it.app, it.max, last.text, p);
        if (b && b.points < it.max) bare++;
      }
    }
  });
  const c = Math.max(1, checkable);
  const bb = bare / Math.max(1, bareN);
  return { checkable, pos: pos / c, half: half / c, neg: neg / c, bare: bb, score: pos / c + neg / c + 0.5 * (half / c) + 0.5 * bb };
}

let best: { p: MathParams; r: ReturnType<typeof evaluate> } | null = null;
for (const coverage of [0.5, 0.6, 0.67, 0.75, 0.85, 1])
  for (const minWork of [1, 2, 3, 4])
    for (const bareCap of [0, 1]) {
      const p = { coverage, minWork, bareCap };
      const r = evaluate(p);
      if (!best || r.score > best.r.score) best = { p, r };
    }
const pct = (x: number) => `${Math.round(x * 100)}%`;
console.log(`Zadania z rozwiązaniem CKE: ${items.length}, z faktami do sprawdzenia: ${best!.r.checkable}`);
console.log(`Parametry: ${JSON.stringify(best!.p)}`);
console.log(`Wzorcowe rozwiązanie = maksimum: ${pct(best!.r.pos)}; połowa rozwiązania < maksimum: ${pct(best!.r.half)}; cudze rozwiązanie = 0 pkt: ${pct(best!.r.neg)}; sam wynik < maksimum: ${pct(best!.r.bare)}`);
mkdirSync('src/data', { recursive: true });
// klucze dla aplikacji: poziomy z faktami, odpowiedzi z pola „Rozwiązanie”, znacznik dowodu
const runtime: Record<string, MathKey> = {};
for (const e of exams) {
  if (e.family !== 'matematyka') continue;
  for (const t of e.tasks) {
    const k = keys[e.id]?.[t.nr];
    if (!k) continue;
    const app = appKey(k, t.proof);
    const checkable = app.levels.some((l) => l.points > 0 && l.alts.length) || !!app.answers?.length;
    if (checkable) runtime[taskIdFor(e.id, t.nr)] = app;
  }
}
writeFileSync('src/data/klucze-matematyka.json', JSON.stringify(runtime) + '\n');
console.log(`Zadania z oceną automatyczną w aplikacji: ${Object.keys(runtime).length}`);
writeFileSync('src/data/ocena-matematyka.json', JSON.stringify({ params: best!.p, wynik: { zadania: best!.r.checkable, wzorcowe: best!.r.pos, polowa: best!.r.half, cudze: best!.r.neg, samWynik: best!.r.bare } }, null, 1) + '\n');
