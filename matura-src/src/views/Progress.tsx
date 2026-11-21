import { useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECTS, subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import { topicsFor } from '../data/taxonomy';
import { addDays, diffDays, fmtDayMonth, weekStart } from '../logic/dates';
import { forecast, masteryMap } from '../logic/mastery';
import { dni, fmtHours, fmtNum, plural, slow, zadan } from '../logic/format';
import { pct } from '../logic/scoring';
import { taskRef } from '../logic/planner';
import { examLabel, partName } from '../logic/cke';
import { Empty, Progress, Segmented, Tag } from '../ui/common';
import { go } from '../ui/router';
import { shortTopic } from './planParts';

interface Point {
  date: string;
  pct: number;
  big: boolean;
}

function ForecastChart({ points, subject }: { points: Point[]; subject: SubjectId }) {
  // viewBox w rzeczywistej szerokości wykresu: podpisy mają zawsze 12 px
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 220;
  const L = 36;
  const R = 16;
  const T = 12;
  const B = 28;
  if (points.length < 2) return null;
  const first = points[0].date;
  const span = Math.max(1, diffDays(points[points.length - 1].date, first));
  const x = (d: string) => L + ((W - L - R) * diffDays(d, first)) / span;
  const y = (p: number) => T + ((H - T - B) * (100 - p)) / 100;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <div className="chart" ref={box} role="img" aria-label={`Prognoza od ${fmtDayMonth(first)} do ${fmtDayMonth(last.date)}: teraz ${last.pct}%.`}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        {[0, 20, 40, 60, 80, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="var(--linia)" strokeWidth={1} />
            <text x={L - 6} y={y(g) + 4} textAnchor="end" fontSize={12} fill="var(--tekst-2)">
              {g}%
            </text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(30)} y2={y(30)} stroke="var(--tekst-2)" strokeDasharray="4 4" strokeWidth={1} />
        <path d={path} fill="none" stroke={`var(--s-${subject})`} strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.date)} cy={y(p.pct)} r={p.big ? 6 : 3.5} fill={`var(--s-${subject})`} stroke="var(--powierzchnia)" strokeWidth={1.5} />
        ))}
        <text x={x(last.date)} y={y(last.pct) - 10} textAnchor="end" fontSize={14} fontWeight={700} fill="var(--tekst)">
          {last.pct}%
        </text>
        <text x={L} y={H - 8} fontSize={12} fill="var(--tekst-2)">
          {fmtDayMonth(first)}
        </text>
        <text x={W - R} y={H - 8} fontSize={12} textAnchor="end" fill="var(--tekst-2)">
          {fmtDayMonth(last.date)}
        </text>
      </svg>
    </div>
  );
}

export function ProgressView({ subject }: { subject: SubjectId | null }) {
  const { d, data, today, setFlow } = useStore();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const busiest = [...enabled].sort((a, b) => d.active.results.filter((r) => r.subj === b.id).length - d.active.results.filter((r) => r.subj === a.id).length)[0];
  const [sel, setSel] = useState<SubjectId>(subject ?? busiest?.id ?? 'mat-p');
  const sub = subjectDef(sel)!;
  const tasksDone = d.active.results.length;
  const fc = d.forecast[sel];
  const topics = topicsFor(sub.family, sub.level);

  const points = useMemo<Point[]>(() => {
    const res = d.active.results.filter((r) => r.subj === sel);
    if (!res.length) return [];
    const ses = d.active.sessions.filter((s) => s.subj === sel);
    const dates = new Set<string>();
    const firstDay = [...res.map((r) => r.d)].sort()[0];
    for (let w = weekStart(firstDay); w <= today; w = addDays(w, 7)) dates.add(addDays(w, 6) > today ? today : addDays(w, 6));
    for (const s of ses) dates.add(s.d);
    const out: Point[] = [];
    for (const dt of [...dates].sort()) {
      const m = masteryMap(d.active.results, sel, topics.map((t) => t.id), dt);
      const diagnosed = ses.some((s) => s.mode === 'diagnoza' && s.d <= dt);
      const f = forecast(d.weights[sel], m, diagnosed);
      if (f.pct != null) out.push({ date: dt, pct: f.pct, big: ses.some((s) => s.d === dt) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, sel, today]);

  const topicRows = topics
    .map((t) => ({ t, w: d.weights[sel][t.id] ?? 0, m: d.mastery[sel][t.id] }))
    .sort((a, b) => b.w * (1.5 - (a.m?.value ?? 0.5)) - a.w * (1.5 - (b.m?.value ?? 0.5)));

  const review = [...d.records.entries()]
    .map(([id, r]) => ({ t: d.tasks.get(id), r, last: r.history[r.history.length - 1] }))
    .filter((x) => x.t && x.t.subjectId === sel && x.last.pct < 70 && !x.t.essay)
    .sort((a, b) => a.last.pct - b.last.pct);

  const history = d.active.sessions.filter((s) => s.subj === sel).sort((a, b) => b.at - a.at);
  const essays = data.essays.filter((e) => e.subjectId === sel).sort((a, b) => b.updatedAt - a.updatedAt);

  const repeat = () => {
    const list = review.slice(0, 5).map((x) => x.t!);
    if (!list.length) return;
    setFlow({ date: today, refs: list.map((t) => taskRef(t.id)) });
    go({ name: 'zadanie', id: list[0].id });
  };

  const pol = d.forecast['pol-p'].pct;
  const ang = d.forecast['ang-p'].pct;
  const matR = d.forecast['mat-r'].pct;
  const recruit = pol != null && ang != null && matR != null ? Math.round(0.5 * pol + 0.5 * ang + 2.5 * matR) : null;

  return (
    <div className="page wide">
      <h1 className="ptitle">Postęp</h1>
      {tasksDone === 0 && history.length === 0 ? (
        <Empty secondary text="Tu zobaczysz serię, liczbę zadań i czas nauki po pierwszym zadaniu." action={{ label: 'Zacznij naukę', run: () => go('#start') }} />
      ) : (
      <div className="stats">
        <div className="card stat">
          <div className="big">{d.streak}</div>
          <div className="small muted">{d.streak === 1 ? 'dzień serii' : 'dni serii'}</div>
        </div>
        <div className="card stat">
          <div className="big">{tasksDone}</div>
          <div className="small muted">{plural(tasksDone, 'zadanie z wynikiem', 'zadania z wynikiem', 'zadań z wynikiem')}</div>
        </div>
        <div className="card stat">
          <div className="big">{d.studySec >= 3600 ? fmtHours(d.studySec).replace(' h', '') : Math.round(d.studySec / 60)}</div>
          <div className="small muted">{d.studySec >= 3600 ? 'h nauki' : 'min nauki'}</div>
        </div>
      </div>
      )}
      <Segmented label="Przedmiot" options={enabled.map((s) => s.id)} value={sel} onChange={(v) => setSel(v)} render={(v) => subjectDef(v)!.short} />
      <div className="two-col">
        <div className="stack">
          <section className="card stack" aria-label="Prognoza">
            <div className="row-between">
              <h2>Prognoza</h2>
              {fc.pct != null ? <span className="big" style={{ fontSize: '2rem', lineHeight: '2.25rem' }}>{fc.pct}%</span> : null}
            </div>
            {fc.pct != null ? (
              points.length >= 2 ? (
                <ForecastChart points={points} subject={sel} />
              ) : (
                <p className="muted small">Wykres pojawi się po kolejnym tygodniu nauki.</p>
              )
            ) : (
              <div className="stack-2">
                <p>Zrób diagnozę, żeby zobaczyć prognozę.</p>
                {d.diagnosis[sel].enough ? (
                  <div>
                    <button type="button" className="btn btn-primary" onClick={() => go({ name: 'diagnoza', subject: sel })}>
                      Zacznij diagnozę
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
          <section className="stack">
            <h2>Tematy</h2>
            <div className="card flush list">
              {topicRows.map(({ t, m }) => (
                <button type="button" className="li" key={t.id} onClick={() => go({ name: 'zadania', subject: sel, topic: t.id })}>
                  <div className="grow stack-2" style={{ gap: 4 }}>
                    <div className="row-between">
                      <span style={{ fontWeight: 600 }}>{shortTopic(t.id)}</span>
                      <span className="small tnum" style={{ whiteSpace: 'nowrap' }}>{m?.value != null ? `${Math.round(m.value * 100)}%` : 'nie badano'}</span>
                    </div>
                    {m?.value != null ? (
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <div className="grow">
                          <Progress value={Math.round(m.value * 100)} color={`var(--s-${sel})`} />
                        </div>
                        {m.value < 0.5 ? <Tag tone="warn">słabe</Tag> : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
        <div className="stack">
          <section className="stack">
            <div className="row-between">
              <h2>Do powtórki</h2>
              <span className="muted">{zadan(review.length)}</span>
            </div>
            {review.length ? (
              <>
                <div className="card flush list">
                  {review.slice(0, 12).map(({ t, last }) => (
                    <button type="button" className="li" key={t!.id} onClick={() => go({ name: 'zadanie', id: t!.id })}>
                      <span className="grow">
                        <span style={{ fontWeight: 600 }}>{t!.label}</span>
                        <br />
                        <span className="small muted">{last.note ? `Notatka: ${last.note}` : shortTopic(t!.topics[0])}</span>
                      </span>
                      <Tag tone="warn">
                        {last.pts} z {last.max} pkt
                      </Tag>
                    </button>
                  ))}
                </div>
                <div>
                  <button type="button" className="btn btn-primary btn-phone-block" onClick={repeat}>
                    Powtórz błędy
                  </button>
                </div>
              </>
            ) : (
              <Empty secondary text="Zadania z błędami pojawią się tutaj." action={{ label: 'Ćwicz zadania', run: () => go({ name: 'zadania', subject: sel, topic: null }) }} />
            )}
          </section>
          <section className="stack">
            <h2>Historia</h2>
            <div className="card flush list">
              {history.map((s) => {
                const e = s.exam ? d.examById.get(s.exam) : undefined;
                const name = s.mode === 'diagnoza' ? 'Diagnoza' : `Arkusz ${e ? examLabel(e) : ''}${e && s.part ? `, ${partName(e, s.part)?.toLowerCase()}` : ''}`;
                return (
                  <button type="button" className="li" key={s.id} onClick={() => go(s.mode === 'diagnoza' ? { name: 'diagnoza', subject: s.subj } : { name: 'arkusz', examId: s.exam!, partId: s.part })}>
                    <span className="grow">
                      <span style={{ fontWeight: 600 }}>{name}</span>
                      <br />
                      <span className="small muted">
                        {fmtDayMonth(s.d)}, ocenione {s.graded} z {s.total}
                      </span>
                    </span>
                    <span className="tnum" style={{ fontWeight: 650 }}>
                      {fmtNum(s.pts)} z {s.max}, {pct(s.pts, s.max)}%
                    </span>
                  </button>
                );
              })}
              {essays.map((e) => (
                <div className="li static" key={e.id}>
                  <span className="grow">
                    <span style={{ fontWeight: 600 }}>{sel === 'pol-p' ? 'Wypracowanie' : 'Wypowiedź pisemna'}</span>
                    <br />
                    <span className="small muted">
                      {fmtDayMonth(e.date)}, {slow(e.words)}
                    </span>
                  </span>
                  <span className="tnum" style={{ fontWeight: 650 }}>
                    {fmtNum(e.points)} z {e.max} pkt
                  </span>
                </div>
              ))}
              {history.length + essays.length === 0 ? (
                <div className="li static">
                  <span className="muted">Tu pojawią się arkusze, diagnozy i wypracowania.</span>
                </div>
              ) : null}
            </div>
            {d.diagnosed.has(sel) ? (
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'diagnoza', subject: sel })}>
                  Powtórz diagnozę
                </button>
              </div>
            ) : null}
          </section>
          <section className="card stack-2">
            <h3>Cel: Politechnika Poznańska, Automatyka i Robotyka</h3>
            {recruit != null ? (
              <p>
                Szacunek z prognozy: ok. <b className="tnum">{recruit}</b> pkt z 350 możliwych bez przedmiotu dodatkowego. To tylko przybliżenie z twoich wyników.
              </p>
            ) : (
              <p className="muted">Szacunek punktów pojawi się, gdy będzie prognoza z polskiego, angielskiego i matematyki rozszerzonej.</p>
            )}
            <p className="small muted">Do egzaminu z {sub.genitive}: {dni(Math.max(0, diffDays(sub.examDate, today)))}.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
