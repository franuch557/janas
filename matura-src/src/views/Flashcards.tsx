import { ocrImages } from '../logic/ocr';
import { useEffect, useMemo, useState } from 'react';
import { SUBJECTS, subjectDef, type Flashcard, type SubjectId } from '../model';
import { newId, useStore } from '../store/AppStore';
import { cardsFromPhotoPrompt, cardsFromWeakPrompt, parseCards, parseCardText, type CardDraft } from '../logic/ai';
import { cardState, deckStats, dueCards, gradeCard, GRADES, isLeech, ivlLabel, newLeft, requeueAt, schedule, type Grade } from '../logic/flashcards';
import { activeNotes } from '../logic/memory';
import { count } from '../logic/format';
import { AiStatus, imagesFor, useAi, useAiCall } from '../ui/ai';
import { MathText } from '../ui/MathText';
import { Confirm, Empty, IconButton, Segmented, Sheet, SubjectTag, Tag } from '../ui/common';
import { Icon } from '../ui/icons';
import { shortTopic } from './planParts';
import { compressImage } from './AddTask';

export const fiszek = (n: number) => count(n, 'fiszka', 'fiszki', 'fiszek');

/** Nowych kart na dzień (jak domyślnie w Anki). */
export const NEW_PER_DAY = 20;

/**
 * Powtórka jak w Anki: przód → „Pokaż odpowiedź” → Nie umiem / Trudne / Dobrze / Łatwe.
 * „Nie umiem” odkłada kartę kilka pozycji dalej w tej samej sesji, aż wejdzie.
 * Skróty: spacja = pokaż, 1–4 = ocena.
 */
export function CardReview({ cards, onDone }: { cards: Flashcard[]; onDone: (n: number) => void }) {
  const { data, updateData, today } = useStore();
  const [queue, setQueue] = useState<string[]>(() => cards.map((c) => c.id));
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState(0);
  const byId = new Map(data.cards.map((c) => [c.id, c]));
  const c = queue.length ? byId.get(queue[0]) ?? cards.find((x) => x.id === queue[0]) : undefined;

  const answer = (g: Grade) => {
    if (!c) return;
    const next = gradeCard(c, g, today, Date.now());
    updateData((d) => ({ ...d, cards: d.cards.map((x) => (x.id === c.id ? next : x)) }));
    setShown(false);
    const rest = queue.slice(1);
    if (next.due <= today) rest.splice(requeueAt(rest.length, 0), 0, c.id);
    else setDone((n) => n + 1);
    if (!rest.length) onDone(done + 1);
    setQueue(rest);
  };

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (!shown && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setShown(true);
      } else if (shown && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        answer(GRADES[Number(e.key) - 1].id);
      }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  });

  if (!c) return null;
  const left = new Set(queue).size;
  return (
    <div className="stack">
      <div className="row-between small muted tnum">
        <span>
          Zostało: {fiszek(left)}, {c.deckName}
        </span>
        {isLeech(c) ? <Tag tone="warn">trudna karta</Tag> : c.reviews === 0 ? <Tag tone="ink">nowa</Tag> : null}
      </div>
      <div className="card flashcard" aria-live="polite">
        <MathText text={c.front} />
        {shown ? (
          <div className="back reveal">
            <MathText text={c.back} />
            {c.example ? <p className="small">{c.example}</p> : null}
          </div>
        ) : null}
      </div>
      {shown ? (
        <div className="grades" role="group" aria-label="Jak dobrze pamiętasz?">
          {GRADES.map((g, i) => (
            <button key={g.id} type="button" className={`btn ${g.id === 'good' ? 'btn-primary' : 'btn-secondary'} grade-${g.id}`} onClick={() => answer(g.id)}>
              <span>{g.label}</span>
              <span className="small tnum">{ivlLabel(schedule(c, g.id).ivl)}</span>
              <span className="sr-only">, klawisz {i + 1}</span>
            </button>
          ))}
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setShown(true)}>
          Pokaż odpowiedź
        </button>
      )}
    </div>
  );
}

function WeakCards({ subject, onDrafts }: { subject: SubjectId; onDrafts: (d: CardDraft[], name: string) => void }) {
  const { data, d } = useStore();
  const call = useAiCall();
  const make = async () => {
    const notes = activeNotes(data.memory, subject)
      .slice(0, 15)
      .map((n) => `${n.note}${n.topic ? ` (${shortTopic(n.topic)})` : ''}`)
      .join('; ');
    const wrong = [...new Set(d.active.results.filter((r) => r.subj === subject && r.max > 0 && r.pts / r.max < 0.5).flatMap((r) => r.topics))]
      .slice(0, 10)
      .map(shortTopic)
      .join(', ');
    const sub = subjectDef(subject)!;
    const cards = await call.run(async (s, o) => parseCards(await s.json(cardsFromWeakPrompt(sub.name.toLowerCase(), notes, wrong), { signal: o.signal, cache: false }), 15));
    if (cards?.length) onDrafts(cards, `Słabe strony: ${sub.name.toLowerCase()}`);
  };
  return (
    <div className="stack-2">
      <button type="button" className="btn btn-secondary" onClick={() => void make()} disabled={call.busy}>
        Utwórz fiszki z tego, co mi słabo idzie
      </button>
      <AiStatus call={call} />
    </div>
  );
}

/** Fiszki ze zdjęć (notatki, słówka z podręcznika, tabela): Claude odczytuje pary przód–tył. */
function PhotoCards({ subject, onDrafts }: { subject: SubjectId; onDrafts: (d: CardDraft[], name: string) => void }) {
  const ai = useAi();
  const call = useAiCall();
  const [photos, setPhotos] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  // bez Claude'a: OCR w przeglądarce, odczytany tekst do poprawienia przed zapisem
  const [ocr, setOcr] = useState<{ busy: boolean; progress: number; text: string | null }>({ busy: false, progress: 0, text: null });
  const max = ai.available ? Math.max(1, Math.min(5, ai.maxImages || 1)) : 5;
  const sub = subjectDef(subject)!;
  const name = () => `Ze zdjęcia: ${sub.short}, ${new Date().toLocaleDateString('pl-PL')}`;
  const readOcr = async () => {
    setErr(null);
    setOcr({ busy: true, progress: 0, text: null });
    try {
      const text = await ocrImages(photos, (p) => setOcr((o) => ({ ...o, progress: p })));
      setOcr({ busy: false, progress: 1, text });
      if (!parseCardText(text).length) setErr('Nie znalazłem par. Popraw tekst: jedna fiszka w linii, przód i tył oddziel myślnikiem.');
    } catch {
      setOcr({ busy: false, progress: 0, text: null });
      setErr('Nie udało się odczytać zdjęcia. Sprawdź połączenie z internetem albo wklej tekst poniżej.');
    }
  };
  const read = async () => {
    if (!ai.available) return readOcr();
    const images = await imagesFor(photos);
    if (!images.length) {
      setErr('Claude nie przyjmuje teraz zdjęć. Wklej tekst poniżej.');
      return;
    }
    const cards = await call.run(async (s, o) => parseCards(await s.json(cardsFromPhotoPrompt(sub.name.toLowerCase(), images.length), { signal: o.signal, images, cache: false, modelTier: 'complex' }), 60));
    if (cards == null) return;
    if (!cards.length) {
      setErr('Na zdjęciu nie znalazłem par do fiszek. Zrób wyraźniejsze zdjęcie z bliska.');
      return;
    }
    onDrafts(cards, name());
    setPhotos([]);
  };
  const ocrDrafts = ocr.text != null ? parseCardText(ocr.text) : [];
  return (
    <div className="card stack-2">
      <h3>Ze zdjęcia</h3>
      <p className="small muted">Zrób zdjęcie listy słówek, notatek albo tabeli. {ai.available ? 'Claude odczyta' : 'Strona odczyta'} pary pojęcie – znaczenie, a ty sprawdzisz je przed zapisem.</p>
      <div className="row">
        <label className={`btn btn-secondary${photos.length >= max ? ' disabled' : ''}`}>
          <Icon name="plus" size={20} /> {photos.length ? 'Dodaj kolejne zdjęcie' : 'Zrób lub wybierz zdjęcie'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            aria-label="Zdjęcie notatek do fiszek"
            disabled={photos.length >= max}
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])].slice(0, max - photos.length);
              e.target.value = '';
              setErr(null);
              try {
                const urls = await Promise.all(files.map((f) => compressImage(f, 700_000, 1800)));
                setPhotos((p) => [...p, ...urls].slice(0, max));
              } catch {
                setErr('Nie udało się wczytać zdjęcia. Wybierz inne.');
              }
            }}
          />
        </label>
        <span className="small muted tnum">
          {photos.length} z {max}
        </span>
      </div>
      {photos.length ? (
        <div className="photo-row">
          {photos.map((p, i) => (
            <div key={i} className="photo-thumb">
              <img src={p} alt={`Zdjęcie ${i + 1}`} />
              <IconButton icon="zamknij" label={`Usuń zdjęcie ${i + 1}`} onClick={() => setPhotos((x) => x.filter((_, k) => k !== i))} />
            </div>
          ))}
        </div>
      ) : null}
      {err ? <p className="error">{err}</p> : null}
      <button type="button" className="btn btn-primary" disabled={!photos.length || call.busy || ocr.busy} onClick={() => void read()}>
        {ocr.busy ? `Odczytuję… ${Math.round(ocr.progress * 100)}%` : 'Odczytaj fiszki'}
      </button>
      {ocr.text != null ? (
        <div className="stack-2">
          <div className="field">
            <label htmlFor="fc-ocr">Odczytany tekst: popraw błędy, jedna fiszka w linii</label>
            <textarea id="fc-ocr" className="textarea" value={ocr.text} onChange={(e) => setOcr((o) => ({ ...o, text: e.target.value }))} maxLength={20000} />
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!ocrDrafts.length}
            onClick={() => {
              onDrafts(ocrDrafts, name());
              setPhotos([]);
              setOcr({ busy: false, progress: 0, text: null });
              setErr(null);
            }}
          >
            Sprawdź fiszki ({ocrDrafts.length})
          </button>
        </div>
      ) : null}
      {ai.available ? <AiStatus call={call} /> : null}
    </div>
  );
}

/** Wklejony tekst: każda linia „pojęcie – znaczenie” (także tabulator, „:”, „=”). */
function TextCards({ onDrafts }: { onDrafts: (d: CardDraft[], name: string) => void }) {
  const [text, setText] = useState('');
  const drafts = parseCardText(text);
  return (
    <div className="card stack-2">
      <h3>Z tekstu</h3>
      <div className="field">
        <label htmlFor="fc-text">Jedna fiszka w linii: przód – tył</label>
        <textarea id="fc-text" className="textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder={'to accomplish – osiągnąć\nsinus 30° – 1/2'} maxLength={20000} />
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        disabled={!drafts.length}
        onClick={() => {
          onDrafts(drafts, `Moje fiszki, ${new Date().toLocaleDateString('pl-PL')}`);
          setText('');
        }}
      >
        Sprawdź {drafts.length ? fiszek(drafts.length) : 'fiszki'}
      </button>
    </div>
  );
}

/** Podgląd przed zapisem: popraw, usuń, wybierz talię. */
function DraftEditor({ drafts, name, subject, onClose }: { drafts: CardDraft[]; name: string; subject: SubjectId; onClose: () => void }) {
  const { data, updateData, today, toast } = useStore();
  const [list, setList] = useState(drafts);
  const decks = useMemo(() => [...new Map(data.cards.filter((c) => !c.deleted && c.subj === subject).map((c) => [c.deck, c.deckName])).entries()], [data.cards, subject]);
  const [target, setTarget] = useState<string>('nowa');
  const [deckName, setDeckName] = useState(name);
  const good = list.filter((c) => c.front.trim() && c.back.trim());
  const save = () => {
    const now = Date.now();
    const deck = target === 'nowa' ? newId('t') : target;
    const dn = target === 'nowa' ? deckName.trim() || name : decks.find(([id]) => id === target)?.[1] ?? name;
    updateData((d) => ({
      ...d,
      cards: [...d.cards, ...good.map((c, i) => ({ id: newId('f'), subj: subject, deck, deckName: dn, front: c.front.trim(), back: c.back.trim(), example: c.example?.trim() || null, step: 0, due: today, reviews: 0, at: now + i }))],
    }));
    toast(`Dodano: ${fiszek(good.length)}.`);
    onClose();
  };
  const set = (i: number, k: 'front' | 'back', v: string) => setList((l) => l.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  return (
    <Sheet title={`Nowe fiszki: ${list.length}`} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label htmlFor="fc-deck">Talia</label>
          <select id="fc-deck" className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="nowa">Nowa talia</option>
            {decks.map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {target === 'nowa' ? (
          <div className="field">
            <label htmlFor="fc-dname">Nazwa talii</label>
            <input id="fc-dname" className="input" value={deckName} onChange={(e) => setDeckName(e.target.value)} maxLength={80} />
          </div>
        ) : null}
        <ol className="draft-list">
          {list.map((c, i) => (
            <li key={i} className="draft">
              <input className="input" aria-label={`Przód fiszki ${i + 1}`} value={c.front} onChange={(e) => set(i, 'front', e.target.value)} maxLength={200} />
              <input className="input" aria-label={`Tył fiszki ${i + 1}`} value={c.back} onChange={(e) => set(i, 'back', e.target.value)} maxLength={400} />
              <IconButton icon="kosz" label={`Usuń fiszkę ${i + 1}`} onClick={() => setList((l) => l.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ol>
        <div className="sheet-actions">
          <button type="button" className="btn btn-primary" disabled={!good.length} onClick={save}>
            Zapisz {fiszek(good.length)}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Anuluj
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function DeckBrowser({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, updateData, today } = useStore();
  const cards = data.cards.filter((c) => c.deck === id && !c.deleted);
  const [q, setQ] = useState('');
  const shown = cards.filter((c) => !q.trim() || `${c.front} ${c.back}`.toLowerCase().includes(q.trim().toLowerCase()));
  const del = (cid: string) => updateData((d) => ({ ...d, cards: d.cards.map((c) => (c.id === cid ? { ...c, deleted: true, at: Date.now() } : c)) }));
  return (
    <Sheet title={cards[0]?.deckName ?? 'Talia'} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label htmlFor="fc-q">Szukaj w talii</label>
          <input id="fc-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="card flush list">
          {shown.map((c) => {
            const st = cardState(c);
            return (
              <div className="li static" key={c.id}>
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{c.front}</span>
                  <br />
                  <span className="small muted">{c.back}</span>
                  <br />
                  <span className="small muted tnum">
                    {c.reviews === 0 ? 'nowa' : c.due <= today ? 'do powtórki dziś' : `następna: ${c.due}, odstęp ${ivlLabel(st.ivl)}`}
                    {st.lapses ? `, pomyłki: ${st.lapses}` : ''}
                  </span>
                </span>
                {isLeech(c) ? <Tag tone="warn">trudna</Tag> : null}
                <IconButton icon="kosz" label={`Usuń fiszkę ${c.front}`} onClick={() => del(c.id)} />
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

export function FlashcardsView() {
  const { data, today, d, tick, updateData } = useStore();
  const ai = useAi();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const [subject, setSubject] = useState<SubjectId>(enabled[0]?.id ?? 'ang-p');
  const [reviewing, setReviewing] = useState<Flashcard[] | null>(null);
  const [doneN, setDoneN] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<{ list: CardDraft[]; name: string } | null>(null);
  const [browse, setBrowse] = useState<string | null>(null);
  const [delDeck, setDelDeck] = useState<string | null>(null);
  const live = data.cards.filter((c) => !c.deleted);
  const due = dueCards(live, today, newLeft(live, today, NEW_PER_DAY));
  const dueReview = due.filter((c) => c.reviews > 0).length;
  const decks = useMemo(() => {
    const m = new Map<string, { name: string; subj: SubjectId; cards: Flashcard[] }>();
    for (const c of live) {
      const cur = m.get(c.deck) ?? { name: c.deckName, subj: c.subj, cards: [] };
      cur.cards.push(c);
      m.set(c.deck, cur);
    }
    return [...m.entries()];
  }, [live]);
  const leeches = live.filter(isLeech);

  const finish = (n: number) => {
    setReviewing(null);
    setDoneN(n);
    const ref = `f:${today}`;
    if (!d.active.ticks.some((t) => t.ref === ref && t.d === today)) tick(ref);
  };
  const onDrafts = (list: CardDraft[], name: string) => setDrafts({ list, name });

  if (reviewing) {
    return (
      <div className="page" style={{ maxWidth: 640 }}>
        <div className="row">
          <IconButton icon="wstecz" label="Zakończ powtórkę" onClick={() => setReviewing(null)} />
          <h1 className="grow" style={{ fontSize: '1.25rem' }}>
            Powtórka fiszek
          </h1>
        </div>
        <CardReview cards={reviewing} onDone={finish} />
      </div>
    );
  }
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <h1>Fiszki</h1>
      {doneN != null ? <p className="feedback ok">Gotowe. Nauczone dziś w tej sesji: {fiszek(doneN)}.</p> : null}
      {live.length === 0 ? (
        <Empty secondary text="Nie masz jeszcze fiszek. Dodaj je ze zdjęcia, z tekstu, przy zadaniach z angielskiego, w lekturach albo z tego, co ci słabo idzie." />
      ) : (
        <section className="card stack">
          <h2>Na dziś: {fiszek(due.length)}</h2>
          <p className="small muted tnum">
            Powtórki: {dueReview}, nowe: {due.length - dueReview} (najwyżej {NEW_PER_DAY} nowych dziennie). Karty, których nie pamiętasz, wracają częściej, a te, które znasz, coraz rzadziej.
          </p>
          {due.length ? (
            <button type="button" className="btn btn-primary btn-phone-block" onClick={() => setReviewing(due.slice(0, 50))}>
              Ucz się ({Math.min(50, due.length)})
            </button>
          ) : (
            <p className="muted">Na dziś wszystko powtórzone.</p>
          )}
          {leeches.length ? (
            <button type="button" className="btn btn-secondary btn-phone-block" onClick={() => setReviewing(leeches.slice(0, 30))}>
              Trudne karty ({leeches.length})
            </button>
          ) : null}
        </section>
      )}
      <section className="stack">
        <h2>Dodaj fiszki</h2>
        <Segmented label="Przedmiot" options={enabled.map((s) => s.id)} value={subject} onChange={setSubject} render={(v) => subjectDef(v)!.short} />
        <PhotoCards subject={subject} onDrafts={onDrafts} />
        <TextCards onDrafts={onDrafts} />
        {ai.available ? <WeakCards subject={subject} onDrafts={onDrafts} /> : null}
      </section>
      {decks.length ? (
        <section className="stack">
          <h2>Talie</h2>
          <div className="card flush list">
            {decks.map(([id, dk]) => {
              const st = deckStats(dk.cards, today);
              return (
                <div className="li static" key={id}>
                  <SubjectTag id={dk.subj} />
                  <span className="grow">
                    <button type="button" className="linklike" style={{ fontWeight: 600 }} onClick={() => setBrowse(id)}>
                      {dk.name}
                    </button>
                    <br />
                    <span className="small muted tnum">
                      {fiszek(st.total)}: nowe {st.fresh}, w nauce {st.learning}, opanowane {st.mature}
                      {st.due ? `, na dziś ${st.due}` : ''}
                    </span>
                  </span>
                  <button type="button" className="btn btn-secondary" onClick={() => setReviewing(dueCards(dk.cards, today).length ? dueCards(dk.cards, today) : dk.cards)}>
                    Ucz się
                  </button>
                  <IconButton icon="kosz" label={`Usuń talię ${dk.name}`} onClick={() => setDelDeck(id)} />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      {drafts ? <DraftEditor drafts={drafts.list} name={drafts.name} subject={subject} onClose={() => setDrafts(null)} /> : null}
      {browse ? <DeckBrowser id={browse} onClose={() => setBrowse(null)} /> : null}
      {delDeck ? (
        <Confirm
          title="Usunąć talię?"
          text={`Talia „${decks.find(([id]) => id === delDeck)?.[1].name ?? ''}” i postęp jej kart znikną.`}
          ok="Usuń talię"
          danger
          onOk={() => {
            updateData((x) => ({ ...x, cards: x.cards.map((c) => (c.deck === delDeck ? { ...c, deleted: true, at: Date.now() } : c)) }));
            setDelDeck(null);
          }}
          onCancel={() => setDelDeck(null)}
        />
      ) : null}
    </div>
  );
}
