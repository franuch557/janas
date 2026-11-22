// Biegłość tematów i prognoza wyniku ze zdarzeń wyników.

import type { ResultEvent, SessionEvent, SubjectId } from '../model';
import { diffDays } from './dates';

export interface TopicMastery {
  /** 0..1 albo null, gdy brak wyników. */
  value: number | null;
  results: number;
}

/**
 * Biegłość tematu: punkty z sześciu ostatnich wyników z tematu podzielone
 * przez ich maksimum (zadanie za 3 pkt waży więcej niż za 1 pkt).
 */
export function topicMastery(results: ResultEvent[], subjectId: SubjectId, topicId: string, until?: string): TopicMastery {
  const mine = results.filter((r) => r.subj === subjectId && r.topics.includes(topicId) && r.max > 0 && (!until || r.d <= until));
  if (!mine.length) return { value: null, results: 0 };
  const last = [...mine].sort((a, b) => a.at - b.at).slice(-6);
  // wynik z podpowiedziami liczy się słabiej: każda podpowiedź −20% (najwyżej −60%)
  const p = last.reduce((s, r) => s + ((r.pts / r.topics.length) * (1 - 0.2 * Math.min(3, r.hints ?? 0))), 0);
  const m = last.reduce((s, r) => s + r.max / r.topics.length, 0);
  return { value: m > 0 ? p / m : null, results: mine.length };
}

export function masteryMap(results: ResultEvent[], subjectId: SubjectId, topicIds: string[], until?: string): Record<string, TopicMastery> {
  const out: Record<string, TopicMastery> = {};
  for (const t of topicIds) out[t] = topicMastery(results, subjectId, t, until);
  return out;
}

/**
 * Premia priorytetu za powtarzające się słabe wyniki w temacie z 30 dni:
 * od drugiego wyniku poniżej 50% +0,2 za każdy, najwyżej +0,6.
 */
export function weakBoost(results: ResultEvent[], subjectId: SubjectId, topicId: string, date: string): number {
  const n = results.filter(
    (r) => r.subj === subjectId && r.topics.includes(topicId) && r.max > 0 && r.pts / r.max < 0.5 && diffDays(date, r.d) >= 0 && diffDays(date, r.d) <= 30,
  ).length;
  if (n < 2) return 0;
  return Math.min(0.6, 0.2 * (n - 1));
}

export interface Forecast {
  /** Prognoza w procentach albo null, gdy za mało danych. */
  pct: number | null;
  coverage: number;
  results: number;
  /** Czego brakuje do prognozy. */
  missing: 'diagnoza' | null;
}

export const FORECAST_MIN_RESULTS = 8;
export const FORECAST_MIN_COVERAGE = 0.4;

/**
 * Prognoza przedmiotu: średnia biegłości tematów ważona udziałem tematów
 * w arkuszach, liczona tylko z tematów z wynikami. Pokazywana dopiero po
 * diagnozie albo przy co najmniej 8 wynikach z tematów o łącznej wadze 40%.
 */
export function forecast(weights: Record<string, number>, mastery: Record<string, TopicMastery>, diagnosed: boolean): Forecast {
  let sum = 0;
  let coverage = 0;
  let results = 0;
  for (const [topic, w] of Object.entries(weights)) {
    const m = mastery[topic];
    if (!m || m.value == null) continue;
    sum += w * m.value;
    coverage += w;
    results += m.results;
  }
  const enough = coverage > 0 && (diagnosed || (results >= FORECAST_MIN_RESULTS && coverage >= FORECAST_MIN_COVERAGE));
  return { pct: enough ? Math.round((sum / coverage) * 100) : null, coverage, results, missing: enough ? null : 'diagnoza' };
}

export function isDiagnosed(sessions: SessionEvent[], subjectId: SubjectId): boolean {
  return sessions.some((s) => s.mode === 'diagnoza' && s.subj === subjectId);
}
