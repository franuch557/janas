// Sesja „Ucz się” fiszek: wybór z 4 odpowiedzi → wpisywanie z pamięci (src/logic/learn.ts).

import { useMemo, useState } from 'react';
import type { Flashcard } from '../model';
import { useStore } from '../store/AppStore';
import { gradeCard } from '../logic/flashcards';
import { compareTyped, distractors } from '../logic/learn';
import { MathText } from '../ui/MathText';

type Stage = { id: string; step: 'wybor' | 'wpisz'; clean: boolean };

export function LearnSession({ cards, onDone }: { cards: Flashcard[]; onDone: (n: number) => void }) {
  const { data, updateData, today } = useStore();
  const [queue, setQueue] = useState<Stage[]>(() => cards.map((c) => ({ id: c.id, step: 'wybor', clean: true })));
  const [done, setDone] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [verdict, setVerdict] = useState<'dobrze' | 'prawie' | 'źle' | null>(null);
  const byId = new Map(data.cards.map((c) => [c.id, c]));
  const cur = queue[0];
  const c = cur ? byId.get(cur.id) ?? cards.find((x) => x.id === cur.id) : undefined;
  const options = useMemo(() => {
    if (!c) return [];
    const opts = [c.back, ...distractors(c, data.cards)];
    return opts.sort(() => Math.random() - 0.5);
  }, [c?.id, cur?.step]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!c || !cur) return null;
  // za mało innych kart do wyboru: od razu wpisywanie
  const step = cur.step === 'wybor' && options.length < 3 ? 'wpisz' : cur.step;

  const advance = (ok: boolean, finish: boolean) => {
    setPicked(null);
    setTyped('');
    setVerdict(null);
    const rest = queue.slice(1);
    if (finish) {
      const next = gradeCard(c, ok ? (cur.clean ? 'easy' : 'good') : 'again', today, Date.now());
      updateData((d) => ({ ...d, cards: d.cards.map((x) => (x.id === c.id ? next : x)) }));
      setDone((n) => n + 1);
      if (!rest.length) onDone(done + 1);
      setQueue(rest);
      return;
    }
    // karta wraca kilka pozycji dalej: po dobrym wyborze do wpisywania, po błędzie znów do wyboru
    const nextStage: Stage = ok ? { ...cur, step: 'wpisz' } : { ...cur, step: 'wybor', clean: false };
    rest.splice(Math.min(rest.length, 3), 0, nextStage);
    setQueue(rest);
  };

  return (
    <section className="card stack" aria-live="polite">
      <div className="row-between">
        <span className="small muted">{step === 'wybor' ? 'Wybierz odpowiedź' : 'Wpisz odpowiedź z pamięci'}</span>
        <span className="small muted tnum">
          Nauczone: {done} z {cards.length}
        </span>
      </div>
      <div style={{ fontSize: '1.25rem', fontWeight: 650 }}>
        <MathText text={c.front} />
      </div>
      {step === 'wybor' ? (
        <div className="levels" role="radiogroup" aria-label="Odpowiedzi">
          {options.map((o) => {
            const state = picked == null ? '' : o === c.back ? ' ok' : o === picked ? ' bad' : '';
            return (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={picked === o}
                className={`level choice${state}`}
                style={{ gridTemplateColumns: '1fr' }}
                disabled={picked != null}
                onClick={() => setPicked(o)}
              >
                <MathText text={o} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="field">
          <label htmlFor="learn-typed">Odpowiedź</label>
          <input
            id="learn-typed"
            className="input"
            value={typed}
            autoComplete="off"
            disabled={verdict != null}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && verdict == null && typed.trim()) setVerdict(compareTyped(typed, c.back));
            }}
          />
        </div>
      )}
      {step === 'wybor' && picked != null ? (
        <>
          <p className={picked === c.back ? 'ok-text' : 'bad-text'}>{picked === c.back ? 'Dobrze. Za chwilę wpiszesz ją z pamięci.' : 'Źle. Karta wróci za chwilę.'}</p>
          <button type="button" className="btn btn-primary" onClick={() => advance(picked === c.back, false)}>
            Dalej
          </button>
        </>
      ) : null}
      {step === 'wpisz' ? (
        verdict == null ? (
          <button type="button" className="btn btn-primary" disabled={!typed.trim()} onClick={() => setVerdict(compareTyped(typed, c.back))}>
            Sprawdź
          </button>
        ) : (
          <>
            <div className={`verdict ${verdict === 'dobrze' ? 'dobrze' : verdict === 'prawie' ? 'częściowo' : 'źle'}`} role="status">
              <strong>{verdict === 'dobrze' ? 'Dobrze' : verdict === 'prawie' ? 'Prawie: literówka' : 'Źle'}</strong>
              <span>
                Poprawnie: <MathText text={c.back} />
              </span>
            </div>
            <div className="row">
              {verdict === 'prawie' ? (
                <button type="button" className="btn btn-secondary" onClick={() => advance(true, true)}>
                  Uznaj jako dobrze
                </button>
              ) : null}
              <button type="button" className="btn btn-primary" onClick={() => (verdict === 'dobrze' ? advance(true, true) : advance(false, false))}>
                Dalej
              </button>
            </div>
          </>
        )
      ) : null}
    </section>
  );
}
