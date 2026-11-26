// Raport z oceny zadania otwartego: wynik, etapy z punktami (spełniony / niespełniony) i wskazówki.
// Pokazywany dopiero po sprawdzeniu rozwiązania – wcześniej uczeń nie widzi kryteriów.

import type { GradeReport } from '../logic/gradeReport';
import { Icon } from '../ui/icons';

export function GradeReportView({ r, title = 'Ocena rozwiązania' }: { r: GradeReport; title?: string }) {
  const tone = r.points === r.max ? 'dobrze' : r.points === 0 ? 'źle' : 'częściowo';
  return (
    <div className={`grade-report ${tone}`} role="status">
      <div className="gr-head">
        <strong>{title}</strong>
        <span className="gr-score tnum">
          {r.points} <span className="muted">z {r.max} pkt</span>
        </span>
      </div>
      <div className="gr-bar" aria-hidden="true">
        {Array.from({ length: r.max }, (_, i) => (
          <span key={i} className={i < r.points ? 'on' : undefined} />
        ))}
      </div>
      {r.stages.length ? (
        <ol className="gr-stages">
          {r.stages.map((s) => (
            <li key={s.points} className={s.met ? 'met' : undefined}>
              <span className="gr-ico" aria-hidden="true">
                <Icon name={s.met ? 'ok' : 'zle'} size={16} />
              </span>
              <div className="gr-stage">
                <span className="gr-pts tnum">{s.points} pkt</span>
                <span>{s.label}</span>
                {s.met && s.found.length ? <span className="small muted">Znalazłem: {s.found.join('; ')}</span> : null}
              </div>
              <span className="sr-only">{s.met ? 'spełnione' : 'niespełnione'}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {r.tips.length ? (
        <ul className="gr-tips">
          {r.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
