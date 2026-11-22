// Trening oceny odpowiedzi otwartych z polskiego na przykładach CKE (data/klucze.json):
// wektory znaczenia przykładów → src/data/wzorce-polski.json (dla aplikacji),
// progi tau/full dobrane sprawdzeniem „bez jednego” (przykład oceniany bez siebie samego)
// i na odpowiedziach z innych zadań (powinny dostać 0 pkt) → src/data/ocena-polski.json.
// Użycie: npx tsx scripts/trenuj-polski.mts   (pierwsze uruchomienie pobiera model, ok. 118 MB)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { embedTexts, gradeText, packVec, type TextExample, type TextParams } from '../src/logic/textGrade';
import { taskIdFor } from '../src/logic/cke';

type Key = { examples: { points: number; text: string }[] };
const keys = JSON.parse(readFileSync('data/klucze.json', 'utf8')) as Record<string, Record<string, Key>>;
const exams = JSON.parse(readFileSync('data/exams.json', 'utf8')).exams as { id: string; family: string; tasks: { nr: string; maxPoints: number; essay: unknown; summary: string | null }[] }[];

const tasks: { id: string; max: number; q: string; ex: { points: number; text: string }[] }[] = [];
for (const e of exams) {
  if (e.family !== 'polski') continue;
  for (const t of e.tasks) {
    const k = keys[e.id]?.[t.nr];
    if (t.essay || !k?.examples.length) continue;
    tasks.push({ id: taskIdFor(e.id, t.nr), max: t.maxPoints, q: (t.summary ?? '').replace(/^\S*\s*\(0[–-]\d\)\s*/, '').slice(0, 600), ex: k.examples.map((x) => ({ points: Math.min(t.maxPoints, x.points), text: x.text.slice(0, 1200) })) });
  }
}
const all = tasks.flatMap((t) => t.ex.map((x) => x.text));
const qs = tasks.map((t) => t.q || '-');
console.log(`Zadania: ${tasks.length}, przykłady: ${all.length}. Liczę wektory…`);
const vecs: Float32Array[] = [];
for (let i = 0; i < all.length; i += 16) vecs.push(...(await embedTexts(all.slice(i, i + 16))));
const qv: Float32Array[] = [];
for (let i = 0; i < qs.length; i += 16) qv.push(...(await embedTexts(qs.slice(i, i + 16))));
let k = 0;
const T = tasks.map((t) => ({ ...t, vec: t.ex.map(() => vecs[k++]) }));

function evaluate(p: TextParams) {
  let pos = 0, posN = 0, neg = 0, negN = 0, within1 = 0, copy = 0, copyN = 0;
  T.forEach((t, i) => {
    if (t.ex.length >= 2) {
      t.ex.forEach((x, j) => {
        const rest: TextExample[] = t.ex.map((y, m) => ({ points: y.points, vec: t.vec[m] })).filter((_, m) => m !== j);
        const g = gradeText(t.vec[j], rest, t.max, p)!;
        posN++;
        if (g.points === x.points) pos++;
        if (Math.abs(g.points - x.points) <= 1) within1++;
      });
    }
    // odpowiedź z innego zadania (inny tekst, inne pytanie) → 0 pkt
    const o = T[(i + 11) % T.length];
    const g = gradeText(o.vec[0], t.ex.map((y, m) => ({ points: y.points, vec: t.vec[m] })), t.max, p)!;
    negN++;
    if (g.points === 0) neg++;
    // przepisane polecenie (ten sam temat, bez odpowiedzi) → 0 pkt
    if (t.q.length > 20) {
      const c = gradeText(qv[i], t.ex.map((y, m) => ({ points: y.points, vec: t.vec[m] })), t.max, p)!;
      copyN++;
      if (c.points === 0) copy++;
    }
  });
  return { pos: pos / posN, within1: within1 / posN, neg: neg / negN, copy: copy / Math.max(1, copyN), posN, score: pos / posN + neg / negN + copy / Math.max(1, copyN) };
}

let best: { p: TextParams; r: ReturnType<typeof evaluate> } | null = null;
for (let tau = 0.3; tau <= 0.86; tau += 0.025)
  for (let full = tau; full <= 0.95; full += 0.025) {
    const p = { tau: +tau.toFixed(3), full: +full.toFixed(3) };
    const r = evaluate(p);
    if (!best || r.score > best.r.score) best = { p, r };
  }
const pct = (x: number) => `${Math.round(x * 100)}%`;
console.log(`Parametry: ${JSON.stringify(best!.p)}`);
console.log(`Przykłady CKE (bez jednego, ${best!.r.posN}): dokładnie te same punkty ${pct(best!.r.pos)}, różnica najwyżej 1 pkt ${pct(best!.r.within1)}; odpowiedź z innego zadania = 0 pkt: ${pct(best!.r.neg)}; przepisane polecenie = 0 pkt: ${pct(best!.r.copy)}`);
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/ocena-polski.json', JSON.stringify({ params: best!.p, wynik: { przyklady: best!.r.posN, dokladnie: best!.r.pos, roznica1: best!.r.within1, cudze: best!.r.neg, polecenie: best!.r.copy } }, null, 1) + '\n');
writeFileSync('src/data/wzorce-polski.json', JSON.stringify(Object.fromEntries(T.map((t) => [t.id, t.ex.map((x, j) => [x.points, packVec(t.vec[j])])]))) + '\n');
