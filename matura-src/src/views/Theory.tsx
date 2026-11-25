// Teoria z matematyki: każdy dział jako krótkie lekcje (teoria, wzory) i przykłady rozwiązywane
// krok po kroku. Treść: data/teoria-matematyka/<temat>.md (opracowanie własne aplikacji).

import { useEffect, useState } from 'react';
import { MATH_TOPICS } from '../data/taxonomy';
import { TIPS } from '../data/wskazowki';
import { parseTheory, type TheoryExample, type TopicTheory } from '../logic/theory';
import { MathText } from '../ui/MathText';
import { Empty, IconButton } from '../ui/common';
import { go } from '../ui/router';

const files = import.meta.glob('../../data/teoria-matematyka/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const loaderFor = (topic: string) => Object.entries(files).find(([k]) => k.endsWith(`/${topic}.md`))?.[1];
export const hasTheory = (topic: string) => !!loaderFor(topic);

function useTheory(topic: string) {
  const [state, setState] = useState<{ data: TopicTheory | null; error: boolean }>({ data: null, error: false });
  useEffect(() => {
    const load = loaderFor(topic);
    if (!load) return;
    let alive = true;
    load()
      .then((md) => alive && setState({ data: parseTheory(md), error: false }))
      .catch(() => alive && setState({ data: null, error: true }));
    return () => {
      alive = false;
    };
  }, [topic]);
  return state;
}

function Example({ ex, n }: { ex: TheoryExample; n: number }) {
  const [shown, setShown] = useState(0);
  const all = ex.steps.length;
  return (
    <div className="th-example">
      <h4>
        Przykład {n}
        {ex.title ? ` – ${ex.title}` : ''}
      </h4>
      <MathText text={ex.task} />
      {shown > 0 ? (
        <ol className="th-steps">
          {ex.steps.slice(0, shown).map((s, i) => (
            <li key={i}>
              <MathText text={s} />
            </li>
          ))}
        </ol>
      ) : null}
      {shown >= all && ex.answer ? (
        <div className="th-answer">
          <strong>Odpowiedź: </strong>
          <MathText text={ex.answer} />
        </div>
      ) : null}
      <div className="row">
        {shown < all ? (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShown((k) => k + 1)}>
              {shown === 0 ? 'Pokaż pierwszy krok' : 'Następny krok'}
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShown(all)}>
              Pokaż całe rozwiązanie
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShown(0)}>
            Ukryj rozwiązanie
          </button>
        )}
      </div>
    </div>
  );
}

function TopicPage({ topic }: { topic: string }) {
  const t = MATH_TOPICS.find((x) => x.id === topic);
  const { data, error } = useTheory(topic);
  const tips = TIPS[topic];
  if (!t || !loaderFor(topic)) return <Empty text="Nie ma jeszcze teorii do tego działu." action={{ label: 'Wszystkie działy', run: () => go({ name: 'teoria', topic: null }) }} />;
  const rozsz = !t.levels.includes('podstawowy');
  return (
    <div className="page th-page">
      <div className="row">
        <IconButton icon="wstecz" label="Wszystkie działy" onClick={() => go({ name: 'teoria', topic: null })} />
        <span className="lk-eyebrow">{rozsz ? 'Matematyka rozszerzona' : 'Matematyka'}</span>
      </div>
      <h1>{t.name}</h1>
      {error ? <p className="muted">Nie udało się wczytać teorii. Odśwież stronę.</p> : null}
      {!data ? (
        !error ? <p className="muted">Ładowanie…</p> : null
      ) : (
        <>
          {data.intro ? <MathText className="th-intro" text={data.intro} /> : null}
          {data.lessons.length > 1 ? (
            <nav className="chips" aria-label="Lekcje">
              {data.lessons.map((l, i) => (
                <button key={i} type="button" className="chip" onClick={() => document.getElementById(`lekcja-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  {i + 1}. {l.title}
                </button>
              ))}
            </nav>
          ) : null}
          {data.lessons.map((l, i) => (
            <section key={i} id={`lekcja-${i}`} className="card stack th-lesson">
              <h2>
                Lekcja {i + 1}. {l.title}
              </h2>
              <MathText className="th-theory" text={l.theory} />
              {l.examples.map((ex, k) => (
                <Example key={k} ex={ex} n={k + 1} />
              ))}
            </section>
          ))}
          {tips?.bledy.length ? (
            <section className="card stack">
              <h2>Najczęstsze błędy</h2>
              <ul className="lk-list">
                {tips.bledy.map((b, i) => (
                  <li key={i}>
                    <MathText text={b} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={() => go({ name: 'cwiczenie', subject: rozsz ? 'mat-r' : 'mat-p', topic })}>
              Przećwicz ten dział
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'zadania', subject: rozsz ? 'mat-r' : 'mat-p', topic })}>
              Zadania CKE z działu
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function TheoryView({ topic }: { topic: string | null }) {
  if (topic) return <TopicPage topic={topic} />;
  const groups = [
    { name: 'Poziom podstawowy i rozszerzony', list: MATH_TOPICS.filter((t) => t.levels.includes('podstawowy')) },
    { name: 'Tylko poziom rozszerzony', list: MATH_TOPICS.filter((t) => !t.levels.includes('podstawowy')) },
  ];
  return (
    <div className="page">
      <h1>Teoria z matematyki</h1>
      <p className="muted">Każdy dział krok po kroku: najpierw teoria i wzory, potem przykłady z rozwiązaniem pokazywanym krok po kroku.</p>
      {groups.map((g) => (
        <section key={g.name} className="stack">
          <h2>{g.name}</h2>
          <div className="card flush list">
            {g.list.map((t) => (
              <button key={t.id} type="button" className="li" disabled={!hasTheory(t.id)} onClick={() => go({ name: 'teoria', topic: t.id })}>
                <span className="grow">{t.name}</span>
                {!hasTheory(t.id) ? <span className="small muted">wkrótce</span> : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
