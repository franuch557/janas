import type { Topic, WeightMode } from '../types';

/** Minimum danych arkusza potrzebne do wag (pasuje do Exam i CkeExam). */
export interface WeightExam {
  id: string;
  year: number;
  tasks: { nr: string; maxPoints: number | null; topics: string[]; type: string | null; alternative?: string | null }[];
  groups?: { tasks: string[]; points: number; topics: string[] }[];
}

export interface TopicStat {
  topicId: string;
  points: number;
  share: number; // 0–1
  examCount: number;
  /** Średnia punktów na arkusz w dwóch ostatnich latach zakresu. */
  recentAvg: number;
  /** Średnia punktów na arkusz w pozostałych latach zakresu (null, gdy brak takich lat). */
  restAvg: number | null;
  /** recentAvg / restAvg; null, gdy nie da się policzyć. */
  trend: number | null;
  avgByType: { zamknięte: number | null; otwarte: number | null; nieznany: number | null };
}

interface Contribution {
  examId: string;
  year: number;
  topicId: string;
  points: number;
  type: 'zamknięte' | 'otwarte' | 'nieznany';
  isTask: boolean;
}

function contributions(exams: WeightExam[]): Contribution[] {
  const out: Contribution[] = [];
  for (const e of exams) {
    const groups = e.groups ?? [];
    const grouped = new Set(groups.flatMap((g) => g.tasks));
    // zadania do wyboru (ten sam klucz alternative) liczą się razem jak jedno
    const altSize = new Map<string, number>();
    for (const t of e.tasks) if (t.alternative) altSize.set(t.alternative, (altSize.get(t.alternative) ?? 0) + 1);
    for (const g of groups) {
      if (g.topics.length === 0) continue;
      const each = g.points / g.topics.length;
      for (const topicId of g.topics) out.push({ examId: e.id, year: e.year, topicId, points: each, type: 'nieznany', isTask: false });
    }
    for (const t of e.tasks) {
      if (grouped.has(t.nr) || t.maxPoints == null || t.topics.length === 0) continue;
      const each = t.maxPoints / t.topics.length / (t.alternative ? altSize.get(t.alternative) ?? 1 : 1);
      const type: Contribution['type'] = t.type === 'zamknięte' || t.type === 'otwarte' ? t.type : 'nieznany';
      for (const topicId of t.topics) out.push({ examId: e.id, year: e.year, topicId, points: each, type, isTask: true });
    }
  }
  return out;
}

/** Statystyki tematów z arkuszy w zakresie. Punkty zadania z kilkoma tematami dzielę po równo. */
export function topicStats(allExams: WeightExam[], topics: Topic[]): TopicStat[] {
  // arkusze bez listy zadań i grup nie wchodzą do średnich ani do trendu
  const exams = allExams.filter((e) => e.tasks.length > 0 || (e.groups ?? []).length > 0);
  const contrib = contributions(exams);
  const total = contrib.reduce((s, c) => s + c.points, 0);
  const years = [...new Set(exams.map((e) => e.year))].sort((a, b) => a - b);
  const recentYears = new Set(years.slice(-2));
  const restYears = years.filter((y) => !recentYears.has(y));
  const examsPerYear = (ys: Iterable<number>) => {
    const set = new Set(ys);
    return exams.filter((e) => set.has(e.year)).length;
  };
  const nRecent = examsPerYear(recentYears);
  const nRest = examsPerYear(restYears);

  return topics.map((topic) => {
    const mine = contrib.filter((c) => c.topicId === topic.id);
    const points = mine.reduce((s, c) => s + c.points, 0);
    const recentPts = mine.filter((c) => recentYears.has(c.year)).reduce((s, c) => s + c.points, 0);
    const restPts = mine.filter((c) => !recentYears.has(c.year)).reduce((s, c) => s + c.points, 0);
    const recentAvg = nRecent > 0 ? recentPts / nRecent : 0;
    const restAvg = nRest > 0 ? restPts / nRest : null;
    let trend: number | null = null;
    if (restAvg != null) {
      if (restAvg > 0) trend = recentAvg / restAvg;
      else if (recentAvg > 0) trend = 2; // temat nowy w ostatnich latach
      else trend = 1;
    }
    const avgType = (type: Contribution['type']) => {
      const tasks = mine.filter((c) => c.isTask && c.type === type);
      return tasks.length ? tasks.reduce((s, c) => s + c.points, 0) / tasks.length : null;
    };
    return {
      topicId: topic.id,
      points: round2(points),
      share: total > 0 ? points / total : 0,
      examCount: new Set(mine.map((c) => c.examId)).size,
      recentAvg: round2(recentAvg),
      restAvg: restAvg == null ? null : round2(restAvg),
      trend: trend == null ? null : round2(trend),
      avgByType: { zamknięte: avgType('zamknięte'), otwarte: avgType('otwarte'), nieznany: avgType('nieznany') },
    };
  });
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * Wagi tematów (sumują się do 1). Bez danych z arkuszy wszystkie tematy
 * dostają równą wagę. Temat bez punktów w zakresie dostaje połowę najmniejszej
 * niezerowej wagi, żeby nie zniknął z planu.
 */
export function computeWeights(stats: TopicStat[], mode: WeightMode): Record<string, number> {
  const raw: Record<string, number> = {};
  const anyData = stats.some((s) => s.points > 0);
  for (const s of stats) {
    if (!anyData) {
      raw[s.topicId] = 1;
      continue;
    }
    const tf = s.trend == null ? 1 : clamp(s.trend, 0.5, 2);
    const factor = mode === 'bazowo' ? 1 : mode === 'trend' ? Math.sqrt(tf) : tf;
    raw[s.topicId] = s.share * factor;
  }
  const positive = Object.values(raw).filter((v) => v > 0);
  const floor = positive.length ? Math.min(...positive) / 2 : 1;
  for (const k of Object.keys(raw)) if (raw[k] <= 0) raw[k] = floor;
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  for (const k of Object.keys(raw)) out[k] = raw[k] / sum;
  return out;
}

/**
 * Priorytet tematu w planie: waga × modyfikator biegłości × modyfikator błędów.
 * Biegłość 0..1 (null = nieznana, modyfikator 1). Słaby wynik podnosi priorytet:
 * biegłość 0 → ×1,5; biegłość 1 → ×0,5. Ręczna waga zastępuje wyliczoną wagę
 * (wartość z zakresu 0..1 tak jak wagi wyliczone).
 */
export function topicPriority(
  weight: number,
  mastery: number | null,
  errorBoost: number,
  manual: number | undefined,
): number {
  const w = manual != null ? manual : weight;
  const m = mastery == null ? 1 : 1.5 - mastery;
  return w * m * (1 + errorBoost);
}
