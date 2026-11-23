import { useMemo, useState } from 'react';
import { SUBJECTS, type PlanItem } from '../model';
import { useStore } from '../store/AppStore';
import { addDays, diffDays, fmtDayMonth, weekStart } from '../logic/dates';
import { dni, zadan } from '../logic/format';
import { Banner, Empty, Progress } from '../ui/common';
import { go } from '../ui/router';
import { useReminderDue } from './reminder';
import { AddSheet, flowFor, openItem, PlanCard, SwapSheet } from './planParts';
import { WeeklyCard } from './Weekly';
import { DailyGoalCard } from './startParts';

export function SyncBanner() {
  const { sync, retrySync, storageFull, cloud } = useStore();
  if (storageFull) {
    return (
      <Banner tone="bad">
        {cloud ? 'Pamięć przeglądarki jest pełna. Wyniki zapisują się tylko w chmurze.' : 'Pamięć przeglądarki jest pełna. Nowe wyniki mogą nie zostać zapisane na tym urządzeniu.'}
      </Banner>
    );
  }
  if (sync.state === 'lokalnie' && sync.message) return <Banner tone="warn" icon="chmuraBlad">{sync.message}</Banner>;
  if (sync.state !== 'blad' && sync.state !== 'offline') return null;
  return (
    <Banner tone={sync.state === 'blad' ? 'bad' : 'warn'} icon="chmuraBlad" action={{ label: 'Spróbuj ponownie', run: retrySync }}>
      {sync.message ?? 'Nie udało się zapisać na serwerze. Wyniki są na tym urządzeniu.'}
    </Banner>
  );
}

export function PacksBanner() {
  const { d, retryPacks } = useStore();
  if (!d.packsError) return null;
  return (
    <Banner tone="bad" action={{ label: 'Spróbuj ponownie', run: retryPacks }}>
      Nie udało się wczytać zadań z arkuszy CKE.
    </Banner>
  );
}

function Tape() {
  const { d, data, today } = useStore();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const last = enabled.map((s) => s.examDate).sort().slice(-1)[0] ?? today;
  const first = [data.stan.startedAt, ...d.days].sort()[0] ?? today;
  const from = weekStart(first < today ? first : today);
  const weeks = useMemo(() => {
    const out: string[][] = [];
    for (let w = from; w <= last; w = addDays(w, 7)) out.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
    return out;
  }, [from, last]);
  const examOn = new Map(enabled.map((s) => [s.examDate, s]));
  const [info, setInfo] = useState(false);
  const firstExam = enabled.map((s) => s.examDate).filter((x) => x >= today).sort()[0];
  const studied = [...d.days].filter((x) => x <= today).length;
  const text = `Uczysz się ${dni(d.streak)} z rzędu, razem ${dni(studied)} z nauką.${firstExam ? ` Do pierwszego egzaminu ${dni(diffDays(firstExam, today))}.` : ''}`;
  return (
    <div className="stack-2">
      <button type="button" className="tape-btn" onClick={() => setInfo((x) => !x)} aria-expanded={info} aria-label={text}>
        <span className="tape-grid" style={{ ['--weeks' as string]: weeks.length }} aria-hidden="true">
          {weeks.flatMap((w) =>
            w.map((day) => {
              const ex = examOn.get(day);
              const on = d.days.has(day);
              return (
                <span
                  key={day}
                  className={`tc${on ? ' on' : ''}${day === today ? ' today' : ''}${day === today && on ? ' fill' : ''}${ex ? ' exam' : ''}${day > last ? ' after' : ''}`}
                  style={ex ? { ['--sc' as string]: `var(--s-${ex.id})` } : undefined}
                />
              );
            }),
          )}
        </span>
      </button>
      {info ? <span className="tape-label">{text}</span> : null}
    </div>
  );
}

function Summary({ diagInPlan }: { diagInPlan: boolean }) {
  const { d, data, today } = useStore();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const upcoming = enabled.filter((s) => s.examDate >= today).sort((a, b) => a.examDate.localeCompare(b.examDate));
  const next = upcoming[0];
  const withFc = enabled.filter((s) => d.forecast[s.id].pct != null);
  const toDiag = enabled.find((s) => !d.diagnosed.has(s.id) && d.diagnosis[s.id].enough);
  const rest = upcoming.slice(1).map((s) => Number(s.examDate.slice(8)));
  const restText = rest.length ? `; potem ${rest.length > 1 ? `${rest.slice(0, -1).join(', ')} i ${rest[rest.length - 1]}` : rest[0]} maja` : '';
  const left = next ? dni(diffDays(next.examDate, today)) : '';
  const cut = left.indexOf(' ');
  return (
    <section className="card summary" aria-label="Podsumowanie">
      <div className="sum-main">
      {next ? (
        <div className="countdown">
          <div className="big">
            <span className="n">{left.slice(0, cut)}</span> <span className="u">{left.slice(cut + 1)}</span>
          </div>
          <div className="muted">
            do pierwszego egzaminu, {next.name.toLowerCase()} {fmtDayMonth(next.examDate)}
            {restText}
          </div>
        </div>
      ) : (
        <h2>Egzaminy za tobą</h2>
      )}
      <Tape />
      <span className="streak-line">{d.streak > 0 ? `Seria: ${dni(d.streak)}` : 'Zacznij serię dziś'}</span>
      </div>
      <div className="sum-fc">
      <h3>Prognoza</h3>
      {withFc.length ? (
        <div className="stack-2">
          {withFc.map((s) => {
            const f = d.forecast[s.id];
            return (
              <button key={s.id} type="button" className="fc-row" onClick={() => go({ name: 'postep', subject: s.id })} aria-label={`${s.name}: ${f.pct}%`}>
                <span className="small" style={{ fontWeight: 600 }}>
                  {s.short}
                </span>
                <Progress value={f.pct!} color={`var(--s-${s.id})`} />
                <span className="v">{f.pct}%</span>
              </button>
            );
          })}
          {withFc.length < enabled.length ? <p className="small muted">Pozostałe przedmioty: prognoza po diagnozie.</p> : null}
          <div>
            <button type="button" className="btn btn-quiet" onClick={() => go('#postep')}>
              Zobacz postęp
            </button>
          </div>
        </div>
      ) : (
        <div className="stack-2">
          <p>Zrób diagnozę, żeby zobaczyć prognozę.</p>
          {toDiag && !diagInPlan ? (
            <div>
              <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'diagnoza', subject: toDiag.id })}>
                Zacznij diagnozę
              </button>
            </div>
          ) : null}
        </div>
      )}
      </div>
    </section>
  );
}

export function StartView() {
  const { d, today, setFlow } = useStore();
  const reminder = useReminderDue();
  const [swap, setSwap] = useState<PlanItem | null>(null);
  const [adding, setAdding] = useState(false);
  const day = d.todayPlan;
  const items = day?.items ?? [];
  const work = items.filter((i) => i.kind !== 'korepetycje');
  const doneCount = work.filter((i) => d.doneOf(today, i)).length;
  const minutes = work.reduce((a, i) => a + i.minutes, 0);
  const firstOpen = work.find((i) => !d.doneOf(today, i) && i.kind !== 'przegląd');
  const planned = new Set(items.map((i) => i.taskId).filter(Boolean));
  const extra = d.active.results.filter((r) => r.d === today && !planned.has(r.task) && !r.session);
  const skipped = d.plan.skipped.filter(() => !d.packsLoading);

  const start = () => {
    if (!firstOpen) return;
    setFlow(flowFor(today, items));
    openItem(firstOpen, d);
  };

  return (
    <div className="page wide" style={{ maxWidth: 1180 }}>
      <h1 className="sr-only">Start</h1>
      <div className="stack empty-collapse">
        <SyncBanner />
        <PacksBanner />
        {reminder ? (
          <Banner tone="warn" icon="dzwonek" action={firstOpen ? { label: 'Zacznij naukę', run: start } : undefined}>
            Dziś jeszcze nic. 15 minut wystarczy, żeby utrzymać serię.
          </Banner>
        ) : null}
      </div>
      <Summary diagInPlan={items.some((i) => i.kind === 'diagnoza')} />
      <div className="start-grid">
        <section className="stack start-today" aria-labelledby="na-dzis">
          <div className="row-between">
            <h2 id="na-dzis">Na dziś</h2>
            {work.length ? (
              <span className="muted tnum">
                {doneCount} z {work.length}, {minutes} min
              </span>
            ) : null}
          </div>
          {day?.notes.map((n) => (
            <Banner tone="info" key={n}>
              {n}
            </Banner>
          ))}
          {skipped.map((s) => (
            <Banner tone="info" key={s}>
              {SUBJECTS.find((x) => x.id === s)!.name}: brak zadań, plan go pomija.
            </Banner>
          ))}
          {d.packsLoading && !work.length ? (
            <div className="card" aria-busy="true">
              <p className="muted">Ładowanie zadań…</p>
            </div>
          ) : work.length === 0 ? (
            <Empty text="Na dziś nie masz nic w planie." action={{ label: 'Dodaj zadanie', run: () => setAdding(true) }} />
          ) : (
            <>
              <Progress value={doneCount} max={work.length} label={`Plan na dziś, ${doneCount} z ${work.length}`} />
              {firstOpen ? (
                <div className="row">
                  <button type="button" className="btn btn-primary btn-phone-block" onClick={start}>
                    Zacznij naukę
                  </button>
                  <button type="button" className="btn btn-secondary btn-phone-block" onClick={() => go('#piec-minut')}>
                    5 minut
                  </button>
                </div>
              ) : (
                <p style={{ fontWeight: 650 }}>
                  Plan na dziś zrobiony. <span style={{ color: 'var(--seria)' }}>Seria: {dni(d.streak)}.</span>
                </p>
              )}
              {items.map((it) => (
                <PlanCard key={it.ref} date={today} item={it} onSwap={() => setSwap(it)} />
              ))}
            </>
          )}
          {extra.length ? (
            <p className="small muted">Poza planem: {zadan(extra.length)} z wynikiem.</p>
          ) : null}
          {work.length > 0 ? (
            <div>
              <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
                Dodaj zadanie
              </button>
            </div>
          ) : null}
        </section>
        <div className="stack start-side">
          <DailyGoalCard />
          <WeeklyCard />
        </div>
      </div>
      {swap ? <SwapSheet date={today} item={swap} onClose={() => setSwap(null)} /> : null}
      {adding ? <AddSheet date={today} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

