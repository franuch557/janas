import { useMemo, useState } from 'react';
import { SUBJECTS, subjectDef, type Flashcard, type SubjectId } from '../model';
import { newId, useStore } from '../store/AppStore';
import { cardsFromWeakPrompt, parseCards } from '../logic/ai';
import { dueCards, reviewCard } from '../logic/flashcards';
import { activeNotes } from '../logic/memory';
import { count } from '../logic/format';
import { AiStatus, useAi, useAiCall } from '../ui/ai';
import { MathText } from '../ui/MathText';
import { Empty, IconButton, Segmented, SubjectTag } from '../ui/common';
import { go } from '../ui/router';
import { shortTopic } from './planParts';

export const fiszek = (n: number) => count(n, 'fiszka', 'fiszki', 'fiszek');

/** Powtórka listy fiszek: przód → „Pokaż odpowiedź” → „Umiem” / „Nie umiem”. */
export function CardReview({ cards, onDone }: { cards: Flashcard[]; onDone: (n: number) => void }) {
  const { updateData, today } = useStore();
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const c = cards[i];
  if (!c) return null;
  const answer = (know: boolean) => {
    updateData((d) => ({ ...d, cards: d.cards.map((x) => (x.id === c.id ? reviewCard(x, know, today, Date.now()) : x)) }));
    setShown(false);
    if (i + 1 >= cards.length) onDone(cards.length);
    else setI(i + 1);
  };
  return (
    <div className="stack">
      <span className="small muted tnum">
        Fiszka {i + 1} z {cards.length}, {c.deckName}
      </span>
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
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <button type="button" className="btn btn-secondary grow" onClick={() => answer(false)}>
            Nie umiem
          </button>
          <button type="button" className="btn btn-primary grow" onClick={() => answer(true)}>
            Umiem
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => setShown(true)}>
          Pokaż odpowiedź
        </button>
      )}
    </div>
  );
}

function WeakCards({ subject }: { subject: SubjectId }) {
  const { data, d, updateData, today, toast } = useStore();
  const ai = useAi();
  const call = useAiCall();
  if (!ai.available) return null;
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
    if (!cards?.length) return;
    const now = Date.now();
    updateData((dd) => ({
      ...dd,
      cards: [...dd.cards, ...cards.map((c) => ({ id: newId('f'), subj: subject, deck: `slabe-${subject}`, deckName: `Słabe strony: ${sub.name.toLowerCase()}`, front: c.front, back: c.back, example: c.example, step: 0, due: today, reviews: 0, at: now }))],
    }));
    toast(`Dodano: ${fiszek(cards.length)}.`);
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

export function FlashcardsView() {
  const { data, today, d, tick } = useStore();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const [subject, setSubject] = useState<SubjectId>(enabled[0]?.id ?? 'ang-p');
  const [reviewing, setReviewing] = useState<Flashcard[] | null>(null);
  const [doneN, setDoneN] = useState<number | null>(null);
  const live = data.cards.filter((c) => !c.deleted);
  const due = dueCards(live, today);
  const decks = useMemo(() => {
    const m = new Map<string, { name: string; subj: SubjectId; cards: Flashcard[] }>();
    for (const c of live) {
      const cur = m.get(c.deck) ?? { name: c.deckName, subj: c.subj, cards: [] };
      cur.cards.push(c);
      m.set(c.deck, cur);
    }
    return [...m.entries()];
  }, [live]);
  const { updateData } = useStore();

  const finish = (n: number) => {
    setReviewing(null);
    setDoneN(n);
    const ref = `f:${today}`;
    if (!d.active.ticks.some((t) => t.ref === ref && t.d === today)) tick(ref);
  };

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
      <div className="row">
        <IconButton icon="wstecz" label="Wróć do zadań" onClick={() => go('#zadania')} />
        <h1 className="grow">Fiszki</h1>
      </div>
      {doneN != null ? <p className="feedback ok">Gotowe. Powtórzono: {fiszek(doneN)}.</p> : null}
      {live.length === 0 ? (
        <Empty secondary text="Nie masz jeszcze fiszek. Utworzysz je przy zadaniach z angielskiego, w lekturach albo z tego, co ci słabo idzie." />
      ) : (
        <section className="card stack">
          <h2>Do powtórki dziś: {fiszek(due.length)}</h2>
          {due.length ? (
            <button type="button" className="btn btn-primary btn-phone-block" onClick={() => setReviewing(due.slice(0, 30))}>
              Powtórz ({due.length})
            </button>
          ) : (
            <p className="muted">Na dziś wszystko powtórzone.</p>
          )}
        </section>
      )}
      <section className="stack">
        <h2>Nowe fiszki</h2>
        <Segmented label="Przedmiot" options={enabled.map((s) => s.id)} value={subject} onChange={setSubject} render={(v) => subjectDef(v)!.short} />
        <WeakCards subject={subject} />
      </section>
      {decks.length ? (
        <section className="stack">
          <h2>Talie</h2>
          <div className="card flush list">
            {decks.map(([id, dk]) => (
              <div className="li static" key={id}>
                <SubjectTag id={dk.subj} />
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{dk.name}</span>
                  <br />
                  <span className="small muted">{fiszek(dk.cards.length)}</span>
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => setReviewing(dk.cards)}>
                  Ucz się
                </button>
                <IconButton
                  icon="kosz"
                  label={`Usuń talię ${dk.name}`}
                  onClick={() => updateData((x) => ({ ...x, cards: x.cards.map((c) => (c.deck === id ? { ...c, deleted: true, at: Date.now() } : c)) }))}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
