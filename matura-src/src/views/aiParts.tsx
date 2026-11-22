// Funkcje z Claude'em przy zadaniu: sprawdzanie zadania otwartego z kluczem,
// wyjaśnienia (podpowiedź, pełne rozwiązanie, dopytanie), fiszki z zadania.

import { useState } from 'react';
import { subjectDef, type ChatTurn, type Explanation, type MistakeType } from '../model';
import { newId, useStore } from '../store/AppStore';
import type { AppTask } from '../store/derived';
import { loadPack } from '../store/catalog';
import { cardsFromTaskPrompt, chatIntro, essayPrompt, explainPrompt, gradePrompt, parseCards, parseEssayGrade, parseGrade, type EssayGrade, type GradeResult } from '../logic/ai';
import { countWords } from '../logic/scoring';
import { addNotes, memoryHint } from '../logic/memory';
import { AiStatus, imagesFor, useAi, useAiCall } from '../ui/ai';
import { MathText } from '../ui/MathText';
import { Icon } from '../ui/icons';
import { compressImage } from './AddTask';

/** Obrazy zadania z pakietu: treść, materiał i (opcjonalnie) klucz z zasad oceniania. */
export async function taskImageUrls(t: AppTask, withKey: boolean): Promise<{ zad: string | null; ctx: string | null; odp: string | null }> {
  if (t.user || !t.examId) return { zad: null, ctx: null, odp: null };
  try {
    const pack = await loadPack(t.examId);
    return { zad: pack.zad[t.nr] ?? null, ctx: t.context ? pack.ctx[t.context] ?? null : null, odp: withKey ? pack.odp[t.nr] ?? null : null };
  } catch {
    return { zad: null, ctx: null, odp: null };
  }
}

export function useMemoryWriter() {
  const { updateData } = useStore();
  return (notes: { subj: AppTask['subjectId']; topic: string | null; type: MistakeType; note: string }[]) => {
    if (!notes.length) return;
    updateData((d) => ({ ...d, memory: addNotes(d.memory, notes, Date.now(), () => newId('m')) }));
  };
}

export function Verdict({ r }: { r: GradeResult }) {
  return (
    <div className={`verdict ${r.verdict}`} role="status">
      <strong>
        {r.verdict === 'dobrze' ? 'Dobrze' : r.verdict === 'częściowo' ? 'Częściowo' : 'Źle'}: {r.points} z {r.max} pkt
      </strong>
      <MathText text={r.feedback} />
      {r.mistakes.length ? (
        <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {r.mistakes.map((m, i) => (
            <li key={i}>
              {m.type}: {m.note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Sprawdzenie zadania otwartego przez Claude'a: wpisany wynik albo zdjęcie z kartki. */
export function OpenGrader({ t, onGraded, initialText = '' }: { t: AppTask; onGraded: (r: GradeResult) => void; initialText?: string }) {
  const { data } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const remember = useMemoryWriter();
  const [text, setText] = useState(initialText);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  if (!ai.available) return null;
  const sub = subjectDef(t.subjectId)!;
  const check = async () => {
    const urls = await taskImageUrls(t, true);
    const r = await call.run(async (s, o) => {
      const images = await imagesFor([urls.zad, urls.ctx, urls.odp, photo]);
      const raw = await s.json(
        gradePrompt({ subject: sub.name.toLowerCase(), label: t.label, max: t.maxPoints, answer: text.trim(), hasPhoto: !!photo && images.length > 1, hasKey: !!urls.odp, memory: memoryHint(data.memory, t.subjectId, t.topics[0] ?? null) }),
        { signal: o.signal, images, cache: false },
      );
      return parseGrade(raw, t.maxPoints);
    });
    if (r) {
      remember(r.mistakes.map((m) => ({ subj: t.subjectId, topic: t.topics[0] ?? null, type: m.type, note: m.note })));
      onGraded(r);
    } else if (!call.error && r === null) {
      /* przerwane albo błąd – komunikat pokazuje AiStatus */
    }
  };
  return (
    <div className="card ai-box">
      <h3>Sprawdź z Claude’em</h3>
      <div className="field">
        <label htmlFor={`ans-${t.id}`}>Twój wynik lub kluczowe kroki</label>
        <textarea id={`ans-${t.id}`} className="textarea" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} />
      </div>
      <div className="row">
        <label className="btn btn-secondary">
          <Icon name="plus" size={20} /> {photo ? 'Zmień zdjęcie' : 'Dodaj zdjęcie rozwiązania'}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            aria-label="Zdjęcie rozwiązania z kartki"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhotoErr(null);
              try {
                setPhoto(await compressImage(f, 600_000, 1600));
              } catch {
                setPhotoErr('Nie udało się wczytać zdjęcia. Wybierz inne.');
              }
            }}
          />
        </label>
        {photo ? (
          <button type="button" className="btn btn-quiet" onClick={() => setPhoto(null)}>
            Usuń zdjęcie
          </button>
        ) : null}
      </div>
      {photo ? <img src={photo} alt="Zdjęcie rozwiązania" className="photo-prev" /> : null}
      {photoErr ? <p className="error">{photoErr}</p> : null}
      <button type="button" className="btn btn-secondary" onClick={() => void check()} disabled={call.busy || (!text.trim() && !photo)}>
        Sprawdź z kluczem
      </button>
      <AiStatus call={call} />
    </div>
  );
}

/** Wyjaśnienie zadania: podpowiedź → pełne rozwiązanie → dopytanie. Zapis w db, drugi raz bez kosztu. */
export function Explain({ t }: { t: AppTask }) {
  const { data, updateData } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const remember = useMemoryWriter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(!!data.explanations[t.id]);
  const ex = data.explanations[t.id];
  if (!ai.available) return null;
  const sub = subjectDef(t.subjectId)!;
  const memory = memoryHint(data.memory, t.subjectId, t.topics[0] ?? null);
  const save = (fn: (e: Explanation) => Explanation) =>
    updateData((d) => {
      const cur = d.explanations[t.id] ?? { taskId: t.id, hint: null, full: null, chat: [], at: 0 };
      return { ...d, explanations: { ...d.explanations, [t.id]: { ...fn(cur), at: Date.now() } } };
    });
  const ask = async (stage: 'hint' | 'full') => {
    setOpen(true);
    const urls = await taskImageUrls(t, stage === 'full');
    const res = await call.run(async (s, o) => {
      const images = await imagesFor([urls.zad, urls.ctx, urls.odp]);
      const r = await s(explainPrompt({ stage, subject: sub.name.toLowerCase(), label: t.label, memory, hasKey: !!urls.odp, hint: ex?.hint }), { signal: o.signal, onText: o.onText, images });
      return r.text;
    });
    if (res) save((e) => ({ ...e, [stage]: res }));
  };
  const followUp = async () => {
    const question = q.trim();
    if (!question) return;
    const turns: ChatTurn[] = [...(ex?.chat ?? []), { role: 'user' as const, content: question }].slice(-8);
    if (turns[0].role !== 'user') turns.shift();
    setQ('');
    save((e) => ({ ...e, chat: turns }));
    const res = await call.run(async (s, o) => {
      const r = await s([{ role: 'user', content: chatIntro({ subject: sub.name.toLowerCase(), label: t.label, hint: ex?.hint ?? null, full: ex?.full ?? null, memory }) }, ...turns], { signal: o.signal, onText: o.onText, cache: false });
      return r.text;
    });
    if (res) {
      save((e) => ({ ...e, chat: [...turns, { role: 'assistant' as const, content: res }].slice(-8) }));
      remember([{ subj: t.subjectId, topic: t.topics[0] ?? null, type: 'inne', note: `dopytywał: ${question.slice(0, 90)}` }]);
    }
  };
  if (!open)
    return (
      <div>
        <button type="button" className="btn btn-secondary" onClick={() => void ask('hint')}>
          Wyjaśnij
        </button>
      </div>
    );
  return (
    <section className="card ai-box" aria-label="Wyjaśnienie">
      <h3>Wyjaśnienie</h3>
      {ex?.hint ? (
        <div className="ai-answer">
          <span className="small muted">Podpowiedź</span>
          <MathText text={ex.hint} />
        </div>
      ) : null}
      {ex?.full ? (
        <div className="ai-answer">
          <span className="small muted">Pełne rozwiązanie</span>
          <MathText text={ex.full} />
        </div>
      ) : null}
      {call.busy && call.text ? (
        <div className="ai-answer">
          <MathText text={call.text} />
        </div>
      ) : null}
      {(ex?.chat ?? []).map((c, i) => (
        <div key={i} className={`chat-turn ${c.role}`}>
          <MathText text={c.content} />
        </div>
      ))}
      <AiStatus call={call} streaming />
      {!call.busy && !ex?.hint ? (
        <button type="button" className="btn btn-secondary" onClick={() => void ask('hint')}>
          Pokaż podpowiedź
        </button>
      ) : null}
      {!call.busy && ex?.hint && !ex.full ? (
        <button type="button" className="btn btn-secondary" onClick={() => void ask('full')}>
          Pokaż pełne rozwiązanie
        </button>
      ) : null}
      {ex?.hint || ex?.full ? (
        <form
          className="stack-2"
          onSubmit={(e) => {
            e.preventDefault();
            void followUp();
          }}
        >
          <label htmlFor={`q-${t.id}`} className="label">
            Dopytaj
          </label>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input id={`q-${t.id}`} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Czego nie rozumiesz?" maxLength={500} />
            <button type="submit" className="btn btn-secondary" disabled={call.busy || !q.trim()}>
              Wyślij
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

/** Fiszki ze słówek i zwrotów z zadania z angielskiego. */
export function CardsFromTask({ t }: { t: AppTask }) {
  const { updateData, today, toast } = useStore();
  const ai = useAi();
  const call = useAiCall();
  if (!ai.available || t.subjectId !== 'ang-p' || t.user) return null;
  const make = async () => {
    const urls = await taskImageUrls(t, false);
    const cards = await call.run(async (s, o) => {
      const images = await imagesFor([urls.ctx, urls.zad]);
      return parseCards(await s.json(cardsFromTaskPrompt(t.label), { signal: o.signal, images }), 15);
    });
    if (!cards?.length) return;
    const now = Date.now();
    updateData((d) => ({
      ...d,
      cards: [
        ...d.cards,
        ...cards
          .filter((c) => !d.cards.some((x) => x.deck === t.id && x.front === c.front))
          .map((c) => ({ id: newId('f'), subj: t.subjectId, deck: t.id, deckName: t.label, front: c.front, back: c.back, example: c.example, step: 0, due: today, reviews: 0, at: now })),
      ],
    }));
    toast(`Dodano fiszki: ${cards.length}.`);
  };
  return (
    <div className="stack-2">
      <button type="button" className="btn btn-secondary" onClick={() => void make()} disabled={call.busy}>
        Utwórz fiszki z tego zadania
      </button>
      <AiStatus call={call} />
    </div>
  );
}

/** Ocena wypracowania / wypowiedzi pisemnej przez Claude'a według kryteriów CKE. */
export function EssayGrader({ t, text, set, onGraded }: { t: AppTask; text: string; set: import('../store/catalog').CriteriaSet | null; onGraded: (g: EssayGrade) => void }) {
  const { data } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const [res, setRes] = useState<EssayGrade | null>(null);
  if (!ai.available || !set) return null;
  const criteria = set.groups.flatMap((g) => g.criteria);
  const sub = subjectDef(t.subjectId)!;
  const grade = async () => {
    const urls = await taskImageUrls(t, false);
    const r = await call.run(async (s, o) => {
      const images = await imagesFor([urls.zad]);
      const raw = await s.json(
        essayPrompt({ subject: sub.name.toLowerCase(), text, criteria, minWords: t.essay?.minWords ?? null, words: countWords(text), memory: memoryHint(data.memory, t.subjectId, t.topics[0] ?? null) }),
        { signal: o.signal, images, modelTier: t.subjectId === 'pol-p' ? 'complex' : 'default', cache: false },
      );
      return parseEssayGrade(raw, criteria);
    });
    if (r) {
      setRes(r);
      onGraded(r);
    }
  };
  return (
    <div className="card ai-box">
      <button type="button" className="btn btn-secondary" onClick={() => void grade()} disabled={call.busy || countWords(text) === 0}>
        Oceń z Claude’em
      </button>
      <AiStatus call={call} />
      {res ? (
        <div className="stack-2">
          {criteria
            .filter((c) => res.reasons[c.id])
            .map((c) => (
              <p key={c.id} className="small">
                <strong>{c.name}:</strong> {res.reasons[c.id]}
              </p>
            ))}
          {res.tips.length ? (
            <div>
              <strong>Wskazówki</strong>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {res.tips.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="small muted">Ocena Claude’a jest wpisana w listę kryteriów. Możesz ją zmienić przed zapisem.</p>
        </div>
      ) : null}
    </div>
  );
}
