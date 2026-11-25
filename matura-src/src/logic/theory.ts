// Parser teorii z matematyki (data/teoria-matematyka/*.md):
//   # Dział            – pomijany (nazwa jest w taksonomii)
//   tekst              – wstęp działu
//   ## Lekcja          – teoria lekcji (akapity, listy, wzory $…$)
//   ### Przykład: tytuł – treść, potem kroki „1. …”, na końcu „Odpowiedź: …”

export interface TheoryExample {
  title: string;
  task: string;
  steps: string[];
  answer: string;
}
export interface TheoryLesson {
  title: string;
  theory: string;
  examples: TheoryExample[];
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
      lessons.push({ title: h2[1].trim(), theory: '', examples: [], lines: [] });
      continue;
    }
    const h3 = line.match(/^### (.+)$/);
    if (h3 && lessons.length) {
      closeEx();
      const title = h3[1].replace(/^Przykład\s*\d*\s*[:.–-]?\s*/i, '').trim();
      ex = { title, task: '', steps: [], answer: '', taskLines: [] };
      lessons[lessons.length - 1].examples.push(ex);
      continue;
    }
    if (ex) {
      const step = line.match(/^\d+\.\s+(.*)$/);
      const ans = line.match(/^Odpowiedź:\s*(.*)$/);
      if (ans) ex.answer = ans[1];
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
      theory: blocks(lines),
      examples: examples.map(({ title: t, task, steps, answer }) => ({ title: t, task, steps, answer })),
    })),
  };
}
