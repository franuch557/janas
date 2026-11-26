import { RubricGrader } from './rubricParts';
import { OfflineExplain, WhyCorrect } from './explainParts';
import { HintSteps, useHintSteps } from './hintParts';
import { AutoGrader, OwnAnswer, useAutoKind, type AutoResult } from './autoGrade';
import { useEffect, useRef, useState } from 'react';
import { subjectDef } from '../model';
import { useStore } from '../store/AppStore';
import { scoreClosed } from '../logic/scoring';
import { taskRef } from '../logic/planner';
import { fmtClock } from '../logic/format';
import { AnswerCard, checkMessage, SelfGrade } from '../ui/AnswerCard';
import { AudioPlayer } from '../ui/AudioPlayer';
import { ContextSheet, TaskSheet } from '../ui/TaskImage';
import { FormulasButton } from '../ui/Formulas';
import { displayNr } from '../logic/cke';
import { Empty, MoreMenu, SubjectTag, Tag, useMedia, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { nextInFlow, openItem, shortTopic, SwapSheet, typeText, usePlanEdit } from './planParts';
import { CardsFromTask, Explain, OpenGrader, useMemoryWriter, Verdict } from './aiParts';
import type { GradeResult } from '../logic/ai';
import type { AppTask } from '../store/derived';

/** Stoper zadania: rusza przy otwarciu, dotknięcie wstrzymuje. */
export function useStopwatch(running: boolean) {
  const [acc, setAcc] = useState(0);
  const [since, setSince] = useState<number | null>(running ? Date.now() : null);
  const [paused, setPaused] = useState(false);
  const now = useNow(1000, since != null);
  useEffect(() => {
    if (!running && since != null) {
      setAcc((a) => a + Date.now() - since);
      setSince(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const ms = acc + (since != null ? now - since : 0);
  const toggle = () => {
    if (!running) return;
    if (since != null) {
      setAcc((a) => a + Date.now() - since);
      setSince(null);
      setPaused(true);
    } else {
      setSince(Date.now());
      setPaused(false);
    }
  };
  const reset = () => {
    setAcc(0);
    setSince(Date.now());
    setPaused(false);
  };
  return { ms: since != null ? acc + Math.max(0, Date.now() - since) : ms, paused, toggle, reset, seconds: () => Math.round((acc + (since != null ? Date.now() - since : 0)) / 1000) };
}

export function TimerBadge({ ms, paused, over, onClick, label }: { ms: number; paused: boolean; over?: boolean; onClick?: () => void; label?: string }) {
  return (
    <button type="button" className={`timer${over ? ' over' : ''}${paused ? ' paused' : ''}`} onClick={onClick} aria-label={label ?? (paused ? 'Stoper wstrzymany, wznów' : 'Stoper, wstrzymaj')} title={paused ? 'Wznów' : 'Wstrzymaj'}>
      <Icon name="zegar" size={20} />
      <span>{paused ? 'wstrzymano' : fmtClock(ms)}</span>
    </button>
  );
}

export function TaskView({ id }: { id: string }) {
  const { d, today, flow, saveResult, undo, updateStan, toast, setFlow } = useStore();
  const t = d.tasks.get(id);
  useEffect(() => {
    if (t?.essay) go({ name: 'wypracowanie', id }, true);
  }, [t, id]);
  if (!t) {
    return (
      <div className="focus">
        <header className="focus-head">
          <div className="bar">
            <button type="button" className="btn btn-icon" aria-label="Zamknij" onClick={goBack}>
              <Icon name="zamknij" />
            </button>
          </div>
        </header>
        <div className="focus-body">
          <Empty text={d.packsLoading ? 'Ładowanie zadań…' : 'Nie znaleziono tego zadania.'} action={{ label: 'Przejdź do zadań', run: () => go('#zadania') }} />
        </div>
      </div>
    );
  }
  if (t.essay) return null;
  return <Solve key={t.id} t={t} d={d} today={today} flow={flow} setFlow={setFlow} saveResult={saveResult} undo={undo} updateStan={updateStan} toast={toast} />;
}

function Solve({ t, d, today, flow, saveResult, undo, updateStan, toast }: { t: AppTask } & Pick<ReturnType<typeof useStore>, 'd' | 'today' | 'flow' | 'setFlow' | 'saveResult' | 'undo' | 'updateStan' | 'toast'>) {
  const edit = usePlanEdit();
  const wide = useMedia('(min-width: 1080px)');
  const exam = t.examId ? d.examById.get(t.examId) : undefined;
  const ref = taskRef(t.id);
  const todayItem = d.todayPlan?.items.find((i) => i.ref === ref) ?? null;
  const prevToday = d.active.results.filter((r) => r.task === t.id && r.d === today).slice(-1)[0];
  const [choice, setChoice] = useState<Record<string, string>>(prevToday?.choice ?? {});
  const [checked, setChecked] = useState(!!prevToday);
  const [revealed, setRevealed] = useState(!!t.user);
  const [self, setSelf] = useState<number | null>(prevToday && !t.auto ? prevToday.pts : null);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const remember = useMemoryWriter();
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(prevToday?.id ?? null);
  const [swap, setSwap] = useState(false);
  const [plays, setPlays] = useState(0);
  const sw = useStopwatch(!checked);
  const autoKind = useAutoKind(t);
  const hintSteps = useHintSteps(t);
  const [hints, setHints] = useState(0);
  const [autoRes, setAutoRes] = useState<AutoResult | null>(null);
  const live = useRef<HTMLDivElement>(null);
  const sub = subjectDef(t.subjectId)!;
  const pos = flow ? flow.refs.indexOf(ref) : -1;
  const where = pos >= 0 ? `${pos + 1} z ${flow!.refs.length}` : shortTopic(t.topics[0]);
  const allChosen = t.answer ? t.answer.items.every((i) => choice[i.id]) : false;
  const done = checked && savedId != null;

  const check = () => {
    if (!t.answer || !allChosen || checked) return;
    const r = scoreClosed(t.answer, choice, t.maxPoints);
    setChecked(true);
    if (r.points < t.maxPoints) remember([{ subj: t.subjectId, topic: t.topics[0] ?? null, type: 'inne', note: `błędna odpowiedź w zadaniu zamkniętym (${shortTopic(t.topics[0])})` }]);
    const id = saveResult(
      { task: t.id, subj: t.subjectId, topics: t.topics, pts: r.points, max: t.maxPoints, sec: sw.seconds(), src: 'zadanie', choice, ...(hints ? { hints } : {}) },
      { toast: false },
    );
    setSavedId(id);
  };
  const saveSelf = () => {
    if (self == null) return;
    setChecked(true);
    const byClaude = grade != null && self === grade.points;
    const byAuto = !byClaude && autoRes != null && self === autoRes.points;
    const id = saveResult({
      task: t.id,
      subj: t.subjectId,
      topics: t.topics,
      pts: self,
      max: t.maxPoints,
      sec: sw.seconds(),
      src: 'zadanie',
      ...(hints ? { hints } : {}),
      note: note.trim() || undefined,
      by: byClaude ? 'claude' : byAuto ? 'automat' : 'samoocena',
      feedback: byClaude && grade ? grade.feedback : byAuto ? autoRes!.feedback : undefined,
    });
    setSavedId(id);
  };
  const next = () => {
    const n = nextInFlow(flow, ref, d);
    if (n) openItem(n, d);
    else {
      if (flow) toast('Plan na dziś zrobiony.');
      goBack();
    }
  };
  const again = () => {
    setChecked(false);
    setSavedId(null);
    setChoice({});
    setSelf(null);
    setGrade(null);
    setAutoRes(null);
    setHints(0);
    setRevealed(false);
    sw.reset();
  };
  // wynik cofnięty z toastu albo na innym urządzeniu: ekran wraca do rozwiązywania
  useEffect(() => {
    if (savedId && !d.active.results.some((r) => r.id === savedId)) {
      setChecked(false);
      setSavedId(null);
      setGrade(null);
      if (t.auto) setChoice({});
      sw.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.active.results, savedId]);

  const undoResult = () => {
    if (savedId) undo(savedId, 'Cofnięto wynik.');
    again();
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tg = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tg.tagName)) return;
      if (document.querySelector('.overlay, .viewer, .menu')) return;
      if (e.key === 'Escape') return goBack();
      const key = e.key.toUpperCase();
      if (t.answer && !checked && t.answer.items.length === 1 && t.answer.items[0].options.includes(key) && key.length === 1) {
        setChoice({ [t.answer.items[0].id]: key });
        return;
      }
      if (e.key === 'Enter' && tg.tagName !== 'BUTTON') {
        if (done) next();
        else if (t.auto) check();
        else saveSelf();
      }
      if (key === 'O' && !t.auto) setRevealed((r) => !r);
      if (!t.auto && revealed && !checked && /^[0-9]$/.test(e.key) && Number(e.key) <= t.maxPoints) setSelf(Number(e.key));
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const msg = t.answer && checked ? checkMessage(t.answer, choice) : null;
  const over = sw.ms > t.minutes * 60_000;

  const primary = done ? (
    <button type="button" className="btn btn-primary btn-block" onClick={next}>
      Dalej
    </button>
  ) : t.auto ? (
    <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={!allChosen}>
      Sprawdź
    </button>
  ) : (
    <button type="button" className="btn btn-primary btn-block" onClick={saveSelf} disabled={self == null || !revealed}>
      Zapisz wynik
    </button>
  );

  const menu = [
    ...(todayItem ? [{ label: 'Zamień na inne', run: () => setSwap(true) }, { label: 'Pomiń na dziś', run: () => { edit.remove(today, todayItem); goBack(); } }] : []),
    {
      label: 'Zgłoś błąd w zadaniu',
      run: () => {
        updateStan((s) => ({ ...s, reported: [...new Set([...s.reported, t.id])] }));
        toast('Zgłoszono błąd. Zadanie nie wróci do planu.');
      },
    },
  ];

  const audioSrc = t.audio && exam ? `cke/${exam.audio ?? `${exam.id}.mp3`}` : null;

  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where tnum">{where}</span>
          <span className="only-desk"><FormulasButton subject={t.subjectId} /></span>
          <TimerBadge ms={sw.ms} paused={sw.paused} over={over} onClick={sw.toggle} />
          <MoreMenu items={menu} />
        </div>
      </header>
      <div className="focus-body">
        {audioSrc ? <AudioPlayer src={audioSrc} start={t.audio!.start} end={t.audio!.end} label={`Nagranie do zadania ${displayNr(t.nr)}`} exam={false} plays={plays} onPlayCounted={() => setPlays((p) => p + 1)} /> : null}
        <div className="solve">
          <div className="stack">
            <div className="meta only-phone">
              <SubjectTag id={t.subjectId} />
              <span className="small muted">
                {t.label}, {typeText(t)}
              </span>
              <FormulasButton subject={t.subjectId} />
            </div>
            {t.context && wide ? <ContextSheet task={t} collapsible={false} /> : <TaskSheet task={t} level={sub.level} showContext={false} />}
            {t.context && !wide ? <ContextSheet task={t} collapsible /> : null}
          </div>
          <div className="side stack">
            <div className="meta only-desk">
              <SubjectTag id={t.subjectId} />
              <span className="small muted">{t.label}</span>
              <Tag>{typeText(t)}</Tag>
            </div>
            {t.context && wide ? <TaskSheet task={t} level={sub.level} showContext={false} /> : null}
            {t.auto && t.answer ? (
              <>
                <AnswerCard answer={t.answer} value={choice} onChange={(i, o) => !checked && setChoice((c) => ({ ...c, [i]: o }))} onAll={(v) => !checked && setChoice(v)} checked={checked} />
                <div ref={live} aria-live="polite">
                  {msg ? (
                    <div className={`feedback ${msg.ok ? 'ok' : 'bad'} reveal`}>
                      <Icon name={msg.ok ? 'ok' : 'zle'} />
                      <span>
                        {msg.text} {prevToday || savedId ? `Wynik: ${scoreClosed(t.answer, choice, t.maxPoints).points} z ${t.maxPoints} pkt.` : ''}
                      </span>
                    </div>
                  ) : null}
                </div>
                {checked ? <WhyCorrect t={t} choice={choice} /> : null}
                {checked ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setRevealed((r) => !r)}>
                    {revealed ? 'Ukryj rozwiązanie' : 'Pokaż rozwiązanie'}
                  </button>
                ) : null}
              </>
            ) : (
              <>
                {t.user ? (
                  <p className="muted">Rozwiąż na kartce i oceń swoje rozwiązanie.</p>
                ) : (
                  <>
                    {!revealed && !autoKind ? <p className="muted">Rozwiąż na kartce albo wpisz odpowiedź poniżej.</p> : null}
                    {autoKind && !revealed ? null : (
                      <button type="button" className="btn btn-secondary btn-block" onClick={() => setRevealed((r) => !r)} aria-expanded={revealed}>
                        {revealed ? 'Ukryj rozwiązanie CKE' : 'Pokaż rozwiązanie CKE'}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            {!t.auto && !checked && !grade ? (
              <OpenGrader
                t={t}
                onGraded={(r) => {
                  setGrade(r);
                  setSelf(r.points);
                  setRevealed(true);
                }}
              />
            ) : null}
            {grade ? <Verdict r={grade} /> : null}
            {hintSteps && !checked && !revealed ? <HintSteps steps={hintSteps} shown={hints} onShow={() => setHints((h) => h + 1)} /> : null}
            {autoKind && !grade && !checked ? (
              <AutoGrader
                key={`auto-${t.id}`}
                t={t}
                kind={autoKind}
                onGraded={(r) => {
                  setAutoRes(r);
                  setSelf(r.points);
                  setRevealed(true);
                }}
              />
            ) : null}
            {autoKind && !revealed && !checked && !grade ? (
              <button type="button" className="btn btn-quiet" onClick={() => setRevealed(true)}>
                Nie wiem – pokaż rozwiązanie
              </button>
            ) : null}
            {!t.auto && !t.essay && !autoKind ? <OwnAnswer key={`own-${t.id}`} id={t.id} shown={revealed || checked || !!grade} onCompare={() => setRevealed(true)} /> : null}
            {!t.auto && t.rubric && !grade && (revealed || checked) ? (
              <RubricGrader
                id={t.id}
                rubric={t.rubric}
                value={self}
                disabled={checked}
                onChange={(p) => {
                  setSelf(p);
                  setRevealed(true);
                }}
              />
            ) : null}
            {revealed && !t.user ? (
              <div className="reveal">
                <TaskSheet task={t} kind="odp" />
              </div>
            ) : null}
            {!t.auto && (revealed || checked) ? (
              <div className="stack reveal">
                <SelfGrade max={t.maxPoints} value={self} onChange={setSelf} disabled={checked} />
                {!checked ? (
                  noteOpen ? (
                    <div className="field">
                      <label htmlFor="note">Notatka do błędu (opcjonalnie)</label>
                      <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} autoFocus />
                    </div>
                  ) : (
                    <div>
                      <button type="button" className="btn btn-quiet" onClick={() => setNoteOpen(true)}>
                        Dodaj notatkę do błędu
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
            {!t.auto || checked ? <Explain key={t.id} t={t} /> : null}
            {checked || revealed ? <OfflineExplain key={`oe-${t.id}`} t={t} /> : null}
            <CardsFromTask t={t} />
            {done ? (
              <div className="row">
                <button type="button" className="btn btn-secondary" onClick={again}>
                  Rozwiąż ponownie
                </button>
                <button type="button" className="btn btn-secondary" onClick={undoResult}>
                  Cofnij wynik
                </button>
              </div>
            ) : null}
            <div className="only-desk">{primary}</div>
          </div>
        </div>
      </div>
      <div className="actionbar only-phone">
        <div className="inner">{primary}</div>
      </div>
      {swap && todayItem ? <SwapSheet date={today} item={todayItem} onClose={() => setSwap(false)} /> : null}
    </div>
  );
}
