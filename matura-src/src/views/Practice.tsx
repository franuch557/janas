// Ćwiczenie: warianty zadań CKE z innymi liczbami (src/logic/variants.ts) w trzech krokach
// nauki metody: 1) przykład z pełnym rozwiązaniem, 2) to samo z lukami w krokach,
// 3) samodzielnie, z podpowiedziami krok po kroku (każda podpowiedź obniża wkład w biegłość).

import { useMemo, useState } from 'react';
import { subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import { generatorsFor, makeVariant, variantTaskId, type Step, type Variant } from '../logic/variants';
import { gradeTask } from '../logic/mathGrade';
import { constValue } from '../logic/mathExpr';
import mathParams from '../data/ocena-matematyka.json';
import { MathText } from '../ui/MathText';
import { Empty, Segmented, SubjectTag } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { shortTopic } from './planParts';

export type PracticeMode = 'przyklad' | 'luki' | 'samodzielnie';
const MODES: { id: PracticeMode; label: string }[] = [
  { id: 'przyklad', label: 'Przykład' },
  { id: 'luki', label: 'Z lukami' },
  { id: 'samodzielnie', label: 'Samodzielnie' },
];

/** Tekst kroku z luką: „{}” → wartość albo kwadracik (w wzorze \square, w tekście □). */
export function stepText(s: Step, show: boolean): string {
  let inMath = false;
  let out = '';
  for (let i = 0; i < s.text.length; i++) {
    const c = s.text[i];
    if (c === '$') inMath = !inMath;
    if (c === '{' && s.text[i + 1] === '}') {
      const v = show ? s.blank ?? '' : inMath ? '\\square' : '□';
      out += inMath && show ? v.replace(/−/g, '-').replace(/∞/g, '\\infty ').replace(/∪/g, '\\cup ') : v;
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

/** Porównanie wpisanej luki z kluczem: liczby numerycznie, reszta po normalizacji zapisu. */
export function sameBlank(input: string, want: string): boolean {
  const a = input.trim();
  if (!a) return false;
  const va = constValue(a);
  const vb = constValue(want);
  if (va != null && vb != null) return Math.abs(va - vb) < 1e-9;
  // bez zamiany przecinka na kropkę: w parach i przedziałach przecinek oddziela liczby
  const n = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/;/g, ',').replace(/\+?∞|inf/g, '∞').replace(/[⟨<]/g, '[').replace(/[⟩>]/g, ']');
  return n(a) === n(want);
}

export function PracticeView({ subject, topic }: { subject: SubjectId; topic: string }) {
  const { d, saveResult } = useStore();
  const gens = generatorsFor(subject, topic);
  // ile razy ćwiczony każdy generator (wyniki „gen-<id>-<ziarno>”)
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of gens) m[g.id] = d.active.results.filter((r) => r.task.startsWith(`gen-${g.id}-`)).length;
    return m;
  }, [d.active.results, gens]);
  // bieżący wariant jest zamrożony do „Następne zadanie” (zapis wyniku zmienia liczniki)
  const pick = (extra: Record<string, number> = {}) => {
    if (!gens.length) return null;
    const c = (id: string) => counts[id] + (extra[id] ?? 0);
    const g = [...gens].sort((a, b) => c(a.id) - c(b.id))[0];
    const n = c(g.id);
    const mode: PracticeMode = n === 0 ? 'przyklad' : n === 1 ? 'luki' : 'samodzielnie';
    return { gen: g.id, seed: 1000 + n * 31 + Math.floor(Math.random() * 900), mode, at: Date.now() };
  };
  const [cur, setCur] = useState(() => pick());
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const g = cur ? gens.find((x) => x.id === cur.gen) ?? null : null;
  const v = useMemo(() => (g && cur ? makeVariant(g, cur.seed) : null), [g, cur]);
  if (!g || !v || !cur) return <Empty text="Dla tego tematu nie ma jeszcze wariantów zadań." action={{ label: 'Wróć', run: goBack }} />;
  const m = mode ?? cur.mode;
  const sub = subjectDef(subject)!;
  // następny wariant: bieżący generator liczy się już z tym wynikiem
  const next = () => {
    setMode(null);
    setCur(pick({ [g.id]: 1 }));
  };
  const save = (pts: number, max: number, extra: { hints?: number; note?: string; feedback?: string } = {}) =>
    saveResult({ task: variantTaskId(v), subj: subject, topics: [topic], pts, max, sec: Math.min(3600, Math.round((Date.now() - cur.at) / 1000)), src: 'ćwiczenie', by: 'automat', ...extra }, { toast: false });
  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">Ćwiczenie: {shortTopic(topic)}</span>
        </div>
      </header>
      <div className="focus-body">
        <div className="page stack" style={{ maxWidth: 760 }}>
          <div className="row">
            <SubjectTag id={subject} />
            <span className="small muted">
              {g.name} · wariant z innymi liczbami · {v.maxPoints} pkt · {sub.short}
            </span>
          </div>
          <Segmented label="Tryb ćwiczenia" options={MODES.map((x) => x.id)} value={m} onChange={(x) => setMode(x)} render={(x) => MODES.find((y) => y.id === x)!.label} />
          <section className="card stack-2">
            <MathText text={v.question} />
          </section>
          {m === 'przyklad' ? <Worked key={`${v.seed}-p`} v={v} onDone={() => (save(0, 0, { note: 'przykład' }), next())} /> : null}
          {m === 'luki' ? <Blanks key={`${v.seed}-l`} v={v} onSave={(p) => save(p, v.maxPoints, { note: 'z lukami' })} onNext={next} /> : null}
          {m === 'samodzielnie' ? <Solo key={`${v.seed}-s`} v={v} onSave={(p, hints, fb) => save(p, v.maxPoints, { hints, feedback: fb })} onNext={next} /> : null}
          <div className="row">
            <button type="button" className="btn btn-quiet" onClick={() => go({ name: 'bledy' })}>
              Moje błędy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepsList({ steps, show }: { steps: Step[]; show: number }) {
  return (
    <ol className="steps">
      {steps.slice(0, show).map((s, i) => (
        <li key={i}>
          <MathText text={stepText(s, true)} />
        </li>
      ))}
    </ol>
  );
}

/** 1) Przykład rozwiązany: wszystkie kroki z wartościami. */
function Worked({ v, onDone }: { v: Variant; onDone: () => void }) {
  return (
    <section className="card stack-2">
      <h3>Rozwiązanie krok po kroku</h3>
      <StepsList steps={v.steps} show={v.steps.length} />
      <p>
        <strong>Odpowiedź:</strong> {v.answer}
      </p>
      <p className="small muted">Przeczytaj kroki. Następne zadanie tego typu będzie z lukami do uzupełnienia.</p>
      <button type="button" className="btn btn-primary" onClick={onDone}>
        Rozumiem, dalej
      </button>
    </section>
  );
}

/** 2) Ten sam typ zadania z lukami w krokach. */
function Blanks({ v, onSave, onNext }: { v: Variant; onSave: (pts: number) => void; onNext: () => void }) {
  const [vals, setVals] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const holes = v.steps.map((s, i) => (s.blank != null ? i : -1)).filter((i) => i >= 0);
  const firstHole = holes[0] ?? 0;
  const ok = holes.filter((i) => sameBlank(vals[i] ?? '', v.steps[i].blank!)).length;
  const check = () => {
    setChecked(true);
    onSave(Math.round((v.maxPoints * ok) / Math.max(1, holes.length)));
  };
  return (
    <section className="card stack-2">
      <h3>Uzupełnij luki w rozwiązaniu</h3>
      <ol className="steps">
        {v.steps.map((s, i) =>
          // kroki bez luki po pierwszej luce zdradzałyby odpowiedzi: pokazuję je po sprawdzeniu
          !checked && s.blank == null && i > firstHole ? null : (
          <li key={i} className="stack-2">
            <MathText text={stepText(s, checked)} />
            {s.blank != null ? (
              <div className="row">
                <input
                  className="input"
                  style={{ maxWidth: 220 }}
                  aria-label={`Luka w kroku ${i + 1}`}
                  value={vals[i] ?? ''}
                  disabled={checked}
                  onChange={(e) => setVals((x) => ({ ...x, [i]: e.target.value }))}
                />
                {checked ? <span className={sameBlank(vals[i] ?? '', s.blank) ? 'ok-text' : 'bad-text'}>{sameBlank(vals[i] ?? '', s.blank) ? 'dobrze' : `poprawnie: ${s.blank}`}</span> : null}
              </div>
            ) : null}
          </li>
          ),
        )}
      </ol>
      {!checked ? (
        <button type="button" className="btn btn-primary" onClick={check}>
          Sprawdź
        </button>
      ) : (
        <>
          <div className={`verdict ${ok === holes.length ? 'dobrze' : ok ? 'częściowo' : 'źle'}`} role="status">
            <strong>
              Dobrze: {ok} z {holes.length} luk
            </strong>
          </div>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Następne zadanie
          </button>
        </>
      )}
    </section>
  );
}

/** 3) Samodzielnie: rozwiązanie sprawdzane według klucza, podpowiedzi po jednym kroku. */
function Solo({ v, onSave, onNext }: { v: Variant; onSave: (pts: number, hints: number, feedback: string) => void; onNext: () => void }) {
  const [text, setText] = useState('');
  const [hints, setHints] = useState(0);
  const [res, setRes] = useState<{ points: number; feedback: string } | null>(null);
  const check = () => {
    const g = gradeTask(v.key, v.maxPoints, text, mathParams.params);
    const points = g?.points ?? 0;
    const fb = g ? [g.found.length ? `Zgadza się z kluczem: ${g.found.join('; ')}.` : 'Nie znalazłem wyniku z klucza.', g.missing.length && points < v.maxPoints ? `Brakuje: ${g.missing.join('; ')}.` : ''].filter(Boolean).join(' ') : 'Nie umiem odczytać rozwiązania.';
    setRes({ points, feedback: fb });
    onSave(points, hints, fb);
  };
  return (
    <section className="card stack-2">
      <div className="field">
        <label htmlFor={`solo-${v.seed}`}>Twoje rozwiązanie: obliczenia i wynik</label>
        <textarea id={`solo-${v.seed}`} className="textarea" value={text} onChange={(e) => setText(e.target.value)} disabled={!!res} maxLength={3000} />
        <span className="hint">Kolejne kroki w osobnych liniach. Pierwiastek: √ albo sqrt(), potęga: ^, ułamek: /, przedział: [a, b).</span>
      </div>
      {hints > 0 && !res ? <StepsList steps={v.steps} show={hints} /> : null}
      {!res ? (
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={check}>
            Sprawdź
          </button>
          {hints < v.steps.length ? (
            <button type="button" className="btn btn-secondary" onClick={() => setHints((h) => h + 1)}>
              Podpowiedź ({hints + 1} z {v.steps.length})
            </button>
          ) : null}
          {hints ? <span className="small muted">Podpowiedzi obniżają wkład zadania w opanowanie tematu.</span> : null}
        </div>
      ) : (
        <>
          <div className={`verdict ${res.points === v.maxPoints ? 'dobrze' : res.points ? 'częściowo' : 'źle'}`} role="status">
            <strong>
              Ocena automatyczna: {res.points} z {v.maxPoints} pkt
            </strong>
            <span>{res.feedback}</span>
          </div>
          <h3>Rozwiązanie</h3>
          <StepsList steps={v.steps} show={v.steps.length} />
          <p>
            <strong>Odpowiedź:</strong> {v.answer}
          </p>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Następne zadanie
          </button>
        </>
      )}
    </section>
  );
}
