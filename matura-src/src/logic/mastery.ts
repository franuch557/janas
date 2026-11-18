import type { BankTask, DiagnosisItem, DiagnosisResult, ErrorEntry, MockResult, Exam } from '../types';
import { diffDays } from './dates';

/** Wynik diagnozy na temat (procent punktów). Pomija zadania bez wpisanych punktów. */
export function scoreDiagnosis(items: DiagnosisItem[]): Record<string, number> {
  const acc: Record<string, { p: number; m: number }> = {};
  for (const it of items) {
    if (it.points == null || it.maxPoints <= 0) continue;
    const a = (acc[it.topicId] ??= { p: 0, m: 0 });
    a.p += Math.min(it.points, it.maxPoints);
    a.m += it.maxPoints;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(acc)) out[k] = Math.round((v.p / v.m) * 100);
  return out;
}

/** Samoocena 1–5 przeliczona na skalę 0..1. */
export function selfToMastery(level: number): number {
  return (Math.max(1, Math.min(5, level)) - 1) / 4;
}

/** Najnowsza diagnoza przedmiotu (test albo samoocena). */
export function latestDiagnosis(diagnoses: DiagnosisResult[], subjectId: string): DiagnosisResult | null {
  const mine = diagnoses.filter((d) => d.subjectId === subjectId);
  if (!mine.length) return null;
  return [...mine].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)))[0];
}

export interface Observation {
  date: string;
  pct: number;
  source: 'zadanie' | 'arkusz' | 'diagnoza' | 'samoocena';
}

/** Wszystkie wyniki tematu w kolejności dat. */
export function observations(
  subjectId: string,
  topicId: string,
  bank: BankTask[],
  mocks: MockResult[],
  exams: Exam[],
  diagnoses: DiagnosisResult[],
): Observation[] {
  const obs: Observation[] = [];
  for (const t of bank) {
    if (t.subjectId !== subjectId || t.topicId !== topicId) continue;
    for (const h of t.history) obs.push({ date: h.date, pct: h.result, source: 'zadanie' });
  }
  for (const m of mocks) {
    if (m.subjectId !== subjectId || !m.examId) continue;
    const exam = exams.find((e) => e.id === m.examId);
    if (!exam) continue;
    let p = 0;
    let max = 0;
    for (const t of exam.tasks) {
      if (!t.topics.includes(topicId) || t.maxPoints == null) continue;
      const got = m.points[t.nr];
      if (got == null) continue;
      p += got;
      max += t.maxPoints;
    }
    if (max > 0) obs.push({ date: m.date, pct: Math.round((p / max) * 100), source: 'arkusz' });
  }
  for (const d of diagnoses) {
    if (d.subjectId !== subjectId || d.perTopic[topicId] == null) continue;
    const v = d.perTopic[topicId];
    obs.push({ date: d.date, pct: d.kind === 'test' ? v : Math.round(selfToMastery(v) * 100), source: d.kind === 'test' ? 'diagnoza' : 'samoocena' });
  }
  return obs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * Biegłość tematu 0..1: średnia trzech ostatnich wyników. Gdy jedynym
 * wynikiem jest samoocena, jest ona używana; null, gdy brak danych.
 */
export function topicMastery(obs: Observation[]): number | null {
  if (!obs.length) return null;
  const real = obs.filter((o) => o.source !== 'samoocena');
  const use = (real.length ? real : obs).slice(-3);
  return use.reduce((s, o) => s + o.pct, 0) / use.length / 100;
}

/** Czy wynik tematu spadł: średnia 3 ostatnich niższa o ≥10 p.p. od 3 wcześniejszych. */
export function resultDropped(obs: Observation[]): boolean {
  const real = obs.filter((o) => o.source !== 'samoocena');
  if (real.length < 4) return false;
  const last = real.slice(-3);
  const prev = real.slice(-6, -3);
  const avg = (a: Observation[]) => a.reduce((s, o) => s + o.pct, 0) / a.length;
  return avg(prev) - avg(last) >= 10;
}

/**
 * Wzrost priorytetu za powtarzające się błędy koncepcyjne w temacie z 30 dni:
 * od drugiego błędu +0,2 za każdy, najwyżej +0,6.
 */
export function errorBoost(errors: ErrorEntry[], subjectId: string, topicId: string, date: string): number {
  const n = errors.filter(
    (e) =>
      e.subjectId === subjectId &&
      e.topicId === topicId &&
      e.type === 'koncepcyjny' &&
      diffDays(date, e.date) >= 0 &&
      diffDays(date, e.date) <= 30,
  ).length;
  if (n < 2) return 0;
  return Math.min(0.6, 0.2 * (n - 1));
}

export interface Forecast {
  pct: number;
  low: number;
  high: number;
  basis: number; // liczba wyników użytych do prognozy
  coverage: number; // 0..1 – część wagi tematów, dla których są dane
}

/**
 * Prognoza wyniku: suma (waga tematu × biegłość). Tematy bez danych liczę
 * jako 50% z pełną niepewnością. Zakres: ±1,96 × błąd standardowy, gdzie
 * efektywna liczba obserwacji to liczba wyników, a tematy bez danych
 * poszerzają zakres proporcjonalnie do swojej wagi.
 */
export function forecast(weights: Record<string, number>, mastery: Record<string, number | null>, nObs: number): Forecast {
  let pct = 0;
  let coverage = 0;
  for (const [topic, w] of Object.entries(weights)) {
    const m = mastery[topic];
    if (m == null) pct += w * 0.5;
    else {
      pct += w * m;
      coverage += w;
    }
  }
  const p = Math.min(0.99, Math.max(0.01, pct));
  const se = Math.sqrt((p * (1 - p)) / Math.max(1, nObs));
  const half = Math.min(0.5, 1.96 * se + (1 - coverage) * 0.25);
  return {
    pct: Math.round(pct * 100),
    low: Math.max(0, Math.round((pct - half) * 100)),
    high: Math.min(100, Math.round((pct + half) * 100)),
    basis: nObs,
    coverage,
  };
}
