// Wypracowanie (polski) i wypowiedź pisemna (angielski): temat z arkusza,
// pole pisania z licznikiem słów, autozapis co 5 s, stoper i samoocena
// według kryteriów CKE.

import { useEffect, useRef, useState } from 'react';
import { subjectDef, type Essay, type Session } from '../model';
import { newId, useStore } from '../store/AppStore';
import { criteriaFor } from '../store/catalog';
import type { AppTask } from '../store/derived';
import { elapsed, newSession, pause, pauseIfRunning, remaining, restoreAfterReload, resume, setAnswer } from '../logic/session';
import { LS_PULSE, lsSet } from '../store/local';
import { readPulse, useAutosave } from './Runner';
import { countWords } from '../logic/scoring';
import { fmtClock } from '../logic/format';
import { TaskSheet } from '../ui/TaskImage';
import { Empty, MoreMenu, Segmented, useMedia, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { CriteriaForm, criteriaComplete, criteriaSum, WordCounter } from './sessionParts';
import { Focus } from './Exams';
import { EssayGrader } from './aiParts';

/** Czas zalecany: ten sam, który plan rezerwuje na wypracowanie. */
function recommendedMinutes(t: AppTask): number {
  return t.minutes;
}

export function EssayView({ id }: { id: string }) {
  const { d, data, putSession, today } = useStore();
  const t = d.tasks.get(id);
  const existing = Object.values(data.sessions)
    .filter((s) => s.mode === 'wypracowanie' && s.taskIds.includes(id) && s.status !== 'koniec')
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  // jedna nowa sesja na wejście; po zapisaniu oceny nie powstaje kolejna
  const created = useRef(false);
  useEffect(() => {
    if (!t || existing || created.current) return;
    created.current = true;
    const alts = t.alternative ? [...d.tasks.values()].filter((x) => x.examId === t.examId && x.alternative === t.alternative).map((x) => x.id) : [t.id];
    const s = newSession({ id: newId('wyp'), mode: 'wypracowanie', subjectId: t.subjectId, examId: t.examId || null, partId: null, taskIds: alts, limitMs: recommendedMinutes(t) * 60_000, planDate: today, now: Date.now() });
    putSession({ ...s, essayTaskId: t.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id, existing?.id]);
  if (!t || !t.essay) {
    return (
      <Focus title="Wypracowanie">
        <Empty text={d.packsLoading ? 'Ładowanie zadań…' : 'Nie znaleziono tego tematu.'} action={{ label: 'Przejdź do zadań', run: () => go('#zadania') }} />
      </Focus>
    );
  }
  if (!existing) return <Focus title="Wypracowanie"><p className="muted">Ładowanie…</p></Focus>;
  return <Editor key={existing.id} s={existing} />;
}

function Editor({ s }: { s: Session }) {
  const { d, updateSession, commitNow, putEssay, saveResult, today } = useStore();
  const wide = useMedia('(min-width: 1080px)');
  const [tab, setTab] = useState<'Temat' | 'Tekst' | 'Ocena'>('Tekst');
  const chosenId = s.essayTaskId ?? s.taskIds[0];
  const t = d.tasks.get(chosenId)!;
  const alts = s.taskIds.map((x) => d.tasks.get(x)).filter(Boolean) as AppTask[];
  const [text, setText] = useState(s.answers[chosenId]?.text ?? '');
  const [criteria, setCriteria] = useState<Record<string, number>>(s.answers[chosenId]?.criteria ?? {});
  const [claudeVals, setClaudeVals] = useState<Record<string, number> | null>(null);
  const sref = useRef(s);
  sref.current = s;
  const sid = s.id;
  const saved = useAutosave(
    text,
    (v) => updateSession(sid, (x) => setAnswer(x, x.essayTaskId ?? x.taskIds[0], { text: v }, Date.now())),
    (v) => commitNow((dd) => (dd.sessions[sid] ? { ...dd, sessions: { ...dd.sessions, [sid]: setAnswer(dd.sessions[sid], dd.sessions[sid].essayTaskId ?? dd.sessions[sid].taskIds[0], { text: v }, Date.now()) } } : dd)),
    s.answers[chosenId]?.text ?? '',
  );
  const now = useNow(1000);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, window.innerHeight * 0.5)}px`;
  });
  const set = criteriaFor(t.essay?.criteria, subjectDef(t.subjectId)!.family);
  const isPol = t.subjectId === 'pol-p';
  const name = isPol ? 'Wypracowanie' : 'Wypowiedź pisemna';

  // Stoper rusza przy wejściu i staje przy wyjściu, ukryciu albo zamknięciu karty;
  // po odświeżeniu nie liczy czasu, gdy karta była zamknięta.
  useEffect(() => {
    const pauseNow = (x: Session) => pauseIfRunning(x, Date.now());
    updateSession(sid, (x) => (x.status === 'trwa' ? resume(restoreAfterReload(x, Date.now(), readPulse(sid)), Date.now()) : x));
    const beat = () => lsSet(LS_PULSE, JSON.stringify({ id: sid, t: Date.now() }));
    const pulse = setInterval(beat, 5000);
    const hide = () => {
      beat();
      commitNow((dd) => (dd.sessions[sid] ? { ...dd, sessions: { ...dd.sessions, [sid]: pauseNow(dd.sessions[sid]) } } : dd));
    };
    const vis = () => (document.visibilityState === 'hidden' ? hide() : updateSession(sid, (x) => (x.status === 'trwa' ? resume(x, Date.now()) : x)));
    window.addEventListener('pagehide', hide);
    document.addEventListener('visibilitychange', vis);
    return () => {
      clearInterval(pulse);
      window.removeEventListener('pagehide', hide);
      document.removeEventListener('visibilitychange', vis);
      updateSession(sid, pauseNow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = s.timerOn !== false ? remaining(s, now) : null;
  const ms = s.timerOn !== false ? left ?? elapsed(s, now) : 0;
  const words = countWords(text);
  const sum = Math.min(t.maxPoints, criteriaSum(set, criteria));
  const complete = criteriaComplete(set, criteria);
  const max = set?.max ?? t.maxPoints;

  const saveGrade = () => {
    const cur = pause(setAnswer(sref.current, chosenId, { text, criteria, self: sum }, Date.now()), Date.now());
    const sec = Math.round(elapsed(cur, Date.now()) / 1000);
    const by = claudeVals && JSON.stringify(claudeVals) === JSON.stringify(criteria) ? 'claude' : 'samoocena';
    const essay: Essay = { id: newId('e'), taskId: chosenId, subjectId: t.subjectId, text, words, criteria, points: sum, max, date: today, sec, updatedAt: Date.now(), by };
    putEssay(essay);
    saveResult({ task: chosenId, subj: t.subjectId, topics: t.topics, pts: sum, max: t.maxPoints, sec, src: 'wypracowanie', by }, { toast: `Zapisano ocenę: ${String(sum).replace('.', ',')} z ${max} pkt.` });
    updateSession(sid, () => ({ ...cur, status: 'koniec', runningSince: null, finishedAt: Date.now(), updatedAt: Date.now() }));
    goBack();
  };

  const chooseTopic = (id: string) => {
    updateSession(sid, (x) => ({ ...setAnswer(x, chosenId, { text }, Date.now()), essayTaskId: id }));
  };

  const topicCol = (
    <div className="topic-col stack">
      {alts.length > 1 ? (
        <Segmented label="Temat" options={alts.map((a) => a.id)} value={chosenId} onChange={chooseTopic} render={(v) => `Temat ${alts.findIndex((a) => a.id === v) + 1}`} />
      ) : null}
      <TaskSheet task={t} level="podstawowy" />
    </div>
  );
  const textCol = (
    <div className="card stack">
      <label htmlFor="essay" className="sr-only">
        Twój tekst
      </label>
      <textarea
        id="essay"
        ref={area}
        className="essay-text"
        placeholder="Zacznij pisać…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
        lang={isPol ? 'pl' : 'en'}
      />
    </div>
  );
  const gradeCol = (
    <div className="stack">
      <EssayGrader
        t={t}
        text={text}
        set={set}
        onGraded={(g) => {
          const v = { ...criteria, ...g.values };
          setCriteria(v);
          setClaudeVals(v);
        }}
      />
      <CriteriaForm set={set} values={criteria} onChange={setCriteria} fallbackMax={t.maxPoints} />
      <button type="button" className="btn btn-primary btn-phone-block" onClick={saveGrade} disabled={!complete || words === 0}>
        Zapisz ocenę
      </button>
      {words === 0 ? <p className="small muted">Ocena będzie możliwa po napisaniu tekstu.</p> : null}
    </div>
  );
  const showTab = wide ? (tab === 'Ocena' ? 'Ocena' : 'Tekst') : tab;

  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">{name}</span>
          {s.timerOn !== false ? (
            <span className={`timer${left === 0 ? ' over' : ''}`} role="timer" aria-label="Czas zalecany">
              <Icon name="zegar" size={20} />
              {fmtClock(ms, ms >= 3600_000)}
            </span>
          ) : null}
          <MoreMenu items={[{ label: s.timerOn !== false ? 'Wyłącz stoper' : 'Włącz stoper', run: () => updateSession(sid, (x) => ({ ...x, timerOn: x.timerOn === false, updatedAt: Date.now() })) }]} />
        </div>
        <div className="tabs-phone" style={{ padding: '0 12px 8px' }}>
          <Segmented full label="Widok" options={['Temat', 'Tekst', 'Ocena'] as const} value={tab} onChange={setTab} />
        </div>
      </header>
      <div className="focus-body">
        {wide ? (
          <div className="essay-grid">
            {topicCol}
            <div className="stack">
              <div className="row">
                <button type="button" className="btn btn-secondary" onClick={() => setTab(showTab === 'Ocena' ? 'Tekst' : 'Ocena')}>
                  {showTab === 'Ocena' ? 'Wróć do tekstu' : 'Oceń tekst'}
                </button>
              </div>
              {showTab === 'Ocena' ? (
                gradeCol
              ) : (
                <>
                  {textCol}
                  <div className="essay-foot inline">
                    <WordCounter text={text} min={t.essay?.minWords ?? null} max={t.essay?.maxWords ?? null} saved={saved ? 'zapisano' : null} />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : showTab === 'Temat' ? (
          topicCol
        ) : showTab === 'Ocena' ? (
          gradeCol
        ) : (
          textCol
        )}
      </div>
      {showTab === 'Tekst' && !wide ? (
        <div className="essay-foot">
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <WordCounter text={text} min={t.essay?.minWords ?? null} max={t.essay?.maxWords ?? null} saved={saved ? 'zapisano' : null} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
