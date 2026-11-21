import { useState } from 'react';
import { SUBJECTS, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import { DIAGNOSIS_MINUTES } from '../logic/diagnosis';
import { zadan } from '../logic/format';
import { Progress, Segmented, Switch, SubjectTag, TimeSelect } from '../ui/common';
import { go } from '../ui/router';
import { askNotifications, notificationsSupported } from './reminder';
import { weekHours } from './Settings';

const OPTS = [15, 30, 45, 60, 90] as const;

export function Onboarding() {
  const { data, updateStan, d, ready } = useStore();
  const s = data.stan;
  const [step, setStep] = useState(1);
  const weekday = s.dayMinutes[1] as (typeof OPTS)[number];
  const weekend = s.dayMinutes[6] as (typeof OPTS)[number];
  const finish = (to: string) => {
    updateStan((st) => ({ ...st, onboarded: true }));
    go(to, true);
  };
  const enabled = SUBJECTS.filter((x) => s.enabled[x.id]);
  const firstDiag = (['mat-p', 'mat-r', 'pol-p', 'ang-p'] as SubjectId[]).find((id) => s.enabled[id] && d.diagnosis[id].enough);
  const firstName = SUBJECTS.find((x) => x.id === firstDiag)?.genitive;

  if (!ready) {
    return (
      <div className="onb">
        <p className="muted" aria-busy="true">
          Ładowanie…
        </p>
      </div>
    );
  }
  return (
    <div className="onb">
      <div className="stack-2">
        <div className="row-between">
          <span className="muted tnum">Krok {step} z 4</span>
          {step < 4 ? (
            <button type="button" className="btn btn-quiet" onClick={() => finish('#start')}>
              Pomiń
            </button>
          ) : null}
        </div>
        <Progress value={step} max={4} label={`Krok ${step} z 4`} />
      </div>
      <div className="onb-body onb-card">
        {step === 1 ? (
          <>
            <h1>Z czego zdajesz maturę?</h1>
            <div className="card flush">
              {SUBJECTS.map((x) => (
                <label className="checkrow" key={x.id}>
                  <input type="checkbox" checked={s.enabled[x.id]} onChange={(e) => updateStan((st) => ({ ...st, enabled: { ...st.enabled, [x.id]: e.target.checked } }))} />
                  <span className="grow">{x.name}</span>
                </label>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            <h1>Ile czasu możesz się uczyć?</h1>
            <div className="stack-2">
              <span className="label">Dni powszednie, minut dziennie</span>
              <Segmented label="Dni powszednie" options={OPTS} value={weekday} onChange={(v) => updateStan((st) => ({ ...st, dayMinutes: st.dayMinutes.map((m, i) => (i >= 1 && i <= 5 ? v : m)) }))} />
            </div>
            <div className="stack-2">
              <span className="label">Sobota i niedziela, minut dziennie</span>
              <Segmented label="Weekend" options={OPTS} value={weekend} onChange={(v) => updateStan((st) => ({ ...st, dayMinutes: st.dayMinutes.map((m, i) => (i === 0 || i === 6 ? v : m)) }))} />
            </div>
            <p>{weekHours(s.dayMinutes)}</p>
            {s.enabled['ang-p'] ? <p className="muted small">Korepetycje z angielskiego w sobotę 15:15–16:15 są w planie osobno.</p> : null}
          </>
        ) : step === 3 ? (
          <>
            <h1>Kiedy ci przypominać?</h1>
            <p className="muted">Jeśli o tej godzinie nic jeszcze nie zrobisz, aplikacja przypomni o nauce.</p>
            <div className="field">
              <span className="label">Godzina przypomnienia</span>
              <TimeSelect id="onb-time" label="Godzina przypomnienia" value={s.reminder.time} onChange={(v) => updateStan((st) => ({ ...st, reminder: { ...st.reminder, time: v } }))} />
            </div>
            <label className="switch-row">
              <span style={{ fontWeight: 600 }}>Przypominaj o nauce</span>
              <Switch checked={s.reminder.enabled} onChange={(v) => updateStan((st) => ({ ...st, reminder: { ...st.reminder, enabled: v } }))} label="Przypominaj o nauce" />
            </label>
          </>
        ) : (
          <>
            <h1>Zacznij od diagnozy.</h1>
            <p>Około 30 minut na przedmiot, prawdziwe zadania CKE. Wynik ustawi plan i prognozę. Przedmioty możesz robić osobno, w różne dni.</p>
            <div className="stack">
              {enabled.map((x) => {
                const sel = d.diagnosis[x.id];
                return (
                  <div className="card row-between" key={x.id}>
                    <div className="stack-2">
                      <SubjectTag id={x.id} long />
                      <span className="small muted">{sel.enough ? `${Math.max(DIAGNOSIS_MINUTES, sel.minutes)} min, ${zadan(sel.taskIds.length)}` : d.packsLoading ? 'Ładowanie zadań…' : 'Za mało zadań do diagnozy'}</span>
                    </div>
                    <button type="button" className="btn btn-secondary" disabled={!sel.enough} onClick={() => finish(`#diagnoza-${x.id}`)}>
                      Zacznij
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div className="onb-foot">
        {step > 1 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            Wstecz
          </button>
        ) : null}
        {step === 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(2)} disabled={!enabled.length}>
            Dalej
          </button>
        ) : step === 2 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
            Dalej
          </button>
        ) : step === 3 ? (
          <>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                updateStan((st) => ({ ...st, reminder: { ...st.reminder, enabled: false } }));
                setStep(4);
              }}
            >
              Bez przypomnień
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (s.reminder.enabled && notificationsSupported()) void askNotifications();
                setStep(4);
              }}
            >
              Dalej
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-quiet" onClick={() => finish('#start')}>
              Zrobię później
            </button>
            {firstDiag ? (
              <button type="button" className="btn btn-primary" onClick={() => finish(`#diagnoza-${firstDiag}`)}>
                Zacznij od {firstName}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
