// Teoria z matematyki: każdy dział jako krótkie lekcje (teoria, wzory) i przykłady rozwiązywane
// krok po kroku. Treść: data/teoria-matematyka/<temat>.md (opracowanie własne aplikacji).

import { useEffect, useState } from 'react';
import { MATH_TOPICS } from '../data/taxonomy';
import { TIPS } from '../data/wskazowki';
import { parseTheory, type TheoryExample, type TheoryPart, type TopicTheory } from '../logic/theory';
import { sameBlank } from './Practice';
import { GENERATORS } from '../logic/variants';
import { Icon } from '../ui/icons';
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

/** Rozwiązanie odsłaniane krok po kroku. */
function StepReveal({ ex, startOpen = false }: { ex: TheoryExample; startOpen?: boolean }) {
  const all = ex.steps.length;
  const [shown, setShown] = useState(startOpen ? all : 0);
  return (
    <>
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
          <strong>Odpowiedź:</strong>
          <MathText text={ex.answer} />
        </div>
      ) : null}
      <div className="row">
        {shown < all ? (
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShown((k) => k + 1)}>
              {shown === 0 ? 'Pokaż pierwszy krok' : `Następny krok (${shown + 1} z ${all})`}
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
    </>
  );
}

function Example({ ex, n }: { ex: TheoryExample; n: number }) {
  return (
    <div className="th-example">
      <div className="th-ex-head">
        <span className="th-ex-no">Przykład {n}</span>
        {ex.title ? <h4>{ex.title}</h4> : null}
      </div>
      <MathText text={ex.task} />
      <StepReveal ex={ex} />
    </div>
  );
}

/** „Sprawdź się”: uczeń wpisuje wynik, aplikacja go sprawdza; rozwiązanie dopiero po sprawdzeniu albo na życzenie. */
function SelfCheck({ ex }: { ex: TheoryExample }) {
  const [val, setVal] = useState('');
  const [res, setRes] = useState<boolean | null>(null);
  const [giveUp, setGiveUp] = useState(false);
  const want = ex.check ?? '';
  const done = res === true || giveUp;
  const check = () => setRes(want.split('|').some((w) => sameBlank(val, w.trim())));
  return (
    <div className="th-example th-self">
      <div className="th-ex-head">
        <span className="th-ex-no">Sprawdź się</span>
        {ex.title ? <h4>{ex.title}</h4> : null}
      </div>
      <MathText text={ex.task} />
      {!done ? (
        <div className="th-self-row">
          <input className="input" aria-label="Twój wynik" placeholder="Twój wynik" value={val} onChange={(e) => { setVal(e.target.value); setRes(null); }} onKeyDown={(e) => e.key === 'Enter' && val.trim() && check()} />
          <button type="button" className="btn btn-primary btn-sm" disabled={!val.trim()} onClick={check}>
            Sprawdź
          </button>
        </div>
      ) : null}
      {res === false && !giveUp ? (
        <div className="th-self-res bad" role="status">
          <Icon name="zle" size={18} /> Jeszcze nie. Sprawdź obliczenia i spróbuj ponownie.
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setGiveUp(true)}>
            Pokaż rozwiązanie
          </button>
        </div>
      ) : null}
      {res === true ? (
        <div className="th-self-res ok" role="status">
          <Icon name="ok" size={18} /> Dobrze! Porównaj swoje kroki z rozwiązaniem.
        </div>
      ) : null}
      {done ? <StepReveal ex={ex} startOpen /> : null}
      {!done && res === null ? <span className="small muted">Rozwiąż na kartce i wpisz sam wynik. Rozwiązanie zobaczysz po sprawdzeniu.</span> : null}
    </div>
  );
}

const PART_LABEL: Record<TheoryPart['kind'], string> = { text: '', key: 'Zapamiętaj', warn: 'Uwaga', method: 'Jak to rozwiązać' };
function Part({ p }: { p: TheoryPart }) {
  if (p.kind === 'text') return <MathText className="th-theory" text={p.text} />;
  return (
    <div className={`th-box th-${p.kind}`}>
      <span className="th-box-label">{PART_LABEL[p.kind]}</span>
      <MathText className="th-theory" text={p.text} />
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
            <section key={i} id={`lekcja-${i}`} className="th-lesson">
              <div className="th-lesson-head">
                <span className="th-lesson-no">Lekcja {i + 1}</span>
                <h2>{l.title}</h2>
              </div>
              {l.parts.map((p, k) => (
                <Part key={k} p={p} />
              ))}
              {l.examples.filter((ex) => !ex.self).map((ex, k) => (
                <Example key={k} ex={ex} n={k + 1} />
              ))}
              {l.examples.filter((ex) => ex.self).map((ex, k) => (
                <SelfCheck key={`s${k}`} ex={ex} />
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
            {!rozsz && GENERATORS.some((g) => g.subjectId === 'mat-r' && g.topic === topic) ? (
              <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'cwiczenie', subject: 'mat-r', topic })}>
                Przećwicz (rozszerzenie)
              </button>
            ) : null}
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
