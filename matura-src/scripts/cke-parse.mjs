// Analiza tekstu arkuszy CKE (formuła 2023). Czyste funkcje, bez dostępu do plików.
// Wejście: strony z liniami tekstu { page, lines: [{ text, y }] }, y liczone od góry strony.

const FAMILY = { MMAP: 'matematyka', MPOP: 'polski', MJAP: 'angielski' };
const MONTH = { '05': 'maj', '06': 'czerwiec', '08': 'sierpień' };

/**
 * Rozpoznanie pliku po nazwie CKE, np. MMAP-R0-100-A-2505-arkusz.pdf.
 * Zwraca null dla nazw, których nie znam. Wariant inny niż 100 (arkusze
 * dostosowane) jest zwracany z flagą `adapted`.
 */
export function parseFileName(name) {
  const m = /^(MMAP|MPOP|MJAP)-([PR])(\d)-(\d{3})(?:-[A-Z0-9]+)*?-(\d{2})(\d{2})(?:-(arkusz|zasady))?\.pdf$/i.exec(name.replace(/^.*[\\/]/, ''));
  if (!m) return null;
  const [, prefix, lvl, part, variant, yy, mm, kind] = m;
  const family = FAMILY[prefix.toUpperCase()];
  const level = lvl.toUpperCase() === 'R' ? 'rozszerzony' : 'podstawowy';
  const year = 2000 + Number(yy);
  const session = MONTH[mm] ?? null;
  const isPolish = family === 'polski';
  const examId = isPolish ? `MPOP-${lvl.toUpperCase()}1-${lvl.toUpperCase()}2-${yy}${mm}` : `${prefix.toUpperCase()}-${lvl.toUpperCase()}${part}-100-${yy}${mm}`;
  return {
    family,
    level,
    year,
    session,
    variant,
    adapted: variant !== '100',
    kind: kind ? kind.toLowerCase() : 'arkusz',
    part: Number(part),
    examId,
    taskPrefix: isPolish ? `A${part}.` : '',
  };
}

const HEADER = /^Zadanie\s+(\d+)(?:\.(\d+))?\.?\s*(?:\(\s*0\s*[–—-]\s*(\d+)\s*\))?/;

/** Nagłówki zadań z punktacją „Zadanie 6.1. (0–2)”. Nagłówek bez punktacji to polecenie wspólne. */
export function findTasks(pages) {
  const heads = [];
  for (const p of pages) {
    p.lines.forEach((l, idx) => {
      const m = HEADER.exec(l.text.trim());
      if (!m) return;
      heads.push({ nr: m[2] ? `${m[1]}.${m[2]}` : m[1], points: m[3] != null ? Number(m[3]) : null, page: p.page, y: l.y, idx });
    });
  }
  // tekst zadania: linie od nagłówka do następnego nagłówka
  const tasks = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    const next = heads[i + 1];
    const text = [];
    for (const p of pages) {
      if (p.page < h.page || (next && p.page > next.page)) continue;
      p.lines.forEach((l, idx) => {
        if (p.page === h.page && idx <= h.idx) return;
        if (next && p.page === next.page && idx >= next.idx) return;
        text.push(l.text);
      });
    }
    tasks.push({ ...h, text: text.join('\n').trim(), nextPage: next?.page ?? null, nextY: next?.y ?? null });
  }
  // nagłówki z punktacją; wspólne polecenie (bez punktów) dopisuję do tekstu podpunktów
  const withPoints = tasks.filter((t) => t.points != null);
  for (const t of withPoints) {
    const stem = tasks.find((s) => s.points == null && t.nr.startsWith(`${s.nr}.`));
    if (stem) t.stem = stem.text;
  }
  return withPoints;
}

export function findMeta(pages) {
  const all = pages.flatMap((p) => p.lines.map((l) => l.text)).join('\n');
  const max = /(?:łącznie|maksymalnie|do uzyskania[^\d]{0,40})\s*(\d{2,3})\s*punkt/i.exec(all);
  const time = /Czas pracy:?\s*(\d{2,3})\s*minut/i.exec(all);
  return { maxPoints: max ? Number(max[1]) : null, minutes: time ? Number(time[1]) : null };
}

export function isClosed(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const opts = ['A.', 'B.', 'C.', 'D.'].filter((o) => lines.some((l) => l.startsWith(o)));
  return opts.length >= 3 || /Zaznacz (właściwą|poprawną) odpowiedź|Wybierz (właściwą|poprawną)|P,? jeśli|prawdziwe,? albo F/i.test(text);
}

export function needsProof(text) {
  return /(?<!\p{L})(Wykaż|Udowodnij)(?!\p{L})/u.test(text);
}

/** Heurystyka: zadania, w których zwykle trzeba rozważyć przypadki. Wynik oznaczam do sprawdzenia. */
export function needsCases(text) {
  return /wartoś\w* bezwzględn|\|\s*x|rozważ\w* przypad|w zależności od|dla każdej wartości parametru|liczb\w* rozwiązań/i.test(text);
}

const MATH_KEYWORDS = [
  ['logarytmy', /\blog/i],
  ['potegi', /potęg|pierwiast|wykładnicz|\^\s*x/i],
  ['procenty', /procent|%|lokat|oprocentow|kapitał/i],
  ['wielomiany', /wielomian|skróconego mnożenia/i],
  ['wartosc-bezwzgledna', /wartoś\w* bezwzględn|\|\s*x/i],
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
  ["dowody", /(?<!\p{L})(Wykaż|Udowodnij)(?!\p{L})/u],
];

export function guessTopics(family, text, ctx = {}) {
  if (family === 'matematyka') {
    const found = MATH_KEYWORDS.filter(([, re]) => re.test(text)).map(([id]) => id);
    // „pochodne” tylko na poziomie rozszerzonym
    const filtered = ctx.level === 'podstawowy' ? found.filter((t) => t !== 'pochodne' && t !== 'granice-ciagow') : found;
    return filtered.slice(0, 3);
  }
  if (family === 'angielski') {
    if (/Usłyszysz|nagrani/i.test(text)) return ['ang-sluchanie'];
    if (/Napisz|wiadomoś\w*|e-mail|wpis/i.test(text) && (ctx.points ?? 0) >= 8) return ['ang-pisanie'];
    if (/Uzupełnij|Przetłumacz|Wybierz właściwe uzupełnienie|zgodn\w* gramatycznie/i.test(text)) return ['ang-srodki'];
    if (/Przeczytaj|tekst/i.test(text)) return ['ang-czytanie'];
    return [];
  }
  if (family === 'polski') {
    if (ctx.part === 2) return ['pol-wyp-kompetencje', 'pol-wyp-kompozycja', 'pol-wyp-jezyk'];
    if (ctx.section === 'historycznoliteracki') return ['pol-historycznoliteracki'];
    if (/interpunk|ortograf|frazeolog|słowotwór|wyraz\w* (podstawow|pochodn)|związ\w* wyrazow|poprawn\w* językow|część mowy|zdani\w* (złożon|pojedyncz)/i.test(text)) return ['pol-jezyk'];
    return ['pol-rozumienie'];
  }
  return [];
}

/** Krótkie streszczenie: początek polecenia, do ok. 25 słów. To cytat, nie parafraza. */
export function summarize(text) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return null;
  const cut = words.slice(0, 25).join(' ');
  return words.length > 25 ? `${cut}…` : cut;
}

/** Zadania z jednego pliku arkusza jako wpisy exams.json. */
export function tasksFromPages(info, pages) {
  // podział części w arkuszu 1 z polskiego
  let section = 'jezyk-w-uzyciu';
  const sectionAt = [];
  for (const p of pages) for (const l of p.lines) {
    if (/Test historycznoliteracki/i.test(l.text)) sectionAt.push({ page: p.page, y: l.y, section: 'historycznoliteracki' });
  }
  return findTasks(pages).map((t) => {
    if (info.family === 'polski') {
      const s = sectionAt.filter((x) => x.page < t.page || (x.page === t.page && x.y < t.y)).pop();
      section = s ? s.section : 'jezyk-w-uzyciu';
    }
    const full = [t.stem, t.text].filter(Boolean).join('\n');
    return {
      nr: `${info.taskPrefix}${t.nr}`,
      maxPoints: t.points,
      type: isClosed(t.text) ? 'zamknięte' : 'otwarte',
      topics: guessTopics(info.family, full, { level: info.level, part: info.part, section, points: t.points }),
      summary: summarize(t.text),
      proof: needsProof(full),
      cases: needsCases(full),
      page: t.page,
      source: `import z PDF ${info.examId}; tematy, typ i „przypadki” rozpoznane automatycznie, do sprawdzenia`,
      _crop: { page: t.page, y: t.y, nextPage: t.nextPage, nextY: t.nextY },
    };
  });
}
