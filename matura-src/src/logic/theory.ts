// Parser teorii z matematyki (data/teoria-matematyka/*.md):
//   # Dział            – pomijany (nazwa jest w taksonomii)
//   tekst              – wstęp działu
//   ## Lekcja          – teoria lekcji (akapity, listy, wzory $…$)
//   ### Przykład: tytuł – treść, potem kroki „1. …”, na końcu „Odpowiedź: …”
//   ### Sprawdź się: tytuł – zadanie do samodzielnego rozwiązania; „Wynik: …” = wartość do sprawdzenia
//   > …                – ramka w teorii lekcji: „> Uwaga: …” ostrzeżenie, „> Metoda:” + „> 1. …” sposób
//                        rozwiązywania, inne „> …” to „Zapamiętaj” (najważniejsze wzory)

export interface TheoryExample {
  title: string;
  task: string;
  steps: string[];
  answer: string;
  /** Zadanie „Sprawdź się”: uczeń wpisuje wynik, aplikacja porównuje go z `check`. */
  self?: boolean;
  check?: string;
}
export type TheoryPart = { kind: 'text' | 'key' | 'warn' | 'method'; text: string };
export interface TheoryLesson {
  title: string;
  theory: string;
  parts: TheoryPart[];
  examples: TheoryExample[];
}

/** Teoria lekcji podzielona na tekst i ramki („> …”). */
export function theoryParts(lines: string[]): TheoryPart[] {
  const out: TheoryPart[] = [];
  let buf: string[] = [];
  let quote: string[] | null = null;
  const flushText = () => {
    const t = blocks(buf);
    if (t) out.push({ kind: 'text', text: t });
    buf = [];
  };
  const flushQuote = () => {
    if (!quote) return;
    const first = quote[0] ?? '';
    const kind: TheoryPart['kind'] = /^uwaga\b/i.test(first) ? 'warn' : /^metoda\b|^jak (to )?rozwiąz/i.test(first) ? 'method' : 'key';
    const body = kind === 'key' ? quote.map((l) => l.replace(/^zapamiętaj:\s*/i, '')) : kind === 'warn' ? [first.replace(/^uwaga:?\s*/i, ''), ...quote.slice(1)] : quote.slice(1);
    const t = blocks(body);
    if (t) out.push({ kind, text: t.charAt(0).toUpperCase() + t.slice(1) });
    quote = null;
  };
  for (const l of lines) {
    const q = l.match(/^>\s?(.*)$/);
    if (q) {
      if (!quote) {
        flushText();
        quote = [];
      }
      quote.push(q[1]);
    } else {
      if (quote && !l.trim()) {
        flushQuote();
        continue;
      }
      flushQuote();
      buf.push(l);
    }
  }
  flushQuote();
  flushText();
  return out;
}
export interface TopicTheory {
  intro: string;
  lessons: TheoryLesson[];
}

const isItem = (l: string) => /^\s*([-*•]|\d+[.)])\s+/.test(l);
/** Lista tuż po zdaniu (bez pustej linii) też ma być listą: oddzielam ją pustymi liniami. */
function blocks(lines: string[]): string {
  const out: string[] = [];
  lines.forEach((l, i) => {
    const prev = i ? lines[i - 1] : '';
    if (l.trim() && prev.trim() && isItem(l) !== isItem(prev)) out.push('');
    out.push(l);
  });
  return out.join('\n').trim();
}

export function parseTheory(md: string): TopicTheory {
  const intro: string[] = [];
  const lessons: (TheoryLesson & { lines: string[] })[] = [];
  let ex: (TheoryExample & { taskLines: string[] }) | null = null;
  const closeEx = () => {
    if (ex) ex.task = blocks(ex.taskLines);
    ex = null;
  };
  for (const raw of md.replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (/^# /.test(line)) continue;
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      closeEx();
      lessons.push({ title: h2[1].trim(), theory: '', parts: [], examples: [], lines: [] });
      continue;
    }
    const h3 = line.match(/^### (.+)$/);
    if (h3 && lessons.length) {
      closeEx();
      const self = /^Sprawdź się/i.test(h3[1]);
      const title = h3[1].replace(/^(Przykład|Sprawdź się)\s*\d*\s*[:.–-]?\s*/i, '').trim();
      ex = { title, task: '', steps: [], answer: '', taskLines: [], ...(self ? { self: true } : {}) };
      lessons[lessons.length - 1].examples.push(ex);
      continue;
    }
    if (ex) {
      const step = line.match(/^\d+\.\s+(.*)$/);
      const ans = line.match(/^Odpowiedź:\s*(.*)$/);
      const chk = line.match(/^Wynik:\s*(.*)$/);
      if (chk) ex.check = chk[1].trim();
      else if (ans) ex.answer = ans[1];
      else if (step) ex.steps.push(step[1]);
      else if (ex.steps.length && line.trim()) ex.steps[ex.steps.length - 1] += `\n${line.trim()}`;
      else ex.taskLines.push(line);
      continue;
    }
    if (lessons.length) lessons[lessons.length - 1].lines.push(line);
    else intro.push(line);
  }
  closeEx();
  return {
    intro: blocks(intro),
    lessons: lessons.map(({ lines, examples, title }) => ({
      title,
      theory: blocks(lines.map((l) => l.replace(/^>\s?/, ''))),
      parts: theoryParts(lines),
      examples: examples.map(({ title: t, task, steps, answer, self, check }) => ({ title: t, task, steps, answer, ...(self ? { self } : {}), ...(check ? { check } : {}) })),
    })),
  };
}
