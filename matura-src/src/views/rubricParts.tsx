// Ocena zadania otwartego bez Claude'a: poziomy punktacji z zasad CKE do wyboru
// i porównanie liczb z wyniku ucznia z wynikiem z klucza.

import { useState } from 'react';
import type { Rubric } from '../logic/cke';
import { matchResult } from '../logic/rubric';

export function RubricGrader({ id, rubric, value, onChange, initialText = '', disabled }: { id: string; rubric: Rubric; value: number | null; onChange: (pts: number) => void; initialText?: string; disabled?: boolean }) {
  const [res, setRes] = useState(initialText);
  const m = matchResult(res, rubric.result);
  return (
    <div className="card stack-2 rubric">
      <h3>Oceń według zasad CKE</h3>
      {rubric.result ? (
        <div className="field">
          <label htmlFor={`res-${id}`}>Twój wynik końcowy</label>
          <input id={`res-${id}`} className="input" value={res} onChange={(e) => setRes(e.target.value)} placeholder="np. x = 4,5" maxLength={200} disabled={disabled} />
          {m.match === 'zgodny' ? (
            <p className="small ok-text" role="status">Wynik zgadza się z kluczem. Sprawdź jeszcze, czy metoda jest poprawna.</p>
          ) : m.match === 'brakuje' ? (
            <p className="small bad-text" role="status">
              Wynik różni się od klucza (brakuje: {m.missing.join(', ')}). Porównaj z zasadami oceniania.
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="label" id={`lv-${id}`}>
        Wybierz najwyższy poziom, który spełnia twoje rozwiązanie
      </div>
      <div className="levels" role="radiogroup" aria-labelledby={`lv-${id}`}>
        {rubric.levels.map((l) => (
          <button type="button" role="radio" key={l.points} aria-checked={value === l.points} disabled={disabled} className="level" onClick={() => onChange(l.points)}>
            <strong className="tnum">{l.points} pkt</strong>
            <span>{l.text}</span>
          </button>
        ))}
      </div>
      <p className="small muted">Opis poziomów pochodzi z zasad oceniania CKE. Wzory i szczegóły są na obrazie zasad.</p>
    </div>
  );
}
