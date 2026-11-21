// Sprawdzanie odpowiedzi zamkniętych, wynik arkusza i licznik słów.

import type { ClosedAnswer, CkeTask } from './cke';
import type { SessionAnswer } from '../model';

export interface ClosedCheck {
  points: number;
  correctCount: number;
  itemCount: number;
  /** Pozycja → czy poprawna. */
  perItem: Record<string, boolean>;
  allAnswered: boolean;
}

/**
 * Punkty za zadanie zamknięte według `answer.scoring`:
 * 'each' – punkt za każdą poprawną pozycję (najwyżej maxPoints),
 * 'all' – maxPoints tylko, gdy wszystkie pozycje są poprawne,
 * mapa – liczba poprawnych pozycji → punkty (brak klucza = 0).
 */
export function scoreClosed(answer: ClosedAnswer, choice: Record<string, string> | undefined, maxPoints: number): ClosedCheck {
  const perItem: Record<string, boolean> = {};
  let correctCount = 0;
  let answered = 0;
  if (answer.unordered) {
    // zbiór odpowiedzi bez kolejności (np. „wybierz dwie odpowiedzi”)
    const left = answer.items.map((i) => i.correct);
    for (const it of answer.items) {
      const c = choice?.[it.id];
      if (c != null) answered++;
      const k = c != null ? left.indexOf(c) : -1;
      perItem[it.id] = k >= 0;
      if (k >= 0) {
        left.splice(k, 1);
        correctCount++;
      }
    }
  } else for (const it of answer.items) {
    const c = choice?.[it.id];
    if (c != null) answered++;
    const ok = c != null && it.correct != null && c === it.correct;
    perItem[it.id] = ok;
    if (ok) correctCount++;
  }
  const n = answer.items.length;
  let points = 0;
  const s = answer.scoring;
  if (s === 'each') points = correctCount;
  else if (s === 'all') points = correctCount === n ? maxPoints : 0;
  else points = s[String(correctCount)] ?? 0;
  points = Math.max(0, Math.min(maxPoints, points));
  return { points, correctCount, itemCount: n, perItem, allAnswered: answered === n };
}

/**
 * Liczba słów jak w zasadach CKE: wyrazy rozdzielone odstępem; liczba
 * zapisana cyframi to jedno słowo; znak interpunkcyjny ani myślnik
 * otoczony spacjami nie są słowem; wyraz z łącznikiem liczy się raz.
 */
export function countWords(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  return tokens.filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}

export interface TaskScore {
  pts: number;
  max: number;
  graded: boolean;
  counted: boolean;
}

export interface ExamScore {
  pts: number;
  /** Suma maksimów ocenionych zadań. */
  max: number;
  /** Suma maksimów wszystkich liczonych zadań. */
  totalMax: number;
  graded: number;
  total: number;
  closedPts: number;
  closedMax: number;
  perTopic: Record<string, [number, number]>;
  perTask: Record<string, TaskScore>;
}

function answered(a: SessionAnswer | undefined): boolean {
  if (!a) return false;
  return (a.choice && Object.keys(a.choice).length > 0) || !!a.paper || (a.text ?? '').trim().length > 0 || a.self != null;
}

/**
 * Wynik arkusza z odpowiedzi sesji. Zamknięte z kluczem są ocenione zawsze
 * (brak odpowiedzi = 0 pkt), otwarte dopiero po samoocenie. Z zadań do wyboru
 * (ten sam klucz `alternative`) liczy się jedno: to, które rozwiązano.
 */
export function scoreExam(tasks: CkeTask[], answers: Record<string, SessionAnswer>): ExamScore {
  const chosenAlt = new Map<string, string>();
  for (const t of tasks) {
    if (!t.alternative) continue;
    if (!chosenAlt.has(t.alternative)) chosenAlt.set(t.alternative, t.id);
    if (answered(answers[t.id]) && !answered(answers[chosenAlt.get(t.alternative)!])) chosenAlt.set(t.alternative, t.id);
  }
  const r: ExamScore = { pts: 0, max: 0, totalMax: 0, graded: 0, total: 0, closedPts: 0, closedMax: 0, perTopic: {}, perTask: {} };
  for (const t of tasks) {
    const counted = !t.alternative || chosenAlt.get(t.alternative) === t.id;
    const a = answers[t.id];
    let pts = 0;
    let graded = false;
    if (t.auto && t.answer) {
      pts = scoreClosed(t.answer, a?.choice, t.maxPoints).points;
      graded = true;
    } else if (a?.self != null) {
      pts = Math.max(0, Math.min(t.maxPoints, a.self));
      graded = true;
    }
    r.perTask[t.id] = { pts, max: t.maxPoints, graded, counted };
    if (!counted) continue;
    r.total++;
    r.totalMax += t.maxPoints;
    if (!graded) continue;
    r.graded++;
    r.pts += pts;
    r.max += t.maxPoints;
    if (t.auto) {
      r.closedPts += pts;
      r.closedMax += t.maxPoints;
    }
    const topics = t.topics.length ? t.topics : ['bez-tematu'];
    for (const topic of topics) {
      const acc = (r.perTopic[topic] ??= [0, 0]);
      acc[0] += pts / topics.length;
      acc[1] += t.maxPoints / topics.length;
    }
  }
  return r;
}

/** Wynik całego arkusza z kilku części (polski: arkusz 1 i 2). */
export function combineScores(parts: ExamScore[]): ExamScore {
  const r: ExamScore = { pts: 0, max: 0, totalMax: 0, graded: 0, total: 0, closedPts: 0, closedMax: 0, perTopic: {}, perTask: {} };
  for (const p of parts) {
    r.pts += p.pts;
    r.max += p.max;
    r.totalMax += p.totalMax;
    r.graded += p.graded;
    r.total += p.total;
    r.closedPts += p.closedPts;
    r.closedMax += p.closedMax;
    Object.assign(r.perTask, p.perTask);
    for (const [k, [a, b]] of Object.entries(p.perTopic)) {
      const acc = (r.perTopic[k] ??= [0, 0]);
      acc[0] += a;
      acc[1] += b;
    }
  }
  return r;
}

export function pct(pts: number, max: number): number {
  return max > 0 ? Math.round((pts / max) * 100) : 0;
}
