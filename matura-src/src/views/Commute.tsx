// Tryb „W tramwaju”: jedno szybkie zadanie na ekranie, duże przyciski, losowanie z wybranego
// przedmiotu i tematu. Tylko zadania na 1–3 minuty: zamknięte CKE, krótkie otwarte z kluczem
// (matematyka, angielski) i warianty z matematyki. Po odpowiedzi: „Sprawdź” albo „Pokaż klucz”.

import { useMemo, useState } from 'react';
import { SUBJECTS, subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import type { AppTask } from '../store/derived';
import { topicsFor } from '../data/taxonomy';
import { generatorsFor, makeVariant, variantTaskId, type Variant } from '../logic/variants';
import { gradeTask } from '../logic/mathGrade';
import { scoreClosed } from '../logic/scoring';
import mathParams from '../data/ocena-matematyka.json';
import { AnswerCard, checkMessage } from '../ui/AnswerCard';
import { TaskSheet } from '../ui/TaskImage';
import { MathText } from '../ui/MathText';
import { SubjectTag } from '../ui/common';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/router';
import { shortTopic } from './planParts';
import { autoGrade, useAutoKind } from './autoGrade';
import { stepText } from './Practice';
import { OfflineExplain } from './explainParts';

type Item = { kind: 'cke'; t: AppTask } | { kind: 'wariant'; v: Variant };

/** Zadanie na szybko: zamknięte do 4 minut albo otwarte za 1–2 pkt (bez słuchania i wypracowań). */
const quick = (t: AppTask) => !t.essay && !t.audio && !t.user && !t.context && t.minutes <= 4 && (t.auto || t.maxPoints <= 2);

export function CommuteView() {
  const { d, data, today } = useStore();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]);
  const [subject, setSubject] = useState<SubjectId | 'losowo'>('losowo');
  const [topic, setTopic] = useState<string>('losowo');
  const [item, setItem] = useState<Item | null>(null);
  const [count, setCount] = useState({ ok: 0, all: 0 });
  const [empty, setEmpty] = useState(false);
  const recent = useMemo(() => new Set(d.active.results.filter((r) => r.d === today).map((r) => r.task)), [d.active.results, today]);

  const draw = () => {
    const subs = subject === 'losowo' ? enabled.map((s) => s.id) : [subject];
    const pool: Item[] = [];
    for (const s of subs) {
      for (const t of d.available[s] ?? []) if (quick(t) && !recent.has(t.id) && (topic === 'losowo' || t.topics[0] === topic)) pool.push({ kind: 'cke', t });
      const topics = topic === 'losowo' ? topicsFor(subjectDef(s)!.family, subjectDef(s)!.level).map((x) => x.id) : [topic];
      for (const tp of topics) for (const g of generatorsFor(s, tp)) pool.push({ kind: 'wariant', v: makeVariant(g, 9000 + Math.floor(Math.random() * 100000)) });
    }
    // warianty nie mogą zalać puli: najwyżej co trzecie zadanie
    const cke = pool.filter((x) => x.kind === 'cke');
    const vars = pool.filter((x) => x.kind === 'wariant');
    const useVar = vars.length && (!cke.length || Math.random() < 0.33);
    const from = useVar ? vars : cke;
    setEmpty(!from.length);
    setItem(from.length ? from[Math.floor(Math.random() * from.length)] : null);
  };

  const topics = subject === 'losowo' ? [] : topicsFor(subjectDef(subject)!.family, subjectDef(subject)!.level);
  return (
    <div className="focus commute">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">W tramwaju</span>
          <span className="small muted tnum">{count.all ? `dobrze ${count.ok} z ${count.all}` : ''}</span>
        </div>
      </header>
      <div className="focus-body">
        <div className="page stack" style={{ maxWidth: 720 }}>
          {!item ? (
            <section className="card stack">
              <h1 style={{ fontSize: '1.375rem' }}>Szybkie zadania</h1>
              <p className="muted">Jedno zadanie na raz, 1–3 minuty. Wybierz przedmiot i temat albo zostaw „losowo”.</p>
              <div className="chips" role="radiogroup" aria-label="Przedmiot">
                {(['losowo', ...enabled.map((s) => s.id)] as const).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={subject === s} className="chip big" onClick={() => (setSubject(s), setTopic('losowo'))}>
                    {s === 'losowo' ? 'Losowo' : subjectDef(s)!.short}
                  </button>
                ))}
              </div>
              {topics.length ? (
                <div className="field">
                  <label htmlFor="cm-topic">Temat</label>
                  <select id="cm-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
                    <option value="losowo">Losowo</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {shortTopic(t.id)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <button type="button" className="btn btn-primary btn-block big" onClick={draw}>
                Losuj zadanie
              </button>
              {empty ? <p className="error">Brak szybkich zadań w tym wyborze. Wybierz inny temat albo „Losowo”.</p> : null}
            </section>
          ) : item.kind === 'cke' ? (
            <CkeQuick key={item.t.id} t={item.t} onDone={(ok) => setCount((c) => ({ ok: c.ok + (ok ? 1 : 0), all: c.all + 1 }))} onNext={draw} onMenu={() => setItem(null)} />
          ) : (
            <VariantQuick key={`${item.v.gen}-${item.v.seed}`} v={item.v} onDone={(ok) => setCount((c) => ({ ok: c.ok + (ok ? 1 : 0), all: c.all + 1 }))} onNext={draw} onMenu={() => setItem(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function NextBar({ onNext, onMenu }: { onNext: () => void; onMenu: () => void }) {
  return (
    <div className="row commute-bar">
      <button type="button" className="btn btn-primary big grow" onClick={onNext}>
        Następne
      </button>
      <button type="button" className="btn btn-secondary big" onClick={onMenu}>
        Zmień temat
      </button>
    </div>
  );
}

function CkeQuick({ t, onDone, onNext, onMenu }: { t: AppTask; onDone: (ok: boolean) => void; onNext: () => void; onMenu: () => void }) {
  const { saveResult } = useStore();
  const kind = useAutoKind(t);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [state, setState] = useState<{ pts: number; msg: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = (pts: number, extra: Record<string, unknown> = {}) => {
    saveResult({ task: t.id, subj: t.subjectId, topics: t.topics, pts, max: t.maxPoints, sec: 60, src: 'zadanie', ...extra }, { toast: false });
    onDone(pts === t.maxPoints);
  };
  const checkClosed = () => {
    if (!t.answer) return;
    const r = scoreClosed(t.answer, choice, t.maxPoints);
    setState({ pts: r.points, msg: checkMessage(t.answer, choice).text });
    save(r.points, { choice });
  };
  const checkOpen = async () => {
    if (!kind || kind === 'pol') return;
    setBusy(true);
    const r = await autoGrade(t, kind, text).catch(() => null);
    setBusy(false);
    if (!r) {
      setShowKey(true);
      return;
    }
    setState({ pts: r.points, msg: r.feedback });
    save(r.points, { by: 'automat', feedback: r.feedback });
  };
  return (
    <section className="stack">
      <div className="row">
        <SubjectTag id={t.subjectId} />
        <span className="small muted">
          {shortTopic(t.topics[0])} · {t.maxPoints} pkt
        </span>
      </div>
      <TaskSheet task={t} level={subjectDef(t.subjectId)!.level} />
      {t.auto && t.answer ? (
        <AnswerCard answer={t.answer} value={choice} onChange={(a, o) => !state && setChoice((c) => ({ ...c, [a]: o }))} onAll={(v) => !state && setChoice(v)} checked={!!state} />
      ) : (
        <div className="field">
          <label htmlFor="cm-ans">Twoja odpowiedź</label>
          <textarea id="cm-ans" className="textarea" style={{ minHeight: 90 }} value={text} onChange={(e) => setText(e.target.value)} disabled={!!state} />
        </div>
      )}
      {state ? (
        <div className={`verdict ${state.pts === t.maxPoints ? 'dobrze' : state.pts ? 'częściowo' : 'źle'}`} role="status">
          <strong>
            {state.pts} z {t.maxPoints} pkt
          </strong>
          <span>{state.msg}</span>
        </div>
      ) : (
        <div className="row commute-bar">
          {t.auto ? (
            <button type="button" className="btn btn-primary big grow" disabled={!t.answer?.items.every((x) => choice[x.id])} onClick={checkClosed}>
              Sprawdź
            </button>
          ) : kind && kind !== 'pol' ? (
            <button type="button" className="btn btn-primary big grow" disabled={!text.trim() || busy} onClick={() => void checkOpen()}>
              {busy ? 'Sprawdzam…' : 'Sprawdź'}
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary big" disabled={!t.auto && !text.trim()} onClick={() => setShowKey(true)}>
            Pokaż klucz
          </button>
        </div>
      )}
      {showKey ? (
        <>
          <TaskSheet task={t} kind="odp" />
          {!state ? (
            <div className="row commute-bar">
              <button type="button" className="btn btn-secondary big grow" onClick={() => (setState({ pts: t.maxPoints, msg: 'Samoocena: dobrze.' }), save(t.maxPoints, { by: 'samoocena' }))}>
                Miałem dobrze
              </button>
              <button type="button" className="btn btn-secondary big grow" onClick={() => (setState({ pts: 0, msg: 'Samoocena: źle. Zadanie wróci w zeszycie błędów.' }), save(0, { by: 'samoocena' }))}>
                Miałem źle
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {state ? <OfflineExplain t={t} /> : null}
      {state ? <NextBar onNext={onNext} onMenu={onMenu} /> : null}
    </section>
  );
}

function VariantQuick({ v, onDone, onNext, onMenu }: { v: Variant; onDone: (ok: boolean) => void; onNext: () => void; onMenu: () => void }) {
  const { saveResult } = useStore();
  const [text, setText] = useState('');
  const [res, setRes] = useState<number | null>(null);
  const [showKey, setShowKey] = useState(false);
  const check = () => {
    const p = gradeTask(v.key, v.maxPoints, text, mathParams.params)?.points ?? 0;
    setRes(p);
    setShowKey(true);
    saveResult({ task: variantTaskId(v), subj: v.subjectId, topics: [v.topic], pts: p, max: v.maxPoints, sec: 60, src: 'ćwiczenie', by: 'automat' }, { toast: false });
    onDone(p === v.maxPoints);
  };
  return (
    <section className="stack">
      <div className="row">
        <SubjectTag id={v.subjectId} />
        <span className="small muted">
          {shortTopic(v.topic)} · wariant · {v.maxPoints} pkt
        </span>
      </div>
      <div className="card" style={{ fontSize: '1.125rem' }}>
        <MathText text={v.question} />
      </div>
      <div className="field">
        <label htmlFor="cm-var">Wynik (i obliczenia, jeśli chcesz)</label>
        <textarea id="cm-var" className="textarea" style={{ minHeight: 90 }} value={text} onChange={(e) => setText(e.target.value)} disabled={res != null} />
      </div>
      {res == null ? (
        <div className="row commute-bar">
          <button type="button" className="btn btn-primary big grow" disabled={!text.trim()} onClick={check}>
            Sprawdź
          </button>
          <button type="button" className="btn btn-secondary big" disabled={!text.trim()} onClick={() => setShowKey(true)}>
            Pokaż klucz
          </button>
        </div>
      ) : (
        <div className={`verdict ${res === v.maxPoints ? 'dobrze' : res ? 'częściowo' : 'źle'}`} role="status">
          <strong>
            {res} z {v.maxPoints} pkt
          </strong>
        </div>
      )}
      {showKey ? (
        <section className="card stack-2">
          <h3>Rozwiązanie</h3>
          <ol className="steps">
            {v.steps.map((s, i) => (
              <li key={i}>
                <MathText text={stepText(s, true)} />
              </li>
            ))}
          </ol>
          <p>
            <strong>Odpowiedź:</strong> {v.answer}
          </p>
        </section>
      ) : null}
      {res != null || showKey ? <NextBar onNext={onNext} onMenu={onMenu} /> : null}
    </section>
  );
}
