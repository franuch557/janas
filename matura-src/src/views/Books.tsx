// Lektury i matura ustna z polskiego.

import { useEffect, useMemo, useRef, useState } from 'react';
import { newId, useStore } from '../store/AppStore';
import { BOOKS, bookById, bookText, EPOCHS, loadOral2Pack, ORAL, ORAL2, type BookEntry } from '../store/books';
import { cardsFromBookPrompt, oral2Prompt, oralPrompt, parseCards, parseOralPlan } from '../logic/ai';
import { fmtClock } from '../logic/format';
import { AiStatus, imagesFor, useAi, useAiCall } from '../ui/ai';
import { Sheetimg } from '../ui/TaskImage';
import { MathText } from '../ui/MathText';
import { Empty, IconButton, Segmented, useNow } from '../ui/common';
import { go } from '../ui/router';
import { fiszek } from './Flashcards';

function Back({ to, label }: { to: string; label: string }) {
  return <IconButton icon="wstecz" label={label} onClick={() => go(to)} />;
}

export function BooksView() {
  const [epoka, setEpoka] = useState('wszystkie');
  const [onlyOral, setOnlyOral] = useState(false);
  const [q, setQ] = useState('');
  const oralIds = new Set((ORAL?.pytania ?? []).map((p) => p.lekturaId).filter(Boolean) as string[]);
  const list = BOOKS.filter((b) => (epoka === 'wszystkie' || b.epokaId === epoka) && (!onlyOral || oralIds.has(b.id)) && (!q.trim() || `${b.tytul} ${b.autor} ${b.gatunek}`.toLowerCase().includes(q.trim().toLowerCase())));
  const groups = (EPOCHS.length ? EPOCHS : [...new Set(BOOKS.map((b) => b.epokaId))].map((id) => ({ id, nazwa: BOOKS.find((b) => b.epokaId === id)?.epoka ?? id, lata: '' })))
    .map((e) => ({ e, books: list.filter((b) => b.epokaId === e.id) }))
    .filter((g) => g.books.length);
  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <div className="row-between">
        <h1>Lektury</h1>
        {ORAL?.pytania.length ? (
          <a className="btn btn-secondary" href="#ustny">
            Ustny polski: {ORAL.pytania.length} pytań
          </a>
        ) : null}
      </div>
      {!BOOKS.length ? (
        <p className="muted">Opracowania lektur pojawią się tutaj wkrótce.</p>
      ) : (
        <>
          <div className="field">
            <label htmlFor="lq">Szukaj lektury</label>
            <input id="lq" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="tytuł albo autor" />
          </div>
          <div className="chips" role="group" aria-label="Epoka">
            {[{ id: 'wszystkie', nazwa: 'wszystkie' }, ...EPOCHS].map((e) => (
              <button key={e.id} type="button" className="chip" aria-pressed={epoka === e.id} onClick={() => setEpoka(e.id)}>
                {e.nazwa}
              </button>
            ))}
            {oralIds.size ? (
              <button type="button" className="chip" aria-pressed={onlyOral} onClick={() => setOnlyOral((x) => !x)}>
                na pytania jawne
              </button>
            ) : null}
          </div>
          {groups.length === 0 ? (
            <Empty secondary text="Brak lektur dla tych filtrów." action={{ label: 'Wyczyść filtry', run: () => { setEpoka('wszystkie'); setOnlyOral(false); setQ(''); } }} />
          ) : (
            groups.map(({ e, books }) => (
              <section className="stack" key={e.id}>
                <h2>
                  {e.nazwa}
                  {e.lata ? <span className="small muted"> ({e.lata})</span> : null}
                </h2>
                <div className="card flush list">
                  {books.map((b) => (
                    <button type="button" className="li" key={b.id} onClick={() => go({ name: 'lektura', id: b.id })}>
                      <span className="grow">
                        <span style={{ fontWeight: 600 }}>{b.tytul}</span>
                        <br />
                        <span className="small muted">
                          {b.autor}
                          {b.czesciowo ? `, ${b.czesciowo}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

function BookCards({ entry, text }: { entry: BookEntry; text: string }) {
  const { updateData, today, toast } = useStore();
  const ai = useAi();
  const call = useAiCall();
  if (!ai.available) return null;
  const make = async () => {
    const cards = await call.run(async (s, o) => parseCards(await s.json(cardsFromBookPrompt(entry.tytul, text), { signal: o.signal }), 15));
    if (!cards?.length) return;
    const now = Date.now();
    updateData((d) => ({ ...d, cards: [...d.cards, ...cards.map((c) => ({ id: newId('f'), subj: 'pol-p' as const, deck: `lektura-${entry.id}`, deckName: entry.tytul, front: c.front, back: c.back, example: c.example, step: 0, due: today, reviews: 0, at: now }))] }));
    toast(`Dodano: ${fiszek(cards.length)}.`);
  };
  return (
    <div className="stack-2">
      <button type="button" className="btn btn-secondary" onClick={() => void make()} disabled={call.busy}>
        Utwórz fiszki
      </button>
      <AiStatus call={call} />
    </div>
  );
}

export function BookView({ id }: { id: string }) {
  const entry = BOOKS.find((b) => b.id === id);
  const book = useMemo(() => bookById(id), [id]);
  const questions = (ORAL?.pytania ?? []).filter((p) => p.lekturaId === id);
  if (!entry) return <Empty text="Nie znaleziono tej lektury." action={{ label: 'Przejdź do lektur', run: () => go('#lektury') }} />;
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="row">
        <Back to="#lektury" label="Wróć do lektur" />
        <h1 className="grow" style={{ fontSize: '1.5rem', lineHeight: '1.875rem' }}>
          {entry.tytul}
        </h1>
      </div>
      <section className="card stack-2">
        <p>
          <strong>{entry.autor}</strong>
          {entry.rok ? `, ${entry.rok}` : ''}
        </p>
        <p className="muted">
          {[entry.gatunek, entry.epoka, entry.czesciowo].filter(Boolean).join(', ')}
        </p>
        {book
          ? Object.entries(book.metryczka)
              .filter(([k]) => !['autor', 'tytul', 'rok', 'gatunek', 'epoka'].includes(k))
              .map(([k, v]) => (
                <p key={k} className="small">
                  {k}: {v}
                </p>
              ))
          : null}
        {entry.pelnyTekst ? (
          <a href={entry.pelnyTekst} target="_blank" rel="noopener noreferrer">
            Pełny tekst (wolnelektury.pl)
          </a>
        ) : null}
      </section>
      {!book ? (
        <p className="muted">Opracowanie tej lektury pojawi się wkrótce.</p>
      ) : (
        <>
          <BookCards entry={entry} text={bookText(book, entry)} />
          {book.streszczenie.length ? (
            <section className="stack">
              <h2>Streszczenie</h2>
              {book.streszczenie.map((p, i) => (
                <details key={i} className="card" open={i === 0}>
                  <summary style={{ fontWeight: 650, cursor: 'pointer', minHeight: 32 }}>{p.tytul}</summary>
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{p.tekst}</p>
                </details>
              ))}
            </section>
          ) : null}
          {book.bohaterowie.length ? (
            <section className="stack">
              <h2>Bohaterowie</h2>
              <div className="card flush list">
                {book.bohaterowie.map((b, i) => (
                  <div className="li static" key={i} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <strong>{b.imie}</strong>
                    <span className="small">{b.opis}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {book.problematyka.length ? (
            <section className="stack-2">
              <h2>Problematyka</h2>
              <ul className="topic-list">{book.problematyka.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          {book.motywy.length ? (
            <section className="stack-2">
              <h2>Motywy</h2>
              <ul className="topic-list">
                {book.motywy.map((m, i) => (
                  <li key={i}>
                    <strong>{m.motyw}</strong>: {m.opis}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {book.konteksty.length ? (
            <section className="stack-2">
              <h2>Konteksty</h2>
              <ul className="topic-list">{book.konteksty.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          {book.cytaty.length ? (
            <section className="stack-2">
              <h2>Cytaty</h2>
              {book.cytaty.map((c, i) => (
                <blockquote key={i} className="card" style={{ margin: 0 }}>
                  <p>„{c.tekst}”</p>
                  {c.kontekst ? <p className="small muted">{c.kontekst}</p> : null}
                </blockquote>
              ))}
            </section>
          ) : null}
          {book.doWypracowania.length ? (
            <section className="stack-2">
              <h2>Do wypracowania</h2>
              <ul className="topic-list">{book.doWypracowania.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </section>
          ) : null}
          {questions.length ? (
            <section className="stack-2">
              <h2>Pytania jawne</h2>
              <div className="card flush list">
                {questions.map((p) => (
                  <button type="button" className="li" key={p.nr} onClick={() => go({ name: 'ustny-pytanie', nr: p.nr })}>
                    <span className="grow">{p.tresc}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {book.zrodlo ? <p className="small muted">Źródło: {book.zrodlo}</p> : null}
        </>
      )}
    </div>
  );
}

export function OralView() {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'jawne' | 'niejawne'>('jawne');
  if (!ORAL || !ORAL.pytania.length) {
    return (
      <div className="page" style={{ maxWidth: 760 }}>
        <div className="row">
          <Back to="#lektury" label="Wróć do lektur" />
          <h1 className="grow">Ustny polski</h1>
        </div>
        <p className="muted">Pytania jawne na maturę ustną pojawią się tutaj, gdy CKE je opublikuje.</p>
      </div>
    );
  }
  const list = ORAL.pytania.filter((p) => !q.trim() || `${p.nr} ${p.tresc} ${p.lektura}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="row">
        <Back to="#lektury" label="Wróć do lektur" />
        <h1 className="grow">Ustny polski</h1>
      </div>
      {ORAL2?.zadania.length ? (
        <Segmented label="Zadanie" options={['jawne', 'niejawne'] as const} value={tab} onChange={setTab} render={(v) => (v === 'jawne' ? `Zadanie 1: pytania jawne (${ORAL!.pytania.length})` : `Zadanie 2: zbiór CKE (${ORAL2!.zadania.length})`)} />
      ) : null}
      {tab === 'niejawne' ? <Oral2List /> : (
      <>
      <p className="small muted">{[ORAL.zrodlo, ORAL.rok].filter(Boolean).join(', ')}</p>
      <div className="field">
        <label htmlFor="oq">Szukaj pytania</label>
        <input id="oq" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="card flush list">
        {list.map((p) => (
          <button type="button" className="li" key={p.nr} onClick={() => go({ name: 'ustny-pytanie', nr: p.nr })}>
            <span className="tnum muted" style={{ minWidth: 32 }}>
              {p.nr}.
            </span>
            <span className="grow">
              {p.tresc}
              <br />
              <span className="small muted">{p.lektura}</span>
            </span>
          </button>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

const TYP2: Record<string, string> = { literacki: 'Materiał literacki', ikoniczny: 'Materiał ikoniczny (obraz, plakat, zdjęcie)', 'językowy': 'Materiał do analizy językowej' };

function Oral2List() {
  const { data } = useStore();
  const groups = [1, 2, 3].map((c) => ORAL2!.zadania.filter((z) => z.czesc === c)).filter((g) => g.length);
  return (
    <div className="stack">
      <p className="small muted">
        Zadanie 2 losujesz na egzaminie razem z pytaniem jawnym. Ćwicz na przykładowych zadaniach CKE: materiał, przygotowanie, wypowiedź i porównanie z przykładową realizacją. Źródło: {ORAL2!.zrodlo}.
      </p>
      {groups.map((g) => (
        <section key={g[0].czesc} className="stack-2">
          <h2>{TYP2[g[0].typ] ?? g[0].typ}</h2>
          <div className="card flush list">
            {g.map((z) => (
              <button type="button" className="li" key={z.id} onClick={() => go({ name: 'ustny-pytanie', nr: `z2-${z.id}` })}>
                <span className="tnum muted" style={{ minWidth: 40 }}>
                  {z.id}
                </span>
                <span className="grow">{z.pytanie || z.polecenie}</span>
                {data.oral[`z2-${z.id}`]?.text ? <span className="small muted">notatka</span> : null}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Oral2View({ id }: { id: string }) {
  const { data, updateData } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const key = `z2-${id}`;
  const z = ORAL2?.zadania.find((x) => x.id === id);
  const note = data.oral[key];
  const [text, setText] = useState(note?.text ?? '');
  const [showKey, setShowKey] = useState(false);
  const [pack, setPack] = useState<{ zad: Record<string, string>; odp: Record<string, string> } | null | undefined>(undefined);
  const [tip, setTip] = useState<string | null>(null);
  const saved = useRef(note?.text ?? '');
  useEffect(() => {
    let alive = true;
    void loadOral2Pack().then((p) => alive && setPack(p));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (text === saved.current) return;
    const t = setTimeout(() => {
      saved.current = text;
      updateData((d) => ({ ...d, oral: { ...d.oral, [key]: { nr: key, text, plan: null, at: Date.now() } } }));
    }, 1000);
    return () => clearTimeout(t);
  }, [text, key, updateData]);
  if (!z) return <Empty text="Nie znaleziono tego zadania." action={{ label: 'Przejdź do ustnego', run: () => go('#ustny') }} />;
  const zad = pack?.zad[id];
  const odp = pack?.odp[id];
  const ask = async () => {
    const images = await imagesFor([zad, showKey ? odp : null]);
    const r = await call.run(async (s, o) => (await s(oral2Prompt(z.polecenie, z.typ, text, images.length > 1), { signal: o.signal, images, onText: o.onText, cache: false })).text);
    if (r) setTip(r);
  };
  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="row">
        <Back to="#ustny" label="Wróć do zadań" />
        <h1 className="grow" style={{ fontSize: '1.25rem', lineHeight: '1.625rem' }}>
          Zadanie {z.id}
        </h1>
      </div>
      <p className="small muted">{TYP2[z.typ] ?? z.typ}</p>
      <p style={{ fontSize: '1.125rem' }}>{z.polecenie}</p>
      {zad ? <Sheetimg src={zad} alt={`Materiał do zadania ${z.id}`} /> : pack === undefined ? <p className="muted">Ładowanie materiału…</p> : <p className="muted">Materiał (obraz) jest dostępny w wersji aplikacji opublikowanej jako artefakt.</p>}
      <Stopwatch label="Przygotowanie (oba zadania)" minutes={15} />
      <Stopwatch label="Wypowiedź" minutes={5} />
      <div className="field">
        <label htmlFor="o2note">Mój plan wypowiedzi</label>
        <textarea id="o2note" className="textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} placeholder="Teza, co widać w materiale, drugi tekst kultury, wniosek" />
      </div>
      {ai.available ? (
        <section className="card ai-box">
          <button type="button" className="btn btn-secondary" onClick={() => void ask()} disabled={call.busy}>
            {text.trim() ? 'Oceń mój plan z Claude’em' : 'Podpowiedz, jak zacząć'}
          </button>
          <AiStatus call={call} streaming />
          {call.busy && call.text ? <MathText text={call.text} /> : tip ? <MathText text={tip} /> : null}
        </section>
      ) : null}
      {odp ? (
        showKey ? (
          <section className="stack-2">
            <h2>Przykładowa realizacja CKE</h2>
            <Sheetimg src={odp} alt={`Przykładowa realizacja zadania ${z.id}`} />
          </section>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setShowKey(true)}>
            Pokaż przykładową realizację CKE
          </button>
        )
      ) : null}
    </div>
  );
}

function Stopwatch({ label, minutes }: { label: string; minutes: number }) {
  const [start, setStart] = useState<number | null>(null);
  const now = useNow(1000, start != null);
  const left = start == null ? minutes * 60_000 : Math.max(0, minutes * 60_000 - (now - start));
  return (
    <div className="row-between card" style={{ padding: '8px 16px' }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <span className={`timer${left === 0 ? ' over' : ''}`} role="timer">
        {fmtClock(left)}
      </span>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setStart(start == null ? Date.now() : null)}>
        {start == null ? 'Start' : 'Od nowa'}
      </button>
    </div>
  );
}

export function OralQuestionView({ nr }: { nr: string }) {
  if (nr.startsWith('z2-')) return <Oral2View id={nr.slice(3)} />;
  return <OralQuestion nr={nr} />;
}

function OralQuestion({ nr }: { nr: string }) {
  const { data, updateData } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const p = ORAL?.pytania.find((x) => x.nr === nr);
  const note = data.oral[nr];
  const [text, setText] = useState(note?.text ?? '');
  const saved = useRef(note?.text ?? '');
  useEffect(() => {
    if (text === saved.current) return;
    const t = setTimeout(() => {
      saved.current = text;
      updateData((d) => ({ ...d, oral: { ...d.oral, [nr]: { nr, text, plan: d.oral[nr]?.plan ?? null, at: Date.now() } } }));
    }, 1000);
    return () => clearTimeout(t);
  }, [text, nr, updateData]);
  if (!p) return <Empty text="Nie znaleziono tego pytania." action={{ label: 'Przejdź do pytań', run: () => go('#ustny') }} />;
  const entry = p.lekturaId ? BOOKS.find((b) => b.id === p.lekturaId) : undefined;
  const plan = note?.plan;
  const prepare = async () => {
    const b = p.lekturaId ? bookById(p.lekturaId) : null;
    const r = await call.run(async (s, o) => parseOralPlan(await s.json(oralPrompt(p.tresc, p.lektura, b ? bookText(b, entry) : ''), { signal: o.signal })));
    if (r) updateData((d) => ({ ...d, oral: { ...d.oral, [nr]: { nr, text: d.oral[nr]?.text ?? text, plan: r, at: Date.now() } } }));
  };
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="row">
        <Back to="#ustny" label="Wróć do pytań" />
        <h1 className="grow" style={{ fontSize: '1.25rem', lineHeight: '1.625rem' }}>
          Pytanie {p.nr}
        </h1>
      </div>
      <p style={{ fontSize: '1.125rem' }}>{p.tresc}</p>
      {entry ? (
        <div>
          <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'lektura', id: entry.id })}>
            Lektura: {entry.tytul}
          </button>
        </div>
      ) : p.lektura ? (
        <p className="muted">Lektura: {p.lektura}</p>
      ) : null}
      <Stopwatch label="Przygotowanie" minutes={10} />
      <Stopwatch label="Wypowiedź" minutes={5} />
      {ai.available ? (
        <section className="card ai-box">
          <button type="button" className="btn btn-secondary" onClick={() => void prepare()} disabled={call.busy}>
            Przygotuj plan odpowiedzi z Claude’em
          </button>
          <AiStatus call={call} />
          {plan ? (
            <div className="stack-2">
              <p>
                <strong>Teza:</strong> {plan.teza}
              </p>
              <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {plan.argumenty.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
              {plan.kontekst ? (
                <p>
                  <strong>Kontekst:</strong> {plan.kontekst}
                </p>
              ) : null}
              {plan.zakonczenie ? (
                <p>
                  <strong>Zakończenie:</strong> {plan.zakonczenie}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="field">
        <label htmlFor="onote">Moja notatka</label>
        <textarea id="onote" className="textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} />
      </div>
    </div>
  );
}
