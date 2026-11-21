import { useEffect, useState } from 'react';
import { SUBJECTS, subjectDef, type Session } from '../model';
import { newId, useStore } from '../store/AppStore';
import { examLabel, examMinutes, examPartIds, examTasks, partName, pointSum, type CkeExam } from '../logic/cke';
import { newSession } from '../logic/session';
import { combineScores, pct, scoreExam } from '../logic/scoring';
import { zadan } from '../logic/format';
import { Empty, SubjectTag, Switch, Tag } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { ResultView, Runner, sessionTasks } from './Runner';
import { PacksBanner } from './Start';

export function examTitle(e: CkeExam, partId: string | null): string {
  const sub = subjectDef(e.subjectId)!;
  const p = partName(e, partId);
  return `${sub.name}, ${examLabel(e)}${p ? `, ${p.toLowerCase()}` : ''}`;
}

function sessionsOf(sessions: Record<string, Session>, examId: string, partId: string | null) {
  return Object.values(sessions)
    .filter((s) => s.mode === 'arkusz' && s.examId === examId && (s.partId ?? null) === (partId ?? null))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function ExamCard({ e }: { e: CkeExam }) {
  const { data, d } = useStore();
  const parts = examPartIds(e);
  const minutes = parts.reduce((a, p) => a + examMinutes(e, p), 0);
  const available = d.packs[e.id] === 'jest';
  const finished = parts.map((p) => sessionsOf(data.sessions, e.id, p).find((s) => s.status === 'koniec'));
  const running = parts.some((p) => sessionsOf(data.sessions, e.id, p).some((s) => s.status !== 'koniec'));
  const scores = finished.map((s) => (s ? scoreExam(sessionTasks(s, d.tasks), s.answers) : null));
  const all = scores.every(Boolean) ? combineScores(scores as NonNullable<(typeof scores)[number]>[]) : null;
  const some = scores.find(Boolean);
  const hasAudio = !!e.audio;
  return (
    <div className="card task-card">
      <div className="meta">
        <SubjectTag id={e.subjectId} />
        <span className="small muted">{examLabel(e)}</span>
      </div>
      <div className="title">{subjectDef(e.subjectId)!.name}</div>
      <span className="small muted">
        {minutes} min, {e.maxPoints ?? pointSum(e.tasks)} pkt{parts.length > 1 ? `, ${parts.length} części` : ''}
        {hasAudio ? ', nagrania' : ''}
      </span>
      {all ? (
        <span className="tnum" style={{ fontWeight: 650 }}>
          Twój wynik: {String(all.pts).replace('.', ',')} z {all.max}, {pct(all.pts, all.max)}%
        </span>
      ) : some ? (
        <span className="small">Zrobione części: {finished.filter(Boolean).length} z {parts.length}</span>
      ) : null}
      <div className="foot" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        {!available ? (
          <span className="small muted">{d.packs[e.id] === 'ladowanie' || !d.packs[e.id] ? 'Ładowanie zadań…' : 'Zadania tego arkusza są niedostępne.'}</span>
        ) : running ? (
          <button type="button" className="btn btn-primary" onClick={() => go({ name: 'arkusz', examId: e.id, partId: null })}>
            Wróć do arkusza
          </button>
        ) : some ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'arkusz', examId: e.id, partId: null })}>
              Zobacz wynik
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                repeatExam = e.id;
                go({ name: 'arkusz', examId: e.id, partId: null });
              }}
            >
              Powtórz
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => go({ name: 'arkusz', examId: e.id, partId: null })}>
            Zacznij arkusz
          </button>
        )}
      </div>
    </div>
  );
}

/** „Powtórz” z listy: ekran arkusza otwiera od razu start nowego podejścia. */
let repeatExam: string | null = null;

export function ExamsView() {
  const { d, data, today } = useStore();
  useEffect(() => {
    repeatExam = null;
  }, []);
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id]).sort((a, b) => a.examDate.localeCompare(b.examDate));
  // domyślnie przedmiot trwającego arkusza, a bez niego przedmiot z najbliższym egzaminem
  const runningSubj = Object.values(data.sessions).find((s) => s.mode === 'arkusz' && s.status !== 'koniec')?.subjectId;
  const nearest = enabled.find((s) => s.examDate >= today)?.id ?? enabled[0]?.id;
  const [filter, setFilter] = useState<string>(runningSubj ?? nearest ?? 'wszystkie');
  const groups = enabled
    .filter((s) => filter === 'wszystkie' || s.id === filter)
    .map((s) => ({ s, list: d.exams.filter((e) => e.complete && e.subjectId === s.id).sort((a, b) => b.year - a.year) }))
    .filter((g) => g.list.length);
  return (
    <div className="page">
      <h1 className="ptitle">Arkusze</h1>
      <PacksBanner />
      <div className="chips" role="group" aria-label="Przedmiot">
        {['wszystkie', ...enabled.map((s) => s.id)].map((v) => (
          <button key={v} type="button" className="chip" aria-pressed={filter === v} onClick={() => setFilter(v)}>
            {v === 'wszystkie' ? 'wszystkie' : subjectDef(v)!.name}
          </button>
        ))}
      </div>
      {groups.length === 0 ? (
        <Empty text="Brak pełnych arkuszy dla wybranych przedmiotów." action={{ label: 'Przejdź do zadań', run: () => go('#zadania') }} />
      ) : (
        groups.map(({ s, list }) => (
          <section className="stack" key={s.id} aria-label={s.name}>
            <h2>{s.name}</h2>
            <div className="two-col" style={{ gap: 12 }}>
              {list.map((e) => (
                <ExamCard key={e.id} e={e} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** Ekran arkusza: wybór części, ekran przed startem, arkusz w trakcie albo wynik. */
export function ExamView({ examId, partId }: { examId: string; partId: string | null }) {
  const { d, data, putSession, today } = useStore();
  const [timed, setTimed] = useState(true);
  const [view, setView] = useState<'auto' | 'start'>(() => (repeatExam === examId ? 'start' : 'auto'));
  const e = d.examById.get(examId);
  if (!e) {
    return (
      <Focus title="Arkusz">
        <Empty text={d.packsLoading ? 'Ładowanie zadań…' : 'Nie znaleziono tego arkusza.'} action={{ label: 'Przejdź do arkuszy', run: () => go('#arkusze') }} />
      </Focus>
    );
  }
  const parts = examPartIds(e);
  if (partId == null && parts.length > 1) {
    return (
      <Focus title={examTitle(e, null)}>
        <div className="page" style={{ maxWidth: 640, margin: 0 }}>
          <h1>{examTitle(e, null)}</h1>
          <p className="muted">Arkusz ma dwie części. Możesz je robić w różne dni.</p>
          <div className="stack">
            {parts.map((p) => {
              const ss = sessionsOf(data.sessions, e.id, p);
              const done = ss.find((s) => s.status === 'koniec');
              const run = ss.find((s) => s.status !== 'koniec');
              const sc = done ? scoreExam(sessionTasks(done, d.tasks), done.answers) : null;
              return (
                <div className="card task-card" key={p}>
                  <div className="title">{partName(e, p)}</div>
                  <span className="small muted">
                    {examMinutes(e, p)} min, {pointSum(examTasks(e, p))} pkt, {zadan(examTasks(e, p).length)}
                  </span>
                  {sc ? (
                    <span className="tnum" style={{ fontWeight: 650 }}>
                      Wynik: {sc.pts} z {sc.max}, {pct(sc.pts, sc.max)}%
                    </span>
                  ) : null}
                  <div className="foot" style={{ justifyContent: 'flex-start' }}>
                    <button type="button" className={`btn ${run ? 'btn-primary' : 'btn-secondary'}`} onClick={() => go({ name: 'arkusz', examId: e.id, partId: p })}>
                      {run ? 'Wróć do arkusza' : done ? 'Zobacz wynik' : 'Zacznij'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Focus>
    );
  }
  const pid = partId ?? parts[0];
  const ss = sessionsOf(data.sessions, e.id, pid);
  const running = ss.find((s) => s.status !== 'koniec');
  const done = ss.find((s) => s.status === 'koniec');
  const title = examTitle(e, pid);
  if (running) return <Runner sessionId={running.id} title={title} />;
  if (done && view === 'auto') {
    return (
      <>
        <ResultView s={done} tasks={sessionTasks(done, d.tasks)} title={title} />
        <div className="actionbar">
          <div className="inner" style={{ maxWidth: 760 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setView('start')}>
              Powtórz arkusz
            </button>
          </div>
        </div>
      </>
    );
  }
  const tasks = examTasks(e, pid);
  const minutes = examMinutes(e, pid);
  const available = d.packs[e.id] === 'jest';
  const start = () => {
    repeatExam = null;
    const now = Date.now();
    const s = newSession({
      id: newId('arkusz'),
      mode: 'arkusz',
      subjectId: e.subjectId,
      examId: e.id,
      partId: pid,
      taskIds: tasks.map((t) => t.id),
      limitMs: timed ? minutes * 60_000 : null,
      planDate: today,
      now,
    });
    putSession(s);
  };
  return (
    <Focus title={title}>
      <div className="page" style={{ maxWidth: 640, margin: 0 }}>
        <div className="stack">
          <SubjectTag id={e.subjectId} long />
          <h1>{title}</h1>
          <p className="tnum">
            {minutes} min, {zadan(tasks.length)}, {pointSum(tasks)} pkt
          </p>
          <p>Odpowiedzi zobaczysz po zakończeniu. Możesz wracać do zadań.{e.audio ? ' Każde nagranie zawiera oba odczytania, jak na egzaminie.' : ''} Otwarte zadania rozwiązujesz na kartce i oceniasz po zakończeniu.</p>
        </div>
        <label className="card switch-row" style={{ padding: '4px 16px' }}>
          <span style={{ fontWeight: 600 }}>Odliczaj czas</span>
          <Switch checked={timed} onChange={setTimed} label="Odliczaj czas" />
        </label>
        {!available ? <p className="muted">Zadania tego arkusza jeszcze się wczytują.</p> : null}
        <div>
          <button type="button" className="btn btn-primary btn-phone-block" onClick={start} disabled={!available || tasks.length === 0}>
            Zacznij arkusz
          </button>
        </div>
        {done ? <Tag>Masz już wynik z tego arkusza; nowy zapis go nie usuwa.</Tag> : null}
      </div>
    </Focus>
  );
}

export function Focus({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="focus">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">{title}</span>
        </div>
      </header>
      <div className="focus-body">{children}</div>
    </div>
  );
}
