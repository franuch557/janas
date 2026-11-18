// Sprawdza data/exams.json i zapisuje rozbieżności do data/exams-issues.md.
// Uruchomienie: npm run validate
import { readFileSync, writeFileSync } from 'node:fs';

export function examIssues(e) {
  const out = [];
  if (e.maxPoints == null) out.push('Brak maksymalnej liczby punktów w sprawdzonych źródłach.');
  if (e.tasks.length === 0 && e.groups.length === 0) {
    out.push('Brak listy zadań. Potrzebny PDF arkusza do importu.');
    return out;
  }
  const grouped = new Set(e.groups.flatMap((g) => g.tasks));
  let known = e.groups.reduce((s, g) => s + g.points, 0);
  const unknown = [];
  const seen = new Set();
  for (const t of e.tasks) {
    if (seen.has(t.nr)) out.push(`Zadanie ${t.nr} występuje dwa razy.`);
    seen.add(t.nr);
    if (!t.topics.length) out.push(`Zadanie ${t.nr} nie ma przypisanego tematu.`);
    if (grouped.has(t.nr)) continue;
    if (t.maxPoints == null) unknown.push(t.nr);
    else known += t.maxPoints;
  }
  if (unknown.length) out.push(`Nieznana punktacja zadań: ${unknown.join(', ')}.`);
  for (const g of e.groups) out.push(`Grupa${g.tasks.length ? ` (zad. ${g.tasks.join(', ')})` : ''}: ${g.note}`);
  if (e.maxPoints != null && !unknown.length && known !== e.maxPoints) out.push(`**Suma punktów zadań to ${known}, a maksimum arkusza to ${e.maxPoints}.**`);
  if (e.maxPoints != null && unknown.length && known > e.maxPoints) out.push(`**Znane punkty (${known}) przekraczają maksimum (${e.maxPoints}).**`);
  if (e.minutes == null) out.push('Brak czasu trwania arkusza w sprawdzonych źródłach.');
  if (!e.urls.arkusz.length) out.push('Brak potwierdzonego adresu PDF arkusza.');
  return out;
}

export function issuesMarkdown(data) {
  const lines = [
    '# Rozbieżności i braki w data/exams.json',
    '',
    'Plik tworzy `npm run validate` (także po `npm run import-cke`).',
    'Sprawdzenie: suma punktów zadań = maksimum arkusza; każde zadanie ma temat i punktację.',
    '',
  ];
  for (const e of data.exams) {
    const iss = examIssues(e);
    lines.push(`## ${e.id} (${e.family}, ${e.level}, ${e.year}) – status: ${e.status}`);
    lines.push('');
    if (!iss.length) lines.push('Bez rozbieżności.');
    else for (const i of iss) lines.push(`- ${i}`);
    lines.push('');
    lines.push(`Źródła: ${e.sources.join('; ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = new URL('../data/exams.json', import.meta.url);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(new URL('../data/exams-issues.md', import.meta.url), issuesMarkdown(data));
  const n = data.exams.reduce((s, e) => s + examIssues(e).length, 0);
  console.log(`Zapisano data/exams-issues.md (${n} uwag w ${data.exams.length} arkuszach).`);
}
