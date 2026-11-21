import { useState } from 'react';
import type { DayPlan, PlanItem } from '../model';
import { useStore } from '../store/AppStore';
import { addDays, capitalize, dayName, fmtRange, fmtWeekdayDay, weekStart, weekday } from '../logic/dates';
import { count, fmtNum, zadan } from '../logic/format';
import { pct } from '../logic/scoring';
import { Confirm, Empty, IconButton, MoreMenu, SubjectTag, Tag } from '../ui/common';
import { AddSheet, itemTitle, openItem, SwapSheet, usePlanEdit } from './planParts';
import { PacksBanner, SyncBanner } from './Start';

const SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];

function PastDay({ date }: { date: string }) {
  const { d } = useStore();
  const res = d.active.results.filter((r) => r.d === date && !r.session);
  const ses = d.active.sessions.filter((s) => s.d === date);
  const ticks = d.active.ticks.filter((t) => t.d === date);
  const parts: string[] = [];
  for (const s of ses) parts.push(`${s.mode === 'diagnoza' ? 'Diagnoza' : 'Arkusz'}, ${fmtNum(s.pts)} z ${s.max} pkt`);
  if (res.length) {
    const p = res.reduce((a, r) => a + r.pts, 0);
    const m = res.reduce((a, r) => a + r.max, 0);
    parts.push(`${count(res.length, 'zadanie zrobione', 'zadania zrobione', 'zadań zrobionych')}, ${pct(p, m)}%`);
  }
  if (ticks.length && !parts.length) parts.push('nauka odhaczona');
  return <span className="small muted">{parts.length ? parts.join('; ') : 'bez nauki'}</span>;
}

function Row({ date, item, editing, first, last, onSwap }: { date: string; item: PlanItem; editing: boolean; first: boolean; last: boolean; onSwap: () => void }) {
  const { d } = useStore();
  const edit = usePlanEdit();
  const done = d.doneOf(date, item);
  return (
    <div className={`plan-row${done ? ' done' : ''}${editing ? ' editing' : ''}`}>
      <div className="pt">
        <div className="meta">
          <SubjectTag id={item.subjectId} />
          <span className="small muted tnum">{item.minutes} min</span>
          {done ? <Tag tone="ok">zrobione</Tag> : null}
          {item.manual ? <Tag>zmienione przez ciebie</Tag> : null}
        </div>
        {editing ? (
          <span className="tt">{itemTitle(item, d)}</span>
        ) : (
          <button type="button" className="btn btn-quiet" style={{ justifyContent: 'flex-start', padding: 0, whiteSpace: 'normal', textAlign: 'left', color: 'var(--tekst)', minHeight: 48 }} onClick={() => openItem(item, d)} disabled={item.kind === 'korepetycje'}>
            <span className="tt">{itemTitle(item, d)}</span>
          </button>
        )}
      </div>
      {editing ? (
        <div className="edit-btns">
          <IconButton icon="gora" label="Wyżej" onClick={() => edit.move(date, item, -1)} disabled={first} />
          <IconButton icon="dol" label="Niżej" onClick={() => edit.move(date, item, 1)} disabled={last} />
          <MoreMenu
            items={[
              ...(item.taskId ? [{ label: 'Zamień na inne', run: onSwap }] : []),
              { label: 'Przenieś na jutro', run: () => edit.moveTomorrow(date, item) },
              { label: 'Usuń z planu', run: () => edit.remove(date, item), danger: true },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

function DayCard({ date, plan, editing, onAdd, onSwap }: { date: string; plan: DayPlan | undefined; editing: boolean; onAdd: () => void; onSwap: (it: PlanItem) => void }) {
  const { today } = useStore();
  const past = date < today;
  const name = `${capitalize(dayName(weekday(date)))}${date === today ? ', dziś' : ''}`;
  const items = plan?.items ?? [];
  const work = items.filter((i) => i.kind !== 'korepetycje');
  const over = plan && plan.used > plan.available;
  return (
    <section className="card stack-2" id={`dzien-${date}`} aria-label={fmtWeekdayDay(date)}>
      <div className="row-between">
        <h3>{name}</h3>
        {past ? (
          <PastDay date={date} />
        ) : work.length ? (
          <span className="small tnum" style={{ color: over ? 'var(--seria)' : 'var(--tekst-2)', fontWeight: over ? 650 : 400 }}>
            {over ? `${plan!.used} z ${plan!.available} min` : `${zadan(work.length)}, ${plan!.used} min`}
          </span>
        ) : (
          <span className="small muted">wolne</span>
        )}
      </div>
      {!past ? (
        <div>
          {plan?.notes.map((n) => (
            <p key={n} className="small muted">
              {n}
            </p>
          ))}
          {items.map((it, i) => (
            <Row key={it.ref} date={date} item={it} editing={editing} first={i === 0} last={i === items.length - 1} onSwap={() => onSwap(it)} />
          ))}
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={onAdd}>
            Dodaj zadanie
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function PlanView() {
  const { d, today, updateStan, toast } = useStore();
  const [ws, setWs] = useState(weekStart(today));
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [swap, setSwap] = useState<{ date: string; item: PlanItem } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const byDate = new Map(d.plan.days.map((x) => [x.date, x]));
  const lastPlan = d.plan.days[d.plan.days.length - 1]?.date ?? today;

  const dot = (date: string) => {
    if (date >= today) return '';
    const p = byDate.get(date);
    if (d.days.has(date)) return 'done';
    return p && p.items.length ? 'miss' : '';
  };
  const recalc = () => {
    updateStan((s) => ({ ...s, overrides: Object.fromEntries(Object.entries(s.overrides).filter(([k]) => k < today)) }));
    setConfirm(false);
    toast('Przeliczono plan od dziś.');
  };

  return (
    <div className="page wide">
      <div className="row-between">
        <h1 className="ptitle">Plan</h1>
        <button type="button" className={`btn ${editing ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setEditing((e) => !e)}>
          {editing ? 'Gotowe' : 'Edytuj'}
        </button>
      </div>
      <SyncBanner />
      <PacksBanner />
      <div className="stack">
        <div className="row-between">
          <IconButton icon="wstecz" label="Poprzedni tydzień" onClick={() => setWs(addDays(ws, -7))} disabled={ws <= weekStart(today)} />
          <span style={{ fontWeight: 650 }}>{fmtRange(days[0], days[6])}</span>
          <IconButton icon="dalej" label="Następny tydzień" onClick={() => setWs(addDays(ws, 7))} disabled={addDays(ws, 7) > lastPlan} />
        </div>
        <div className="week-strip only-phone" role="list" aria-label="Dni tygodnia">
          {days.map((date) => (
            <button
              key={date}
              type="button"
              role="listitem"
              className={date === today ? 'today' : undefined}
              onClick={() => document.getElementById(`dzien-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label={fmtWeekdayDay(date)}
            >
              <span>{SHORT[weekday(date)]}</span>
              <span className="tnum">{Number(date.slice(8))}</span>
              <span className={`st ${dot(date)}`} />
            </button>
          ))}
        </div>
        {editing ? (
          <div>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(true)}>
              Przelicz plan od dziś
            </button>
          </div>
        ) : null}
      </div>
      {d.packsLoading && !d.plan.days.some((x) => x.items.length) ? (
        <div className="card">
          <p className="muted">Ładowanie zadań…</p>
        </div>
      ) : d.plan.days.length === 0 ? (
        <Empty text="Plan pojawi się, gdy włączysz przedmioty w ustawieniach." action={{ label: 'Otwórz ustawienia', run: () => (window.location.hash = '#ustawienia') }} />
      ) : (
        <div className={`plan-days week-grid${editing ? ' editing' : ''}`}>
          {days.map((date) => (
            <DayCard key={date} date={date} plan={byDate.get(date)} editing={editing} onAdd={() => setAdding(date)} onSwap={(item) => setSwap({ date, item })} />
          ))}
        </div>
      )}
      {adding ? <AddSheet date={adding} onClose={() => setAdding(null)} /> : null}
      {swap ? <SwapSheet date={swap.date} item={swap.item} onClose={() => setSwap(null)} /> : null}
      {confirm ? (
        <Confirm title="Przeliczyć plan od dziś?" text="Twoje ręczne zmiany w przyszłych dniach zostaną zastąpione." ok="Przelicz" onOk={recalc} onCancel={() => setConfirm(false)} />
      ) : null}
    </div>
  );
}
