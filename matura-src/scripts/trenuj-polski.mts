// Trening oceny odpowiedzi otwartych z polskiego na przykładach CKE (data/klucze.json):
// wektory znaczenia przykładów → src/data/wzorce-polski.json (dla aplikacji),
// progi tau/full dobrane sprawdzeniem „bez jednego” (przykład oceniany bez siebie samego)
// i na odpowiedziach z innych zadań (powinny dostać 0 pkt) → src/data/ocena-polski.json.
// Użycie: npx tsx scripts/trenuj-polski.mts   (pierwsze uruchomienie pobiera model, ok. 118 MB)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { decideText, embedTexts, packVec, setTextModel, textFeatures, TEXT_MODEL, type TextExample, type TextFeatures, type TextParams } from '../src/logic/textGrade';

// model do porównania: MODEL=Xenova/multilingual-e5-small PREFIX='query: ' npx tsx scripts/trenuj-polski.mts
const MODEL = process.env.MODEL ?? TEXT_MODEL;
const PREFIX = process.env.PREFIX ?? '';
setTextModel(MODEL, PREFIX);
const DRY = !!process.env.DRY; // tylko wynik, bez zapisu plików
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
const cut = qs.map((q) => q.split(/\s+/).slice(0, Math.max(3, Math.ceil(q.split(/\s+/).length * 0.6))).join(' '));
const qcut: Float32Array[] = [];
for (let i = 0; i < cut.length; i += 16) qcut.push(...(await embedTexts(cut.slice(i, i + 16))));
let k = 0;
const T = tasks.map((t) => ({ ...t, vec: t.ex.map(() => vecs[k++]) }));

// cechy liczę raz (niezależne od progów), progi dobieram na nich
const others = (...skip: number[]) => T.flatMap((o, j) => (skip.includes(j) ? [] : o.vec));
const exOf = (t: (typeof T)[number], skip = -1): TextExample[] => t.ex.map((y, m) => ({ points: y.points, vec: t.vec[m] })).filter((_, m) => m !== skip);
type Case = { f: TextFeatures; max: number; want: number; kind: 'pos' | 'neg' | 'copy' };
const cases: Case[] = [];
T.forEach((t, i) => {
  const ctx = { q: qv[i], others: others(i) };
  const oi = (i + 11) % T.length;
  if (t.ex.length >= 2) t.ex.forEach((x, j) => cases.push({ f: textFeatures(t.vec[j], exOf(t, j), ctx)!, max: t.max, want: x.points, kind: 'pos' }));
  // odpowiedź z innego zadania (inny tekst, inne pytanie) → 0 pkt
  // (bez przykładów zadania, z którego pochodzi odpowiedź: inaczej znalazłaby samą siebie)
  cases.push({ f: textFeatures(T[oi].vec[0], exOf(t), { q: qv[i], others: others(i, oi) })!, max: t.max, want: 0, kind: 'neg' });
  // przepisane polecenie (ten sam temat, bez odpowiedzi) → 0 pkt
  // (początek polecenia, 60% słów: częściowe przepisanie, nie identyczny tekst)
  if (t.q.length > 20) cases.push({ f: textFeatures(qcut[i], exOf(t), ctx)!, max: t.max, want: 0, kind: 'copy' });
});

function evaluate(p: TextParams) {
  const n = { pos: 0, neg: 0, copy: 0 };
  const ok = { pos: 0, neg: 0, copy: 0 };
  let within1 = 0;
  for (const c of cases) {
    const got = decideText(c.f, c.max, p);
    n[c.kind]++;
    if (got === c.want) ok[c.kind]++;
    if (c.kind === 'pos' && Math.abs(got - c.want) <= 1) within1++;
  }
  const r = (k: keyof typeof n) => ok[k] / Math.max(1, n[k]);
  return { pos: r('pos'), within1: within1 / Math.max(1, n.pos), neg: r('neg'), copy: r('copy'), posN: n.pos, score: r('pos') + r('neg') + r('copy') };
}

let best: { p: TextParams; r: ReturnType<typeof evaluate> } | null = null;
for (let tau = 0.3; tau <= 0.95; tau += 0.025)
  for (let full = tau; full <= 0.97; full += 0.025)
    for (const qm of [undefined, -0.05, 0, 0.02, 0.05, 0.08, 0.12])
      for (const om of [undefined, 0, 0.02, 0.05, 0.1]) {
        const p: TextParams = { tau: +tau.toFixed(3), full: +full.toFixed(3), ...(qm != null ? { qm } : {}), ...(om != null ? { om } : {}) };
        const r = evaluate(p);
        if (!best || r.score > best.r.score) best = { p, r };
      }
const pct = (x: number) => `${Math.round(x * 100)}%`;
console.log(`Model: ${MODEL}`);
console.log(`Parametry: ${JSON.stringify(best!.p)}`);
console.log(`Przykłady CKE (bez jednego, ${best!.r.posN}): dokładnie te same punkty ${pct(best!.r.pos)}, różnica najwyżej 1 pkt ${pct(best!.r.within1)}; odpowiedź z innego zadania = 0 pkt: ${pct(best!.r.neg)}; przepisane polecenie = 0 pkt: ${pct(best!.r.copy)}`);
mkdirSync('src/data', { recursive: true });
if (DRY) process.exit(0);
writeFileSync('src/data/ocena-polski.json', JSON.stringify({ model: MODEL, prefix: PREFIX, params: best!.p, wynik: { przyklady: best!.r.posN, dokladnie: best!.r.pos, roznica1: best!.r.within1, cudze: best!.r.neg, polecenie: best!.r.copy } }, null, 1) + '\n');
// wektory: przykłady z punktami i polecenie (q) każdego zadania
writeFileSync('src/data/wzorce-polski.json', JSON.stringify(Object.fromEntries(T.map((t, i) => [t.id, { q: t.q.length > 20 ? packVec(qv[i]) : null, ex: t.ex.map((x, j) => [x.points, packVec(t.vec[j])]) }]))) + '\n');
