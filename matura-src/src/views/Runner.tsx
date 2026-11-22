// Arkusz próbny i diagnoza: zadanie po zadaniu, odliczanie, spis zadań,
// oznaczanie do powrotu, zapis postępu w sesji (przetrwa odświeżenie),
// samoocena otwartych po zakończeniu i wynik punktowy.

import { RubricGrader } from './rubricParts';
import { AutoGrader, useAutoKind } from './autoGrade';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '../model';
import { subjectDef } from '../model';
import { newId, useStore } from '../store/AppStore';
import { criteriaFor } from '../store/catalog';
import { LS_PULSE, lsGet, lsSet } from '../store/local';
import type { AppTask } from '../store/derived';
import { finalizeEvents } from '../logic/finalize';
import { elapsed, pause, pauseIfRunning, remaining, restoreAfterReload, resume, setAnswer } from '../logic/session';
import { pct, scoreExam } from '../logic/scoring';
import { fmtClock, fmtDuration, zadan } from '../logic/format';
import { addDays } from '../logic/dates';
import { suggestTasks } from '../logic/planner';
import { AnswerCard, SelfGrade } from '../ui/AnswerCard';
import { AudioPlayer } from '../ui/AudioPlayer';
import { ContextSheet, TaskSheet } from '../ui/TaskImage';
import { FormulasButton } from '../ui/Formulas';
import { displayNr } from '../logic/cke';
import { Confirm, Sheet, SubjectTag, Switch, Tag, useMedia, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { CriteriaForm, criteriaComplete, criteriaSum, WordCounter } from './sessionParts';
import { shortTopic, taskPlanItem, typeText, usePlanEdit } from './planParts';
import { EssayGrader, OpenGrader, taskImageUrls } from './aiParts';
import { AiStatus, imagesFor, useAi, useAiCall } from '../ui/ai';
import { gradePrompt, parseGrade } from '../logic/ai';
import { memoryHint } from '../logic/memory';

export function readPulse(id: string): number | null {
  try {
    const p = JSON.parse(lsGet(LS_PULSE) ?? 'null') as { id: string; t: number } | null;
    return p && p.id === id ? p.t : null;
  } catch {
    return null;
  }
}

function isAnswered(t: AppTask, s: Session): boolean {
  const a = s.answers[t.id];
  if (!a) return false;
  if (t.auto && t.answer) return t.answer.items.every((i) => a.choice?.[i.id]);
  return !!a.paper || (a.text ?? '').trim().length > 0;
}

export function sessionTasks(s: Session, tasks: Map<string, AppTask>): AppTask[] {
  return s.taskIds.map((id) => tasks.get(id)).filter(Boolean) as AppTask[];
}

export function Runner({ sessionId, title }: { sessionId: string; title: string }) {
  const { data, d, putSession, updateSession, commitNow, addEvents, today, toast } = useStore();
  const s = data.sessions[sessionId];
  const ref = useRef(s);
  ref.current = s;
  const finishing = useRef(false);
  const tasks = s ? sessionTasks(s, d.tasks) : [];

  // Wznowienie po wejściu (także po odświeżeniu strony) i wstrzymanie przy wyjściu.
  // Wstrzymanie zawsze na aktualnym stanie sesji i tylko gdy sesja nadal trwa
  // (zakończona sesja nie może wrócić do „trwa”).
  useEffect(() => {
    const cur = ref.current;
    if (!cur || cur.status !== 'trwa') return;
    const id = cur.id;
    const pauseNow = (x: Session) => pauseIfRunning(x, Date.now());
    updateSession(id, (x) => (x.status === 'trwa' ? resume(restoreAfterReload(x, Date.now(), readPulse(id)), Date.now()) : x));
    const beat = () => lsSet(LS_PULSE, JSON.stringify({ id, t: Date.now() }));
    const pulse = setInterval(beat, 5000);
    const vis = () => {
      if (document.visibilityState === 'hidden') {
        beat();
        commitNow((dd) => (dd.sessions[id] ? { ...dd, sessions: { ...dd.sessions, [id]: pauseNow(dd.sessions[id]) } } : dd));
      } else updateSession(id, (x) => (x.status === 'trwa' ? resume(x, Date.now()) : x));
    };
    const hide = () => {
      beat();
      commitNow((dd) => (dd.sessions[id] ? { ...dd, sessions: { ...dd.sessions, [id]: pauseNow(dd.sessions[id]) } } : dd));
    };
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('pagehide', hide);
    return () => {
      clearInterval(pulse);
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pagehide', hide);
      updateSession(id, pauseNow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, s?.status]);

  const finalize = useCallback(
    (sess: Session) => {
      const ts = sessionTasks(sess, d.tasks);
      const score = scoreExam(ts, sess.answers);
      addEvents(finalizeEvents(sess, ts, score, today, data.events, Date.now(), newId));
      putSession({ ...sess, status: 'koniec', runningSince: null, finishedAt: Date.now(), updatedAt: Date.now() });
      toast(sess.mode === 'diagnoza' ? 'Diagnoza zapisana.' : 'Arkusz zakończony.');
    },
    [addEvents, d.tasks, data.events, putSession, toast, today],
  );

  const finish = useCallback(() => {
    const cur = ref.current;
    if (!cur || cur.status !== 'trwa' || finishing.current) return;
    finishing.current = true;
    const now = Date.now();
    const paused = pause(cur, now);
    const ts = sessionTasks(paused, d.tasks);
    const score = scoreExam(ts, paused.answers);
    const needGrade = ts.some((t) => !t.auto && score.perTask[t.id]?.counted);
    if (needGrade) putSession({ ...paused, status: 'ocena', gradeIndex: 0, updatedAt: now });
    else finalize(paused);
    setTimeout(() => (finishing.current = false), 500);
  }, [d.tasks, finalize, putSession]);

  if (!s) return null;
  if (s.status === 'trwa') return <Running s={s} tasks={tasks} title={title} onFinish={finish} />;
  if (s.status === 'ocena') return <Grading s={s} tasks={tasks} title={title} onDone={finalize} />;
  return <ResultView s={s} tasks={tasks} title={title} />;
}

function Running({ s, tasks, title, onFinish }: { s: Session; tasks: AppTask[]; title: string; onFinish: () => void }) {
  const { updateSession, commitNow, d } = useStore();
  const ai = useAi();
  const wide = useMedia('(min-width: 1080px)');
  const now = useNow(1000);
  const [spis, setSpis] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [warned, setWarned] = useState<string | null>(null);
  const t = tasks[Math.min(s.current, tasks.length - 1)];
  const left = remaining(s, now);
  const ms = left ?? elapsed(s, now);
  const exam = s.examId ? d.examById.get(s.examId) : undefined;
  const sub = subjectDef(s.subjectId)!;
  const endLabel = s.mode === 'diagnoza' ? 'Zakończ diagnozę' : 'Zakończ arkusz';
  const what = s.mode === 'diagnoza' ? 'diagnozę' : 'arkusz';

  useEffect(() => {
    if (left == null) return;
    if (left <= 0) onFinish();
    else if (left <= 5 * 60_000 && warned !== '5') setWarned('5');
    else if (left <= 15 * 60_000 && left > 5 * 60_000 && warned == null) setWarned('15');
  }, [left, onFinish, warned]);

  const put = (patch: Partial<Session>) => updateSession(s.id, (x) => ({ ...x, ...patch, updatedAt: Date.now() }));
  const answerFor = (taskId: string) => (patch: Parameters<typeof setAnswer>[2]) => updateSession(s.id, (x) => setAnswer(x, taskId, patch, Date.now()));
  const answer = (patch: Parameters<typeof setAnswer>[2]) => answerFor(t.id)(patch);
  const saveNow = (taskId: string, text: string) =>
    commitNow((dd) => (dd.sessions[s.id] ? { ...dd, sessions: { ...dd.sessions, [s.id]: setAnswer(dd.sessions[s.id], taskId, { text }, Date.now()) } } : dd));
  const goTo = (i: number) => {
    put({ current: Math.max(0, Math.min(tasks.length - 1, i)) });
    window.scrollTo(0, 0);
  };
  const unanswered = tasks.filter((x) => !isAnswered(x, s) && !(x.alternative && tasks.some((y) => y !== x && y.alternative === x.alternative && isAnswered(y, s)))).length;
  const a = s.answers[t?.id ?? ''] ?? {};
  const last = s.current >= tasks.length - 1;
  const audioSrc = t?.audio && exam ? `cke/${exam.audio ?? `${exam.id}.mp3`}` : null;

  if (!t) return null;
  return (
    <div className="focus" style={{ ['--head-h' as string]: '76px' }}>
      <header className={`focus-head${left != null && left <= 15 * 60_000 ? ' warn' : ''}`}>
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Przerwij" title="Przerwij" onClick={() => setConfirmExit(true)}>
            <Icon name="zamknij" />
          </button>
          <span className="where tnum">
            Zad. {s.current + 1} z {tasks.length}
          </span>
          <span className="timer" role="timer" aria-label={left != null ? 'Czas do końca' : 'Czas'}>
            <Icon name="zegar" size={20} />
            {fmtClock(ms, ms >= 3600_000)}
            {left != null ? <span className="small muted" style={{ fontWeight: 400 }}>&nbsp;do końca</span> : null}
          </span>
          <span className="only-desk"><FormulasButton subject={s.subjectId} /></span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSpis(true)}>
            Spis
          </button>
        </div>
        <div className="segbar" aria-hidden="true">
          {tasks.map((x, i) => (
            <button
              key={x.id}
              type="button"
              tabIndex={-1}
              className={`s${isAnswered(x, s) ? ' answered' : ''}${s.answers[x.id]?.flagged ? ' flag' : ''}${i === s.current ? ' cur' : ''}`}
              onClick={() => (window.matchMedia('(min-width: 1080px)').matches ? goTo(i) : setSpis(true))}
            />
          ))}
        </div>
        <div aria-live="assertive" className="sr-only">
          {warned === '15' ? 'Zostało 15 minut.' : warned === '5' ? 'Zostało 5 minut.' : ''}
        </div>
        {warned && left != null && left > 0 ? (
          <p className="small" style={{ textAlign: 'center', paddingBottom: 6, color: 'var(--seria-tekst)', fontWeight: 650 }}>
            {warned === '15' ? 'Zostało 15 minut.' : 'Zostało 5 minut.'}
          </p>
        ) : null}
      </header>
      <div className="focus-body">
        {audioSrc ? (
          <AudioPlayer
            key={t.id}
            src={audioSrc}
            start={t.audio!.start}
            end={t.audio!.end}
            label={`Nagranie do zadania ${displayNr(t.nr)}`}
            exam
            plays={s.plays[t.id] ?? 0}
            onPlayCounted={() => put({ plays: { ...s.plays, [t.id]: (s.plays[t.id] ?? 0) + 1 } })}
          />
        ) : null}
        <div className="solve">
          <div className="stack">
            <div className="meta">
              <SubjectTag id={s.subjectId} />
              <span className="small muted">
                {t.label}, {typeText(t)}
              </span>
              <span className="only-phone">
                <FormulasButton subject={s.subjectId} />
              </span>
            </div>
            {t.context && wide ? <ContextSheet task={t} collapsible={false} /> : <TaskSheet task={t} level={sub.level} showContext={false} />}
            {t.context && !wide ? <ContextSheet task={t} collapsible /> : null}
          </div>
          <div className="side stack">
            {t.context && wide ? <TaskSheet task={t} level={sub.level} showContext={false} /> : null}
            {t.auto && t.answer ? (
              <AnswerCard answer={t.answer} value={a.choice ?? {}} onChange={(i, o) => answer({ choice: { ...(a.choice ?? {}), [i]: o } })} onAll={(v) => answer({ choice: v })} checked={false} />
            ) : t.essay ? (
              <MockEssay key={t.id} t={t} text={a.text ?? ''} onSave={(text) => answerFor(t.id)({ text })} onSaveNow={(text) => saveNow(t.id, text)} />
            ) : (
              <>
                <label className="switch-row card" style={{ padding: '4px 16px' }}>
                  <span style={{ fontWeight: 600 }}>Zrobione na kartce</span>
                  <Switch checked={!!a.paper} onChange={(v) => answer({ paper: v })} label="Zrobione na kartce" />
                </label>
                {ai.available || t.rubric?.result ? <OpenAnswerField key={t.id} value={a.text ?? ''} onSave={(text) => answerFor(t.id)({ text })} onSaveNow={(text) => saveNow(t.id, text)} /> : null}
              </>
            )}
            {t.alternative ? <p className="small muted">Zadanie do wyboru: liczy się jedno z zadań oznaczonych jako alternatywne.</p> : null}
            <div>
              <button type="button" className="btn btn-quiet" onClick={() => answer({ flagged: !a.flagged })} aria-pressed={!!a.flagged}>
                <Icon name="flaga" size={20} /> {a.flagged ? 'Oznaczone do powrotu' : 'Oznacz do powrotu'}
              </button>
            </div>
            <div className="only-desk" style={{ gap: 12 }}>
              <button type="button" className="btn btn-secondary" onClick={() => goTo(s.current - 1)} disabled={s.current === 0} style={{ flex: 1 }}>
                Poprzednie
              </button>
              {last ? (
                <button type="button" className="btn btn-primary" onClick={() => setConfirmEnd(true)} style={{ flex: 1 }}>
                  {endLabel}
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => goTo(s.current + 1)} style={{ flex: 1 }}>
                  Następne
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="actionbar only-phone">
        <div className="inner">
          <button type="button" className="btn btn-secondary" onClick={() => goTo(s.current - 1)} disabled={s.current === 0}>
            Poprzednie
          </button>
          {last ? (
            <button type="button" className="btn btn-primary" onClick={() => setConfirmEnd(true)}>
              {endLabel}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => goTo(s.current + 1)}>
              Następne
            </button>
          )}
        </div>
      </div>
      {spis ? (
        <Sheet title="Spis zadań" onClose={() => setSpis(false)}>
          <p className="small muted">
            {title}. Odpowiedziane: {tasks.length - unanswered} z {tasks.length}.
          </p>
          <div className="numgrid">
            {tasks.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className={`${isAnswered(x, s) ? 'answered' : ''}${s.answers[x.id]?.flagged ? ' flag' : ''}${i === s.current ? ' cur' : ''}`}
                aria-label={`Zadanie ${displayNr(x.nr)}${isAnswered(x, s) ? ', odpowiedziane' : ''}${s.answers[x.id]?.flagged ? ', oznaczone' : ''}`}
                onClick={() => {
                  goTo(i);
                  setSpis(false);
                }}
              >
                {displayNr(x.nr).replace('temat ', 'T')}
              </button>
            ))}
          </div>
          <div className="legend" aria-hidden="true">
            <span>
              <i className="answered" /> odpowiedziane
            </span>
            <span>
              <i className="flag" /> do powrotu
            </span>
            <span>
              <i className="cur" /> bieżące
            </span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => { setSpis(false); setConfirmEnd(true); }}>
            {endLabel}
          </button>
        </Sheet>
      ) : null}
      {confirmEnd ? (
        <Confirm
          title={`Zakończyć ${what}?`}
          text={unanswered ? `Bez odpowiedzi: ${zadan(unanswered)}.` : 'Wszystkie zadania mają odpowiedź.'}
          ok="Zakończ"
          cancel={s.mode === 'diagnoza' ? 'Wróć do diagnozy' : 'Wróć do arkusza'}
          onOk={() => {
            setConfirmEnd(false);
            onFinish();
          }}
          onCancel={() => setConfirmEnd(false)}
        />
      ) : null}
      {confirmExit ? (
        <Confirm
          title={`Przerwać ${what}?`}
          text="Odpowiedzi zostaną zapisane i możesz wrócić później."
          ok="Przerwij"
          cancel="Wróć do arkusza"
          danger
          onOk={() => {
            setConfirmExit(false);
            goBack();
          }}
          onCancel={() => setConfirmExit(false)}
        />
      ) : null}
    </div>
  );
}

/** Autozapis tekstu: po 1 s przerwy w pisaniu, co 5 s i od razu przy zamykaniu karty. */
export function useAutosave(text: string, onSave: (t: string) => void, onSaveNow: (t: string) => void, initial: string) {
  const latest = useRef(text);
  latest.current = text;
  const saved = useRef(initial);
  const [savedFlag, setSavedFlag] = useState(true);
  const save = useCallback((now = false) => {
    if (latest.current === saved.current) return;
    saved.current = latest.current;
    if (now) onSaveNow(latest.current);
    else onSave(latest.current);
    setSavedFlag(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (text === saved.current) return;
    setSavedFlag(false);
    const t = setTimeout(() => save(), 1000);
    return () => clearTimeout(t);
  }, [text, save]);
  useEffect(() => {
    const i = setInterval(() => save(), 5000);
    const hide = () => save(true);
    const vis = () => document.visibilityState === 'hidden' && save(true);
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(i);
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', vis);
      save();
    };
  }, [save]);
  return savedFlag;
}

/** Wynik lub kluczowe kroki zadania otwartego (do sprawdzenia przez Claude'a po zakończeniu). */
function OpenAnswerField({ value, onSave, onSaveNow }: { value: string; onSave: (s: string) => void; onSaveNow: (s: string) => void }) {
  const [v, setV] = useState(value);
  useAutosave(v, onSave, onSaveNow, value);
  return (
    <div className="field">
      <label htmlFor="mock-open">Wynik lub kluczowe kroki (opcjonalnie)</label>
      <textarea id="mock-open" className="textarea" value={v} onChange={(e) => setV(e.target.value)} maxLength={4000} />
      <span className="hint">Po zakończeniu porównasz to z kluczem CKE.</span>
    </div>
  );
}

function MockEssay({ t, text, onSave, onSaveNow }: { t: AppTask; text: string; onSave: (s: string) => void; onSaveNow: (s: string) => void }) {
  const [v, setV] = useState(text);
  const saved = useAutosave(v, onSave, onSaveNow, text);
  return (
    <div className="card stack">
      <label htmlFor={`e-${t.id}`} className="label">
        Twój tekst
      </label>
      <textarea id={`e-${t.id}`} className="textarea" style={{ minHeight: 280, fontSize: '1.125rem', lineHeight: '1.875rem' }} value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} />
      <WordCounter text={v} min={t.essay?.minWords ?? null} max={t.essay?.maxWords ?? null} saved={saved ? 'zapisano' : null} />
    </div>
  );
}

function Grading({ s, tasks, title, onDone }: { s: Session; tasks: AppTask[]; title: string; onDone: (s: Session) => void }) {
  const { putSession, updateSession } = useStore();
  const score = scoreExam(tasks, s.answers);
  const list = tasks.filter((t) => !t.auto && score.perTask[t.id]?.counted);
  const i = Math.min(s.gradeIndex, list.length - 1);
  const t = list[i];
  const a = s.answers[t?.id ?? ''] ?? {};
  const autoKind = useAutoKind(t);
  const set = t?.essay ? criteriaFor(t.essay.criteria, subjectDef(t.subjectId)!.family) : null;
  const sub = subjectDef(s.subjectId)!;
  const put = (patch: Partial<Session>) => putSession({ ...s, ...patch, updatedAt: Date.now() });
  const grade = (self: number, criteria?: Record<string, number>, by: 'claude' | 'samoocena' | 'automat' = 'samoocena', feedback?: string) =>
    updateSession(s.id, (x) => setAnswer(x, t.id, { self, by, ...(criteria ? { criteria } : {}), ...(feedback != null ? { feedback } : {}) }, Date.now()));
  const canNext = a.self != null && (!t?.essay || criteriaComplete(set, a.criteria ?? {}));
  const next = () => {
    if (!canNext) return;
    if (i >= list.length - 1) onDone(s);
    else {
      put({ gradeIndex: i + 1 });
      window.scrollTo(0, 0);
    }
  };
  if (!t) return null;
  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">
            Ocena: {i + 1} z {list.length}
          </span>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => onDone(s)}>
            Pomiń ocenę
          </button>
        </div>
      </header>
      <div className="focus-body">
        <div className="stack" style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: '1.25rem', lineHeight: '1.625rem' }}>{title}</h1>
          {score.closedMax > 0 ? (
            <p className="tnum" style={{ fontWeight: 650 }}>
              Zamknięte: {score.closedPts} z {score.closedMax} pkt
            </p>
          ) : null}
          <p className="muted">Porównaj swoje rozwiązanie z zasadami oceniania i przyznaj punkty.</p>
          <BulkGrader s={s} list={list} />
        </div>
        <div className="solve">
          <div className="stack">
            <div className="meta">
              <SubjectTag id={t.subjectId} />
              <span className="small muted">
                {t.label}, {typeText(t)}
              </span>
            </div>
            <TaskSheet task={t} level={sub.level} />
            {t.essay && a.text ? (
              <div className="card">
                <h3>Twój tekst</h3>
                <p style={{ whiteSpace: 'pre-wrap', maxWidth: '68ch' }}>{a.text}</p>
              </div>
            ) : null}
          </div>
          <div className="side stack">
            <TaskSheet task={t} kind="odp" />
            {t.essay ? (
              <>
                <EssayGrader
                  key={t.id}
                  t={t}
                  text={a.text ?? ''}
                  set={set}
                  onGraded={(g) => {
                    const v = { ...(a.criteria ?? {}), ...g.values };
                    grade(Math.min(t.maxPoints, criteriaSum(set, v)), v, 'claude', g.tips.join(' '));
                  }}
                />
                <CriteriaForm set={set} values={a.criteria ?? {}} onChange={(v) => grade(Math.min(t.maxPoints, criteriaSum(set, v)), v)} fallbackMax={t.maxPoints} />
              </>
            ) : (
              <>
                {a.by === 'claude' && a.feedback ? (
                  <div className="verdict częściowo" role="status">
                    <strong>Ocena Claude’a: {a.self} z {t.maxPoints} pkt</strong>
                    <span>{a.feedback}</span>
                  </div>
                ) : (
                  <OpenGrader key={t.id} t={t} initialText={a.text ?? ''} onGraded={(r) => grade(r.points, undefined, 'claude', r.feedback)} />
                )}
                {autoKind && a.by !== 'claude' ? <AutoGrader key={`a-${t.id}`} t={t} kind={autoKind} initialText={a.text ?? ''} onGraded={(r) => grade(r.points, undefined, 'automat', r.feedback)} /> : null}
                {t.rubric && a.by !== 'claude' ? <RubricGrader key={`r-${t.id}`} id={t.id} rubric={t.rubric} value={a.self ?? null} initialText={a.text ?? ''} onChange={(v) => grade(v)} /> : null}
                <SelfGrade max={t.maxPoints} value={a.self ?? null} onChange={(v) => grade(v)} />
              </>
            )}
            <button type="button" className="btn btn-primary only-desk" onClick={next} disabled={!canNext}>
              {i >= list.length - 1 ? 'Pokaż wynik' : 'Dalej'}
            </button>
          </div>
        </div>
      </div>
      <div className="actionbar only-phone">
        <div className="inner">
          <button type="button" className="btn btn-primary" onClick={next} disabled={!canNext}>
            {i >= list.length - 1 ? 'Pokaż wynik' : 'Dalej'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** „Sprawdź wszystkie z Claude'em”: po kolei zadania otwarte z wpisanym wynikiem. */
function BulkGrader({ s, list }: { s: Session; list: AppTask[] }) {
  const { updateSession, data } = useStore();
  const ai = useAi();
  const call = useAiCall();
  const [progress, setProgress] = useState<{ cur: number; all: number } | null>(null);
  const todo = list.filter((t) => !t.essay && (s.answers[t.id]?.text ?? '').trim() && s.answers[t.id]?.self == null);
  if (!ai.available || !todo.length) return null;
  const runAll = async () => {
    for (let k = 0; k < todo.length; k++) {
      const t = todo[k];
      setProgress({ cur: k + 1, all: todo.length });
      const urls = await taskImageUrls(t, true);
      const r = await call.run(async (fn, o) => {
        const images = await imagesFor([urls.zad, urls.ctx, urls.odp]);
        const raw = await fn.json(
          gradePrompt({ subject: subjectDef(t.subjectId)!.name.toLowerCase(), label: t.label, max: t.maxPoints, answer: (s.answers[t.id]?.text ?? '').trim(), hasPhoto: false, hasKey: !!urls.odp, memory: memoryHint(data.memory, t.subjectId, t.topics[0] ?? null) }),
          { signal: o.signal, images, cache: false },
        );
        return parseGrade(raw, t.maxPoints);
      });
      if (!r) break;
      updateSession(s.id, (x) => setAnswer(x, t.id, { self: r.points, by: 'claude', feedback: r.feedback }, Date.now()));
    }
    setProgress(null);
  };
  return (
    <div className="stack-2">
      <button type="button" className="btn btn-secondary" onClick={() => void runAll()} disabled={call.busy}>
        Sprawdź wszystkie z Claude’em ({todo.length})
      </button>
      {progress ? <span className="small muted">Sprawdzam {progress.cur} z {progress.all}…</span> : null}
      <AiStatus call={call} />
    </div>
  );
}

export function ResultView({ s, tasks, title }: { s: Session; tasks: AppTask[]; title: string }) {
  const { d, putSession, today, toast } = useStore();
  const edit = usePlanEdit();
  const score = scoreExam(tasks, s.answers);
  const p = pct(score.pts, score.max);
  const fc = d.forecast[s.subjectId].pct;
  const losses = Object.entries(score.perTopic)
    .map(([topic, [pts, max]]) => ({ topic, lost: max - pts, pct: pct(pts, max), max }))
    .filter((x) => x.lost > 0 && x.topic !== 'bez-tematu')
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 5);
  const ungraded = score.total - score.graded;
  const sec = Math.round(elapsed(s, s.finishedAt ?? Date.now()) / 1000);
  const diag = s.mode === 'diagnoza';
  const exam = s.examId ? d.examById.get(s.examId) : undefined;
  const otherParts = exam && s.partId ? exam.parts.filter((x) => x.id !== s.partId) : [];

  const addWeak = () => {
    let n = 0;
    const used = new Set<string>();
    losses.slice(0, 3).forEach((l, i) => {
      const sug = suggestTasks(d.plannable, d.srsBefore, s.subjectId, l.topic, used, addDays(today, i + 1), 1)[0];
      if (!sug) return;
      used.add(sug.id);
      const t = d.tasks.get(sug.id);
      if (t) {
        edit.add(addDays(today, i + 1), taskPlanItem(t), true);
        n++;
      }
    });
    toast(n ? `Dodano do planu: ${zadan(n)} ze słabych tematów.` : 'Brak nowych zadań ze słabych tematów.');
  };

  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={() => go(diag ? '#postep' : '#arkusze')}>
            <Icon name="zamknij" />
          </button>
          <span className="where">{diag ? 'Wynik diagnozy' : 'Wynik arkusza'}</span>
        </div>
      </header>
      <div className="focus-body">
        <div className="result-grid">
        <div className="stack result-main">
          <div className="stack">
            <h1 style={{ fontSize: '1.25rem', lineHeight: '1.625rem' }}>{title}</h1>
            <div className="big">
              {String(score.pts).replace('.', ',')} z {score.max}, {p}%
            </div>
            <p className="muted">
              Ocenione {score.graded} z {score.total} zadań. Czas: {fmtDuration(sec)}.
            </p>
            {score.closedMax > 0 ? <p className="tnum">Zamknięte: {score.closedPts} z {score.closedMax} pkt</p> : null}
            {fc != null ? <p>Prognoza z przedmiotu: {fc}%.</p> : null}
            {diag ? (
              <p style={{ fontWeight: 650 }}>
                Diagnoza {subjectDef(s.subjectId)!.genitive.replace(/^/, 'z ')} zapisana.{fc != null ? ` Prognoza: ${fc}%.` : ''}
              </p>
            ) : null}
          </div>
          {ungraded > 0 ? (
            <div className="banner info">
              <div className="bt">
                <Icon name="info" />
                <span>Bez oceny: {zadan(ungraded)}. Wynik liczy tylko ocenione zadania.</span>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => putSession({ ...s, status: 'ocena', gradeIndex: 0, updatedAt: Date.now() })}>
                Oceń pozostałe
              </button>
            </div>
          ) : null}
          {losses.length ? (
            <section className="stack">
              <h2>{diag ? 'Tematy do poprawy' : 'Największa strata punktów'}</h2>
              <div className="card flush list">
                {losses.map((l) => (
                  <div className="li static" key={l.topic}>
                    <span className="grow">{shortTopic(l.topic)}</span>
                    <span className="small tnum muted">
                      {l.pct}%, strata {String(Math.round(l.lost * 10) / 10).replace('.', ',')} pkt
                    </span>
                  </div>
                ))}
              </div>
              <button type="button" className={`btn ${ungraded > 0 || diag ? 'btn-secondary' : 'btn-primary'} btn-phone-block`} onClick={addWeak}>
                Dodaj słabe tematy do planu
              </button>
            </section>
          ) : null}
          {diag ? (
            <DiagnosisNext subject={s.subjectId} />
          ) : otherParts.length ? (
            <div className="row">
              {otherParts.map((x) => (
                <button key={x.id} type="button" className="btn btn-secondary" onClick={() => go({ name: 'arkusz', examId: s.examId!, partId: x.id })}>
                  Przejdź do: {x.name.replace(/\.$/, '').toLowerCase()}
                </button>
              ))}
            </div>
          ) : null}
        </div>
          <section className="stack result-list">
            <h2>Zadania</h2>
            <div className="card flush list">
              {tasks.map((t) => {
                const r = score.perTask[t.id];
                return (
                  <button type="button" className="li" key={t.id} onClick={() => go({ name: t.essay ? 'wypracowanie' : 'zadanie', id: t.id })}>
                    <span className="grow">
                      <span style={{ fontWeight: 600 }}>{displayNr(t.nr).startsWith('temat') ? `Wypracowanie, ${displayNr(t.nr)}` : `Zadanie ${displayNr(t.nr)}`}</span>
                      <br />
                      <span className="small muted">{shortTopic(t.topics[0])}</span>
                    </span>
                    {!r.counted ? <Tag>nie liczone</Tag> : r.graded ? <Tag tone={r.pts === r.max ? 'ok' : r.pts === 0 ? 'bad' : undefined}>{r.pts} z {r.max} pkt</Tag> : <Tag tone="warn">bez oceny</Tag>}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DiagnosisNext({ subject }: { subject: string }) {
  const { d, data } = useStore();
  const next = (['mat-p', 'mat-r', 'pol-p', 'ang-p'] as const).find((id) => id !== subject && data.stan.enabled[id] && !d.diagnosed.has(id) && d.diagnosis[id].enough);
  return (
    <div className="row">
      {next ? (
        <button type="button" className="btn btn-primary" onClick={() => go({ name: 'diagnoza', subject: next })}>
          Następny przedmiot
        </button>
      ) : null}
      <button type="button" className={`btn ${next ? 'btn-secondary' : 'btn-primary'}`} onClick={() => go('#plan')}>
        Przejdź do planu
      </button>
    </div>
  );
}
