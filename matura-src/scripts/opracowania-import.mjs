// Opracowania lektur: data/opracowania/*.md → data/lektury/<id>.json (+ epoki-opisy.json).
//
// Dwa źródła:
//  - pliki z innego czatu (np. 03-renesans.md): „## N. Autor, *Tytuł*” albo „## N. *Tytuł* – Autor”,
//    sekcje „### …”; mają pierwszeństwo,
//  - opracowania zastępcze (z-*.md) ze znacznikiem „<!-- id: … -->” pod nagłówkiem: tylko dla lektur,
//    których tamte pliki nie omawiają. Znacznik „<!-- dodatek -->” dopisuje sekcje do opracowania z czatu.
// Sekcja „Charakterystyka epoki” trafia do epoki-opisy.json, „Spis treści” i „0. Zakres epoki…” są pomijane
// (oficjalna lista lektur jest w index.json).
// Uruchom: node scripts/opracowania-import.mjs

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = join(root, 'data/opracowania');
const out = join(root, 'data/lektury');
const index = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8'));

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// tytuły z plików czatu, których nie da się dopasować po samym tytule
const ALIAS = {
  treny: 'kochanowski-treny',
  'wybrana satyra': 'krasicki-satyry',
  'dziady cz ii': 'dziady-cz-2',
  'dziady cz iii': 'dziady-cz-3',
  'oda do mlodosci': 'mickiewicz-ballady',
  pamietniki: 'pasek-pamietniki',
  bajki: 'krasicki-bajki',
  'kroniki tygodniowe': 'prus-kroniki',
};

const EPOKA = [
  [/antyk|sredniow/, 'antyk'],
  [/renesans/, 'renesans'],
  [/barok/, 'barok'],
  [/oswiec/, 'oswiecenie'],
  [/romantyzm/, 'romantyzm'],
  [/pozytyw/, 'pozytywizm'],
  [/mloda/, 'mloda-polska'],
  [/dwudziest/, 'dwudziestolecie'],
  [/wojen|okupac/, 'wojna-i-okupacja'],
  [/wspolczes/, 'wspolczesnosc'],
];

function findId(title, rest) {
  const t = norm(title);
  const full = `${t} ${norm(rest)}`;
  // najdłuższy klucz najpierw, żeby „dziady cz iii” nie trafiło na „dziady cz ii”
  const keys = Object.keys(ALIAS).sort((x, y) => y.length - x.length);
  const k = keys.find((k) => t === k || full === k || (k.includes(' ') && (full.startsWith(`${k} `) || t.endsWith(k))));
  if (k) return ALIAS[k];
  const cands = index.lektury.map((b) => ({ b, n: norm(b.tytul) })).filter(({ n }) => n);
  const hit =
    cands.find(({ n }) => n === t)?.b ??
    cands
      .filter(({ n }) => t.startsWith(`${n} `) || n.startsWith(`${t} `))
      .sort((x, y) => y.n.length - x.n.length)[0]?.b;
  return hit?.id ?? null;
}

function parseItem(line) {
  const m = line.match(/^\*\*(.+?)\*\*\s*(?:[:–-]\s*)?(.*)$/);
  if (m && m[2]) return { etykieta: m[1].replace(/:$/, ''), tekst: m[2] };
  return { etykieta: '', tekst: line };
}

/** Sekcje „### …” jako bloki w kolejności z pliku: akapit, punkt listy, tabela. */
function parseSections(lines) {
  const sekcje = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === '---' || line.startsWith('<!--')) continue;
    if (line.startsWith('### ')) {
      cur = { tytul: line.slice(4).replace(/^[A-J]\.\s+/, '').trim(), bloki: [] };
      sekcje.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('|')) {
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      const row = line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const last = cur.bloki.at(-1);
      if (last?.typ === 'tabela') last.wiersze.push(row);
      else cur.bloki.push({ typ: 'tabela', wiersze: [row] });
      continue;
    }
    const bullet = line.match(/^[*-]\s+(.*)$/);
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    if (bullet) cur.bloki.push({ typ: 'punkt', ...parseItem(bullet[1]) });
    else if (num) cur.bloki.push({ typ: 'punkt', nr: Number(num[1]), ...parseItem(num[2]) });
    else cur.bloki.push({ typ: 'akapit', tekst: line });
  }
  return sekcje.filter((s) => s.bloki.length);
}

const entries = new Map();
const extras = [];
const epochs = {};
for (const f of readdirSync(src).filter((x) => x.endsWith('.md')).sort()) {
  const text = readFileSync(join(src, f), 'utf8');
  const h1 = text.match(/^# (.+)$/m)?.[1] ?? f;
  const epokaPliku = EPOKA.find(([re]) => re.test(norm(`${f} ${h1}`)))?.[1] ?? null;
  for (const chunk of text.split(/\n(?=## )/).filter((c) => c.startsWith('## '))) {
    const lines = chunk.split('\n');
    const head = lines[0].replace(/^##\s+(\d+\.\s*)?/, '').trim();
    if (/^spis tre/i.test(head) || /^zakres epoki/i.test(head)) continue;
    if (/^charakterystyka epoki/i.test(head)) {
      if (epokaPliku) epochs[epokaPliku] = { sekcje: parseSections(lines.slice(1)), plik: f };
      continue;
    }
    const idTag = chunk.match(/<!--\s*id:\s*([a-z0-9-]+)\s*-->/);
    const extra = /<!--\s*dodatek\s*-->/.test(chunk);
    const title = (head.match(/\*([^*]+)\*/)?.[1] ?? head.split(' – ')[0]).trim();
    const rest = head.slice(head.indexOf(title) + title.length);
    const id = idTag?.[1] ?? findId(title, rest);
    if (!id) throw new Error(`${f}: nie znam lektury „${head}” – dodaj ją do ALIAS albo do index.json`);
    const e = { id, own: !!idTag, f, naglowek: head, sekcje: parseSections(lines.slice(1)) };
    if (extra) {
      extras.push(e);
      continue;
    }
    const prev = entries.get(id);
    if (prev && prev.own === e.own) throw new Error(`${f}: lektura ${id} występuje drugi raz (też w ${prev.f})`);
    if (!prev || prev.own) entries.set(id, e);
  }
}
for (const x of extras) {
  const e = entries.get(x.id);
  if (e) e.sekcje.push(...x.sekcje);
}

// Opracowania w układzie „bryk” (data/bryk/<id>.md, własne teksty): „## Sekcja”, w niej „### Podtytuł”
// z akapitem (punkt z etykietą), listy i akapity. Zastępują streszczenie, bohaterów, problematykę
// i symbole; z dawnego opracowania zostają informacje podstawowe, motywy, konteksty, matura i quiz.
const brykDir = join(root, 'data/bryk');
const KEEP = /informacje podstawowe|motyw|kontekst|maturze|zapamięt|sprawdź swoją wiedzę/i;
function parseBryk(text) {
  const sekcje = [];
  let cur = null;
  let sub = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('<!--') || line.startsWith('# ')) continue;
    if (line.startsWith('## ')) {
      cur = { tytul: line.slice(3).trim(), bloki: [] };
      sub = null;
      sekcje.push(cur);
      continue;
    }
    if (!cur) continue;
    if (line.startsWith('### ')) {
      sub = { typ: 'punkt', etykieta: line.slice(4).trim(), tekst: '' };
      cur.bloki.push(sub);
      continue;
    }
    const bullet = line.match(/^[*-]\s+(.*)$/);
    const num = line.match(/^(\d+)\.\s+(.*)$/);
    // notatka pod „### ”: „> ” = sedno w jednym zdaniu, „- ” = punkty
    if (sub && line.startsWith('> ')) {
      sub.sedno = line.slice(2).trim();
      continue;
    }
    if (sub && bullet && (sub.sedno || sub.punkty || !sub.tekst)) {
      (sub.punkty ??= []).push(bullet[1].trim());
      continue;
    }
    if (bullet || num) {
      sub = null;
      cur.bloki.push({ typ: 'punkt', ...(num ? { nr: Number(num[1]) } : {}), ...parseItem((bullet ?? num)[bullet ? 1 : 2]) });
    } else if (sub) sub.tekst = sub.tekst ? `${sub.tekst} ${line}` : line;
    else cur.bloki.push({ typ: 'akapit', tekst: line });
  }
  return sekcje.filter((s) => s.bloki.length);
}
let brykCount = 0;
for (const f of readdirSync(brykDir).filter((x) => x.endsWith('.md'))) {
  const id = f.replace(/\.md$/, '');
  const e = entries.get(id);
  if (!e) throw new Error(`data/bryk/${f}: brak opracowania bazowego dla „${id}”`);
  const bryk = parseBryk(readFileSync(join(brykDir, f), 'utf8'));
  const info = e.sekcje.filter((s) => /informacje podstawowe/i.test(s.tytul));
  const rest = e.sekcje.filter((s) => KEEP.test(s.tytul) && !/informacje podstawowe/i.test(s.tytul));
  // bez własnego omówienia (np. wiersze) zostaje dawne streszczenie / omówienie utworów
  const ownSummary = bryk.some((s) => /streszcz|omówienie/i.test(s.tytul));
  const oldSummary = ownSummary ? [] : e.sekcje.filter((s) => /streszcz|omówienie/i.test(s.tytul)).map((s) => ({ ...s, tytul: /wiersze$/.test(id) || /omawiane utwory/i.test(s.tytul) ? 'Omówienie utworów' : 'Streszczenie szczegółowe' }));
  const at = Math.min(1, bryk.length);
  e.sekcje = [...info, ...bryk.slice(0, at), ...oldSummary, ...bryk.slice(at), ...rest];
  brykCount++;
}
console.log(`Układ „bryk”: ${brykCount} lektur.`);

const known = new Set(index.lektury.map((b) => b.id));
for (const e of entries.values()) {
  if (!known.has(e.id)) throw new Error(`${e.f}: brak „${e.id}” w data/lektury/index.json`);
  writeFileSync(join(out, `${e.id}.json`), JSON.stringify({ id: e.id, zrodlo: e.own ? 'zastepcze' : 'czat', plik: e.f, sekcje: e.sekcje }, null, 2) + '\n');
}
writeFileSync(join(out, 'epoki-opisy.json'), JSON.stringify(epochs, null, 2) + '\n');

const missing = index.lektury.filter((b) => !entries.has(b.id)).map((b) => b.id);
const fromChat = [...entries.values()].filter((e) => !e.own).length;
console.log(
  `Zapisano ${entries.size} opracowań (z czatu: ${fromChat}, zastępczych: ${entries.size - fromChat}), opisy epok: ${Object.keys(epochs).join(', ') || 'brak'}.` +
    (missing.length ? ` Bez opracowania: ${missing.join(', ')}` : ' Wszystkie lektury z listy mają opracowanie.'),
);
