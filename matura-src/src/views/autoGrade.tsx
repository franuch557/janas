// Panel „Sprawdź automatycznie” (bez Claude'a): matematyka według wyników i kroków z klucza CKE,
// polski według sensu odpowiedzi w porównaniu z przykładowymi odpowiedziami CKE.
// Wynik ustawia punkty, a uczeń może je zmienić, gdy algorytm się pomylił.

import { useEffect, useState } from 'react';
import type { AppTask } from '../store/derived';
import { gradeMath, type KeyLevel, type MathParams } from '../logic/mathGrade';
import { embedTexts, gradeText, unpackVec, type TextExample, type TextParams } from '../logic/textGrade';

type MathKeys = Record<string, KeyLevel[]>;
type TextKeys = Record<string, [number, string][]>;
let mathKeys: Promise<{ keys: MathKeys; params: MathParams }> | null = null;
let textKeys: Promise<{ keys: TextKeys; params: TextParams }> | null = null;
const loadMath = () =>
  (mathKeys ??= Promise.all([import('../data/klucze-matematyka.json'), import('../data/ocena-matematyka.json')]).then(([k, p]) => ({ keys: k.default as unknown as MathKeys, params: p.default.params })));
const loadText = () =>
  (textKeys ??= Promise.all([import('../data/wzorce-polski.json'), import('../data/ocena-polski.json')]).then(([k, p]) => ({ keys: k.default as unknown as TextKeys, params: p.default.params })));

/** Czy zadanie ma klucz do oceny automatycznej. */
export function useAutoKind(t: AppTask | undefined): 'mat' | 'pol' | null {
  const [kind, setKind] = useState<'mat' | 'pol' | null>(null);
  useEffect(() => {
    let alive = true;
    setKind(null);
    if (!t || t.auto || t.essay || t.user) return;
    if (t.subjectId === 'mat-p' || t.subjectId === 'mat-r') void loadMath().then((m) => alive && setKind(m.keys[t.id] ? 'mat' : null));
    // w artefakcie polski ocenia Claude (silnika modelu nie ma w wersji jednoplikowej)
    else if (t.subjectId === 'pol-p' && import.meta.env.MODE !== 'jeden-plik') void loadText().then((m) => alive && setKind(m.keys[t.id] ? 'pol' : null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id]);
  return kind;
}

export interface AutoResult {
  points: number;
  feedback: string;
}

export async function autoGrade(t: AppTask, kind: 'mat' | 'pol', text: string, onProgress?: (p: number) => void): Promise<AutoResult | null> {
  if (kind === 'mat') {
    const { keys, params } = await loadMath();
    const g = gradeMath(keys[t.id] ?? [], t.maxPoints, text, params);
    if (!g || !g.confident) return null;
    const parts = [
      g.found.length ? `Zgadza się z kluczem: ${g.found.join('; ')}.` : 'Nie znalazłem w rozwiązaniu wyników z klucza.',
      g.missing.length && g.points < t.maxPoints ? `Do pełnej punktacji brakuje: ${g.missing.join('; ')}.` : '',
    ];
    return { points: g.points, feedback: parts.filter(Boolean).join(' ') };
  }
  const { keys, params } = await loadText();
  const ex: TextExample[] = (keys[t.id] ?? []).map(([points, v]) => ({ points, vec: unpackVec(v) }));
  const [vec] = await embedTexts([text.slice(0, 1500)], onProgress);
  const g = gradeText(vec, ex, t.maxPoints, params);
  if (!g) return null;
  const sim = Math.round(g.similarity * 100);
  const near = ex[g.nearest].points;
  return {
    points: g.points,
    feedback:
      g.points > 0
        ? `Sens odpowiedzi jest zbieżny z przykładową odpowiedzią CKE za ${near} pkt (podobieństwo ${sim}%). Sprawdź jeszcze z zasadami oceniania, czy nie brakuje elementu.`
        : `Odpowiedź nie pasuje do przykładowych odpowiedzi CKE (podobieństwo ${sim}%). Porównaj ją z zasadami oceniania.`,
  };
}

export function AutoGrader({ t, kind, initialText = '', onGraded, disabled }: { t: AppTask; kind: 'mat' | 'pol'; initialText?: string; onGraded: (r: AutoResult) => void; disabled?: boolean }) {
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [res, setRes] = useState<AutoResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await autoGrade(t, kind, text, (p) => setProgress(p));
      if (!r) setErr('Tego rozwiązania nie umiem sprawdzić automatycznie. Oceń je według zasad CKE poniżej.');
      else {
        setRes(r);
        onGraded(r);
      }
    } catch {
      setErr('Nie udało się pobrać modelu oceny. Sprawdź internet i spróbuj ponownie.');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };
  return (
    <div className="card stack-2">
      <h3>Sprawdź automatycznie</h3>
      <div className="field">
        <label htmlFor={`auto-${t.id}`}>{kind === 'mat' ? 'Twoje rozwiązanie: obliczenia i wynik' : 'Twoja odpowiedź'}</label>
        <textarea
          id={`auto-${t.id}`}
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          disabled={disabled}
          placeholder={kind === 'mat' ? 'np.\nC = (14, 8)\n|BC| = √(16 + 36) = 2√13' : 'Napisz odpowiedź pełnymi zdaniami.'}
        />
        <span className="hint">
          {kind === 'mat'
            ? 'Pisz kolejne kroki w osobnych liniach. Pierwiastek: √ albo sqrt(), potęga: ^, ułamek: /.'
            : 'Ocena porównuje sens odpowiedzi z przykładowymi odpowiedziami CKE. Za pierwszym razem strona pobiera model oceny (ok. 118 MB).'}
        </span>
      </div>
      <button type="button" className="btn btn-primary" disabled={busy || disabled || !text.trim()} onClick={() => void run()}>
        {busy ? (progress != null && progress < 1 ? `Pobieram model oceny… ${Math.round(progress * 100)}%` : 'Sprawdzam…') : 'Sprawdź'}
      </button>
      {res ? (
        <div className={`verdict ${res.points === t.maxPoints ? 'dobrze' : res.points === 0 ? 'źle' : 'częściowo'}`} role="status">
          <strong>
            Ocena automatyczna: {res.points} z {t.maxPoints} pkt
          </strong>
          <span>{res.feedback}</span>
          <span className="small muted">Jeśli algorytm się pomylił, zmień punkty niżej.</span>
        </div>
      ) : null}
      {err ? <p className="error">{err}</p> : null}
    </div>
  );
}
