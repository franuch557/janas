// Raport tygodniowy na Starcie („Twój tydzień”) i historia w Postępie.

import { useStore } from '../store/AppStore';
import { reportWeekFor, weeklyPrompt, weeklyReport, type WeeklyReport } from '../logic/weekly';
import { addDays, fmtRange } from '../logic/dates';
import { fmtHours, zadan } from '../logic/format';
import { AiStatus, useAi, useAiCall } from '../ui/ai';
import { shortTopic } from './planParts';

export function ReportBody({ r }: { r: WeeklyReport }) {
  const diff = r.pct != null && r.prevPct != null ? r.pct - r.prevPct : null;
  return (
    <div className="stack-2">
      <p className="tnum">
        {zadan(r.tasks)}, {fmtHours(r.sec)} nauki
        {r.pct != null ? `, wynik ${r.pct}%` : ''}
        {diff != null ? ` (${diff >= 0 ? '+' : ''}${diff} p.p. wobec poprzedniego tygodnia)` : ''}
      </p>
      {r.better.length ? <p className="small">Lepiej: {r.better.map((b) => shortTopic(b.topic)).join(', ')}.</p> : null}
      {r.worse.length ? <p className="small">Gorzej: {r.worse.map((b) => shortTopic(b.topic)).join(', ')}.</p> : null}
      {r.changes.length ? <p className="small muted">W następnym tygodniu plan da {r.changes.join(', ')}.</p> : null}
    </div>
  );
}

function useSummary(week: string, r: WeeklyReport) {
  const { data, updateData } = useStore();
  const call = useAiCall();
  const ask = async () => {
    const text = await call.run(async (s, o) => (await s(weeklyPrompt(r, shortTopic), { signal: o.signal, onText: o.onText, modelTier: 'quick', cache: { gcTime: 86_400_000 } })).text);
    if (text) updateData((d) => ({ ...d, reports: { ...d.reports, [week]: { week, seen: d.reports[week]?.seen ?? false, summary: text, at: Date.now() } } }));
  };
  return { call, ask, summary: data.reports[week]?.summary ?? null };
}

export function WeeklyCard() {
  const { data, d, today, updateData } = useStore();
  const ai = useAi();
  const week = reportWeekFor(today);
  const r = week ? weeklyReport(d.active.results, d.active.sessions, week, shortTopic) : null;
  const { call, ask, summary } = useSummary(week ?? '', r ?? ({} as WeeklyReport));
  if (!week || !r || r.tasks === 0 || data.reports[week]?.seen) return null;
  return (
    <section className="card stack" aria-label="Twój tydzień">
      <div className="row-between">
        <h2>Twój tydzień</h2>
        <span className="small muted">{fmtRange(week, addDays(week, 6))}</span>
      </div>
      <ReportBody r={r} />
      {summary ? <p>{summary}</p> : null}
      {call.busy && call.text ? <p>{call.text}</p> : null}
      <AiStatus call={call} streaming />
      <div className="row">
        {ai.available && !summary ? (
          <button type="button" className="btn btn-secondary" onClick={() => void ask()} disabled={call.busy}>
            Podsumowanie od Claude’a
          </button>
        ) : null}
        <button type="button" className="btn btn-quiet" onClick={() => updateData((x) => ({ ...x, reports: { ...x.reports, [week]: { week, seen: true, summary: x.reports[week]?.summary ?? null, at: Date.now() } } }))}>
          Zamknij raport
        </button>
      </div>
    </section>
  );
}

/** Historia raportów (ostatnie tygodnie z nauką). */
export function ReportHistory() {
  const { d, data, today } = useStore();
  const weeks: string[] = [];
  const cur = reportWeekFor(today) ?? addDays(today, -7);
  for (let i = 0; i < 8; i++) weeks.push(addDays(cur.slice(0, 10), -7 * i));
  const reports = weeks
    .map((w) => ({ w, r: weeklyReport(d.active.results, d.active.sessions, w, shortTopic) }))
    .filter((x) => x.r.tasks > 0);
  if (!reports.length) return null;
  return (
    <section className="stack">
      <h2>Raporty tygodniowe</h2>
      {reports.map(({ w, r }) => (
        <details key={w} className="card">
          <summary style={{ fontWeight: 650, cursor: 'pointer', minHeight: 32 }}>{fmtRange(w, addDays(w, 6))}</summary>
          <div style={{ marginTop: 8 }} className="stack-2">
            <ReportBody r={r} />
            {data.reports[w]?.summary ? <p>{data.reports[w]!.summary}</p> : null}
          </div>
        </details>
      ))}
    </section>
  );
}
