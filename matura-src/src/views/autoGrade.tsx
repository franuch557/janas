// Panel „Sprawdź automatycznie” (bez Claude'a): matematyka według wyników i kroków z klucza CKE,
// polski według sensu odpowiedzi w porównaniu z przykładowymi odpowiedziami CKE.
// Wynik ustawia punkty, a uczeń może je zmienić, gdy algorytm się pomylił.

import { useEffect, useState } from 'react';
import type { AppTask } from '../store/derived';
import { gradeTask, type MathKey, type MathParams } from '../logic/mathGrade';
import { gradeReport, type GradeReport } from '../logic/gradeReport';
import { GradeReportView } from './gradeReportView';
import { gradeEnglish, type EnglishItem } from '../logic/englishGrade';
import { gradeByKey, type TextKey } from '../logic/keyGrade';
import { embedTexts, gradeText, setTextModel, unpackVec, type TextExample, type TextParams } from '../logic/textGrade';

type MathKeys = Record<string, MathKey>;
type TextKeys = Record<string, { q: string | null; ex: [number, string][] }>;
let mathKeys: Promise<{ keys: MathKeys; params: MathParams }> | null = null;
let textKeys: Promise<{ keys: TextKeys; params: TextParams }> | null = null;
const loadMath = () =>
  (mathKeys ??= Promise.all([import('../data/klucze-matematyka.json'), import('../data/ocena-matematyka.json')]).then(([k, p]) => ({ keys: k.default as unknown as MathKeys, params: p.default.params })));
let engKeys: Promise<Record<string, EnglishItem[]>> | null = null;
const loadEng = () => (engKeys ??= import('../data/klucze-angielski.json').then((k) => k.default as unknown as Record<string, EnglishItem[]>));
const loadText = () =>
  (textKeys ??= Promise.all([import('../data/wzorce-polski.json'), import('../data/ocena-polski.json')]).then(([k, p]) => {
    const conf = p.default as { model?: string; prefix?: string; params: TextParams };
    if (conf.model) setTextModel(conf.model, conf.prefix ?? '');
    return { keys: k.default as unknown as TextKeys, params: conf.params };
  }));

let approxKeys: Promise<Record<string, TextKey>> | null = null;
const loadApprox = () => (approxKeys ??= import('../data/klucze-tekst.json').then((k) => k.default as unknown as Record<string, TextKey>));

/** Czy zadanie ma klucz do oceny automatycznej. 'klucz' = ocena przybliżona (słowa kluczowe z zasad CKE). */
export type AutoKind = 'mat' | 'pol' | 'ang' | 'klucz';

export function useAutoKind(t: AppTask | undefined): AutoKind | null {
  const [kind, setKind] = useState<AutoKind | null>(null);
  useEffect(() => {
    let alive = true;
    setKind(null);
    if (!t || t.auto || t.essay || t.user) return;
    const exact: Promise<AutoKind | null> =
      t.subjectId === 'mat-p' || t.subjectId === 'mat-r'
        ? loadMath().then((m) => (m.keys[t.id] ? 'mat' : null))
        : t.subjectId === 'ang-p'
          ? loadEng().then((k) => (k[t.id] ? 'ang' : null))
          : // w artefakcie polski ocenia Claude (silnika modelu nie ma w wersji jednoplikowej)
            t.subjectId === 'pol-p' && import.meta.env.MODE !== 'jeden-plik'
            ? loadText().then((m) => (m.keys[t.id] ? 'pol' : null))
            : Promise.resolve(null);
    // bez dokładnego klucza: ocena przybliżona według słów kluczowych z zasad CKE
    void exact
      .then(async (k) => k ?? ((await loadApprox())[t.id] ? 'klucz' : null))
      .then((k) => alive && setKind(k));
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
  /** Matematyka: etapy z zasad oceniania (spełnione / niespełnione). */
  report?: GradeReport;
}

export async function autoGrade(t: AppTask, kind: AutoKind, text: string, onProgress?: (p: number) => void): Promise<AutoResult | null> {
  if (kind === 'mat') {
    const { keys, params } = await loadMath();
    const k = keys[t.id];
    const g = k ? gradeTask(k, t.maxPoints, text, params) : null;
    if (!g || !g.confident) return null;
    const parts = [
      g.found.length ? `Zgadza się z kluczem: ${g.found.join('; ')}.` : 'Nie znalazłem w rozwiązaniu wyników z klucza.',
      g.missing.length && g.points < t.maxPoints ? `Do pełnej punktacji brakuje: ${g.missing.join('; ')}.` : '',
    ];
    const report = k ? gradeReport(k, t.maxPoints, text, params) : null;
    return { points: g.points, feedback: parts.filter(Boolean).join(' '), ...(report ? { report } : {}) };
  }
  if (kind === 'klucz') {
    const k = (await loadApprox())[t.id];
    const g = k ? gradeByKey(text, { ...k, max: t.maxPoints }) : null;
    if (!g) return null;
    const head = `Ocena przybliżona: porównałem twoją odpowiedź ze słowami kluczowymi z zasad oceniania CKE.`;
    const detail =
      g.basis === 'odpowiedzi'
        ? g.missing.length
          ? ` Nie znalazłem: ${g.missing.slice(0, 3).join('; ')}.`
          : ' Wszystkie elementy z klucza są w odpowiedzi.'
        : g.basis === 'poziomy' && g.matched.length
          ? ` Pasuje do opisu za ${g.points} pkt: „${g.matched[0]}”.`
          : '';
    return { points: g.points, feedback: `${head}${detail} Sprawdź z rozwiązaniem i popraw punkty, jeśli trzeba.` };
  }
  if (kind === 'ang') {
    const items = (await loadEng())[t.id] ?? [];
    const g = gradeEnglish(items, text);
    if (!g) return null;
    const label = { dobrze: 'dobrze', źle: 'źle', niepewne: 'nie ma w kluczu, sprawdź sam' } as const;
    const lines = g.items.map((x) => `${x.id}: ${x.answer || '(brak)'} – ${label[x.verdict]}`);
    return {
      points: g.points,
      feedback: `${lines.join('; ')}.${g.confident ? '' : ' CKE uznaje też inne poprawne odpowiedzi spoza klucza: jeśli twoja jest poprawna, dodaj punkt.'}`,
    };
  }
  const { keys, params } = await loadText();
  const k = keys[t.id];
  const ex: TextExample[] = (k?.ex ?? []).map(([points, v]) => ({ points, vec: unpackVec(v) }));
  const [vec] = await embedTexts([text.slice(0, 1500)], onProgress);
  // polecenie (przepisane polecenie = 0 pkt) i przykłady innych zadań (odpowiedź nie na temat)
  const others = params.om != null ? Object.entries(keys).flatMap(([id, x]) => (id === t.id ? [] : x.ex.map(([, v]) => unpackVec(v)))) : [];
  const g = gradeText(vec, ex, t.maxPoints, params, { q: k?.q ? unpackVec(k.q) : null, others });
  if (!g) return null;
  const near = ex[g.nearest].points;
  return {
    points: g.points,
    feedback:
      g.points > 0
        ? `Sens odpowiedzi jest zbieżny z przykładową odpowiedzią CKE za ${near} pkt. Sprawdź jeszcze z zasadami oceniania, czy nie brakuje elementu.`
        : `Odpowiedź nie pasuje do przykładowych odpowiedzi CKE. Porównaj ją z zasadami oceniania.`,
  };
}

export function AutoGrader({ t, kind, initialText = '', onGraded, disabled }: { t: AppTask; kind: AutoKind; initialText?: string; onGraded: (r: AutoResult) => void; disabled?: boolean }) {
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
      <h3>{res ? 'Twoje rozwiązanie' : 'Rozwiąż i sprawdź'}</h3>
      <div className="field">
        <label htmlFor={`auto-${t.id}`}>{kind === 'mat' || (kind === 'klucz' && t.subjectId.startsWith('mat')) ? 'Twoje rozwiązanie: obliczenia i wynik' : kind === 'ang' ? 'Twoje odpowiedzi: jedna w linii, po kolei' : 'Twoja odpowiedź'}</label>
        <textarea
          id={`auto-${t.id}`}
          className="textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          disabled={disabled || !!res}
          placeholder={kind === 'klucz' ? 'Wynik, kroki rozwiązania albo odpowiedź' : kind === 'mat' ? 'np.\nC = (14, 8)\n|BC| = √(16 + 36) = 2√13' : kind === 'ang' ? 'np.\nhaven’t changed since\nfor them to book\nmind if I' : 'Napisz odpowiedź pełnymi zdaniami.'}
        />
        <span className="hint">
          {kind === 'mat'
            ? 'Pisz kolejne kroki w osobnych liniach. Pierwiastek: √ albo sqrt(), potęga: ^, ułamek: /.'
            : kind === 'klucz'
              ? 'Napisz wynik i najważniejsze kroki albo pełną odpowiedź.'
              : kind === 'ang'
              ? 'Liczy się poprawna forma i pisownia, tak jak na maturze. Skróty (haven’t / have not) są równoważne.'
              : 'Napisz odpowiedź pełnymi zdaniami. Za pierwszym sprawdzeniem strona pobiera model oceny (ok. 118 MB).'}
        </span>
      </div>
      {!res ? (
      <button type="button" className="btn btn-primary" disabled={busy || disabled || !text.trim()} onClick={() => void run()}>
        {busy ? (progress != null && progress < 1 ? `Pobieram model oceny… ${Math.round(progress * 100)}%` : 'Sprawdzam…') : 'Sprawdź'}
      </button>
      ) : null}
      {res?.report ? (
        <>
          <GradeReportView r={res.report} />
          <span className="small muted">Jeśli algorytm się pomylił, zmień punkty niżej.</span>
        </>
      ) : res ? (
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

/**
 * Pole odpowiedzi do zadania otwartego bez klucza do automatycznego sprawdzania:
 * wpisana odpowiedź zostaje widoczna po odsłonięciu rozwiązania CKE, do porównania.
 */
export function OwnAnswer({ id, shown, onCompare }: { id: string; shown: boolean; onCompare: () => void }) {
  const [text, setText] = useState('');
  if (shown)
    return text.trim() ? (
      <div className="card stack-2 own-answer">
        <h3>Twoja odpowiedź</h3>
        <p className="own-answer-text">{text}</p>
        <span className="hint">Porównaj ją z rozwiązaniem CKE i oceń, ile punktów by dostała.</span>
      </div>
    ) : null;
  return (
    <div className="card stack-2">
      <div className="field">
        <label htmlFor={`own-${id}`}>Twoja odpowiedź</label>
        <textarea id={`own-${id}`} className="textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Wynik albo kluczowe kroki rozwiązania" />
        <span className="hint">Tego zadania aplikacja nie sprawdza sama. Po porównaniu zobaczysz swoją odpowiedź obok rozwiązania CKE.</span>
      </div>
      <button type="button" className="btn btn-secondary" disabled={!text.trim()} onClick={onCompare}>
        Porównaj z rozwiązaniem CKE
      </button>
    </div>
  );
}
