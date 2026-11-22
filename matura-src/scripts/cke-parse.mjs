// Analiza tekstu arkuszy i zasad oceniania CKE (formuła 2023). Czyste funkcje, bez dostępu do plików.
// Wejście: strony { page, width, height, lines: [{ y, top, bottom, x0, x1, text, n, items }] },
// y liczone od góry strony w punktach PDF, n = tekst linii bez spacji. Tekst z pdfjs ma rozbite
// spacje („Z adanie 4 . (0 – 1)”, „202 5”), dlatego nagłówki dopasowuję po usunięciu spacji.

const FAMILY = { MMAP: 'matematyka', MPOP: 'polski', MJAP: 'angielski', MJA: 'angielski' };
const MONTH = { '03': 'marzec', '05': 'maj', '06': 'czerwiec', '08': 'sierpień' };

/** Linia z tekstu (testy): { text, y } → pełna linia z polami top/bottom/n/items. */
export function mkLine(text, y, x = 71, h = 11) {
  const items = [{ x, x1: x + text.length * 5, y, h, s: text }];
  return { y, top: y - h * 0.85, bottom: y + h * 0.25, x0: x, x1: x + text.length * 5, h, text, n: text.replace(/\s+/g, ''), items };
}

/**
 * Rozpoznanie pliku po nazwie CKE. Obsługuje m.in.:
 * MMAP-R0-100-A-2505-arkusz.pdf, MMAP-P0-100-2305.pdf (arkusz 2023 bez końcówki),
 * MMAP-R0-100-2505-zasady.pdf, MJAP-P0-100-200-660-2505_MJAU-P0-100-2505-zasady.pdf,
 * MJAP-P0-100-200-660-K00-MJAU-100-2405-zasady.pdf, MJAP-P0-100-2305-transkrypcja.pdf,
 * nagrania MJAP-P0-100-2305.mp3, MJA-P-100-2405.mp3, MJAP-P-100-2505_MJAU-P-100-2505.mp3.
 * Zwraca null dla nieznanych nazw. Wariant inny niż 100 ma flagę `adapted`.
 */
export function parseFileName(name) {
  const base = name.replace(/^.*[\\/]/, '');
  const ext = /\.(pdf|mp3)$/i.exec(base)?.[1]?.toLowerCase();
  if (!ext) return null;
  let stem = base.slice(0, -(ext.length + 1));
  let kind = ext === 'mp3' ? 'nagranie' : 'arkusz';
  const k = /-(arkusz|zasady|transkrypcja)$/i.exec(stem);
  if (k) { kind = k[1].toLowerCase(); stem = stem.slice(0, -k[0].length); }
  stem = stem.split('_')[0]; // „…-2505_MJAU-P0-100-2505”: druga część to arkusz MJAU
  const m = /^(MMAP|MPOP|MJAP|MJA)-([PR])(\d)?-(\d{3})((?:-[A-Z0-9]{1,4})*?)-(\d{2})(\d{2})$/i.exec(stem);
  if (!m) return null;
  const [, prefixRaw, lvlRaw, partRaw, variant, , yy, mm] = m;
  const prefix = prefixRaw.toUpperCase() === 'MJA' ? 'MJAP' : prefixRaw.toUpperCase();
  const lvl = lvlRaw.toUpperCase();
  const part = Number(partRaw ?? 0);
  const family = FAMILY[prefix];
  const isPolish = family === 'polski';
  return {
    family,
    level: lvl === 'R' ? 'rozszerzony' : 'podstawowy',
    year: 2000 + Number(yy),
    session: MONTH[mm] ?? null,
    variant,
    adapted: variant !== '100',
    kind,
    part,
    examId: isPolish ? `MPOP-${lvl}1-${lvl}2-${yy}${mm}` : `${prefix}-${lvl}${part}-100-${yy}${mm}`,
    taskPrefix: isPolish ? `A${part}.` : '',
  };
}

// ---------- układ strony ----------

/** Kolumna treści (pt). Matematyka i polski: bez okienek punktacji na marginesach. */
export function columnFor(family, page) {
  if (page?.col) return page.col; // własny układ strony (informatory CKE: rysunki do prawego marginesu)
  if (family !== 'angielski') return [62, 534];
  // angielski: margines zmienia się na stronach parzystych i nieparzystych (57 albo 85 pt)
  const xs = page.lines.map((l) => l.x0).filter((x) => x > 45 && x < 110);
  const left = xs.length ? Math.min(...xs) : 57;
  const x0 = left < 64 ? 57 : left < 80 ? 71 : 85; // 71 pt: zasady oceniania z 2025 i 2026
  return [x0 - 6, Math.min(page.width - 8, x0 + 462)];
}

const FOOTER = /^(Strona\d+z\d+|M(MAP|POP|JAP)-?[A-Z0-9_-]*(Strona\d+z\d+)?|Układgraficzny|©CKE\d*)$/;

/** Górna i dolna granica treści strony (bez nagłówka, stopki „Strona X z Y”, kodu arkusza i przypisu z podstawą prawną). */
export function pageLimits(page) {
  let top = 0;
  for (const l of page.lines) if (l.y < 58) top = Math.max(top, l.bottom + 3);
  let bottom = page.height - 20;
  for (const l of page.lines) {
    if (l.y > page.height - 70 && (FOOTER.test(l.n) || /Strona\d+z\d+/.test(l.n))) bottom = Math.min(bottom, l.top - 4);
  }
  // logo CKE nad stopką (obraz, nie tekst): tnę 26 pt nad stopką, chyba że niżej jest jeszcze tekst
  const lastText = Math.max(0, ...page.lines.filter((l) => l.bottom <= bottom && !FOOTER.test(l.n)).map((l) => l.bottom));
  if (bottom < page.height - 20) bottom = Math.min(bottom, Math.max(lastText + 6, bottom - 22));
  // przypis z podstawą programową („Rozporządzenie Ministra…”) na dole strony zasad
  const fn = page.lines.find((l) => l.y > page.height * 0.7 && /^\d?Rozporządzenie/.test(l.n));
  if (fn) {
    const mark = page.lines.filter((l) => l.y < fn.y && fn.y - l.y < 8 && /^\d$/.test(l.n)).pop();
    bottom = Math.min(bottom, (mark ?? fn).top - 6);
  }
  return { top, bottom };
}

/** Tekst linii z elementów w kolumnie treści (pomija numery i punktację z okienek na marginesie). */
export function columnText(line, col) {
  const its = line.items.filter((i) => i.x >= col[0] - 2 && i.x < col[1] - 4);
  if (its.length === line.items.length) return line.text;
  let text = '';
  its.forEach((p, k) => {
    const prev = its[k - 1];
    text += (!prev ? '' : /\s$/.test(prev.s) || /^\s/.test(p.s) || p.x - prev.x1 > Math.min(p.h, prev.h) * 0.2 ? ' ' : '') + p.s;
  });
  return text.replace(/\s+/g, ' ').trim();
}

// „Zadanie 12.1. (0–2)”, „Zadanie 15. (0–35)”, „Zadanie 3.” – po usunięciu spacji
const HEADER = /^Zadanie(\d+)\.(?:(\d+)\.?)?(?:\(0[–—-](\d+)\))?/;

/** Rozpoznaje nagłówek zadania w tekście (spacje są ignorowane). */
export function parseHeader(text) {
  const n = text.replace(/\s+/g, '');
  const m = HEADER.exec(n);
  if (!m) return null;
  return { main: Number(m[1]), sub: m[2] != null ? Number(m[2]) : null, nr: m[2] != null ? `${m[1]}.${m[2]}` : m[1], points: m[3] != null ? Number(m[3]) : null };
}

const cmpNr = (a, b) => a.main - b.main || (a.sub ?? 0) - (b.sub ?? 0);

/**
 * Nagłówki zadań w kolejności. `subHeads: false` pomija nagłówki z podpunktem (zasady angielskiego,
 * gdzie „Zadanie 3.1.” to tylko podsekcja). Nagłówek poza kolejnością (np. odwołanie w tekście) pomijam.
 */
export function findHeads(pages, family, { subHeads = true } = {}) {
  const heads = [];
  for (const p of pages) {
    const col = columnFor(family, p);
    for (const l of p.lines) {
      const its = l.items.filter((i) => i.x >= col[0] - 2 && i.x < col[1] - 4);
      if (!its.length || its[0].x > col[0] + 40) continue;
      const h = parseHeader(its.map((i) => i.s).join(''));
      if (!h || (!subHeads && h.sub != null)) continue;
      const prev = heads[heads.length - 1];
      if (prev && cmpNr(h, prev) <= 0) continue;
      heads.push({ ...h, page: p.page, y: l.y, top: l.top, bottom: l.bottom });
    }
  }
  return heads;
}

export function findMeta(pages) {
  const all = pages.slice(0, 2).flatMap((p) => p.lines.map((l) => l.n)).join('\n');
  const max = /LICZBAPUNKTÓWDOUZYSKANIA(?:ZA(?:ARKUSZ\d\.\((?:TESTY|WYPRACOWANIE)\)|CZĘŚ(?:Ć|CI)[\d.i]+))?:(\d{2,3})/i.exec(all)
    ?? /(?:łącznie|maksymalnie)(\d{2,3})punkt/i.exec(all);
  const time = /CZASTRWANIA:(\d{2,3})minut/i.exec(all) ?? /Czaspracy:?(\d{2,3})minut/i.exec(all);
  const joint = /łączniena(rozwiązanie|napisanie)/i.test(all);
  return { maxPoints: max ? Number(max[1]) : null, minutes: time ? Number(time[1]) : null, jointTime: joint };
}

// ---------- regiony (fragmenty stron) ----------

/**
 * Fragmenty stron od punktu `from` do punktu `to` (wyłącznie). Punkt: { page, y } (y = górna krawędź).
 * `to` null = do końca dokumentu. Strony z wielkim „BRUDNOPIS” pomijam.
 */
export function span(pages, from, to, family) {
  const out = [];
  for (const p of pages) {
    if (p.page < from.page || (to && p.page > to.page)) continue;
    if (isScratchPage(p)) { if (p.page > from.page) break; continue; }
    const lim = pageLimits(p);
    const y0 = p.page === from.page ? Math.max(lim.top, from.y) : lim.top;
    const y1 = to && p.page === to.page ? Math.min(lim.bottom, to.y) : lim.bottom;
    if (y1 - y0 < 6) continue;
    // na stronie następnego nagłówka: sam górny margines (ewentualnie fragment ikony nagłówka)
    if (to && p.page === to.page && p.page !== from.page && !p.lines.some((l) => l.top >= y0 - 1 && l.bottom <= y1 + 1 && l.y > lim.top + 2) && y1 - lim.top < 75) continue;
    const col = columnFor(family, p);
    out.push({ page: p.page, y0, y1, x0: col[0], x1: col[1] });
  }
  return out;
}

export function isScratchPage(p) {
  return p.lines.some((l) => /^BRUDNOPIS/.test(l.n));
}

/** Prostokąty do zamalowania na biało: kropki do pisania odpowiedzi, miejsca dla egzaminatora, „PRZENIEŚ…”. */
export function whiteouts(page, family) {
  const out = [];
  if (family === 'angielski') {
    // logo „EM 23” w lewym dolnym rogu strony nad stopką
    const foot = page.lines.find((l) => l.y > page.height - 70 && /Strona\d+z\d+/.test(l.n));
    if (foot) {
      const col = columnFor(family, page);
      const box = { x0: 0, x1: col[0] + 75, y0: foot.top - 40, y1: foot.top };
      if (!page.lines.some((l) => l !== foot && l.bottom > box.y0 && l.top < box.y1 && l.x0 < box.x1)) out.push(box);
    }
  }
  const pad = (i) => ({ x0: i.x - 1, x1: i.x1 + 1, y0: i.y - i.h * 0.9, y1: i.y + i.h * 0.35 });
  for (const l of page.lines) {
    if (/^PRZENIEŚ/.test(l.n) || /^CZYSTOPIS$/.test(l.n)) { out.push({ x0: 0, x1: page.width, y0: l.top - 2, y1: l.bottom + 2 }); continue; }
    for (const i of l.items) {
      const s = i.s.replace(/\s+/g, '');
      if (/^[.…]{4,}$/.test(s)) out.push(pad(i));
      else if (family !== 'angielski' && /^[_.…]{4,}$/.test(s)) out.push(pad(i));
      else if (family !== 'angielski' && /^(Miejscedla(Miejscedla)?|egzaminatora(egzaminatora)?)$/.test(s)) out.push(pad(i));
    }
  }
  return out;
}

const firstLine = (pages, page, y0, y1, re) => {
  const p = pages.find((x) => x.page === page);
  return p?.lines.find((l) => l.y > y0 && l.top < y1 && re.test(l.n)) ?? null;
};

/** Linie (z numerem strony) między dwoma punktami dokumentu. */
export function linesBetween(pages, from, to) {
  const out = [];
  for (const p of pages) {
    if (p.page < from.page || (to && p.page > to.page)) continue;
    for (const l of p.lines) {
      if (p.page === from.page && l.top < from.y - 1) continue;
      if (to && p.page === to.page && l.top >= to.y - 1) continue;
      out.push({ ...l, page: p.page });
    }
  }
  return out;
}

const pt = (l) => ({ page: l.page, y: l.top - 6 });

/**
 * Plan arkusza: zadania z punktacją i fragmentami do wycięcia oraz wspólne materiały (context).
 * Zwraca { tasks: [{ nr, maxPoints, text, page, frags, context, sub? }], contexts: [{ key, frags }] }.
 */
export function planSheet(info, pages) {
  const fam = info.family;
  const heads = findHeads(pages, fam);
  const all = pages.flatMap((p) => p.lines.map((l) => ({ ...l, page: p.page })));
  // granice: nagłówki zadań, „Brudnopis” (okienko na stronie), nagłówki części polskiego, „CZYSTOPIS”
  const stops = [
    ...heads.map((h) => ({ page: h.page, y: h.top - 6 })),
    ...all.filter((l) => l.n === 'Brudnopis' || /^Część\d\.(Test|i)/.test(l.n) || /^CZYSTOPIS$/.test(l.n) || (fam === 'polski' && /^WYPRACOWANIE$/.test(l.n))).map(pt),
  ].sort((a, b) => a.page - b.page || a.y - b.y);
  const nextStop = (from) => stops.find((s) => s.page > from.page || (s.page === from.page && s.y > from.y + 4)) ?? null;
  const region = (from) => span(pages, from, nextStop(from), fam);
  const textOf = (from) => { const to = nextStop(from); return linesBetween(pages, from, to).map((l) => columnText(l, columnFor(fam, pages[l.page - 1]))).filter(Boolean).join('\n'); };

  const tasks = [];
  const contexts = [];
  const prefix = info.taskPrefix;

  // polski, arkusz 1: teksty przed pierwszym zadaniem części 1 to wspólny materiał
  let part1Ctx = null;
  let part2Start = null;
  if (fam === 'polski' && info.part === 1) {
    const p2 = all.find((l) => /^Część2\./.test(l.n));
    part2Start = p2 ? { page: p2.page, y: p2.y } : null;
    const firstText = all.find((l) => /^Tekst1\./.test(l.n));
    if (firstText && heads[0] && (firstText.page < heads[0].page || (firstText.page === heads[0].page && firstText.y < heads[0].y))) {
      part1Ctx = 'A1-teksty';
      contexts.push({ key: part1Ctx, frags: span(pages, pt(firstText), { page: heads[0].page, y: heads[0].top - 6 }, fam) });
    }
  }
  const inPart2 = (h) => part2Start && (h.page > part2Start.page || (h.page === part2Start.page && h.y > part2Start.y));

  if (fam === 'polski' && info.part === 2) {
    // wypracowanie: wspólne polecenie + tematy do wyboru jako osobne zadania
    const h = heads.find((x) => x.points != null);
    if (h) {
      const from = { page: h.page, y: h.top - 6 };
      const lines = linesBetween(pages, from, nextStop(from));
      const temats = lines.filter((l) => /^Temat\d+\.?$/.test(l.n));
      const end = lines.find((l) => /^WYPRACOWANIE/.test(l.n));
      const common = span(pages, from, temats[0] ? pt(temats[0]) : null, fam);
      const commonText = lines.filter((l) => !temats[0] || l.page < temats[0].page || l.y < temats[0].y).map((l) => l.text).join('\n');
      const minWords = /conajmniej(\d+)wyraz/.exec(commonText.replace(/\s+/g, ''));
      temats.forEach((t, i) => {
        const to = temats[i + 1] ? pt(temats[i + 1]) : end ? pt(end) : nextStop(from);
        const tl = linesBetween(pages, pt(t), to);
        tasks.push({
          nr: `${prefix}${i + 1}`, maxPoints: h.points, page: t.page, frags: [...common, ...span(pages, pt(t), to, fam)],
          text: tl.map((l) => l.text).join('\n'), stem: commonText, context: null, alternative: `${prefix}temat`,
          essay: { minWords: minWords ? Number(minWords[1]) : null, maxWords: null, criteria: 'pol-2023' }, sheetNr: h.nr,
        });
      });
    }
    return { tasks, contexts, heads };
  }

  for (const h of heads) {
    if (h.points == null) continue;
    const from = { page: h.page, y: h.top - 6 };
    let frags = region(from);
    let text = textOf(from);
    let context = part1Ctx && !inPart2(h) ? part1Ctx : null;
    // polecenie wspólne („Zadanie 12.” bez punktów) dla podpunktów 12.1, 12.2, …
    const stem = h.sub != null ? heads.find((s) => s.points == null && s.main === h.main && s.sub == null) : null;
    let stemText = null;
    if (stem) {
      const sf = { page: stem.page, y: stem.top - 6 };
      const sl = linesBetween(pages, sf, nextStop(sf));
      stemText = sl.map((l) => columnText(l, columnFor(fam, pages[l.page - 1]))).join('\n');
      const sfr = region(sf);
      const tall = sfr.reduce((t, f) => t + (f.y1 - f.y0), 0) > 200;
      if (fam === 'polski' && (tall || sl.some((l) => /^(Tekst\d|Fragment)/.test(l.n)))) {
        const key = `${prefix}${stem.nr}`;
        if (!contexts.some((c) => c.key === key)) contexts.push({ key, frags: sfr });
        context = key;
      } else frags = [...sfr, ...frags];
    }
    if (fam === 'angielski') {
      tasks.push(...splitEnglish(h, frags, text, pages, from, nextStop(from), contexts));
      continue;
    }
    tasks.push({ nr: `${prefix}${h.nr}`, maxPoints: h.points, page: h.page, frags, text, stem: stemText, context, sheetNr: h.nr, section: fam === 'polski' ? (inPart2(h) ? 'historycznoliteracki' : 'jezyk-w-uzyciu') : null });
  }
  return { tasks, contexts, heads };
}

/**
 * Angielski: zadanie z częściami o różnym typie („Wykonaj zadania 5.1.–5.7. zgodnie z poleceniami”)
 * dzielę na części według poleceń „…5.1.–5.3.…”; wspólne teksty trafiają do context.
 */
function splitEnglish(h, frags, text, pages, from, to, contexts) {
  const lines = linesBetween(pages, from, to);
  const rangeRe = /(\d+)\.(\d+)\.?[–—-](\d+)\.(\d+)\./;
  const essay = /Napiszswojąwypowiedź/.test(text.replace(/\s+/g, '')) ? englishEssay(text) : null;
  const subs = lines.filter((l, i) => i > 0 && /^(Przeczytaj|Uzupełnij|Wpisz|Dopasuj)/.test(l.n) && !/Wykonajzadania/.test(l.n) && rangeRe.test(l.n) && Number(rangeRe.exec(l.n)[1]) === h.main);
  const items = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => `${h.main}.${a + k}`);
  const base = { maxPoints: h.points, page: h.page, sheetNr: h.nr, essay };
  if (subs.length < 2) {
    // w angielskim każda pozycja to 1 pkt, więc pozycje to N.1 … N.(punkty)
    const ids = Array.from({ length: h.points }, (_, k) => `${h.main}.${k + 1}`);
    return [{ ...base, nr: h.nr, frags, text, context: null, itemIds: essay ? [] : ids }];
  }
  const key = `${h.nr}`;
  contexts.push({ key, frags: span(pages, from, pt(subs[0]), 'angielski') });
  return subs.map((s, i) => {
    const r = rangeRe.exec(s.n);
    const a = Number(r[2]);
    const b = Number(r[4]);
    const sTo = subs[i + 1] ? pt(subs[i + 1]) : to;
    const sl = linesBetween(pages, pt(s), sTo);
    return { ...base, nr: `${h.main}.${a}-${h.main}.${b}`, maxPoints: b - a + 1, page: s.page, frags: span(pages, pt(s), sTo, 'angielski'), text: sl.map((l) => l.text).join('\n'), context: key, itemIds: items(a, b) };
  });
}

/** Wypowiedź pisemna z angielskiego: liczba wyrazów z polecenia („od 80 do 130 wyrazów”). */
export function englishEssay(text) {
  const m = /od(\d+)do(\d+)wyrazów/.exec(text.replace(/\s+/g, ''));
  return { minWords: m ? Number(m[1]) : null, maxWords: m ? Number(m[2]) : null, criteria: 'ang-pp-2023' };
}

// ---------- zasady oceniania ----------

const SECTION_END = /^(Zasadyoceniania|Uszczegółowienia|Rozwiązanie|Schematpunktowania|Przykładowe|Kluczowejest|Odpowiedźoczekiwana|Uwag|Kryteria|Poprawnaodpowiedź|Ocenianie)/;

/**
 * Plan zasad oceniania: dla każdego zadania fragmenty obrazu odpowiedzi (bez tabeli wymagań
 * z podstawy programowej) i odczytane tokeny rozwiązania.
 */
export function planRules(info, pages) {
  const fam = info.family;
  const heads = findHeads(pages, fam, { subHeads: fam !== 'angielski' });
  const out = [];
  // sekcje dla osób z dyskalkulią / specyficznymi trudnościami nie należą do obrazu odpowiedzi
  const extraStops = pages.flatMap((p) => p.lines.filter((l) => /^(Kryteriauwzględniającespecyficznetrudności|Ocenapracosóbzestwierdzoną|Uwagidotycząceocenianiapraczdającychzespecyficznymi|Przykładoweakceptowaneodpowiedzidozadania\d+\.wpracachzdających|Wypowiedźpisemna$)/.test(l.n)).map((l) => ({ page: p.page, y: l.top - 3 })));
  heads.forEach((h, i) => {
    const from = { page: h.page, y: h.top - 6 };
    const nh = heads[i + 1];
    let to = nh ? { page: nh.page, y: nh.top - 6 } : null;
    const stop = extraStops.find((s) => (s.page > from.page || (s.page === from.page && s.y > from.y)) && (!to || s.page < to.page || (s.page === to.page && s.y < to.y)));
    if (stop) to = stop;
    // matematyka: z przykładowych rozwiązań zostawiam sposób I (kolejne sposoby powiększają pakiet
    // kilkukrotnie; zasady punktacji dla wszystkich sposobów są przed rozwiązaniami)
    if (fam === 'matematyka') {
      const ls = linesBetween(pages, from, to);
      const ex = ls.findIndex((l) => /^Przykładow[ea](pełne)?rozwiązani/.test(l.n));
      const alt = ex >= 0 ? ls.slice(ex + 1).find((l) => /^SposóbII($|[^I])/.test(l.n)) : null;
      if (alt) to = { page: alt.page, y: alt.top - 4 };
    }
    const lines = linesBetween(pages, from, to);
    const headLine = lines[0];
    const rest = lines.slice(1);
    const scoring = scoringLines(rest);
    if (fam === 'angielski') {
      out.push({ nr: h.nr, main: h.main, points: h.points, ...englishRules(h, pages, from, to, lines), scoring });
      return;
    }
    // pomijam tabelę „Wymagania określone w podstawie programowej” (od nagłówka wymagań do „Zasady oceniania”)
    const req = rest.find((l) => /^(Wymagani[ae]|Podstawaprogramowa)/.test(l.n));
    let frags;
    if (req) {
      const after = rest.find((l) => (l.page > req.page || l.y > req.y) && SECTION_END.test(l.n));
      frags = [...span(pages, from, { page: headLine.page, y: headLine.bottom + 2 }, fam), ...(after ? span(pages, pt(after), to, fam) : [])];
    } else frags = span(pages, from, to, fam);
    // polski, wypracowanie: osobny obraz dla każdego tematu („Temat 1.” + uszczegółowienia zasad)
    const temats = [];
    if (fam === 'polski' && info.part === 2) {
      const ts = rest.filter((l) => /^Temat\d+\.?$/.test(l.n));
      const crit = rest.find((l) => /^1\.Spełnienieformalnychwarunków/.test(l.n));
      ts.forEach((t, k) => temats.push({ k: k + 1, frags: span(pages, pt(t), ts[k + 1] ? pt(ts[k + 1]) : crit ? pt(crit) : to, fam) }));
    }
    out.push({ nr: h.nr, main: h.main, points: h.points, frags, temats, tokens: solutionTokens(rest), scoring, text: rest.map((l) => l.text).join('\n') });
  });
  return out;
}

/** Linie „2 pkt – …” z sekcji zasad oceniania (z kontynuacjami). */
export function scoringLines(lines) {
  const out = [];
  let cur = null;
  for (const l of lines) {
    const m = /^(\d+)pkt[–—-]/.exec(l.n);
    if (m) { cur = { points: Number(m[1]), text: l.text.replace(/^\d+\s*pkt\s*[–—-]\s*/, '') }; out.push(cur); continue; }
    if (cur && !SECTION_END.test(l.n) && !/^(Zadanie|Strona|ALBO)/.test(l.n) && l.n.length > 2 && out.length < 8 && cur.text.length < 400) cur.text += ` ${l.text}`;
    else cur = null;
  }
  return out;
}

/**
 * Tokeny rozwiązania zadania zamkniętego. „Rozwiązanie / Wersja A Wersja B / B C” → kolumna wersji A.
 * Bez wersji: kolejne linie po „Rozwiązanie”. Zwraca listę napisów (po jednym na linię) albo null.
 */
export function solutionTokens(lines) {
  const i = lines.findIndex((l) => /^Rozwiązanie$/.test(l.n));
  if (i < 0) return null;
  const out = [];
  const head = lines[i + 1];
  if (head && /^WersjaA/.test(head.n)) {
    // kolumna wersji B zaczyna się przy drugim „Wersja”
    const vb = head.items.filter((it) => /^Wersja/.test(it.s.trim())).map((it) => it.x)[1]
      ?? head.items.find((it) => /B$/.test(it.s.trim()) && it.x > head.x0 + 60)?.x;
    const limit = vb != null ? vb - 4 : Infinity;
    let prevY = head.y;
    for (const l of lines.slice(i + 2, i + 8)) {
      if (/^(Zadanie|Strona|Zasady|Uwag|Schemat|Przykład|Egzamin|Kryteria|Wymagan)/.test(l.n)) break;
      if (l.page !== head.page || l.y - prevY > 40) break; // np. numer przypisu na dole strony
      prevY = l.y;
      const t = l.items.filter((it) => it.x < limit).map((it) => it.s).join('').replace(/\s+/g, '');
      if (t) out.push(t);
    }
    if (out.length) out.versions = true;
    return out.length ? out : null;
  }
  let prevY = lines[i].y;
  for (const l of lines.slice(i + 1, i + 6)) {
    if (/^(Zadanie|Strona|Zasady|Uwag|Schemat|Przykład|Egzamin|Kryteria|Wymagan)/.test(l.n)) break;
    if (l.page !== lines[i].page || l.y - prevY > 40) break;
    prevY = l.y;
    out.push(l.items.map((it) => it.s).join('').replace(/\s+/g, ''));
  }
  return out.length ? out : null;
}

/** Odczyt „Wersja A Wersja B / B C” z tekstu (do testów i prostych przypadków). */
export function versionA(textLines) {
  return solutionTokens(textLines.map((t, k) => (typeof t === 'string' ? mkLine(t, 100 + k * 14) : t)));
}

/**
 * Zasady angielskiego: tabela z kolumnami „Zadanie | Podstawa programowa | Poprawna odpowiedź (A B)”.
 * Odpowiedzi z kolumny wersji A (gdy są dwie wersje) albo jedynej kolumny. Obraz: kolumna numerów
 * i odpowiedzi bez kolumn wymagań; dla części otwartych – uszczegółowienia bez tabeli.
 */
function englishRules(h, pages, from, to, lines) {
  const answers = {};
  const rowRe = /^(\d+)\.(\d+)\.?$/;
  const tableRows = [];
  // tabela „Przykłady odpowiedzi…” pod tabelą wymagań nie należy do tabeli odpowiedzi
  const stopAt = lines.find((l, k) => k > 0 && /^Przykład/.test(l.n));
  for (const l of lines) {
    if (stopAt && (l.page > stopAt.page || (l.page === stopAt.page && l.y >= stopAt.y))) break;
    const first = l.items[0]?.s.trim().replace(/\s+/g, '');
    if (!first || !rowRe.test(first) || Number(rowRe.exec(first)[1]) !== h.main) continue;
    if (l.items[0].x > (columnFor('angielski', pages[l.page - 1])[0] + 50)) continue;
    const toks = l.text.split(' ').slice(1).filter(Boolean);
    const last = toks.slice(-2);
    tableRows.push(l);
    const id = first.replace(/\.$/, '');
    const isAns = (t) => /^[A-HTFPN]$/.test(t);
    const twoCols = lines.some((x) => /Wersjaarkusza/.test(x.n) && x.page === l.page && x.y < l.y);
    if (twoCols && last.length === 2 && isAns(last[0]) && isAns(last[1])) answers[id] = last[0];
    else if (!twoCols && toks.length && isAns(toks[toks.length - 1])) answers[id] = toks[toks.length - 1];
  }
  // fragmenty obrazu
  const frags = [];
  const tables = groupTables(lines, tableRows);
  let cursor = from;
  const headLine = lines[0];
  frags.push(...span(pages, from, { page: headLine.page, y: headLine.bottom + 2 }, 'angielski'));
  cursor = { page: headLine.page, y: headLine.bottom + 2 };
  const openTables = [];
  for (const t of tables) {
    const hasAns = t.rows.some((r) => answers[r.items[0].s.trim().replace(/\.$/, '')]);
    const p = pages[t.page - 1];
    const col = columnFor('angielski', p);
    const inTable = lines.filter((l) => l.page === t.page && l.top >= t.top - 1 && l.bottom <= t.bottom + 1);
    const headItems = inTable.flatMap((l) => l.items).filter((it) => /^(Poprawna|Wersja|odpowiedź)/.test(it.s.trim()));
    if (hasAns || headItems.length) {
      // kolumny: numery zadań | (wymagania – pomijam) | poprawna odpowiedź
      const ansHead = headItems.length ? Math.min(...headItems.map((it) => it.x)) : Math.min(...t.ansXs);
      const ansX = Math.min(ansHead, ...t.ansXs) - 12;
      const zad = inTable.flatMap((l) => l.items).filter((it) => /^Zadanie$/.test(it.s.trim()));
      const numX1 = Math.max(...t.rows.map((r) => r.items[0].x1), ...zad.map((it) => it.x1)) + 6;
      const rowIds = new Set(t.rows.map((r) => r.items[0]));
      const req = inTable.flatMap((l) => l.items).filter((it) => !rowIds.has(it) && !zad.includes(it) && it.x > numX1 - 8 && it.x < ansX);
      const c1 = req.length ? Math.max(numX1, Math.min(...req.map((it) => it.x)) - 3) : numX1;
      const c2 = req.length ? Math.min(ansX + 10, Math.max(ansX - 30, Math.max(...req.map((it) => it.x1)) + 3)) : ansX;
      const frag = { page: t.page, y0: t.top, y1: t.bottom, x0: col[0], x1: col[1], cols: [[col[0], c1], [c2, col[1]]],
        split: { numX1: Math.max(...t.rows.map((r) => r.items[0].x1)), ansX: headItems.length ? Math.min(...headItems.map((it) => it.x)) : ansX + 12 } };
      if (hasAns) frags.push(frag); else openTables.push(frag);
    }
    cursor = { page: t.page, y: t.bottom };
  }
  // reszta (uszczegółowienia, przykłady odpowiedzi) po ostatniej tabeli
  const restStart = lines.find((l) => l.y > 58 && (l.page > cursor.page || (l.page === cursor.page && l.top >= cursor.y)) && /^(Uszczegółowienia|Zasadyoceniania|Zadanie\d+\.\d+|Kluczowe|Odpowiedź|Przykład|Uwaga)/.test(l.n));
  // część otwarta: kolumna odpowiedzi z tabeli wymagań (jeśli jest) + uszczegółowienia i przykłady
  const headFr = span(pages, from, { page: headLine.page, y: headLine.bottom + 2 }, 'angielski');
  const rest = restStart ? span(pages, pt(restStart), to, 'angielski') : [];
  const openPart = openTables.length || rest.length ? [...(openTables.length ? headFr : []), ...openTables, ...rest] : span(pages, from, to, 'angielski');
  // wypowiedź pisemna: uszczegółowienia oceny treści dla tematu (drugi nagłówek „Zadanie 12.”)
  // do ogólnych kryteriów („Spójność i logika wypowiedzi”), które są w data/kryteria.json
  const again = lines.filter((l, k) => k > 0 && new RegExp(`^Zadanie${h.main}\\.$`).test(l.n)).pop();
  const general = lines.find((l) => /^Spójnośćilogikawypowiedzi$/.test(l.n));
  if (again && general) return { answers, frags: span(pages, pt(again), pt(general), 'angielski'), openFrags: [], closedIds: [], text: lines.map((l) => l.text).join('\n') };
  const closedIds = Object.keys(answers);
  return { answers, frags, openFrags: openPart, closedIds, text: lines.map((l) => l.text).join('\n') };
}

// strona (z wysokością) dla linii z linesBetween – wystarcza do pageLimits
const pagesOf = (lines, page) => ({ page, height: 842, lines: lines.filter((l) => l.page === page) });

function groupTables(lines, rows) {
  // tabela: ciąg wierszy na jednej stronie; górna granica = linia „Zadanie”/„Podstawa” nad pierwszym wierszem
  const out = [];
  for (const r of rows) {
    let t = out[out.length - 1];
    const newHeader = t && t.page === r.page && lines.some((l) => l.page === r.page && l.y > t.lastY && l.y < r.y && l.items.some((it) => /^Zadanie$/.test(it.s.trim())));
    if (!t || t.page !== r.page || r.y - t.lastY > 90 || newHeader) {
      // nagłówek tabeli nad pierwszym wierszem (do 200 pt; wiersze bywają wysokie), ale poniżej nagłówka zadania
      const headY = Math.max(58, ...lines.filter((l) => l.page === r.page && l.y < r.y && /^Zadanie\d/.test(l.n)).map((l) => l.y), ...(t && t.page === r.page ? [t.lastY] : []));
      const above = lines.filter((l) => l.page === r.page && l.y < r.y && l.y > headY && r.y - l.y < 200 && !/^\d+pkt|^Akceptowane/.test(l.n) && /(Zadanie|Podstawa|Wersja|Poprawna|odpowiedź|^AB$|Wymagani)/.test(l.n));
      t = { page: r.page, top: Math.min(r.top, ...above.map((l) => l.top)) - 4, bottom: r.bottom, lastY: r.y, rows: [], ansXs: [] };
      const ah = above.flatMap((l) => l.items).filter((it) => /^(Poprawna|Wersja|odpowiedź)/.test(it.s.trim()));
      t.ansXs.push(...ah.map((it) => it.x));
      out.push(t);
    }
    t.rows.push(r);
    t.lastY = r.y;
    // dolna krawędź wiersza: następna linia przed kolejnym wierszem
    t.bottom = Math.max(t.bottom, r.bottom + 6);
    const lastTok = r.items[r.items.length - 1];
    if (/^[A-HTFP](\s[A-HTFP])?$/.test(lastTok.s.trim())) t.ansXs.push(lastTok.x - (lastTok.s.trim().length > 1 ? 0 : 20));
  }
  for (const t of out) {
    // dolna granica tabeli: ostatnia linia tekstu wymagań pod ostatnim wierszem (do 30 pt)
    // dolna granica: do następnej sekcji (przykłady, uszczegółowienia, kolejne zadanie) albo końca tekstu strony
    const lim = pageLimits(pagesOf(lines, t.page));
    const after = lines.filter((l) => l.page === t.page && l.y > t.lastY && l.bottom < lim.bottom);
    const sec = after.find((l) => /^(Przykład|Uszczegółowienia|Zasadyoceniania|Zadanie|Uwagi|Kluczowe|Wypowiedź|Odpowiedź|Rozumienie|Znajomość)/.test(l.n));
    const below = sec ? after.filter((l) => l.y < sec.y) : after;
    if (below.length) t.bottom = Math.max(t.bottom, ...below.map((l) => l.bottom + 6));
    // ramka następnej tabeli zaczyna się nad tekstem jej nagłówka
    if (sec) t.bottom = Math.max(t.rows[t.rows.length - 1].bottom + 6, Math.min(t.bottom, sec.top - (/^Zadanie$|^Zadanie[A-ZŻP]/.test(sec.n) || sec.items[0].s.trim() === 'Zadanie' ? 24 : 4)));
    t.bottom += 6; // dolna krawędź tabeli
    if (!t.ansXs.length) t.ansXs.push(400);
  }
  return out;
}

// ---------- typ, tematy, streszczenie ----------

export function isClosed(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const opts = ['A.', 'B.', 'C.', 'D.'].filter((o) => lines.some((l) => l.startsWith(o)));
  return opts.length >= 3 || /Zaznacz (właściwą|poprawną) odpowiedź|Wybierz (właściwą|poprawną)|P,? jeśli|prawdziwe,? albo F|Zakreśl|Zaznacz znakiem X|Dobierz|Dopasuj/i.test(text);
}

export function needsProof(text) {
  return /(?<!\p{L})(Wykaż|Udowodnij)(?!\p{L})/u.test(text);
}

/** Heurystyka: zadania, w których zwykle trzeba rozważyć przypadki. Wynik oznaczam do sprawdzenia. */
export function needsCases(text) {
  return /wartoś\w* bezwzględn|\|\s*x|rozważ\w* (wszystkie )?przypad|w zależności od|dla każdej wartości parametru|liczb\w* rozwiązań/i.test(text);
}

const MATH_KEYWORDS = [
  ['logarytmy', /\blog/i],
  ['potegi', /potęg|pierwiast|wykładnicz|\^\s*x/i],
  ['procenty', /procent|%|lokat|oprocentow|kapitał/i],
  ['wielomiany', /wielomian|skróconego mnożenia/i],
  ['wartosc-bezwzgledna', /wartoś\w* bezwzględn|\|\s*𝑥|\|\s*x/i],
  ['kwadratowa-parametr', /parametr|kwadratow|trójmian/i],
  ['wymierne', /wymiern|homograficzn/i],
  ['granice-ciagow', /granic|lim\b|szereg/i],
  ['ciagi', /ciąg|arytmetyczn|geometryczn/i],
  ['trygonometria', /sin|cos|tg\b|trygonometr/i],
  ['okrag', /okrąg|okręg|styczn/i],
  ['podobienstwo', /podobn|twierdzeni\w* (sinusów|cosinusów|Talesa|Pitagorasa)/i],
  ['geometria-analityczna', /układzie współrzędnych|prost\w* o równaniu|współrzędn/i],
  ['stereometria', /graniastosłup|ostrosłup|walec|stożek|kul[ai]|sześcian|prostopadłościan|bryła/i],
  ['planimetria', /trójkąt|czworokąt|równoległobok|trapez|romb|kwadrat\w* ABCD|wielokąt|pole figury/i],
  ['kombinatoryka', /ile jest|liczb\w* (cztero|pięcio|trzy|sześcio)cyfrow|permutac|kombinac|na ile sposobów/i],
  ['prawdopodobienstwo', /prawdopodobieńst|losujemy|rzucamy|losowo/i],
  ['pochodne', /pochodn|najmniejsz\w* wartoś|największ\w* wartoś|monotoniczn|ekstrem/i],
  ['rownania', /równani|nierównoś|układ równań/i],
  ['dowody', /(?<!\p{L})(Wykaż|Udowodnij)(?!\p{L})/u],
];

export function guessTopics(family, text, ctx = {}) {
  if (family === 'matematyka') {
    const found = MATH_KEYWORDS.filter(([, re]) => re.test(text)).map(([id]) => id);
    const filtered = ctx.level === 'podstawowy' ? found.filter((t) => t !== 'pochodne' && t !== 'granice-ciagow') : found;
    return filtered.slice(0, 3);
  }
  if (family === 'angielski') {
    if (/Usłyszysz|nagrani/i.test(text)) return ['ang-sluchanie'];
    if (/Napisz swoją wypowiedź/i.test(text) || (/Napisz|e-mail|wpis/i.test(text) && (ctx.points ?? 0) >= 8)) return ['ang-pisanie'];
    if (/Uzupełnij|Przetłumacz|Wybierz właściwe uzupełnienie|zgodn\w* gramatycznie|poprawnie uzupełnia|minidialog|Wykorzystując wyrazy/i.test(text)) return ['ang-srodki'];
    if (/Przeczytaj|tekst/i.test(text)) return ['ang-czytanie'];
    return [];
  }
  if (family === 'polski') {
    if (ctx.part === 2) return ['pol-wyp-kompetencje', 'pol-wyp-kompozycja', 'pol-wyp-jezyk'];
    if (ctx.section === 'historycznoliteracki') return ['pol-historycznoliteracki'];
    if (/interpunk|ortograf|frazeolog|słowotwór|wyraz\w* (podstawow|pochodn)|związ\w* wyrazow|poprawn\w* językow|część mowy|zdani\w* (złożon|pojedyncz)|przymiotnik|czasownik|rzeczownik|wyraz\w* wartościując|neologizm|archaizm|zapożycz/i.test(text)) return ['pol-jezyk'];
    return ['pol-rozumienie'];
  }
  return [];
}

/** Krótkie streszczenie: początek polecenia, do ok. 25 słów. To cytat, nie parafraza. */
export function summarize(text) {
  const words = (text ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return null;
  const cut = words.slice(0, 25).join(' ');
  return words.length > 25 ? `${cut}…` : cut;
}

/** Zadania z jednego pliku arkusza jako wpisy exams.json (bez odpowiedzi i obrazów). */
export function tasksFromPages(info, pages) {
  const { tasks } = planSheet(info, pages);
  return tasks.map((t) => {
    const full = [t.stem, t.text].filter(Boolean).join('\n');
    const body = t.text.replace(/^Zadanie[^\n]*\n?/, '');
    return {
      nr: t.nr,
      maxPoints: t.maxPoints,
      type: t.essay ? 'otwarte' : isClosed(body) ? 'zamknięte' : 'otwarte',
      topics: guessTopics(info.family, full, { level: info.level, part: info.part, section: t.section, points: t.maxPoints }),
      summary: summarize(body),
      proof: info.family === 'matematyka' ? needsProof(full) : null,
      cases: info.family === 'matematyka' ? needsCases(full) : null,
      page: t.page,
      source: `import z PDF ${info.examId}; tematy i typ rozpoznane automatycznie, do sprawdzenia`,
    };
  });
}
