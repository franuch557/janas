// Karty na ekranie Start: cel dnia z serią (zamrożenie jak w Duolingo) i metody nauki:
// sprawdzian mieszany raz w tygodniu, zeszyt błędów, tryb 10 minut.

import { useMemo } from 'react';
import { useStore } from '../store/AppStore';
import { streakInfo, studyDays } from '../logic/events';
import { weekday, weekStart } from '../logic/dates';
import { mistakes, quizThisWeek } from '../logic/levels';
import { dni } from '../logic/format';
import { Progress } from '../ui/common';
import { go } from '../ui/router';

export function DailyGoalCard() {
  const { d, data, today } = useStore();
  const goal = data.stan.dayMinutes[weekday(today)] ?? 0;
  const sec = d.active.results.filter((r) => r.d === today && !r.session).reduce((a, r) => a + r.sec, 0) + d.active.sessions.filter((s) => s.d === today).reduce((a, s) => a + s.sec, 0);
  const min = Math.round(sec / 60);
  const info = useMemo(() => streakInfo(studyDays(d.active), today), [d.active, today]);
  const errors = useMemo(() => mistakes(d.active.results).length, [d.active.results]);
  const quizDone = quizThisWeek(d.active.results, weekStart(today));
  return (
    <section className="card stack-2" aria-labelledby="cel-dnia">
      <div className="row-between">
        <h2 id="cel-dnia" style={{ fontSize: '1.125rem' }}>
          Cel dnia
        </h2>
        <span className="tnum" style={{ color: 'var(--seria-tekst)', fontWeight: 650 }}>
          Seria: {dni(info.days)}
        </span>
      </div>
      {goal > 0 ? (
        <>
          <Progress value={Math.min(min, goal)} max={goal} label={`Cel dnia: ${min} z ${goal} min`} />
          <p className="small muted tnum">
            {min >= goal ? `Cel dnia osiągnięty: ${min} min.` : `${min} z ${goal} min nauki.`}
            {info.frozen.length ? ' Jeden opuszczony dzień nie przerwał serii (zamrożenie, raz na 7 dni).' : ' Jeden opuszczony dzień w tygodniu nie przerwie serii.'}
          </p>
        </>
      ) : (
        <p className="small muted">Dziś dzień wolny w planie.</p>
      )}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button type="button" className={`btn ${quizDone ? 'btn-secondary' : 'btn-primary'} btn-sm`} onClick={() => go({ name: 'sprawdzian' })}>
          {quizDone ? 'Sprawdzian mieszany' : 'Sprawdzian tygodnia'}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => go({ name: 'bledy' })}>
          Moje błędy{errors ? ` (${errors})` : ''}
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => go('#dziesiec-minut')}>
          Mam 10 minut
        </button>
      </div>
      {!quizDone ? <p className="small muted">Sprawdzian mieszany: zadania z różnych działów naraz. Bez błędu w temacie = poziom „opanowany”.</p> : null}
    </section>
  );
}
