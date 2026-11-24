// Lektury i matura ustna z polskiego.

import { checkOralPlan } from '../logic/oralCheck';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { newId, useStore } from '../store/AppStore';
import { BOOKS, bookById, bookText, EPOCHS, epochOverview, loadOral2Pack, ORAL, ORAL2, type BookBlock, type BookEntry, type BookSection } from '../store/books';
import { cardsFromBookPrompt, oral2Prompt, oralPrompt, parseCards, parseOralPlan } from '../logic/ai';
import { fmtClock, plural } from '../logic/format';
import { checkBookAnswer, type QuizVerdict } from '../logic/bookQuiz';
import { lqRef } from '../logic/bookReview';
import { AiStatus, imagesFor, useAi, useAiCall } from '../ui/ai';
import { Sheetimg } from '../ui/TaskImage';
import { MathText } from '../ui/MathText';
import { Empty, IconButton, Segmented, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { go } from '../ui/router';
import { fiszek } from './Flashcards';

function Back({ to, label }: { to: string; label: string }) {
  return <IconButton icon="wstecz" label={label} onClick={() => go(to)} />;
}

/** „Wybrane wiersze” itp.: na karcie i w nagłówku ważniejszy jest autor. */
const headline = (b: BookEntry) => (/^wybrane (wiersze|utwory)/i.test(b.tytul) && !/^m\.in\./.test(b.autor) ? { title: b.autor.replace(/\s*\(.*\)$/, ''), sub: b.tytul } : { title: b.tytul, sub: b.autor });

const short = (b: BookEntry) => {
  const c = (b.czesciowo ?? '').toLowerCase();
  return c.includes('fragment') ? 'fragmenty' : c.includes('wybran') ? 'wybrane' : null;
};

export function BooksView() {
  const [epoka, setEpoka] = useState('wszystkie');
  const [onlyOral, setOnlyOral] = useState(false);
  const [q, setQ] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const oralCount = new Map<string, number>();
  for (const p of ORAL?.pytania ?? []) if (p.lekturaId) oralCount.set(p.lekturaId, (oralCount.get(p.lekturaId) ?? 0) + 1);
  const needle = q.trim().toLowerCase();
  const list = BOOKS.filter((b) => (epoka === 'wszystkie' || b.epokaId === epoka) && (!onlyOral || oralCount.has(b.id)) && (!needle || `${b.tytul} ${b.autor} ${b.gatunek}`.toLowerCase().includes(needle)));
  const groups = (EPOCHS.length ? EPOCHS : [...new Set(BOOKS.map((b) => b.epokaId))].map((id) => ({ id, nazwa: BOOKS.find((b) => b.epokaId === id)?.epoka ?? id, lata: '' })))
    .map((e) => ({ e, books: list.filter((b) => b.epokaId === e.id) }))
    .filter((g) => g.books.length);
  return (
    <div className="page lk-page">
      <header className="lk-head">
        <div className="grow">
          <h1 className="ptitle">Lektury</h1>
          <p className="muted">
            {BOOKS.length} {plural(BOOKS.length, 'opracowanie', 'opracowania', 'opracowań')} w {EPOCHS.length} {plural(EPOCHS.length, 'epoce', 'epokach', 'epokach')}
          </p>
        </div>
        {ORAL?.pytania.length ? (
          <a className="btn btn-secondary" href="#ustny">
            Ustny polski · {ORAL.pytania.length} {plural(ORAL.pytania.length, 'pytanie', 'pytania', 'pytań')}
          </a>
        ) : null}
      </header>
      {!BOOKS.length ? (
        <p className="muted">Opracowania lektur pojawią się tutaj wkrótce.</p>
      ) : (
        <>
          <div className="lk-search">
            <Icon name="szukaj" size={20} />
            <input className="input" aria-label="Szukaj lektury" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj: tytuł, autor, gatunek" />
          </div>
          <div className="lk-chips" role="group" aria-label="Epoka">
            {[{ id: 'wszystkie', nazwa: 'Wszystkie' }, ...EPOCHS].map((e) => (
              <button key={e.id} type="button" className="chip" aria-pressed={epoka === e.id} onClick={() => setEpoka(e.id)}>
                {e.nazwa.replace(/\s*\(.*\)$/, '')}
              </button>
            ))}
            {oralCount.size ? (
              <button type="button" className="chip" aria-pressed={onlyOral} onClick={() => setOnlyOral((x) => !x)}>
                Na pytania jawne
              </button>
            ) : null}
          </div>
          {groups.length === 0 ? (
            <Empty secondary text="Brak lektur dla tych filtrów." action={{ label: 'Wyczyść filtry', run: () => { setEpoka('wszystkie'); setOnlyOral(false); setQ(''); } }} />
          ) : (
            groups.map(({ e, books }) => (
              <section className="lk-epoch" key={e.id}>
                <div className="lk-epoch-head">
                  <h2>{e.nazwa}</h2>
                  {e.lata ? <span className="lk-epoch-years">{e.lata}</span> : null}
                  <span className="grow" />
                  {epochOverview(e.id).length ? (
                    <button type="button" className="lk-link" aria-expanded={info === e.id} onClick={() => setInfo((x) => (x === e.id ? null : e.id))}>
                      {info === e.id ? 'Zwiń opis epoki' : 'O epoce'}
                    </button>
                  ) : null}
                </div>
                {info === e.id ? <EpochOverview id={e.id} /> : null}
                <div className="lk-grid">
                  {books.map((b) => {
                    const n = oralCount.get(b.id) ?? 0;
                    const sh = short(b);
                    return (
                      <button type="button" className="lk-card" key={b.id} onClick={() => go({ name: 'lektura', id: b.id })}>
                        <span className="lk-card-title">{headline(b).title}</span>
                        <span className="lk-card-author">{headline(b).sub}</span>
                        <span className="lk-tags">
                          {b.gatunek ? <span className="lk-tag">{b.gatunek.split(/[;,(]/)[0].trim()}</span> : null}
                          {sh ? <span className="lk-tag">{sh}</span> : null}
                          {n ? <span className="lk-tag lk-tag-ink">{n} {plural(n, 'pytanie jawne', 'pytania jawne', 'pytań jawnych')}</span> : null}
                          {!b.obowiazkowa ? <span className="lk-tag lk-tag-warn">spoza listy</span> : null}
                        </span>
                      </button>
                    );
                  })}
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

/** Prosty markdown w linii: **pogrubienie** i *kursywa*. */
function Md({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] != null ? <strong key={m.index}>{m[1]}</strong> : <em key={m.index}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

type Punkt = Extract<BookBlock, { typ: 'punkt' }>;
const clean = (t: string) => t.replace(/^\*\*(.*)\*\*:?$/, '$1').replace(/:$/, '');

/** Akapit: cały pogrubiony = podtytuł, cały kursywą = uwaga. */
function Para({ text }: { text: string }) {
  if (/^\*\*[^*]+\*\*:?$/.test(text)) return <h3 className="lk-sub">{clean(text)}</h3>;
  if (/^\*[^*].*\*$/.test(text)) return <p className="lk-note">{text.slice(1, -1)}</p>;
  return <p><Md text={text} /></p>;
}

/** Bloki sekcji: długie punkty z etykietą jako akapity z nagłówkiem, krótkie jako lista. */
function Blocks({ blocks }: { blocks: BookBlock[] }) {
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; ) {
    const b = blocks[i];
    if (b.typ === 'punkt') {
      const run: Punkt[] = [];
      while (i < blocks.length && blocks[i].typ === 'punkt') run.push(blocks[i++] as Punkt);
      const long = run.every((x) => x.etykieta) && run.some((x) => x.tekst.length > 160);
      if (long) {
        out.push(
          <div key={i} className="lk-defs">
            {run.map((x, k) => (
              <div key={k} className="lk-def">
                <h4><Md text={x.etykieta} /></h4>
                <p><Md text={x.tekst} /></p>
              </div>
            ))}
          </div>,
        );
      } else {
        const items = run.map((x, k) => (
          <li key={k}>
            {x.etykieta ? <strong><Md text={x.etykieta} /></strong> : null}
            {x.etykieta && x.tekst ? ' – ' : null}
            <Md text={x.tekst} />
          </li>
        ));
        out.push(run[0].nr != null ? <ol key={i} className="lk-list" start={run[0].nr}>{items}</ol> : <ul key={i} className="lk-list">{items}</ul>);
      }
      continue;
    }
    if (b.typ === 'tabela') {
      const [head, ...rows] = b.wiersze;
      out.push(
        <div key={i} style={{ overflowX: 'auto' }}>
          <table className="book-table">
            <thead><tr>{head.map((c, k) => <th key={k}><Md text={c} /></th>)}</tr></thead>
            <tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, n) => <td key={n}><Md text={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
    } else out.push(<Para key={i} text={b.tekst} />);
    i++;
  }
  return <>{out}</>;
}

/** Informacje podstawowe: siatka etykieta – wartość. */
function Facts({ blocks }: { blocks: BookBlock[] }) {
  const facts = blocks.filter((b): b is Punkt => b.typ === 'punkt' && !!b.etykieta);
  const rest = blocks.filter((b) => !(b.typ === 'punkt' && b.etykieta));
  return (
    <>
      <dl className="lk-facts">
        {facts.map((f, k) => (
          <div key={k} className={f.tekst.length > 90 ? 'wide' : undefined}>
            <dt>{clean(f.etykieta)}</dt>
            <dd><Md text={f.tekst.replace(/\.$/, '')} /></dd>
          </div>
        ))}
      </dl>
      {rest.length ? <Blocks blocks={rest} /> : null}
    </>
  );
}

/** Streszczenie: kolejne etapy na osi; akapity (uwagi, „znaczenie”) pod osią. */
function Steps({ blocks }: { blocks: BookBlock[] }) {
  const out: ReactNode[] = [];
  let run: Punkt[] = [];
  let n = 0;
  const flush = (key: number) => {
    if (!run.length) return;
    out.push(
      <ol key={`s${key}`} className="lk-steps">
        {run.map((x, k) => (
          <li key={k}>
            <span className="lk-step-no" aria-hidden="true">{++n}</span>
            <div>
              {x.etykieta ? <h4><Md text={x.etykieta} /></h4> : null}
              <p><Md text={x.tekst} /></p>
            </div>
          </li>
        ))}
      </ol>,
    );
    run = [];
  };
  blocks.forEach((b, k) => {
    if (b.typ === 'punkt') run.push(b);
    else if (b.typ === 'akapit' && /^\*\*[^*]+:?\*\*:?$/.test(b.tekst)) {
      // nagłówek aktu („**Akt I – …:**”) bez treści – jako podtytuł osi
      flush(k);
      out.push(<h3 key={k} className="lk-sub">{clean(b.tekst)}</h3>);
    } else {
      flush(k);
      out.push(<Para key={k} text={b.typ === 'akapit' ? b.tekst : ''} />);
    }
  });
  flush(blocks.length);
  return <>{out}</>;
}

/** Bohaterowie, motywy, symbole: kafelki. */
function Tiles({ blocks }: { blocks: BookBlock[] }) {
  const tiles = blocks.filter((b): b is Punkt => b.typ === 'punkt');
  const rest = blocks.filter((b) => b.typ !== 'punkt');
  return (
    <>
      <div className="lk-tiles">
        {tiles.map((t, k) => {
          // „**Imię** – opis” bez dwukropka trafia do tekstu; wydzielam imię
          const m = !t.etykieta ? t.tekst.match(/^\*\*(.+?)\*\*\s*[–:-]\s*(.*)$/) : null;
          const name = t.etykieta || m?.[1] || '';
          const text = t.etykieta ? t.tekst : m ? m[2] : t.tekst;
          return (
            <div key={k} className="lk-tile">
              {name ? <h4><Md text={name} /></h4> : null}
              <p><Md text={text} /></p>
            </div>
          );
        })}
      </div>
      {rest.length ? <Blocks blocks={rest} /> : null}
    </>
  );
}

/** „Sprawdź swoją wiedzę”: klucz odpowiedzi ukryty do kliknięcia. */
const QUIZ_KEY = (id: string) => `matura-lektura-wynik-${id}`;

/**
 * Pytania z lektury, spokojnie: na stronie tylko krótki wiersz z liczbą pytań i ostatnim wynikiem.
 * Po „Zacznij” jedno pytanie naraz: wpisujesz odpowiedź, „Sprawdź” pokazuje odpowiedź z klucza.
 */
function QuizSection({ blocks, bookId }: { blocks: BookBlock[]; bookId: string }) {
  const k = blocks.findIndex((b) => b.typ === 'akapit' && /klucz odpowiedzi/i.test(b.tekst));
  const qs = k < 0 ? [] : blocks.slice(0, k).filter((b): b is Punkt => b.typ === 'punkt');
  const keys = k < 0 ? [] : blocks.slice(k + 1).filter((b): b is Punkt => b.typ === 'punkt');
  const items = qs.map((q, i) => ({ q: q.tekst, a: keys[i]?.tekst ?? '' })).filter((x) => x.a);
  const [last, setLast] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem(QUIZ_KEY(bookId));
      const n = v == null ? NaN : Number(v);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  });
  const [order, setOrder] = useState<number[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return <Blocks blocks={blocks} />;
  const finish = (good: number) => {
    setLast(good);
    try {
      localStorage.setItem(QUIZ_KEY(bookId), String(good));
    } catch {
      /* bez zapisu w przeglądarce */
    }
  };
  if (order) return <QuizRun bookId={bookId} items={order.map((i) => ({ ...items[i], i }))} total={items.length} onFinish={finish} onClose={() => setOrder(null)} onRetry={(ids) => setOrder(ids)} />;
  return (
    <div className="lk-quiz-intro">
      <div className="grow">
        <strong>{plural(items.length, `${items.length} pytanie`, `${items.length} pytania`, `${items.length} pytań`)} z kluczem</strong>
        <span className="small muted">{last != null ? `Ostatnio: ${last} z ${items.length}` : 'Jedno pytanie naraz – wpisujesz odpowiedź i sprawdzasz.'}</span>
      </div>
      <div className="lk-quiz-intro-actions">
        <button type="button" className="btn btn-primary" onClick={() => setOrder(items.map((_, i) => i))}>
          {last != null ? 'Jeszcze raz' : 'Zacznij'}
        </button>
        <button type="button" className="lk-link" aria-expanded={showAll} onClick={() => setShowAll((x) => !x)}>
          {showAll ? 'Ukryj listę' : 'Lista z odpowiedziami'}
        </button>
      </div>
      {showAll ? (
        <ol className="lk-list lk-quiz-all">
          {items.map((x, i) => (
            <li key={i}>
              <Md text={x.q} />
              <span className="muted small"> – <Md text={x.a} /></span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function QuizRun({ bookId, items, total, onFinish, onClose, onRetry }: { bookId: string; items: { q: string; a: string; i: number }[]; total: number; onFinish: (good: number) => void; onClose: () => void; onRetry: (ids: number[]) => void }) {
  const { tick } = useStore();
  const [pos, setPos] = useState(0);
  const [text, setText] = useState('');
  const [res, setRes] = useState<{ i: number; ok: boolean }[]>([]);
  const [verdict, setVerdict] = useState<QuizVerdict | null>(null);
  const [own, setOwn] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cur = items[pos];
  useEffect(() => {
    if (cur && !verdict) inputRef.current?.focus({ preventScroll: true });
    if (verdict) nextRef.current?.focus({ preventScroll: true });
  }, [pos, !!verdict]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!cur) {
    const good = res.filter((r) => r.ok).length;
    const wrong = res.filter((r) => !r.ok).map((r) => r.i);
    return (
      <div className="lk-quiz-card lk-quiz-end" aria-live="polite">
        <strong className="lk-quiz-score tnum">
          {good} / {res.length}
        </strong>
        <p className="muted">{good === res.length ? 'Wszystko dobrze.' : `Do powtórki: ${plural(wrong.length, `${wrong.length} pytanie`, `${wrong.length} pytania`, `${wrong.length} pytań`)}.`}</p>
        <div className="lk-q-actions">
          {wrong.length ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onRetry(wrong)}>
              Powtórz błędne
            </button>
          ) : null}
          <button type="button" className="btn btn-quiet btn-sm" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    );
  }
  const ok = own ?? verdict === 'dobrze';
  const check = (give = false) => setVerdict(give ? 'zle' : checkBookAnswer(text, cur.a).verdict);
  const next = () => {
    // odpowiedź trafia do powtórek (sesja powtórek wróci do pytania)
    tick(lqRef(bookId, cur.i, ok));
    const out = [...res, { i: cur.i, ok }];
    setRes(out);
    setText('');
    setVerdict(null);
    setOwn(null);
    setPos((p) => p + 1);
    if (pos + 1 >= items.length && items.length === total) onFinish(out.filter((r) => r.ok).length);
  };
  return (
    <div className="lk-quiz-card">
      <div className="lk-quiz-top">
        <span className="small muted tnum">
          {pos + 1} / {items.length}
        </span>
        <div className="lk-quiz-dots" aria-hidden="true">
          {items.map((_, i) => (
            <span key={i} className={i < res.length ? (res[i].ok ? 'ok' : 'bad') : i === pos ? 'cur' : ''} />
          ))}
        </div>
        <button type="button" className="lk-link" onClick={onClose}>
          Zakończ
        </button>
      </div>
      <label htmlFor="lk-quiz-in" className="lk-quiz-q">
        <Md text={cur.q} />
      </label>
      <textarea
        id="lk-quiz-in"
        ref={inputRef}
        rows={2}
        value={text}
        readOnly={!!verdict}
        placeholder="Twoja odpowiedź…"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!verdict && text.trim()) check();
          }
        }}
      />
      {!verdict ? (
        <div className="lk-q-actions">
          <button type="button" className="btn btn-primary btn-sm" disabled={!text.trim()} onClick={() => check()}>
            Sprawdź
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => check(true)}>
            Nie wiem
          </button>
        </div>
      ) : (
        <div className={`lk-quiz-answer ${ok ? 'ok' : verdict === 'czesciowo' && own == null ? 'part' : 'bad'}`} aria-live="polite">
          <p>
            <span className="lk-quiz-mark">{ok ? 'Dobrze' : verdict === 'czesciowo' && own == null ? 'Prawie' : text.trim() ? 'Inaczej niż w kluczu' : 'Odpowiedź'}</span> <Md text={cur.a} />
          </p>
          <div className="lk-q-actions">
            <button ref={nextRef} type="button" className="btn btn-primary btn-sm" onClick={next}>
              {pos + 1 < items.length ? 'Dalej' : 'Wynik'}
            </button>
            {text.trim() ? (
              <button type="button" className="lk-link" onClick={() => setOwn(!ok)}>
                {ok ? 'Jednak źle' : 'Miałem dobrze'}
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

const anchor = (i: number) => `sekcja-${i}`;
type Kind = 'facts' | 'steps' | 'tiles' | 'remember' | 'quiz' | 'plain';
function kindOf(t: string): Kind {
  if (/informacje podstawowe|metryczka/i.test(t)) return 'facts';
  if (/streszczenie|plan wydarzeń|omówienie|treny ix/i.test(t)) return 'steps';
  if (/bohater|motyw|symbol/i.test(t)) return 'tiles';
  if (/najważniejsze informacje/i.test(t)) return 'remember';
  if (/sprawdź swoją wiedzę/i.test(t)) return 'quiz';
  return 'plain';
}
const tocName = (t: string) => t.replace(/\s*\/.*$/, '').replace(/ i interpretacja$/, '').replace(/^Najważniejsze informacje do zapamiętania$/, 'Do zapamiętania').replace(/^Wykorzystanie lektury na maturze$/, 'Na maturze').replace(/^Szczegółowe streszczenie$/, 'Streszczenie').replace(/^Symbole i ważne elementy$/, 'Symbole').replace(/^Geneza i znaczenie tytułu$/, 'Geneza i tytuł').replace(/^Główne motywy$|^Motywy literackie$/, 'Motywy').replace(/^Informacje podstawowe$/, 'Informacje');

function Section({ sec, i, bookId }: { sec: BookSection; i: number; bookId: string }) {
  const kind = kindOf(sec.tytul);
  const body =
    kind === 'facts' ? <Facts blocks={sec.bloki} /> :
    kind === 'steps' ? <Steps blocks={sec.bloki} /> :
    kind === 'tiles' ? <Tiles blocks={sec.bloki} /> :
    kind === 'quiz' ? <QuizSection blocks={sec.bloki} bookId={bookId} /> :
    <Blocks blocks={sec.bloki} />;
  return (
    <section id={anchor(i)} className={`lk-sec lk-sec-${kind}`}>
      <h2>{sec.tytul.replace(/\s*\/\s*Informacje podstawowe$/, '')}</h2>
      {body}
    </section>
  );
}

function EpochOverview({ id }: { id: string }) {
  const sekcje = useMemo(() => epochOverview(id), [id]);
  if (!sekcje.length) return null;
  return (
    <div className="lk-epoch-info">
      {sekcje.map((sec, i) => (
        <section key={i}>
          <h3>{sec.tytul.replace(/^Najważniejszych twórców$/, 'Najważniejsi twórcy')}</h3>
          <Blocks blocks={sec.bloki} />
        </section>
      ))}
    </div>
  );
}

/** Spis sekcji: podświetla sekcję, którą właśnie czytasz. */
function useActive(count: number) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!count || typeof IntersectionObserver === 'undefined') return;
    const els = Array.from({ length: count }, (_, i) => document.getElementById(anchor(i))).filter((x): x is HTMLElement => !!x);
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(Number(vis.target.id.split('-')[1]));
      },
      { rootMargin: '-80px 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [count]);
  return active;
}

export function BookView({ id }: { id: string }) {
  const entry = BOOKS.find((b) => b.id === id);
  const book = useMemo(() => bookById(id), [id]);
  const questions = (ORAL?.pytania ?? []).filter((p) => p.lekturaId === id);
  const active = useActive(book?.sekcje.length ?? 0);
  const tocRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = tocRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active]);
  if (!entry) return <Empty text="Nie znaleziono tej lektury." action={{ label: 'Przejdź do lektur', run: () => go('#lektury') }} />;
  const jump = (i: number) => document.getElementById(anchor(i))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="page lk-book">
      <header className="lk-hero">
        <div className="row">
          <Back to="#lektury" label="Wróć do lektur" />
          <span className="lk-eyebrow">{entry.epoka}</span>
        </div>
        <h1>{headline(entry).title}</h1>
        <p className="lk-hero-author">{headline(entry).sub}</p>
        <div className="lk-tags">
          {entry.rok ? <span className="lk-tag">{entry.rok}</span> : null}
          {entry.gatunek ? <span className="lk-tag">{entry.gatunek}</span> : null}
          {entry.czesciowo ? <span className="lk-tag">{entry.czesciowo}</span> : null}
          {!entry.obowiazkowa ? <span className="lk-tag lk-tag-warn">spoza listy obowiązkowej</span> : null}
        </div>
        {!entry.obowiazkowa ? <p className="lk-note">Tej lektury nie ma w wykazie lektur obowiązkowych zakresu podstawowego (rozporządzenie z 28.06.2024).</p> : null}
        <div className="lk-actions">
          {entry.pelnyTekst ? (
            <a className="btn btn-secondary" href={entry.pelnyTekst} target="_blank" rel="noopener noreferrer">
              Pełny tekst
            </a>
          ) : null}
          {questions.length ? (
            <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('pytania-jawne')?.scrollIntoView({ behavior: 'smooth' })}>
              Pytania jawne ({questions.length})
            </button>
          ) : null}
          {book ? <BookCards entry={entry} text={bookText(book, entry)} /> : null}
        </div>
      </header>
      {!book ? (
        <p className="muted">Opracowanie tej lektury pojawi się wkrótce.</p>
      ) : (
        <div className="lk-layout">
          <nav className="lk-toc" aria-label="Sekcje opracowania" ref={tocRef}>
            {book.sekcje.map((sec, i) => (
              <button key={i} type="button" aria-current={active === i ? 'true' : undefined} onClick={() => jump(i)}>
                {tocName(sec.tytul)}
              </button>
            ))}
          </nav>
          <article className="lk-content">
            {book.sekcje.map((sec, i) => (
              <Section key={i} sec={sec} i={i} bookId={id} />
            ))}
            {questions.length ? (
              <section className="lk-sec" id="pytania-jawne">
                <h2>Pytania jawne na maturę ustną</h2>
                <div className="card flush list">
                  {questions.map((p) => (
                    <button type="button" className="li" key={p.nr} onClick={() => go({ name: 'ustny-pytanie', nr: p.nr })}>
                      <span className="grow">{p.tresc}</span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            {book.zrodlo === 'zastepcze' ? <p className="lk-note">Opracowanie własne aplikacji – do sprawdzenia z tekstem lektury.</p> : null}
          </article>
        </div>
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
      {zad ? <Sheetimg src={zad} alt={`Materiał do zadania ${z.id}`} /> : pack === undefined ? <p className="muted">Ładowanie materiału…</p> : <p className="muted">Nie udało się wczytać materiału. Sprawdź połączenie i otwórz zadanie ponownie.</p>}
      <Stopwatch label="Przygotowanie (oba zadania)" minutes={15} />
      <Stopwatch label="Wypowiedź" minutes={5} />
      <div className="field">
        <label htmlFor="o2note">Mój plan wypowiedzi</label>
        <textarea id="o2note" className="textarea" style={{ minHeight: 160 }} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} placeholder="Teza, co widać w materiale, drugi tekst kultury, wniosek" />
      </div>
      <PlanChecklist text={text} kind="z2" />
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

/** Lista kontrolna planu według kryteriów CKE (działa bez Claude'a). */
function PlanChecklist({ text, kind, lektura }: { text: string; kind: 'jawne' | 'z2'; lektura?: string | null }) {
  const items = useMemo(() => checkOralPlan(text, kind, BOOKS.map((b) => b.tytul), lektura), [text, kind, lektura]);
  if (!text.trim()) return null;
  const ok = items.filter((i) => i.ok).length;
  return (
    <section className="card stack-2" aria-live="polite">
      <h3>
        Sprawdzenie planu: <span className="tnum">{ok} z {items.length}</span>
      </h3>
      <ul className="checklist">
        {items.map((i) => (
          <li key={i.label} className={i.ok ? 'ok' : 'todo'}>
            <Icon name={i.ok ? 'ok' : 'zle'} size={20} />
            <span>
              <strong>{i.label}</strong>
              {i.ok ? null : <span className="small muted"> {i.tip}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="small muted">Lista sprawdza, czy plan ma elementy wymagane przez CKE. Treść ocenisz sam, porównując z przykładową realizacją.</p>
    </section>
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
      <PlanChecklist text={text} kind="jawne" lektura={entry?.tytul ?? p.lektura} />
    </div>
  );
}
