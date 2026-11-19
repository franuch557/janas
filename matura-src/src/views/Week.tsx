import { useState } from 'react';
import { useApp, subjectName } from '../store/context';
import { Header } from '../components/common';
import { addDays, dayName, fmtShort, weekStart, weekday } from '../logic/dates';
import { availableMinutes } from '../logic/planner';
import type { PlanItem } from '../types';

const SHORT: Record<string, string> = { 'mat-r': 'M-R', 'mat-p': 'M-P', 'pol-p': 'P', 'ang-p': 'A', 'pol-r': 'P-R', 'ang-r': 'A-R' };

export default function Week() {
  const { state, plan, today } = useApp();
  const [start, setStart] = useState(weekStart(today));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const byDate = new Map(plan.map((d) => [d.date, d]));
  const label = (it: PlanItem) => {
    const sub = it.subjectId ? `${SHORT[it.subjectId] ?? subjectName(state, it.subjectId)}: ` : '';
    return `${sub}${it.label}`;
  };
  return (
    <section>
      <Header title="Plan tygodnia">
        Każda zmiana ustawień przelicza plan od dziś. Dni minione i zatwierdzone pokazują to, co zostało zapisane.
      </Header>
      <div className="rzad" style={{ marginBottom: '0.75rem' }}>
        <button type="button" onClick={() => setStart(addDays(start, -7))}>Poprzedni tydzień</button>
        <button type="button" onClick={() => setStart(weekStart(today))}>Bieżący tydzień</button>
        <button type="button" onClick={() => setStart(addDays(start, 7))}>Następny tydzień</button>
        <span className="olowek liczby">
          {fmtShort(days[0])}–{fmtShort(days[6])}
        </span>
      </div>
      <div className="tydzien">
        {days.map((d) => {
          const p = byDate.get(d);
          const log = state.dayLog[d];
          const items = (p?.items ?? log?.items ?? []).filter((i) => i.kind !== 'brak-zadań');
          const missing = (p?.items ?? []).filter((i) => i.kind === 'brak-zadań').length;
          const avail = p?.available ?? availableMinutes(d, state.settings).minutes;
          const used = p?.used ?? items.filter((i) => i.kind !== 'korepetycje' && i.kind !== 'zajęcia' && i.kind !== 'brak-zadań').reduce((a, b) => a + b.minutes, 0);
          return (
            <div key={d} className={`dzien${d === today ? ' dzis' : ''}`} aria-label={`${dayName(weekday(d))} ${fmtShort(d)}`}>
              <h3>
                {dayName(weekday(d), true)} {fmtShort(d)}
              </h3>
              <small className="liczby">
                {used}/{avail} min
              </small>
              {d < today && !log && <p className="olowek">–</p>}
              <ul>
                {items.map((it) => {
                  const done = log?.done[it.key];
                  return (
                    <li key={it.key}>
                      {done ? '✓ ' : ''}
                      {label(it)}
                      {it.minutes > 0 && it.kind !== 'brak-zadań' ? <span className="olowek"> · {it.minutes} min</span> : null}
                    </li>
                  );
                })}
              </ul>
              {missing > 0 && <small>Puste tematy: {missing}. </small>}
              {p && p.shifted.length > 0 && <small>Nie zmieściło się: {p.shifted.length}</small>}
            </div>
          );
        })}
      </div>
      <p className="olowek" style={{ marginTop: '0.75rem' }}>
        Skróty: M-R matematyka rozszerzona, M-P matematyka podstawowa, P polski, A angielski.
      </p>
    </section>
  );
}
