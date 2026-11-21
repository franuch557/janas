import type { ClosedAnswer } from '../logic/cke';
import { Icon } from './icons';

const NAMES: Record<string, string> = { P: 'prawda', F: 'fałsz', T: 'tak', N: 'nie' };

/**
 * Karta odpowiedzi wzorowana na karcie CKE: pola A–D (albo P/F) w rzędzie,
 * jedna grupa na pozycję. Po sprawdzeniu pola pokazują poprawną odpowiedź.
 */
export function AnswerCard({
  answer,
  value,
  onChange,
  checked,
  locked,
  onAll,
}: {
  answer: ClosedAnswer;
  value: Record<string, string>;
  onChange: (itemId: string, option: string) => void;
  checked: boolean;
  locked?: boolean;
  onAll: (v: Record<string, string>) => void;
}) {
  const many = answer.items.length > 1;
  if (answer.unordered) return <ChooseMany answer={answer} value={value} onAll={onAll} checked={checked} locked={locked} />;
  return (
    <div className="abcd">
      {answer.items.map((it, idx) => {
        const chosen = value[it.id];
        const wide = it.options.some((o) => o.length > 2);
        const onKey = (e: React.KeyboardEvent, i: number) => {
          if (checked || locked) return;
          if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
            const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
            const j = (i + dir + it.options.length) % it.options.length;
            onChange(it.id, it.options[j]);
            ((e.currentTarget.parentElement?.children[j] as HTMLElement) ?? null)?.focus();
          }
        };
        return (
          <div key={it.id} className="stack-2">
            <div className="item-label" id={`it-${idx}`}>
              {many ? it.label ?? `${it.id}.` : 'Zaznacz odpowiedź'}
            </div>
            <div className={`opts${it.options.length > 4 && !wide ? ' many' : ''}`} style={{ ['--n' as string]: it.options.length }} role="radiogroup" aria-labelledby={`it-${idx}`}>
              {it.options.map((o, i) => {
                const sel = chosen === o;
                let cls = 'opt';
                let mark: string | null = null;
                if (wide) cls += ' wide';
                if (checked) {
                  const isCorrect = o === it.correct;
                  if (sel && isCorrect) {
                    cls += ' ok';
                    mark = 'ok';
                  } else if (sel) {
                    cls += ' bad';
                    mark = 'zle';
                  } else if (isCorrect) {
                    cls += ' should';
                    mark = 'ok';
                  } else cls += ' dim';
                }
                return (
                  <button
                    type="button"
                    key={o}
                    role="radio"
                    aria-checked={sel}
                    aria-label={NAMES[o] ? `${o}, ${NAMES[o]}` : o}
                    tabIndex={sel || (!chosen && i === 0) ? 0 : -1}
                    className={cls}
                    disabled={checked || locked}
                    onClick={() => onChange(it.id, o)}
                    onKeyDown={(e) => onKey(e, i)}
                  >
                    <span>{o}</span>
                    {mark ? (
                      <span className="mark">
                        <Icon name={mark} size={14} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** „Wybierz N odpowiedzi”: zaznaczenie zbioru liter, zapis w kolejności alfabetycznej. */
function ChooseMany({ answer, value, onAll, checked, locked }: { answer: ClosedAnswer; value: Record<string, string>; onAll: (v: Record<string, string>) => void; checked: boolean; locked?: boolean }) {
  const n = answer.items.length;
  const chosen = new Set(Object.values(value));
  const correct = new Set(answer.items.map((i) => i.correct));
  const toggle = (o: string) => {
    const next = new Set(chosen);
    if (next.has(o)) next.delete(o);
    else if (next.size < n) next.add(o);
    else return;
    const sorted = [...next].sort();
    const v: Record<string, string> = {};
    answer.items.forEach((it, i) => {
      if (sorted[i]) v[it.id] = sorted[i];
    });
    onAll(v);
  };
  return (
    <div className="abcd">
      <div className="item-label" id="many-l">
        Zaznacz {n} odpowiedzi
      </div>
      <div className={`opts${answer.items[0].options.length > 4 ? ' many' : ''}`} style={{ ['--n' as string]: answer.items[0].options.length }} role="group" aria-labelledby="many-l">
        {answer.items[0].options.map((o) => {
          const sel = chosen.has(o);
          let cls = 'opt';
          let mark: string | null = null;
          if (checked) {
            if (sel && correct.has(o)) {
              cls += ' ok';
              mark = 'ok';
            } else if (sel) {
              cls += ' bad';
              mark = 'zle';
            } else if (correct.has(o)) {
              cls += ' should';
              mark = 'ok';
            } else cls += ' dim';
          }
          return (
            <button type="button" key={o} role="checkbox" aria-checked={sel} aria-label={o} className={cls} disabled={checked || locked} onClick={() => toggle(o)}>
              <span>{o}</span>
              {mark ? (
                <span className="mark">
                  <Icon name={mark} size={14} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <span className="small muted">
        Zaznaczono {chosen.size} z {n}.
      </span>
    </div>
  );
}

/** Komunikat po sprawdzeniu: „Dobrze. Odpowiedź B.” / „Twoja odpowiedź: C. Poprawna: B.” */
export function checkMessage(answer: ClosedAnswer, value: Record<string, string>): { ok: boolean; text: string } {
  if (answer.unordered) {
    const mine = Object.values(value).sort();
    const good = answer.items.map((i) => i.correct ?? '').sort();
    return mine.join() === good.join()
      ? { ok: true, text: `Dobrze. Odpowiedzi ${good.join(' i ')}.` }
      : { ok: false, text: `Twoje odpowiedzi: ${mine.join(', ') || 'brak'}. Poprawne: ${good.join(', ')}.` };
  }
  const allOk = answer.items.every((i) => value[i.id] === i.correct);
  if (answer.items.length === 1) {
    const it = answer.items[0];
    return allOk ? { ok: true, text: `Dobrze. Odpowiedź ${it.correct}.` } : { ok: false, text: `Twoja odpowiedź: ${value[it.id] ?? 'brak'}. Poprawna: ${it.correct}.` };
  }
  if (allOk) return { ok: true, text: `Dobrze. Wszystkie odpowiedzi poprawne.` };
  const wrong = answer.items.filter((i) => value[i.id] !== i.correct).map((i) => `${i.label ?? i.id}: ${i.correct}`);
  return { ok: false, text: `Poprawne odpowiedzi: ${wrong.join(', ')}.` };
}

export function SelfGrade({ max, value, onChange, disabled }: { max: number; value: number | null; onChange: (v: number) => void; disabled?: boolean }) {
  const opts = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <div className="stack-2">
      <div className="label" id="sg-l">
        Ile punktów przyznajesz sobie?
      </div>
      <div className="row">
        <div className="seg" role="radiogroup" aria-labelledby="sg-l">
          {opts.map((o) => (
            <button type="button" role="radio" key={o} aria-checked={value === o} disabled={disabled} onClick={() => onChange(o)}>
              {o}
            </button>
          ))}
        </div>
        <span className="muted">z {max} pkt</span>
      </div>
    </div>
  );
}
