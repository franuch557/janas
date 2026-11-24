// Sesja powtórek (na cały ekran, jak aplikacja mobilna) i mapa pamięci.
// Przebieg: ustawienia sesji → zadanie → karta odpowiedzi (odpowiedź, rozwiązanie, wskazówki,
// najczęstsze błędy) → ocena trudności wyliczona przez aplikację → następne zadanie.
// Zadanie ocenione „Do nauki” wraca raz na koniec sesji.

import { useEffect, useMemo, useRef, useState } from 'react';
import { SUBJECTS, subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import type { AppTask } from '../store/derived';
import { scoreClosed } from '../logic/scoring';
import { autoRate, buildSession, dueCount, memoryMap, postponed, postponeRef, previewNext, RATES, whenLabel, type Rate, type ReviewMode, type TopicMemory } from '../logic/review';
import { dni, fmtClock, plural, zadan } from '../logic/format';
import { topicName } from '../data/taxonomy';
import { TIPS } from '../data/wskazowki';
import { AnswerCard, checkMessage, SelfGrade } from '../ui/AnswerCard';
import { ContextSheet, TaskSheet } from '../ui/TaskImage';
import { Empty, SubjectTag, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { go, goBack } from '../ui/router';
import { useExplain } from './explainParts';
import { HintSteps, useHintSteps } from './hintParts';
import { AutoGrader, useAutoKind, type AutoResult } from './autoGrade';

const LENGTHS = [5, 10, 20, 30] as const;
const MODES: { id: ReviewMode; label: string; hint: string }[] = [
  { id: 'mieszane', label: 'Mieszane', hint: 'Powtórki i trochę nowych zadań' },
  { id: 'powtorki', label: 'Same powtórki', hint: 'Tylko to, co czeka na dziś' },
  { id: 'nowe', label: 'Nowe zadania', hint: 'Najważniejsze działy, jeszcze nie ćwiczone' },
];

function usePool() {
  const { d, data, today } = useStore();
  const subjects = SUBJECTS.filter((s) => data.stan.enabled[s.id]).map((s) => s.id);
  const pool = useMemo(() => subjects.flatMap((s) => d.available[s]).filter((t) => !t.essay), [d.available, subjects.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const srs = useMemo(() => new Map([...d.records].map(([k, v]) => [k, v.srs])), [d.records]);
  const skip = useMemo(() => postponed(d.active.ticks, today), [d.active.ticks, today]);
  return { pool, srs, skip, subjects };
}

interface Settings {
  minutes: number;
  mode: ReviewMode;
  chosen: SubjectId[] | null;
}

export function ReviewView({ subject, topic }: { subject: SubjectId | null; topic: string | null }) {
  const [run, setRun] = useState<{ ids: string[]; minutes: number; n: number } | null>(null);
  // ustawienia zostają po „Jeszcze jedna sesja”
  const [settings, setSettings] = useState<Settings>({ minutes: 10, mode: 'mieszane', chosen: subject ? [subject] : null });
  return run ? (
    <Runner key={`${run.n}-${run.ids.join()}`} ids={run.ids} minutes={run.minutes} onAgain={() => setRun(null)} />
  ) : (
    <Setup subject={subject} topic={topic} settings={settings} onSettings={setSettings} onStart={(ids, minutes) => setRun((r) => ({ ids, minutes, n: (r?.n ?? 0) + 1 }))} />
  );
}

// ---------- ustawienia sesji ----------

function Setup({ subject, topic, settings, onSettings, onStart }: { subject: SubjectId | null; topic: string | null; settings: Settings; onSettings: (s: Settings) => void; onStart: (ids: string[], minutes: number) => void }) {
  const { d, today } = useStore();
  const { pool, srs, skip, subjects } = usePool();
  const { minutes, mode } = settings;
  const chosen = (settings.chosen ?? subjects).filter((s) => subjects.includes(s));
  const picked = chosen.length ? chosen : subjects;
  const setMinutes = (m: number) => onSettings({ ...settings, minutes: m });
  const setMode = (m: ReviewMode) => onSettings({ ...settings, mode: m });
  const opts = { minutes, mode, subjects: picked, topic, today, priority: (s: string, tp: string) => d.priorities[s as SubjectId]?.[tp] ?? 0 };
  const set = useMemo(() => buildSession(pool, srs, skip, opts), [pool, srs, skip, minutes, mode, picked.join(), topic]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = dueCount(pool, srs, skip, picked, today, topic);
  const toggle = (s: SubjectId) => onSettings({ ...settings, chosen: picked.includes(s) ? (picked.length > 1 ? picked.filter((x) => x !== s) : picked) : [...picked, s] });
  return (
    <div className="focus rv">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">Sesja powtórek</span>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => go('#mapa-pamieci')}>
            Mapa pamięci
          </button>
        </div>
      </header>
      <div className="focus-body">
        <div className="page rv-setup">
          <section className="rv-hero">
            <span className="rv-hero-num tnum">{due}</span>
            <div>
              <h1>{plural(due, 'powtórka czeka', 'powtórki czekają', 'powtórek czeka')} na dziś</h1>
              <p className="muted">{topic ? `Dział: ${topicName(topic)}.` : 'Ucz się krótko i często. Aplikacja sama ocenia, jak poszło, i pilnuje, kiedy wrócić do każdego zadania.'}</p>
            </div>
          </section>
          <section className="stack-2">
            <h2 className="rv-label">Długość sesji</h2>
            <div className="rv-options" role="radiogroup" aria-label="Długość sesji">
              {LENGTHS.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className="rv-option" onClick={() => setMinutes(m)}>
                  <strong className="tnum">{m}</strong>
                  <span>min</span>
                </button>
              ))}
            </div>
          </section>
          <section className="stack-2">
            <h2 className="rv-label">Co dziś?</h2>
            <div className="rv-modes" role="radiogroup" aria-label="Rodzaj sesji">
              {MODES.map((m) => (
                <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} className="rv-mode" onClick={() => setMode(m.id)}>
                  <strong>{m.label}</strong>
                  <span>{m.hint}</span>
                </button>
              ))}
            </div>
          </section>
          {!subject && subjects.length > 1 ? (
            <section className="stack-2">
              <h2 className="rv-label">Przedmioty</h2>
              <div className="lk-chips" style={{ marginTop: 0 }}>
                {subjects.map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={picked.includes(s)} onClick={() => toggle(s)}>
                    {subjectDef(s)!.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <div className="rv-start">
            <p className="muted small" aria-live="polite">
              {set.length ? `${zadan(set.length)}, około ${set.reduce((a, t) => a + Math.max(1, t.minutes), 0)} min.` : mode === 'powtorki' ? 'Na dziś nie ma powtórek. Wybierz „Mieszane” albo „Nowe zadania”.' : d.packsLoading ? 'Ładowanie zadań…' : 'Brak zadań dla tych ustawień.'}
            </p>
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!set.length} onClick={() => onStart(set.map((t) => t.id), minutes)}>
              Zacznij sesję
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- przebieg sesji ----------

interface Done {
  id: string;
  rate: Rate;
  next: string | null;
}

/** Wynik pozycji w kolejce sesji (do kolorów paska postępu). */
type Slot = Rate | 'odl' | 'pom';

function SessionClock({ start, minutes, active }: { start: number; minutes: number; active: boolean }) {
  const now = useNow(1000, active);
  const [end, setEnd] = useState<number | null>(null);
  useEffect(() => {
    if (!active) setEnd((e) => e ?? Date.now());
  }, [active]);
  const elapsed = (end ?? now) - start;
  return (
    <span className={`timer${elapsed > minutes * 60_000 ? ' over' : ''}`} role="timer" aria-label="Czas sesji">
      <Icon name="zegar" size={20} />
      {fmtClock(elapsed)}
    </span>
  );
}

function Runner({ ids, minutes, onAgain }: { ids: string[]; minutes: number; onAgain: () => void }) {
  const { d, today, saveResult, tick } = useStore();
  const [queue, setQueue] = useState<string[]>(ids);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState(0);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [done, setDone] = useState<Done[]>([]);
  const [start] = useState(Date.now());
  const id = queue[pos];
  const t = id ? d.tasks.get(id) : undefined;
  const finished = pos >= queue.length;

  // każde zadanie zaczyna się od góry ekranu
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pos]);

  const advance = (slot: Slot) => {
    setSlots((s) => {
      const n = [...s];
      n[pos] = slot;
      return n;
    });
    setPos((p) => p + 1);
  };
  const rated = (rate: Rate, pts: number, extra: Partial<Parameters<typeof saveResult>[0]>, sec: number) => {
    if (!t) return;
    const prev = d.records.get(t.id)?.srs;
    const pct = t.maxPoints > 0 ? (pts / t.maxPoints) * 100 : 0;
    saveResult({ task: t.id, subj: t.subjectId, topics: t.topics, pts, max: t.maxPoints, sec, src: 'zadanie', rate, ...extra }, { toast: false });
    // ostatnia ocena zadania zastępuje wcześniejszą (zadanie po błędzie wraca w tej sesji)
    setDone((x) => [...x.filter((y) => y.id !== t.id), { id: t.id, rate, next: previewNext(prev, pct, rate, today) }]);
    // „Do nauki” wraca raz na koniec tej sesji (krok nauki)
    if (rate === 1 && !requeued.has(t.id)) {
      setQueue((q) => [...q, t.id]);
      setRequeued((s) => new Set(s).add(t.id));
    }
    advance(rate);
  };
  const later = () => {
    if (!t) return;
    tick(postponeRef(t.id, 1));
    advance('odl');
  };
  const retry = !!t && queue.slice(0, pos).includes(t.id);

  return (
    <div className="focus rv">
      <header className="focus-head">
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zakończ sesję" title="Zakończ sesję" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <div className="rv-progress" role="progressbar" aria-label="Postęp sesji" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={Math.min(pos, queue.length)}>
            {queue.map((q, i) => {
              const sl = slots[i];
              return <span key={`${q}-${i}`} className={i < pos ? `done ${typeof sl === 'number' ? `r${sl}` : 'skip'}` : i === pos ? 'cur' : ''} />;
            })}
          </div>
          <SessionClock start={start} minutes={minutes} active={!finished} />
        </div>
      </header>
      <div className="focus-body">
        {finished ? (
          <Summary done={done} onAgain={onAgain} />
        ) : !t ? (
          <Empty text={d.packsLoading ? 'Ładowanie zadań…' : 'Nie znaleziono zadania.'} action={{ label: 'Pomiń', run: () => advance('pom') }} />
        ) : (
          <Step key={`${t.id}-${pos}`} t={t} nr={pos + 1} total={queue.length} retry={retry} onRated={rated} onLater={later} />
        )}
      </div>
    </div>
  );
}

/** Klawisze skrótów nie działają, gdy fokus jest na polu, przycisku albo zakładce, ani z modyfikatorami. */
function shortcutAllowed(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return false;
  const tg = e.target as HTMLElement | null;
  if (!tg) return true;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tg.tagName)) return false;
  if (tg.isContentEditable || tg.closest('[role=tab],[role=radio],[role=button]')) return false;
  return true;
}

function Step({ t, nr, total, retry, onRated, onLater }: { t: AppTask; nr: number; total: number; retry: boolean; onRated: (rate: Rate, pts: number, extra: Record<string, unknown>, sec: number) => void; onLater: () => void }) {
  const { d, today } = useStore();
  const [start] = useState(Date.now());
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [solveSec, setSolveSec] = useState<number | null>(null);
  const shown = solveSec != null;
  const [self, setSelf] = useState<number | null>(null);
  const [auto, setAuto] = useState<AutoResult | null>(null);
  const [hints, setHints] = useState(0);
  const verdictRef = useRef<HTMLDivElement>(null);
  const hintSteps = useHintSteps(t);
  const autoKind = useAutoKind(t);
  const sub = subjectDef(t.subjectId)!;
  const allChosen = t.answer ? t.answer.items.every((i) => choice[i.id]) : false;
  const closed = t.auto && !!t.answer;
  const pts = closed ? scoreClosed(t.answer!, choice, t.maxPoints).points : self;
  const pct = pts != null && t.maxPoints > 0 ? (pts / t.maxPoints) * 100 : null;
  const prev = d.records.get(t.id)?.srs;
  const verdict = pct != null && solveSec != null ? autoRate({ pct, hints, sec: solveSec, minutes: t.minutes, retry }) : null;
  const next = verdict ? previewNext(prev, pct!, verdict.rate, today) : null;
  const msg = closed && shown ? checkMessage(t.answer!, choice) : null;
  const rateLabel = verdict ? RATES.find((r) => r.rate === verdict.rate)!.label : '';

  const reveal = () => setSolveSec((s) => s ?? Math.round((Date.now() - start) / 1000));
  const finish = () => {
    if (!verdict || pts == null) return;
    const sec = Math.round((Date.now() - start) / 1000);
    const graded = !closed && auto && self === auto.points;
    onRated(verdict.rate, pts, closed ? { choice, ...(hints ? { hints } : {}) } : { by: graded ? 'automat' : 'samoocena', ...(graded ? { feedback: auto!.feedback } : {}), ...(hints ? { hints } : {}) }, sec);
  };

  // po sprawdzeniu fokus na werdykcie (czytnik ekranu od razu słyszy wynik)
  useEffect(() => {
    if (verdict) verdictRef.current?.focus({ preventScroll: true });
  }, [!!verdict]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!shortcutAllowed(e)) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (shown) finish();
        else if (!closed || allChosen) reveal();
      } else if (!shown && closed && t.answer!.items.length === 1 && t.answer!.items[0].options.includes(e.key.toUpperCase())) setChoice({ [t.answer!.items[0].id]: e.key.toUpperCase() });
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <div className="page rv-step">
      <div className="meta">
        <span className="small muted tnum">
          {nr} / {total}
        </span>
        <SubjectTag id={t.subjectId} />
        <span className="small muted">{topicName(t.topics[0])}</span>
        {retry ? <span className="tag ink">jeszcze raz</span> : prev?.attempts ? <span className="tag ink">powtórka</span> : <span className="tag">nowe</span>}
      </div>
      <div className="rv-task">
        <TaskSheet task={t} level={sub.level} showContext={false} />
        {t.context ? <ContextSheet task={t} collapsible /> : null}
      </div>
      {closed ? <AnswerCard answer={t.answer!} value={choice} onChange={(i, o) => !shown && setChoice((c) => ({ ...c, [i]: o }))} onAll={(v) => !shown && setChoice(v)} checked={shown} /> : null}
      {!shown ? (
        <>
          {hintSteps ? <HintSteps steps={hintSteps} shown={hints} onShow={() => setHints((h) => h + 1)} /> : null}
          {!closed && autoKind ? (
            <AutoGrader
              key={`rv-${t.id}`}
              t={t}
              kind={autoKind}
              onGraded={(r) => {
                setAuto(r);
                setSelf(r.points);
                reveal();
              }}
            />
          ) : null}
          <div className="rv-actions">
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={closed && !allChosen} onClick={reveal}>
              {closed ? 'Sprawdź' : 'Pokaż odpowiedź'}
            </button>
            <button type="button" className="btn btn-quiet btn-block" onClick={onLater}>
              Odłóż na później
            </button>
          </div>
        </>
      ) : (
        <>
          {msg ? (
            <div className={`feedback ${msg.ok ? 'ok' : 'bad'} reveal`} aria-live="polite">
              <Icon name={msg.ok ? 'ok' : 'zle'} />
              <span>
                {msg.text} {pts} z {t.maxPoints} pkt.
              </span>
            </div>
          ) : null}
          {auto ? (
            <div className="feedback reveal" aria-live="polite">
              <Icon name="ok" />
              <span>
                Ocena automatyczna: {auto.points} z {t.maxPoints} pkt. {auto.feedback}
              </span>
            </div>
          ) : null}
          <AnswerPanel t={t} />
          {!closed ? (
            <section className="card stack-2">
              <h3>Ile punktów?</h3>
              <p className="small muted">Porównaj z odpowiedzią i zaznacz punkty. Na tej podstawie aplikacja oceni, kiedy wrócić do zadania.</p>
              <SelfGrade max={t.maxPoints} value={self} onChange={setSelf} />
            </section>
          ) : null}
          <section className="rv-rate" aria-label="Ocena trudności">
            {verdict ? (
              <div ref={verdictRef} tabIndex={-1} className={`rv-verdict r${verdict.rate}`} aria-live="polite">
                <div>
                  <strong>{rateLabel}</strong>
                  <span> · następna powtórka {whenLabel(next, today)}</span>
                </div>
                <small>{verdict.why.join(', ')}</small>
              </div>
            ) : (
              <p className="small muted rv-verdict">Zaznacz punkty, a aplikacja oceni trudność.</p>
            )}
            <button type="button" className="btn btn-primary btn-block btn-lg" disabled={!verdict} onClick={finish}>
              Dalej
            </button>
          </section>
        </>
      )}
    </div>
  );
}

// ---------- karta odpowiedzi ----------

type Tab = 'odp' | 'rozw' | 'wsk' | 'bledy';

function AnswerPanel({ t }: { t: AppTask }) {
  const { data } = useStore();
  const ex = useExplain(t);
  const steps = useHintSteps(t);
  const tips = TIPS[t.topics[0]];
  const mine = data.memory.filter((m) => !m.deleted && m.subj === t.subjectId && m.topic === t.topics[0]).sort((a, b) => b.count - a.count).slice(0, 3);
  const cke = ex?.ang?.flatMap((x) => x.bad.slice(0, 3).map((b) => `${x.id}: „${b}” – nie zaliczono`)) ?? [];
  const lowPol = ex?.pol?.filter((x) => x.p === 0).slice(0, 2) ?? [];
  const solution = steps ?? ex?.mat ?? null;
  const tabs: { id: Tab; label: string; on: boolean }[] = [
    { id: 'odp', label: 'Odpowiedź', on: !t.user || !!t.answer },
    { id: 'rozw', label: 'Rozwiązanie', on: !!solution || !!ex?.pol?.length || !!ex?.ang?.length },
    { id: 'wsk', label: 'Wskazówki', on: !!tips?.mnemo.length },
    { id: 'bledy', label: 'Najczęstsze błędy', on: !!tips?.bledy.length || mine.length > 0 || cke.length > 0 || lowPol.length > 0 },
  ];
  const visible = tabs.filter((x) => x.on);
  const [tab, setTab] = useState<Tab>(visible[0]?.id ?? 'odp');
  const [atEnd, setAtEnd] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const checkEnd = () => {
    const el = listRef.current;
    if (el) setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  };
  useEffect(checkEnd, [visible.length]);
  if (!visible.length) return null;
  const pick = (id: Tab) => {
    setTab(id);
    document.getElementById(`rv-tab-${t.id}-${id}`)?.focus();
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = visible.findIndex((x) => x.id === tab);
    const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? visible.length - 1 : null;
    if (n == null) return;
    e.preventDefault();
    pick(visible[(n + visible.length) % visible.length].id);
  };
  const panelId = `rv-panel-${t.id}`;
  return (
    <section className="card rv-card reveal">
      <div ref={listRef} className={`rv-tabs${atEnd ? ' at-end' : ''}`} role="tablist" aria-label="Karta odpowiedzi" onScroll={checkEnd} onKeyDown={onKey}>
        {visible.map((x) => (
          <button
            key={x.id}
            id={`rv-tab-${t.id}-${x.id}`}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            aria-controls={panelId}
            tabIndex={tab === x.id ? 0 : -1}
            onClick={(e) => {
              setTab(x.id);
              e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={`rv-tab-${t.id}-${tab}`} className="rv-tabpanel" tabIndex={0}>
        {tab === 'odp' ? (
          t.user ? <p className="muted">Własne zadanie – porównaj z własnym rozwiązaniem.</p> : <TaskSheet task={t} kind="odp" />
        ) : tab === 'rozw' ? (
          solution ? (
            <ol className="steps">
              {solution.map((s, i) => (
                <li key={i} style={{ whiteSpace: 'pre-wrap' }}>
                  {s}
                </li>
              ))}
            </ol>
          ) : ex?.pol ? (
            ex.pol.slice(0, 3).map((x, i) => (
              <blockquote key={i} className="quote">
                <strong className="tnum">{x.p} pkt:</strong> {x.t}
              </blockquote>
            ))
          ) : ex?.ang ? (
            ex.ang.map((x) => (
              <p key={x.id} className="small">
                <strong>{x.id}:</strong> {x.ok.slice(0, 6).join('; ')}
              </p>
            ))
          ) : null
        ) : tab === 'wsk' ? (
          <div className="stack-2">
            {tips!.mnemo.map((m, i) => (
              <div key={i} className="rv-mnemo">
                <strong>{m.tytul}</strong>
                <p>{m.tekst}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="stack-2">
            {mine.length ? (
              <>
                <h4>Twoje błędy w tym dziale</h4>
                <ul className="topic-list">
                  {mine.map((m) => (
                    <li key={m.id}>
                      {m.note} {m.count > 1 ? <span className="muted">({m.count}×)</span> : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {cke.length ? (
              <>
                <h4>Odpowiedzi odrzucone przez CKE</h4>
                <ul className="topic-list">{cke.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}</ul>
              </>
            ) : null}
            {lowPol.length ? (
              <>
                <h4>Odpowiedzi za 0 pkt (przykłady CKE)</h4>
                {lowPol.map((x, i) => (
                  <blockquote key={i} className="quote">
                    {x.t}
                  </blockquote>
                ))}
              </>
            ) : null}
            {tips?.bledy.length ? (
              <>
                <h4>Typowe błędy w dziale</h4>
                <ul className="topic-list">{tips.bledy.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------- podsumowanie ----------

function Summary({ done, onAgain }: { done: Done[]; onAgain: () => void }) {
  const { d, today } = useStore();
  const by = (r: Rate) => done.filter((x) => x.rate === r).length;
  const nexts = done
    .filter((x) => x.next)
    .reduce<Record<string, number>>((m, x) => ({ ...m, [whenLabel(x.next, today)]: (m[whenLabel(x.next, today)] ?? 0) + 1 }), {});
  return (
    <div className="page rv-summary">
      <div className="rv-hero">
        <span className="rv-hero-num tnum">{done.length}</span>
        <div>
          <h1>{plural(done.length, 'zadanie', 'zadania', 'zadań')} za tobą</h1>
          <p className="muted">Seria: {dni(d.streak)}. Każda sesja liczy się do celu dnia.</p>
        </div>
      </div>
      <div className="rv-stats">
        {RATES.map((r) => (
          <div key={r.rate} className={`rv-stat r${r.rate}`}>
            <strong className="tnum">{by(r.rate)}</strong>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
      {Object.keys(nexts).length ? (
        <section className="card stack-2">
          <h3>Następne powtórki</h3>
          <ul className="topic-list">
            {Object.entries(nexts).map(([k, n]) => (
              <li key={k}>
                {k}: {zadan(n)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <div className="rv-actions">
        <button type="button" className="btn btn-primary btn-block btn-lg" onClick={onAgain}>
          Jeszcze jedna sesja
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => go('#mapa-pamieci')}>
          Mapa pamięci
        </button>
        <button type="button" className="btn btn-quiet btn-block" onClick={goBack}>
          Zakończ
        </button>
      </div>
    </div>
  );
}

// ---------- mapa pamięci ----------

const STATUS: { k: keyof TopicMemory['counts']; label: string }[] = [
  { k: 'powtorka', label: 'do powtórki' },
  { k: 'nauka', label: 'w nauce' },
  { k: 'utrwalone', label: 'utrwalone' },
  { k: 'nowe', label: 'nowe' },
];

export function MemoryMapView() {
  const { today } = useStore();
  const { pool, srs, subjects } = usePool();
  const [subj, setSubj] = useState<SubjectId>(subjects[0] ?? 'mat-p');
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => memoryMap(pool, srs, today), [pool, srs, today]);
  const list = rows.filter((r) => r.subj === subj).sort((a, b) => b.counts.powtorka - a.counts.powtorka || b.counts.nauka - a.counts.nauka || topicName(a.topic).localeCompare(topicName(b.topic)));
  const sum = (k: keyof TopicMemory['counts']) => list.reduce((a, r) => a + r.counts[k], 0);
  return (
    <div className="page rv-map">
      <header className="lk-head">
        <div className="grow">
          <h1 className="ptitle">Mapa pamięci</h1>
          <p className="muted">Stan zadań w każdym dziale. Bez rankingów i ocen – tylko to, co pamiętasz i co czeka na powtórkę.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => go('#powtorki')}>
          Sesja powtórek
        </button>
      </header>
      <div className="lk-chips" role="group" aria-label="Przedmiot">
        {subjects.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={subj === s} onClick={() => setSubj(s)}>
            {subjectDef(s)!.name}
          </button>
        ))}
      </div>
      <div className="rv-stats">
        {STATUS.map((s) => (
          <div key={s.k} className={`rv-stat st-${s.k}`}>
            <strong className="tnum">{sum(s.k)}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      {!list.length ? (
        <Empty text="Brak zadań w tym przedmiocie." />
      ) : (
        <div className="rv-topics">
          {list.map((r) => {
            const tips = TIPS[r.topic];
            const isOpen = open === r.topic;
            return (
              <div key={r.topic} className="rv-topic">
                <div className="rv-topic-head">
                  <div className="grow">
                    <strong>{topicName(r.topic)}</strong>
                    <span className="small muted">
                      {r.counts.powtorka ? `${r.counts.powtorka} do powtórki dziś` : r.next ? `następna powtórka ${whenLabel(r.next, today)}` : r.counts.nowe === r.total ? 'jeszcze nie ćwiczone' : 'wszystko utrwalone'}
                    </span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => go(`#powtorki-${r.subj}-${r.topic}`)}>
                    Powtórz
                  </button>
                </div>
                <div className="rv-bar" role="img" aria-label={STATUS.map((s) => `${s.label}: ${r.counts[s.k]}`).join(', ')}>
                  {STATUS.map((s) => (r.counts[s.k] ? <span key={s.k} className={`st-${s.k}`} style={{ flexGrow: r.counts[s.k] }} /> : null))}
                </div>
                {tips ? (
                  <button type="button" className="lk-link" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.topic)}>
                    {isOpen ? 'Ukryj wskazówki' : 'Mnemotechniki i typowe błędy'}
                  </button>
                ) : null}
                {isOpen && tips ? (
                  <div className="stack-2">
                    {tips.mnemo.map((m, i) => (
                      <div key={i} className="rv-mnemo">
                        <strong>{m.tytul}</strong>
                        <p>{m.tekst}</p>
                      </div>
                    ))}
                    <ul className="topic-list">{tips.bledy.map((b, i) => <li key={i}>{b}</li>)}</ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- wejście na ekranie Start ----------

export function ReviewCard() {
  const { today } = useStore();
  const { pool, srs, skip, subjects } = usePool();
  const due = dueCount(pool, srs, skip, subjects, today);
  const rows = useMemo(() => memoryMap(pool, srs, today), [pool, srs, today]);
  const fixed = rows.reduce((a, r) => a + r.counts.utrwalone, 0);
  if (!pool.length) return null;
  return (
    <section className="card rv-cta" aria-label="Sesja powtórek">
      <div className="rv-cta-num tnum" aria-hidden="true">
        {due}
      </div>
      <div className="grow">
        <h2>{due ? `${due} ${plural(due, 'powtórka czeka', 'powtórki czekają', 'powtórek czeka')}` : 'Sesja powtórek'}</h2>
        <p className="small muted">{due ? 'Krótka sesja: zadanie, karta odpowiedzi, a aplikacja sama ocenia, kiedy wrócić.' : `Utrwalone zadania: ${fixed}. Zacznij od nowych z najważniejszych działów.`}</p>
      </div>
      <div className="rv-cta-actions">
        <button type="button" className="btn btn-primary" onClick={() => go('#powtorki')}>
          {due ? 'Powtarzaj' : 'Zacznij'}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => go('#mapa-pamieci')}>
          Mapa pamięci
        </button>
      </div>
    </section>
  );
}
