import type { BankTask, Exam, SubjectConfig, TaskSource } from '../types';

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function blankTask(subjectId: string, source: TaskSource, topicId: string, minutes: number): BankTask {
  return {
    id: newId('z'),
    subjectId,
    source,
    url: null,
    page: null,
    ref: '',
    topicId,
    type: null,
    difficulty: null,
    minutes,
    maxPoints: null,
    status: 'nowe',
    lastSolved: null,
    result: null,
    nextReview: null,
    reviewStep: 0,
    note: '',
    imageKey: null,
    answerImageKey: null,
    answerText: null,
    text: null,
    attribution: null,
    examId: null,
    history: [],
  };
}

export const ZADANIA_INFO_ATTRIBUTION =
  'Materiał pobrany z portalu zadania.info. Licencja CC BY-SA 4.0 (treść zadania bez rozwiązania).';

/**
 * Numer zadania z adresu zadania.info. Odczytuję tylko liczby, które
 * faktycznie są w adresie podanym przez użytkownika, np. „zadania.info/d5/12345”
 * → „12345” (ostatni segment z samych cyfr albo z cyframi i podkreśleniem).
 * Adres musi należeć do domeny zadania.info.
 */
export function parseZadaniaInfoUrl(raw: string): { url: string; ref: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)zadania\.info$/.test(u.hostname)) return null;
  const segs = u.pathname.split('/').filter(Boolean);
  const last = [...segs].reverse().find((x) => /^\d+(_\d+)?$/.test(x));
  return { url: u.toString(), ref: last ? `#${last}` : u.pathname };
}

/** Linki zadania.info z wklejonego tekstu albo zapisanej strony HTML (tylko adresy obecne w tekście). */
export function extractZadaniaInfoLinks(text: string): { url: string; ref: string; title: string | null }[] {
  const out = new Map<string, { url: string; ref: string; title: string | null }>();
  const anchor = /<a\s[^>]*href\s*=\s*"([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(text))) {
    let href = m[1];
    if (href.startsWith('/')) href = `https://zadania.info${href}`;
    const p = parseZadaniaInfoUrl(href);
    if (p && !out.has(p.url)) {
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
      out.set(p.url, { ...p, title });
    }
  }
  const plain = /https?:\/\/(?:www\.)?zadania\.info\/[^\s"'<>)]+/gi;
  while ((m = plain.exec(text))) {
    const p = parseZadaniaInfoUrl(m[0]);
    if (p && !out.has(p.url)) out.set(p.url, { ...p, title: null });
  }
  return [...out.values()];
}

/**
 * Zadania CKE z exams.json jako pozycje banku. Czas wzorcowy to punkty ×
 * (czas arkusza / maksimum punktów), czyli tempo egzaminu. Istniejące
 * zadania (z wynikami) nie są nadpisywane.
 */
export function syncCkeTasks(bank: BankTask[], exams: Exam[], subjects: SubjectConfig[], defaultMinutes: number): BankTask[] {
  const have = new Set(bank.map((t) => t.id));
  const added: BankTask[] = [];
  for (const e of exams) {
    const sub = subjects.find((s) => s.family === e.family && s.level === e.level);
    if (!sub) continue;
    const pace = e.minutes && e.maxPoints ? e.minutes / e.maxPoints : null;
    for (const t of e.tasks) {
      const id = `cke:${e.id}:${t.nr}`;
      if (have.has(id) || t.topics.length === 0) continue;
      const task = blankTask(sub.id, 'CKE', t.topics[0], defaultMinutes);
      task.id = id;
      task.ref = `${e.year} zad. ${t.nr}`;
      task.url = e.urls.arkusz[0] ?? null;
      task.page = t.page;
      task.type = t.type;
      task.maxPoints = t.maxPoints;
      task.examId = e.id;
      task.minutes = pace && t.maxPoints ? Math.max(2, Math.round(pace * t.maxPoints)) : defaultMinutes;
      task.imageKey = `cke/${e.id}/${t.nr}`;
      task.answerImageKey = `cke-odp/${e.id}/${t.nr}`;
      added.push(task);
    }
  }
  return added.length ? [...bank, ...added] : bank;
}
