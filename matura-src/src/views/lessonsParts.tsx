// Lista korepetycji (powitanie i ustawienia): przedmiot, dzień, godzina, czas.
// Plan liczy je jako naukę przedmiotu i tego dnia daje z niego mniej zadań.

import { SUBJECTS, type Lesson, type Stan } from '../model';
import { newId } from '../store/AppStore';
import { capitalize, dayName, fmtHM, hm } from '../logic/dates';
import { TimeSelect } from '../ui/common';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function LessonsEditor({ stan: s, set }: { stan: Stan; set: (fn: (s: Stan) => Stan) => void }) {
  return (
    <>
    {s.lessons.map((l) => {
      const upd = (p: Partial<Lesson>) => set((st) => ({ ...st, lessons: st.lessons.map((x) => (x.id === l.id ? { ...x, ...p } : x)) }));
      return (
        <div className="row lesson-row" key={l.id}>
          <select className="select" style={{ width: 'auto' }} aria-label="Przedmiot korepetycji" value={l.subj} onChange={(e) => upd({ subj: e.target.value as Lesson['subj'] })}>
            {SUBJECTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 'auto' }} aria-label="Dzień korepetycji" value={l.weekday} onChange={(e) => upd({ weekday: Number(e.target.value) })}>
            {ORDER.map((wd) => (
              <option key={wd} value={wd}>
                {capitalize(dayName(wd))}
              </option>
            ))}
          </select>
          <TimeSelect id={`les-${l.id}`} label="Godzina korepetycji" value={l.start} onChange={(v) => upd({ start: v })} />
          <select className="select" style={{ width: 'auto' }} aria-label="Czas korepetycji" value={l.minutes} onChange={(e) => upd({ minutes: Number(e.target.value) })}>
            {[45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
          <span className="muted tnum">do {fmtHM(hm(l.start) + l.minutes)}</span>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => set((st) => ({ ...st, lessons: st.lessons.filter((x) => x.id !== l.id) }))}>
            Usuń
          </button>
        </div>
      );
    })}
    <div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => set((st) => ({ ...st, lessons: [...st.lessons, { id: newId('k'), subj: SUBJECTS.find((x) => st.enabled[x.id])?.id ?? 'mat-p', weekday: 2, start: '16:00', minutes: 60 }] }))}
      >
        Dodaj korepetycje
      </button>
    </div>
    </>
  );
}
