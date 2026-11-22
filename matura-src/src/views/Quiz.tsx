// Sprawdzian mieszany (raz w tygodniu): zadania z różnych działów i przedmiotów naraz,
// bez podpowiedzi. Uczy rozpoznawać metodę; dobry wynik daje poziom „opanowany”, błąd go cofa.
// Zeszyt błędów: zadania z wynikiem poniżej maksimum do rozwiązania jeszcze raz.

import { useMemo, useState } from 'react';
import { subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import type { AppTask } from '../store/derived';
import { GENERATORS, makeVariant, variantTaskId, genOfTask, generatorsFor, type Variant } from '../logic/variants';
import { gradeTask } from '../logic/mathGrade';
import { pickQuickTasks } from '../logic/quick';
import { scoreClosed } from '../logic/scoring';
import { mistakes } from '../logic/levels';
import { fmtDayMonth } from '../logic/dates';
import mathParams from '../data/ocena-matematyka.json';
import { AnswerCard, checkMessage } from '../ui/AnswerCard';
import { TaskSheet } from '../ui/TaskImage';
import { MathText } from '../ui/MathText';
import { Empty, SubjectTag } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { shortTopic } from './planParts';

type QuizItem = { kind: 'wariant'; v: Variant } | { kind: 'cke'; t: AppTask };

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuizView() {
  const { d, data, today, saveResult } = useStore();
  const items = useMemo<QuizItem[]>(() => {
    const enabled = (s: SubjectId) => data.stan.enabled[s];
    // matematyka: po jednym wariancie z różnych tematów (najpierw ćwiczone, potem reszta)
    const topics = shuffle([...new Set(GENERATORS.filter((g) => enabled(g.subjectId)).map((g) => `${g.subjectId}|${g.topic}`))]);
    const seen = (k: string) => {
      const [s, t] = k.split('|');
      return d.active.results.some((r) => r.subj === s && r.topics.includes(t));
    };
    const ordered = [...topics.filter(seen), ...topics.filter((k) => !seen(k))].slice(0, 5);
    const vars: QuizItem[] = ordered.map((k) => {
      const [s, t] = k.split('|');
      const g = shuffle(generatorsFor(s, t))[0];
      return { kind: 'wariant', v: makeVariant(g, 5000 + Math.floor(Math.random() * 100000)) };
    });
    // zadania zamknięte CKE z pozostałych przedmiotów
    const pool = Object.values(d.available)
      .flat()
      .filter((t) => enabled(t.subjectId) && !t.user && (t.subjectId === 'pol-p' || t.subjectId === 'ang-p'));
    const cke: QuizItem[] = pickQuickTasks(pool, d.srsBefore, (s, tp) => d.mastery[s as SubjectId]?.[tp]?.value ?? null, today, 3).map((t) => ({ kind: 'cke', t }));
    return shuffle([...vars, ...cke]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [score, setScore] = useState<{ ok: number; all: number; topics: string[] }>({ ok: 0, all: 0, topics: [] });
  const it = items[i];
  const done = (pts: number, max: number, topic: string) => setScore((s) => ({ ok: s.ok + (pts === max ? 1 : 0), all: s.all + 1, topics: pts === max ? s.topics : [...s.topics, topic] }));
  if (!items.length) return <Empty text="Za mało zadań do sprawdzianu. Włącz przedmioty w ustawieniach." action={{ label: 'Wróć', run: goBack }} />;
  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where tnum">
            Sprawdzian mieszany {Math.min(i + 1, items.length)} z {items.length}
          </span>
        </div>
      </header>
      <div className="focus-body">
        <div className="page stack" style={{ maxWidth: 760 }}>
          {it ? (
            it.kind === 'wariant' ? (
              <VariantQuestion
                key={`${i}-v`}
                v={it.v}
                onDone={(pts) => {
                  saveResult({ task: variantTaskId(it.v), subj: it.v.subjectId, topics: [it.v.topic], pts, max: it.v.maxPoints, sec: 0, src: 'sprawdzian', by: 'automat' }, { toast: false });
                  done(pts, it.v.maxPoints, shortTopic(it.v.topic));
                }}
                onNext={() => setI((x) => x + 1)}
              />
            ) : (
              <ClosedQuestion
                key={`${i}-c`}
                t={it.t}
                onDone={(pts, choice) => {
                  saveResult({ task: it.t.id, subj: it.t.subjectId, topics: it.t.topics, pts, max: it.t.maxPoints, sec: 0, src: 'sprawdzian', choice }, { toast: false });
                  done(pts, it.t.maxPoints, shortTopic(it.t.topics[0]));
                }}
                onNext={() => setI((x) => x + 1)}
              />
            )
          ) : (
            <section className="card stack-2">
              <h2>Koniec sprawdzianu</h2>
              <p>
                Bez błędu: <strong className="tnum">{score.ok}</strong> z {score.all} zadań. Tematy rozwiązane bez błędu przechodzą na poziom „opanowany”, a tematy z błędem
                wracają do ćwiczeń.
              </p>
              {score.topics.length ? <p className="small muted">Do poprawy: {[...new Set(score.topics)].join(', ')}.</p> : null}
              <div className="row">
                <button type="button" className="btn btn-primary" onClick={() => go({ name: 'bledy' })}>
                  Moje błędy
                </button>
                <button type="button" className="btn btn-secondary" onClick={goBack}>
                  Zakończ
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function VariantQuestion({ v, onDone, onNext }: { v: Variant; onDone: (pts: number) => void; onNext: () => void }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState<number | null>(null);
  return (
    <section className="card stack-2">
      <div className="row">
        <SubjectTag id={v.subjectId} />
        <span className="small muted">
          {shortTopic(v.topic)} · {v.maxPoints} pkt
        </span>
      </div>
      <MathText text={v.question} />
      <div className="field">
        <label htmlFor="quiz-ans">Rozwiązanie i wynik</label>
        <textarea id="quiz-ans" className="textarea" value={text} onChange={(e) => setText(e.target.value)} disabled={res != null} />
      </div>
      {res == null ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => {
            const p = gradeTask(v.key, v.maxPoints, text, mathParams.params)?.points ?? 0;
            setRes(p);
            onDone(p);
          }}
        >
          Sprawdź
        </button>
      ) : (
        <>
          <div className={`verdict ${res === v.maxPoints ? 'dobrze' : res ? 'częściowo' : 'źle'}`} role="status">
            <strong>
              {res} z {v.maxPoints} pkt
            </strong>
            <span>Odpowiedź: {v.answer}</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={onNext}>
            Dalej
          </button>
        </>
      )}
    </section>
  );
}

function ClosedQuestion({ t, onDone, onNext }: { t: AppTask; onDone: (pts: number, choice: Record<string, string>) => void; onNext: () => void }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  if (!t.answer) return null;
  const all = t.answer.items.every((x) => choice[x.id]);
  const msg = checked ? checkMessage(t.answer, choice) : null;
  return (
    <section className="stack-2">
      <div className="row">
        <SubjectTag id={t.subjectId} />
        <span className="small muted">{t.label}</span>
      </div>
      <TaskSheet task={t} level={subjectDef(t.subjectId)!.level} />
      <AnswerCard answer={t.answer} value={choice} onChange={(a, o) => !checked && setChoice((c) => ({ ...c, [a]: o }))} onAll={(v) => !checked && setChoice(v)} checked={checked} />
      {msg ? (
        <div className={`feedback ${msg.ok ? 'ok' : 'bad'}`}>
          <Icon name={msg.ok ? 'ok' : 'zle'} />
          <span>{msg.text}</span>
        </div>
      ) : null}
      {!checked ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!all}
          onClick={() => {
            setChecked(true);
            onDone(scoreClosed(t.answer!, choice, t.maxPoints).points, choice);
          }}
        >
          Sprawdź
        </button>
      ) : (
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Dalej
        </button>
      )}
    </section>
  );
}

/** Zeszyt błędów: zadania do poprawy, z podobnym wariantem dla matematyki. */
export function MistakesView() {
  const { d } = useStore();
  const list = useMemo(() => mistakes(d.active.results).slice(0, 60), [d.active.results]);
  return (
    <div className="page stack" style={{ maxWidth: 820 }}>
      <h1 className="ptitle">Moje błędy</h1>
      <p className="muted">Zadania, w których zabrakło punktów. Rozwiąż je jeszcze raz albo zrób podobne zadanie z innymi liczbami.</p>
      {!list.length ? (
        <Empty secondary text="Nie ma błędów do poprawy." action={{ label: 'Wróć do nauki', run: () => go('#start') }} />
      ) : (
        <div className="card flush list">
          {list.map((r) => {
            const gen = genOfTask(r.task);
            const t = gen ? null : d.tasks.get(r.task);
            const topic = r.topics[0];
            const similar = generatorsFor(r.subj, topic).length > 0;
            return (
              <div className="li static" key={r.id} style={{ flexWrap: 'wrap', gap: 8 }}>
                <SubjectTag id={r.subj} />
                <span className="grow">
                  <span style={{ fontWeight: 600 }}>{t ? t.label : `Ćwiczenie: ${shortTopic(topic)}`}</span>
                  <br />
                  <span className="small muted tnum">
                    {shortTopic(topic)} · {r.pts} z {r.max} pkt · {fmtDayMonth(r.d)}
                  </span>
                </span>
                {t ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => go({ name: 'zadanie', id: t.id })}>
                    Rozwiąż ponownie
                  </button>
                ) : null}
                {similar ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => go({ name: 'cwiczenie', subject: r.subj, topic })}>
                    Podobne zadanie
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      <p className="small muted">Zadanie znika z listy, gdy rozwiążesz je za pełne punkty.</p>
    </div>
  );
}
