// Raport tygodniowy: zadania, czas, wynik w porównaniu z poprzednim tygodniem,
// tematy lepiej i gorzej oraz to, co plan zmieni w następnym tygodniu.

import type { ResultEvent, SessionEvent, SubjectId } from '../model';
import { addDays, weekStart, weekday } from './dates';

export interface WeeklyReport {
  week: string;
  tasks: number;
  sec: number;
  pct: number | null;
  prevPct: number | null;
  better: { subj: SubjectId; topic: string; delta: number }[];
  worse: { subj: SubjectId; topic: string; delta: number }[];
  changes: string[];
}

function inWeek(d: string, ws: string) {
  return d >= ws && d <= addDays(ws, 6);
}

function pctOf(list: ResultEvent[]): number | null {
  const m = list.reduce((a, r) => a + r.max, 0);
  return m > 0 ? Math.round((list.reduce((a, r) => a + r.pts, 0) / m) * 100) : null;
}

function byTopic(list: ResultEvent[]): Map<string, { subj: SubjectId; topic: string; pts: number; max: number; n: number }> {
  const out = new Map<string, { subj: SubjectId; topic: string; pts: number; max: number; n: number }>();
  for (const r of list) {
    for (const t of r.topics.length ? r.topics : ['inne']) {
      const k = `${r.subj}|${t}`;
      const cur = out.get(k) ?? { subj: r.subj, topic: t, pts: 0, max: 0, n: 0 };
      cur.pts += r.pts / Math.max(1, r.topics.length);
      cur.max += r.max / Math.max(1, r.topics.length);
      cur.n += 1;
      out.set(k, cur);
    }
  }
  return out;
}

export function weeklyReport(results: ResultEvent[], sessions: SessionEvent[], ws: string, topicName: (id: string) => string = (x) => x): WeeklyReport {
  const prev = addDays(ws, -7);
  const cur = results.filter((r) => inWeek(r.d, ws));
  const last = results.filter((r) => inWeek(r.d, prev));
  const ses = sessions.filter((s) => inWeek(s.d, ws));
  const sec = cur.filter((r) => !r.session).reduce((a, r) => a + r.sec, 0) + ses.reduce((a, s) => a + s.sec, 0);
  const a = byTopic(cur);
  const b = byTopic(last);
  const better: WeeklyReport['better'] = [];
  const worse: WeeklyReport['worse'] = [];
  for (const [k, v] of a) {
    const p = b.get(k);
    if (!p || v.n < 2 || p.n < 1 || v.max <= 0 || p.max <= 0) continue;
    const delta = Math.round((v.pts / v.max - p.pts / p.max) * 100);
    if (delta >= 10) better.push({ subj: v.subj, topic: v.topic, delta });
    if (delta <= -10) worse.push({ subj: v.subj, topic: v.topic, delta });
  }
  // słabe tematy tego tygodnia (poniżej 50%) też trafiają do „gorzej”, gdy brak porównania
  for (const [k, v] of a) {
    if (b.has(k) || v.n < 2 || v.max <= 0) continue;
    const p = Math.round((v.pts / v.max) * 100);
    if (p < 50) worse.push({ subj: v.subj, topic: v.topic, delta: p - 50 });
  }
  better.sort((x, y) => y.delta - x.delta);
  worse.sort((x, y) => x.delta - y.delta);
  const changes = worse.slice(0, 3).map((w) => `więcej zadań z tematu „${topicName(w.topic)}”`);
  if (better.length) changes.push(`mniej powtórek z tematu „${topicName(better[0].topic)}”`);
  return { week: ws, tasks: cur.length, sec, pct: pctOf(cur), prevPct: pctOf(last), better: better.slice(0, 5), worse: worse.slice(0, 5), changes };
}

/** Który tydzień pokazać na Starcie: w niedzielę bieżący, od poniedziałku do środy poprzedni. */
export function reportWeekFor(today: string): string | null {
  const wd = weekday(today);
  if (wd === 0) return weekStart(today);
  if (wd >= 1 && wd <= 3) return addDays(weekStart(today), -7);
  return null;
}

export function weeklyPrompt(r: WeeklyReport, names: (id: string) => string): string {
  return `[typ: tydzien]\nUczeń przygotowuje się do matury. Podsumuj jego tydzień w 3–4 krótkich zdaniach po polsku: co poszło dobrze, na co uważać, jedna konkretna rada na następny tydzień. Bez wymyślania danych.\n\nZadania: ${r.tasks}, czas nauki: ${Math.round(r.sec / 60)} min, wynik: ${r.pct ?? 'brak'}% (poprzedni tydzień: ${r.prevPct ?? 'brak'}%).\nLepiej: ${r.better.map((b) => `${names(b.topic)} (+${b.delta} p.p.)`).join(', ') || 'brak'}.\nGorzej: ${r.worse.map((w) => `${names(w.topic)} (${w.delta} p.p.)`).join(', ') || 'brak'}.`;
}
