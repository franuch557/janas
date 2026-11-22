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

function useExplain(t: AppTask): Data | null {
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
