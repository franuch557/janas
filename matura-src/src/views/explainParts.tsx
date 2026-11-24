// Wyjaśnienie zadania bez modelu i bez API, z danych CKE: matematyka – wzorcowe rozwiązanie
// krok po kroku, polski – przykładowe odpowiedzi ocenione przez CKE, angielski – odpowiedzi
// akceptowane i przykłady błędnych. Zadania zamknięte: tylko klucz (CKE nie podaje uzasadnienia).

import { useEffect, useState } from 'react';
import type { AppTask } from '../store/derived';
import type { EnglishItem } from '../logic/englishGrade';

type Data = { mat?: string[]; pol?: { p: number; t: string }[]; ang?: EnglishItem[] };
const cache = new Map<string, Promise<Record<string, unknown>>>();
const load = (name: 'mat' | 'pol' | 'ang') => {
  if (!cache.has(name))
    cache.set(
      name,
      (name === 'mat' ? import('../data/rozwiazania-matematyka.json') : name === 'pol' ? import('../data/wyjasnienia-polski.json') : import('../data/klucze-angielski.json')).then((m) => m.default as Record<string, unknown>),
    );
  return cache.get(name)!;
};

export function useExplain(t: AppTask): Data | null {
  const [d, setD] = useState<Data | null>(null);
  useEffect(() => {
    let alive = true;
    setD(null);
    if (t.user) return;
    const name = t.subjectId === 'pol-p' ? 'pol' : t.subjectId === 'ang-p' ? 'ang' : 'mat';
    void load(name).then((m) => {
      const v = m[t.id];
      if (alive && v) setD({ [name]: v } as Data);
    });
    return () => {
      alive = false;
    };
  }, [t.id, t.subjectId, t.user]);
  return d;
}

export function OfflineExplain({ t }: { t: AppTask }) {
  const d = useExplain(t);
  const [open, setOpen] = useState(false);
  if (!d) return null;
  return (
    <section className="card stack-2">
      <div className="row-between">
        <h3>Wyjaśnienie z materiałów CKE</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Ukryj' : 'Pokaż'}
        </button>
      </div>
      {open && d.mat ? (
        <>
          <p className="small muted">Wzorcowe rozwiązanie z zasad oceniania CKE (sposób I).</p>
          <ol className="steps">
            {d.mat.map((s, i) => (
              <li key={i} style={{ whiteSpace: 'pre-wrap' }}>
                {s}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      {open && d.pol ? (
        <>
          <p className="small muted">Przykładowe odpowiedzi ocenione przez egzaminatorów CKE. Porównaj, co w nich jest, a czego brakuje w twojej.</p>
          {d.pol.map((x, i) => (
            <blockquote key={i} className="quote">
              <strong className="tnum">{x.p} pkt:</strong> {x.t}
            </blockquote>
          ))}
        </>
      ) : null}
      {open && d.ang ? (
        <>
          <p className="small muted">Odpowiedzi akceptowane przez CKE i przykłady odpowiedzi błędnych (0 pkt). Liczy się poprawna forma i pisownia.</p>
          {d.ang.map((x) => (
            <div key={x.id} className="stack-2">
              <strong>{x.id}</strong>
              <span className="small">
                <span className="ok-text">Dobrze:</span> {x.ok.slice(0, 8).join('; ')}
              </span>
              {x.bad.length ? (
                <span className="small">
                  <span className="bad-text">Źle:</span> {x.bad.slice(0, 6).join('; ')}
                </span>
              ) : null}
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}

// ---------- „Dlaczego ta odpowiedź?” przy zadaniach zamkniętych ----------

let whyData: Promise<Record<string, string>> | null = null;
const loadWhy = () => (whyData ??= import('../data/wyjasnienia-zamkniete.json').then((m) => m.default as unknown as Record<string, string>));

export function useWhy(id: string): string | null {
  const [w, setW] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setW(null);
    void loadWhy().then((d) => alive && setW(d[id] ?? null));
    return () => {
      alive = false;
    };
  }, [id]);
  return w;
}

/**
 * Po sprawdzeniu zadania zamkniętego: przy błędzie od razu rozwinięte wyjaśnienie, dlaczego
 * poprawna jest odpowiedź z klucza; przy dobrej odpowiedzi – do rozwinięcia na życzenie.
 */
export function WhyCorrect({ t, choice }: { t: AppTask; choice: Record<string, string> }) {
  const why = useWhy(t.id);
  const items = t.answer?.items ?? [];
  const wrong = items.filter((i) => i.correct && choice[i.id] !== i.correct);
  const [open, setOpen] = useState(wrong.length > 0);
  if (!items.length) return null;
  const key = items.length === 1 ? items[0].correct : null;
  const title = key ? `Dlaczego odpowiedź ${key}?` : 'Dlaczego tak jest w kluczu?';
  if (!why && !wrong.length) return null;
  return (
    <section className={`card why${wrong.length ? ' why-bad' : ''} reveal`} aria-live="polite">
      <div className="row-between">
        <h3>{title}</h3>
        {why && !wrong.length ? (
          <button type="button" className="btn btn-secondary btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? 'Ukryj' : 'Pokaż'}
          </button>
        ) : null}
      </div>
      {wrong.length ? (
        <p className="small muted">
          {key
            ? `Zaznaczono ${choice[items[0].id] ?? '—'}, a poprawna jest ${key}.`
            : `Błędne pozycje: ${wrong.map((i) => `${i.label ?? i.id} (poprawnie: ${i.correct})`).join(', ')}.`}
        </p>
      ) : null}
      {open && why ? <p style={{ whiteSpace: 'pre-wrap' }}>{why}</p> : null}
      {open && !why ? <p className="small muted">Do tego zadania nie ma jeszcze opisu. Porównaj z rozwiązaniem z zasad oceniania CKE poniżej.</p> : null}
    </section>
  );
}
