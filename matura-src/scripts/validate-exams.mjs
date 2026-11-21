// Sprawdza data/exams.json i zapisuje rozbieżności do data/exams-issues.md.
// Uruchomienie: npm run validate   (kod wyjścia 1, gdy suma punktów arkusza się nie zgadza)
//
// Uwagi z importu PDF (np. odpowiedzi, których nie dało się odczytać) zapisuje
// `npm run import-cke` w data/exams-import-uwagi.json; ten skrypt dołącza je do raportu.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TOPIC_IDS = (() => {
  try {
    const src = readFileSync(fileURLToPath(new URL('../src/data/taxonomy.ts', import.meta.url)), 'utf8');
    return new Set([...src.matchAll(/\{\s*id:\s*'([^']+)',\s*family:/g)].map((m) => m[1]));
  } catch {
    return null;
  }
})();

/** Suma punktów zadań; zadania z tym samym `alternative` (np. tematy wypracowania) liczę raz. */
export function pointSum(e) {
  const grouped = new Set((e.groups ?? []).flatMap((g) => g.tasks));
  let known = (e.groups ?? []).reduce((s, g) => s + g.points, 0);
  const unknown = [];
  const alt = new Set();
  for (const t of e.tasks) {
    if (grouped.has(t.nr)) continue;
    if (t.alternative) { if (alt.has(t.alternative)) continue; alt.add(t.alternative); }
    if (t.maxPoints == null) unknown.push(t.nr);
    else known += t.maxPoints;
  }
  return { known, unknown };
}

export function examIssues(e, { images = null } = {}) {
  const out = [];
  const groups = e.groups ?? [];
  if (e.maxPoints == null) out.push('Brak maksymalnej liczby punktów w sprawdzonych źródłach.');
  if (e.tasks.length === 0 && groups.length === 0) {
    out.push('Brak listy zadań. Potrzebny PDF arkusza do importu.');
    return out;
  }
  const seen = new Set();
  for (const t of e.tasks) {
    if (seen.has(t.nr)) out.push(`Zadanie ${t.nr} występuje dwa razy.`);
    seen.add(t.nr);
    if (!t.topics.length) out.push(`Zadanie ${t.nr} nie ma przypisanego tematu.`);
    if (TOPIC_IDS) for (const id of t.topics) if (!TOPIC_IDS.has(id)) out.push(`Zadanie ${t.nr}: temat „${id}” spoza src/data/taxonomy.ts.`);
    if (t.type === 'zamknięte') {
      if (!t.answer) out.push(`Zadanie ${t.nr} (zamknięte): brak odpowiedzi (answer = null).`);
      else {
        const nul = t.answer.items.filter((i) => i.correct == null).map((i) => i.id);
        if (nul.length) out.push(`Zadanie ${t.nr} (zamknięte): nieodczytane pozycje ${nul.join(', ')}.`);
        for (const i of t.answer.items) if (i.correct != null && !i.options.includes(i.correct)) out.push(`Zadanie ${t.nr}: odpowiedź ${i.correct} spoza opcji ${i.options.join('')}.`);
      }
    }
    if (images && !images.has(t.nr)) out.push(`Zadanie ${t.nr}: brak obrazu w cke-obrazy/zad/${e.id}/.`);
  }
  const { known, unknown } = pointSum(e);
  if (unknown.length) out.push(`Nieznana punktacja zadań: ${unknown.join(', ')}.`);
  for (const g of groups) out.push(`Grupa${g.tasks.length ? ` (zad. ${g.tasks.join(', ')})` : ''}: ${g.note}`);
  if (e.maxPoints != null && !unknown.length && known !== e.maxPoints) out.push(`**Suma punktów zadań to ${known}, a maksimum arkusza to ${e.maxPoints}.**`);
  if (e.maxPoints != null && unknown.length && known > e.maxPoints) out.push(`**Znane punkty (${known}) przekraczają maksimum (${e.maxPoints}).**`);
  if (e.minutes == null) out.push('Brak czasu trwania arkusza w sprawdzonych źródłach.');
  if (!e.urls.arkusz.length) out.push('Brak potwierdzonego adresu PDF arkusza (import z pliku lokalnego).');
  return out;
}

export function issuesMarkdown(data, importNotes = [], imagesFor = () => null) {
  const lines = [
    '# Rozbieżności i braki w data/exams.json',
    '',
    'Plik tworzy `npm run validate` (także po `npm run import-cke`).',
    'Sprawdzenie: suma punktów zadań = maksimum arkusza (zadania z tym samym `alternative` liczone raz);',
    'każde zadanie ma temat z taksonomii i punktację; zadanie zamknięte ma odpowiedź z zasad oceniania.',
    'Sekcja „Uwagi z importu” pochodzi z odczytu PDF (`npm run import-cke`).',
    '',
  ];
  for (const e of data.exams) {
    const iss = examIssues(e, { images: imagesFor(e) });
    const notes = importNotes.filter((n) => n.examId === e.id).map((n) => n.text);
    lines.push(`## ${e.id} (${e.family}, ${e.level}, ${e.year}) – status: ${e.status}`);
    lines.push('');
    if (!iss.length) lines.push('Walidacja: bez rozbieżności.');
    else for (const i of iss) lines.push(`- ${i}`);
    if (notes.length) {
      lines.push('');
      lines.push('Uwagi z importu:');
      lines.push('');
      for (const n of [...new Set(notes)]) lines.push(`- ${n}`);
    }
    lines.push('');
    lines.push(`Źródła: ${e.sources.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

export async function imagesLookup(root) {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('cke-obrazy/zad/', root);
  if (!existsSync(dir)) return () => null;
  return (e) => {
    const d = new URL(`${e.id}/`, dir);
    if (!existsSync(d)) return new Set();
    return new Set(readdirSync(d).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)));
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('validate-exams.mjs')) {
  const root = new URL('../', import.meta.url);
  const data = JSON.parse(readFileSync(new URL('data/exams.json', root), 'utf8'));
  const notesPath = new URL('data/exams-import-uwagi.json', root);
  const notes = existsSync(notesPath) ? JSON.parse(readFileSync(notesPath, 'utf8')) : [];
  const imgs = await imagesLookup(root);
  writeFileSync(new URL('data/exams-issues.md', root), issuesMarkdown(data, notes, imgs));
  let bad = 0;
  for (const e of data.exams) {
    const { known, unknown } = pointSum(e);
    const ok = e.maxPoints != null && !unknown.length && known === e.maxPoints;
    if (!ok) bad++;
    const closed = e.tasks.filter((t) => t.type === 'zamknięte');
    const nul = closed.filter((t) => !t.answer || t.answer.items.some((i) => i.correct == null)).length;
    console.log(`${ok ? 'OK ' : 'BŁĄD'} ${e.id}: ${e.tasks.length} zadań, suma ${known}/${e.maxPoints ?? '?'} pkt, ${e.minutes ?? '?'} min, zamknięte ${closed.length} (bez odpowiedzi: ${nul})`);
  }
  const n = data.exams.reduce((s, e) => s + examIssues(e, { images: imgs(e) }).length, 0);
  console.log(`Zapisano data/exams-issues.md (${n} uwag walidacji, ${notes.length} uwag z importu, ${data.exams.length} arkuszy).`);
  if (bad) { console.error(`Błąd: ${bad} arkuszy ma sumę punktów różną od maksimum.`); process.exit(1); }
}
