// Odpowiedzi zadań zamkniętych (ClosedAnswer z docs/kontrakt-danych.md) z tokenów odczytanych
// z zasad oceniania. Wartości `correct` pochodzą wyłącznie z zasad (kolumna wersji A arkusza
// wariantu 100); gdy nie da się ich jednoznacznie odczytać, zostaje null i wpis w exams-issues.md.
// Strukturę pozycji (opcje) biorę z treści arkusza albo z data/odpowiedzi-recznie.json.

const WORDS = { jedn: 1, dwie: 2, dwa: 2, dwóch: 2, trzy: 3, trzech: 3, cztery: 4, czterech: 4, pięć: 5, pięciu: 5, sześć: 6, sześciu: 6, wszystk: 'all' };

/** Litery opcji występujące w treści zadania („A. …”, „B. …”). */
export function optionLetters(body) {
  const found = new Set();
  for (const m of body.matchAll(/(?:^|\n|\s)([A-F])\.(?=\s|$)/g)) found.add(m[1]);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  // ciągły zakres od A
  const out = [];
  for (const l of letters) { if (found.has(l)) out.push(l); else break; }
  return out;
}

/** Zakres liter z polecenia: „(A–F)”, „A, B albo C”, „A, B, C albo D”. */
export function letterRange(text) {
  const n = text.replace(/\s+/g, '');
  const r = /\(([A-H])[–—-]([A-H])\)/.exec(n);
  if (r) return range(r[1], r[2]);
  const r2 = /Zakreśljednązliter:([A-H](?:,[A-H])*(?:albo|lub)[A-H])/.exec(n);
  if (r2) return r2[1].split(/,|albo|lub/);
  return null;
}
const range = (a, b) => Array.from({ length: b.charCodeAt(0) - a.charCodeAt(0) + 1 }, (_, i) => String.fromCharCode(a.charCodeAt(0) + i));

/** Punktacja z linii „2 pkt – poprawne 4 odpowiedzi” → { "4": 2, "3": 1 }. Null, gdy nie odczytano. */
export function scoringFrom(lines, nItems, maxPoints) {
  if (maxPoints === 1) return nItems === 1 ? 'each' : 'all';
  const map = {};
  for (const l of lines ?? []) {
    if (l.points === 0) continue;
    const t = l.text.toLowerCase();
    if (/za każdą poprawn/.test(t)) return 'each';
    let n = null;
    const d = /(\d+)\s*(?:poprawn|odpowiedzi|zdań|wiersz|uzupełni)/.exec(t) ?? /poprawne?\s+(?:zaznaczenie\s+|uzupełnienie\s+|przyporządkowanie\s+)?(\d+)/.exec(t);
    if (d) n = Number(d[1]);
    else {
      for (const [w, v] of Object.entries(WORDS)) if (new RegExp(`(^|\\s)${w}\\w*\\s`).test(t)) { n = v === 'all' ? nItems : v; break; }
    }
    if (n == null) return null;
    map[String(n)] = l.points;
  }
  if (!Object.keys(map).length) return null;
  if (Object.entries(map).every(([k, v]) => Number(k) === v) && Object.keys(map).length === maxPoints && nItems === maxPoints) return 'each';
  return map;
}

/**
 * Buduje odpowiedź. Zwraca { type, answer, issues }.
 * `rule` = wpis z planRules (tokens, scoring) albo z zasad angielskiego (answers).
 */
export function buildAnswer({ info, task, body, rule, manual }) {
  const issues = [];
  if (manual?.tokens) {
    // ręcznie odczytane rozwiązanie (np. z obrazu zasad, gdy PDF nie ma warstwy tekstu); strukturę buduje skrypt
    rule = { ...(rule ?? {}), tokens: manual.tokens, scoring: manual.scoring ?? rule?.scoring };
    manual = null;
  }
  if (manual) {
    if (manual.type === 'otwarte') return { type: 'otwarte', answer: null, issues };
    return { type: 'zamknięte', answer: { items: manual.items, scoring: manual.scoring }, issues: manual.issue ? [manual.issue] : [] };
  }
  if (info.family === 'angielski') return englishAnswer(task, body, rule, issues);
  const looksClosed = rule?.tokens?.versions || /Spośród podanych \S+ \([A-F][–-][A-F]\) wybierz|Zaznacz (właściwą|poprawną)|Wybierz (właściwą|poprawną)|P,? jeśli|albo F|Zakreśl|Dokończ zdani|Przyporządkuj|Wpisz (literę|numer)|Uzupełnij (tabelę|zdani).*(liter|wybran)/i.test(body);
  const tokens = rule?.tokens ?? null;
  const s = tokens ? tokens.join('') : null;
  const closedToken = s != null && (/^([A-F]|[PF]{2,}|[A-F][1-4]|([A-F][1-6],?)+|[A-F]{2,3})$/.test(s) || (tokens.length > 1 && tokens.every((x) => /^(\d+\.\d+\.?)?[A-F]$/.test(x))));
  if (!rule) {
    if (looksClosed) { issues.push('brak zasad oceniania: odpowiedź = null'); return { type: 'zamknięte', answer: null, issues }; }
    return { type: 'otwarte', answer: null, issues };
  }
  if (!closedToken) {
    if (looksClosed && (!s || s.length < 16 || rule.tokens?.versions)) {
      issues.push(`zadanie zamknięte, ale rozwiązania „${s ?? '—'}” nie umiem rozpisać automatycznie (data/odpowiedzi-recznie.json): odpowiedź = null`);
      return { type: 'zamknięte', answer: null, issues };
    }
    return { type: 'otwarte', answer: null, issues };
  }
  const sc = (n) => scoringFrom(rule.scoring, n, task.maxPoints);
  let items = null;
  if (/^[A-F]$/.test(s)) {
    const opts = optionLetters(body);
    if (opts.length >= 2 && opts.includes(s)) items = [{ id: task.nr, label: null, options: opts, correct: s }];
  } else if (/^[PF]+$/.test(s)) {
    const n = (body.match(/(?:^|\s)P\s?F(?=\s|$)/gm) ?? []).length;
    if (n === s.length) items = [...s].map((c, i) => ({ id: `${task.nr}.${i + 1}`, label: String(i + 1), options: ['P', 'F'], correct: c }));
    else issues.push(`liczba zdań P/F w arkuszu (${n}) różna od długości rozwiązania „${s}”`);
  } else if (/^[A-D][1-4]$/.test(s)) {
    const n = body.replace(/\s+/g, '');
    const letters = /AalboB/.test(n) ? ['A', 'B'] : /A,BalboC/.test(n) ? ['A', 'B', 'C'] : null;
    const digits = /1\.,2\.albo3\./.test(n) || /1\.,2\.lub3\./.test(n) ? ['1', '2', '3'] : /1\.albo2\./.test(n) ? ['1', '2'] : /1\.,2\.,3\.albo4\./.test(n) ? ['1', '2', '3', '4'] : null;
    if (letters && digits && letters.includes(s[0]) && digits.includes(s[1])) items = [
      { id: `${task.nr}.1`, label: 'odpowiedź', options: letters, correct: s[0] },
      { id: `${task.nr}.2`, label: 'uzasadnienie', options: digits, correct: s[1] },
    ];
  }
  const nb = body.replace(/\s+/g, '');
  const lr = /literami([A-F])[–—-]([A-F])/.exec(nb);
  const lettersRange = lr ? range(lr[1], lr[2]) : null;
  if (!items && tokens.length > 1 && tokens.every((x) => /^(\d+\.\d+\.?)?[A-F]$/.test(x)) && lettersRange) {
    // tabela: jedna komórka (wiersz) = jedna pozycja, np. „29.1. C”, „29.2. A”
    items = tokens.map((x, i) => {
      const m = /^(\d+\.\d+)?\.?([A-F])$/.exec(x);
      return { id: m[1] ?? `${task.nr}.${i + 1}`, label: m[1] ?? String(i + 1), options: lettersRange, correct: m[2] };
    });
  } else if (!items && /^[A-F]{2,3}$/.test(s) && lettersRange && /Wybierz(dwie|trzy)właściwe/.test(nb)) {
    // „Wybierz dwie właściwe odpowiedzi spośród A–F”: kolejność liter dowolna, zapisuję alfabetycznie
    items = [...s].sort().map((c, i) => ({ id: `${task.nr}.${i + 1}`, label: `litera ${i + 1} (alfabetycznie)`, options: lettersRange, correct: c }));
    issues.push(`wybór ${s.length} liter z ${lettersRange.join('')} bez kolejności: pozycje zapisane alfabetycznie`);
  } else if (!items && /^([A-F]\d,?)+$/.test(s)) {
    // przyporządkowanie „A1, B4”: litera → numer
    const dr = /(\d)[–—-](\d)\./.exec(nb) ?? /spośród(\d)[–—-](\d)/.exec(nb);
    const digits = dr ? Array.from({ length: Number(dr[2]) - Number(dr[1]) + 1 }, (_, k) => String(Number(dr[1]) + k)) : null;
    const pairs = s.split(',').filter(Boolean);
    if (digits && pairs.every((p) => digits.includes(p[1]))) items = pairs.map((p) => ({ id: `${task.nr}.${p[0]}`, label: p[0], options: digits, correct: p[1] }));
  }
  if (!items) {
    issues.push(`rozwiązanie „${s}” wymaga ręcznego rozpisania (data/odpowiedzi-recznie.json): odpowiedź = null`);
    return { type: 'zamknięte', answer: null, issues };
  }
  const scoring = sc(items.length);
  if (scoring == null) {
    issues.push(`nie odczytałem zasad punktacji (${(rule.scoring ?? []).map((l) => `${l.points} pkt – ${l.text}`).join('; ')})`);
    return { type: 'zamknięte', answer: { items, scoring: items.length === task.maxPoints ? 'each' : 'all' }, issues };
  }
  return { type: 'zamknięte', answer: { items, scoring }, issues };
}

function englishAnswer(task, body, rule, issues) {
  const ids = task.itemIds ?? [];
  if (!ids.length) return { type: 'otwarte', answer: null, issues };
  const ans = rule?.answers ?? {};
  const got = ids.filter((id) => ans[id] != null);
  if (!got.length) {
    const closedText = /Zakreśl|Dobierz|Dopasuj|Zaznacz znakiem X|literę/i.test(body) && !/Uzupełnij luki|uzupełnij każd\w* luk\w* jednym|wpisując|Przetłumacz|Wykorzystując/i.test(body);
    if (closedText) { issues.push('nie odczytałem odpowiedzi z zasad: odpowiedź = null'); return { type: 'zamknięte', answer: null, issues }; }
    return { type: 'otwarte', answer: null, issues };
  }
  if (got.length !== ids.length) issues.push(`odczytano ${got.length} z ${ids.length} odpowiedzi; brakujące = null`);
  const vals = got.map((id) => ans[id]);
  let options = letterRange(body);
  if (vals.every((v) => v === 'T' || v === 'F')) options = ['T', 'F'];
  if (vals.every((v) => v === 'P' || v === 'F') && /P\s*[–-]|prawd/i.test(body)) options = ['P', 'F'];
  if (!options) {
    // np. zadania z opcjami A–C przy każdej pozycji
    const opts = optionLetters(body);
    options = opts.length >= 2 ? opts : null;
  }
  if (!options) { issues.push('nie rozpoznałem opcji odpowiedzi w treści zadania'); options = [...new Set(vals)].sort(); }
  const bad = vals.filter((v) => !options.includes(v));
  if (bad.length) issues.push(`odpowiedzi ${bad.join(', ')} spoza opcji ${options.join('')}`);
  return {
    type: 'zamknięte',
    answer: { items: ids.map((id) => ({ id, label: id, options, correct: ans[id] ?? null })), scoring: 'each' },
    issues,
  };
}

/**
 * Punktacja zadania otwartego z zasad oceniania („3 pkt – …”, „2 pkt – …”) do oceny bez Claude'a:
 * { levels: [{ points, text }], result } albo null. `result` to wynik z najwyższego poziomu
 * (tekst po ostatnim dwukropku, gdy jest w nim liczba), do porównania z odpowiedzią ucznia.
 */
export function rubricFrom(ans, rule, task) {
  if (task.essay || ans?.type !== 'otwarte' || !rule?.scoring?.length) return null;
  const clean = (s) => s.normalize('NFKC').replace(/\s+/g, ' ').replace(/\s+([,.;:)])/g, '$1').trim();
  const seen = new Set();
  const levels = [];
  for (const l of rule.scoring) {
    if (seen.has(l.points) || l.points > task.maxPoints) continue;
    seen.add(l.points);
    levels.push({ points: l.points, text: clean(l.text).slice(0, 420) });
  }
  levels.sort((a, b) => b.points - a.points);
  if (!levels.length || levels[0].points !== task.maxPoints) return null;
  if (!levels.some((l) => l.points === 0)) levels.push({ points: 0, text: 'rozwiązanie niespełniające żadnego z powyższych warunków albo brak rozwiązania.' });
  const top = levels[0].text;
  const i = top.lastIndexOf(':');
  let result = i >= 0 ? top.slice(i + 1).replace(/[.;,]\s*$/, '').trim() : null;
  if (!result || !/\d/.test(result) || result.length > 80) result = null;
  return { levels, result };
}

/**
 * Szczegóły klucza z tekstu zasad oceniania (do automatycznej oceny):
 * - levels: [{ points, alts: [tekst] }] – poziomy punktacji z wariantami „ALBO”;
 * - solution: przykładowe pełne rozwiązanie (matematyka, sposób I);
 * - examples: [{ points, text }] – przykładowe odpowiedzi ocenione przez CKE (polski).
 */
export function keyDetails(ruleText, maxPoints) {
  const lines = (ruleText ?? '').normalize('NFKC').split('\n').map((l) => l.replace(/\s+/g, ' ').trim());
  const noise = (l) => !l || /^Strona \d+ z \d+$/.test(l) || /^Egzamin maturalny z /.test(l) || /^Zasady oceniania rozwiązań zadań$/.test(l);
  const levels = [];
  let i = lines.findIndex((l) => /^Zasady oceniania$/.test(l));
  if (i >= 0) {
    let cur = null;
    for (i = i + 1; i < lines.length; i++) {
      const l = lines[i];
      if (noise(l)) continue;
      if (/^(Uwag[ai]|Przykładow|Zadanie \d)/.test(l)) break;
      const m = /^(\d+)\s*pkt\s*[–—-]\s*(.*)$/.exec(l);
      if (m) {
        cur = { points: Number(m[1]), alts: [m[2]] };
        levels.push(cur);
        continue;
      }
      if (!cur) continue;
      if (/^ALBO$/.test(l)) {
        cur.alts.push('');
        continue;
      }
      const t = l.replace(/^[–—-]\s+/, '');
      cur.alts[cur.alts.length - 1] = `${cur.alts[cur.alts.length - 1]} ${t}`.trim();
    }
  }
  for (const lv of levels) lv.alts = lv.alts.map((a) => a.replace(/[,;]\s*$/, '').trim()).filter(Boolean);
  let solution = null;
  const s = lines.findIndex((l) => /^Przykładow[ea] (pełne )?rozwiązani[ea]$/.test(l));
  if (s >= 0) {
    solution = lines.slice(s + 1).filter((l) => !noise(l) && !/^Sposób I$/.test(l)).join('\n').trim() || null;
  }
  const examples = [];
  let pts = null;
  let buf = null;
  const flush = () => {
    if (buf && pts != null) {
      const t = buf.replace(/\s+/g, ' ').trim();
      if (t.length >= 3) examples.push({ points: pts, text: t });
    }
    buf = null;
  };
  for (const l of lines) {
    if (noise(l)) continue;
    const h = /^Przykładow[ea] (?:odpowiedzi|odpowiedź|rozwiązani[ea])(?: ocenion[ea] na (\d+) pkt)?/.exec(l);
    if (h) {
      flush();
      pts = h[1] != null ? Number(h[1]) : maxPoints;
      buf = '';
      continue;
    }
    if (pts == null) continue;
    if (/^(Uwag[ai]|Zasady oceniania|Wymagani|Zadanie \d)/.test(l)) {
      flush();
      pts = null;
      continue;
    }
    if (/^[•●]/.test(l)) {
      flush();
      buf = l.replace(/^[•●]\s*/, '');
      continue;
    }
    buf = buf == null ? l : `${buf} ${l}`;
  }
  flush();
  return { levels, solution, examples };
}

/** Dopisuje szczegóły kluczy arkuszy do data/klucze.json (wpisy innych arkuszy zostają). */
export async function saveKeys(rootDir, byExam) {
  const { readFileSync, writeFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const p = join(rootDir, 'data/klucze.json');
  const cur = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  for (const [id, v] of Object.entries(byExam)) cur[id] = v;
  const sorted = Object.fromEntries(Object.keys(cur).sort().map((k) => [k, cur[k]]));
  writeFileSync(p, JSON.stringify(sorted) + '\n');
}
