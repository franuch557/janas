import { useMemo, useState } from 'react';
import { SUBJECTS, subjectDef, type SubjectId } from '../model';
import { useStore } from '../store/AppStore';
import type { AppTask } from '../store/derived';
import { topicsFor } from '../data/taxonomy';
import { addDays, fmtWeekdayDay } from '../logic/dates';
import { count, zadan } from '../logic/format';
import { taskRef } from '../logic/planner';
import { Empty, IconButton, MoreMenu, Progress, Segmented, Sheet, SubjectTag, Tag, useMedia } from '../ui/common';
import { Icon } from '../ui/icons';
import { go } from '../ui/router';
import { AddTaskSheet } from './AddTask';
import { dueCards } from '../logic/flashcards';
import { shortTopic, taskPlanItem, typeText, usePlanEdit } from './planParts';
import { PacksBanner } from './Start';

type Filter = 'niezrobione' | 'do powtórki' | 'zamknięte' | 'otwarte';
const FILTERS: Filter[] = ['niezrobione', 'do powtórki', 'zamknięte', 'otwarte'];

function useTaskState() {
  const { d } = useStore();
  return (t: AppTask) => {
    const r = d.records.get(t.id);
    if (!r) return { label: 'nowe', tone: undefined as undefined | 'ok' | 'warn', done: false, review: false };
    const last = r.history[r.history.length - 1];
    const review = r.srs.status === 'do powtórki' && last.pct < 70;
    return { label: `${last.pts} z ${last.max} pkt`, tone: review ? ('warn' as const) : ('ok' as const), done: true, review };
  };
}

function openTask(t: AppTask) {
  go(t.essay ? { name: 'wypracowanie', id: t.id } : { name: 'zadanie', id: t.id });
}

function DayPicker({ t, onClose }: { t: AppTask; onClose: () => void }) {
  const { today } = useStore();
  const edit = usePlanEdit();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return (
    <Sheet title="Dodaj do planu" onClose={onClose}>
      <div className="stack-2">
        {days.map((dd) => (
          <button
            key={dd}
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              edit.add(dd, taskPlanItem(t), true);
              onClose();
            }}
          >
            {dd === today ? 'Dziś' : fmtWeekdayDay(dd)}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

function TaskRow({ t, onPickDay }: { t: AppTask; onPickDay: () => void }) {
  const { today, toast } = useStore();
  const edit = usePlanEdit();
  const st = useTaskState()(t);
  return (
    <div className="li static">
      <button type="button" className="li-main grow stack-2" style={{ gap: 2 }} onClick={() => openTask(t)}>
        <span style={{ fontWeight: 600 }}>{t.label}</span>
        <span className="small muted">{typeText(t)}</span>
        {t.summary && t.subjectId !== 'mat-p' && t.subjectId !== 'mat-r' ? <span className="small muted clamp2">{t.summary}</span> : null}
      </button>
      <Tag tone={st.tone}>{st.review ? 'do powtórki' : st.label}</Tag>
      <MoreMenu
        items={[
          {
            label: 'Dodaj do planu na dziś',
            run: () => {
              edit.add(today, taskPlanItem(t), true);
              toast('Dodano do planu na dziś.');
            },
          },
          { label: 'Dodaj do planu na inny dzień', run: onPickDay },
        ]}
      />
    </div>
  );
}

export function BankView({ subject, topic }: { subject: SubjectId | null; topic: string | null }) {
  const { d, data, setFlow, today } = useStore();
  const state = useTaskState();
  const wide = useMedia('(min-width: 1080px)');
  const [sort, setSort] = useState<'według arkuszy' | 'najsłabsze'>('według arkuszy');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState<AppTask | null>(null);

  const dueN = dueCards(data.cards, today).length;
  const subjects = [...SUBJECTS].sort((a, b) => Number(data.stan.enabled[b.id]) - Number(data.stan.enabled[a.id]));
  const sub = subjectDef(subject);
  const activeSubject = sub ?? (wide ? subjects[0] : undefined);

  const topicRows = useMemo(() => {
    if (!activeSubject) return [];
    const list = d.available[activeSubject.id];
    const rows = topicsFor(activeSubject.family, activeSubject.level).map((tp) => {
      const tasks = list.filter((t) => t.topics.includes(tp.id));
      const m = d.mastery[activeSubject.id][tp.id];
      return { tp, tasks, weight: d.weights[activeSubject.id][tp.id] ?? 0, mastery: m?.value ?? null };
    });
    return rows.sort((a, b) => (sort === 'najsłabsze' ? (a.mastery ?? 2) - (b.mastery ?? 2) : b.weight - a.weight));
  }, [activeSubject, d, sort]);

  const activeTopic = topic ?? (wide && activeSubject ? topicRows[0]?.tp.id ?? null : null);
  const topicTasks = useMemo(() => {
    if (!activeSubject || !activeTopic) return [];
    return d.available[activeSubject.id]
      .filter((t) => t.topics.includes(activeTopic))
      .filter((t) => {
        const st = state(t);
        if (filters.includes('niezrobione') && st.done) return false;
        if (filters.includes('do powtórki') && !st.review) return false;
        if (filters.includes('zamknięte') && !filters.includes('otwarte') && !t.auto) return false;
        if (filters.includes('otwarte') && !filters.includes('zamknięte') && t.auto) return false;
        return true;
      })
      .sort((a, b) => b.year - a.year || a.examId.localeCompare(b.examId) || a.nr.localeCompare(b.nr, 'pl', { numeric: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubject, activeTopic, d, filters]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const parts = q.split(/\s+/);
    return [...d.tasks.values()]
      .filter((t) => d.available[t.subjectId]?.includes(t))
      .filter((t) => {
        const hay = `${shortTopic(t.topics[0])} ${t.topics.map((x) => x).join(' ')} ${t.year} ${t.nr} ${t.label}`.toLowerCase();
        return parts.every((p) => (/^\d+$/.test(p) && p.length <= 2 ? t.nr === p || t.nr.startsWith(p + '.') || hay.includes(` ${p} `) : hay.includes(p)));
      })
      .slice(0, 40);
  }, [query, d]);

  const practice = () => {
    if (!activeSubject || !activeTopic) return;
    const order = topicTasks.filter((t) => !t.essay).sort((a, b) => Number(state(a).done) - Number(state(b).done));
    const pickList = order.slice(0, 5);
    if (!pickList.length) return;
    setFlow({ date: today, refs: pickList.map((t) => taskRef(t.id)) });
    openTask(pickList[0]);
  };

  const subjectsPane = (
    <div className="stack">
      <div className="extra-links">
        <button type="button" className="btn btn-secondary" onClick={() => go('#fiszki')}>
          Fiszki{dueN ? ` (${dueN})` : ''}
        </button>
        {data.stan.enabled['pol-p'] ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => go('#lektury')}>
              Lektury
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => go('#ustny')}>
              Ustny polski
            </button>
          </>
        ) : null}
      </div>
      {subjects.map((s) => {
        const list = d.available[s.id];
        const doneN = list.filter((t) => d.records.has(t.id)).length;
        const topicsN = new Set(list.flatMap((t) => t.topics)).size;
        const current = activeSubject?.id === s.id;
        return (
          <button
            key={s.id}
            type="button"
            className="card click"
            style={{ textAlign: 'left', borderColor: current && wide ? 'var(--atrament)' : undefined, background: current && wide ? 'var(--atrament-tlo)' : undefined }}
            onClick={() => go({ name: 'zadania', subject: s.id, topic: null })}
            aria-current={current ? 'true' : undefined}
          >
            <div className="stack-2">
              <span className="subj-title">
                <span className="sdot" style={{ background: `var(--s-${s.id})` }} aria-hidden="true" />
                {s.name}
              </span>
              <span className="small muted nowrap">{list.length ? `${zadan(list.length)}, ${count(topicsN, 'temat', 'tematy', 'tematów')}` : d.packsLoading ? 'Ładowanie zadań…' : 'Brak zadań'}</span>
              {list.length ? (
                <>
                  <Progress value={doneN} max={list.length} color={`var(--s-${s.id})`} label={`${s.name}: zrobione`} />
                  <span className="small muted tnum">{Math.round((doneN / list.length) * 100)}% zrobione</span>
                </>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );

  const topicsPane = activeSubject ? (
    <div className="stack">
      {!wide ? (
        <div className="row">
          <IconButton icon="wstecz" label="Wróć do przedmiotów" onClick={() => go('#zadania')} />
          <h2 className="grow">{activeSubject.name}</h2>
        </div>
      ) : (
        <h2>Tematy</h2>
      )}
      <Segmented label="Sortuj tematy" options={['według arkuszy', 'najsłabsze'] as const} value={sort} onChange={setSort} />
      <div className="card flush list">
        {topicRows.map(({ tp, tasks, mastery }) => (
          <button
            type="button"
            key={tp.id}
            className="li"
            aria-current={activeTopic === tp.id ? 'true' : undefined}
            onClick={() => go({ name: 'zadania', subject: activeSubject.id, topic: tp.id })}
          >
            <div className="grow stack-2" style={{ gap: 4 }}>
              <div className="row-between">
                <span style={{ fontWeight: 600 }}>{shortTopic(tp.id)}</span>
                <span className="small muted tnum">{tasks.length} zad.</span>
              </div>
              {mastery != null ? (
                <div className="row" style={{ flexWrap: 'nowrap' }}>
                  <div className="grow">
                    <Progress value={Math.round(mastery * 100)} color={`var(--s-${activeSubject.id})`} />
                  </div>
                  <span className="small tnum">{Math.round(mastery * 100)}%</span>
                  {mastery < 0.5 ? <Tag tone="warn">słabe</Tag> : null}
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <div>
        <button type="button" className="btn btn-secondary" onClick={() => setAdding(true)}>
          Dodaj zadanie
        </button>
      </div>
    </div>
  ) : null;

  const idx = topicRows.findIndex((r) => r.tp.id === activeTopic);
  const neighbour = topicRows[(idx + 1) % Math.max(1, topicRows.length)];
  const listPane =
    activeSubject && activeTopic ? (
      <div className="stack">
        <div className="row">
          {!wide ? <IconButton icon="wstecz" label="Wróć do tematów" onClick={() => go({ name: 'zadania', subject: activeSubject.id, topic: null })} /> : null}
          <h2 className="grow">{shortTopic(activeTopic)}</h2>
        </div>
        <div className="chips" role="group" aria-label="Filtry">
          <button type="button" className="chip" aria-pressed={filters.length === 0} onClick={() => setFilters([])}>
            wszystkie
          </button>
          {FILTERS.map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filters.includes(f)} onClick={() => setFilters((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))}>
              {f}
            </button>
          ))}
        </div>
        {topicTasks.length === 0 ? (
          filters.length ? (
            <Empty text="Brak zadań dla tych filtrów." action={{ label: 'Wyczyść filtry', run: () => setFilters([]) }} />
          ) : d.packsLoading ? (
            <div className="card">
              <p className="muted">Ładowanie zadań…</p>
            </div>
          ) : (
            <Empty
              text="Brak zadań w tym temacie w arkuszach z lat 2023–2026."
              action={neighbour ? { label: 'Pokaż sąsiedni temat', run: () => go({ name: 'zadania', subject: activeSubject.id, topic: neighbour.tp.id }) } : undefined}
            />
          )
        ) : (
          <>
            <div className="card flush list">
              {topicTasks.map((t) => (
                <TaskRow key={t.id} t={t} onPickDay={() => setPick(t)} />
              ))}
            </div>
            {topicTasks.some((t) => !t.essay) ? (
              <div className="actionbar" style={{ position: 'sticky', bottom: wide ? 0 : 'calc(64px + env(safe-area-inset-bottom, 0px))', borderRadius: 14, border: '1px solid var(--linia)', padding: 12 }}>
                <button type="button" className="btn btn-primary btn-block" onClick={practice}>
                  Ćwicz ten temat
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    ) : null;

  return (
    <div className="page wide">
      <div className="row-between">
        <h1 className="ptitle">Zadania</h1>
        <IconButton icon={searching ? 'zamknij' : 'szukaj'} label={searching ? 'Zamknij wyszukiwanie' : 'Szukaj zadań'} onClick={() => { setSearching((s) => !s); setQuery(''); }} />
      </div>
      <PacksBanner />
      {searching ? (
        <div className="stack">
          <div className="field">
            <label htmlFor="q">Szukaj po temacie, roku i numerze</label>
            <input id="q" className="input" autoFocus placeholder="np. logarytmy albo 2024 9" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {query.trim() ? (
            searchResults.length ? (
              <div className="card flush list">
                {searchResults.map((t) => (
                  <button type="button" className="li" key={t.id} onClick={() => openTask(t)}>
                    <SubjectTag id={t.subjectId} />
                    <span className="grow">
                      <span style={{ fontWeight: 600 }}>{t.label}</span>
                      <br />
                      <span className="small muted">{shortTopic(t.topics[0])}, {typeText(t)}</span>
                    </span>
                    <Icon name="dalej" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Brak zadań dla „{query.trim()}”.</p>
            )
          ) : null}
        </div>
      ) : wide ? (
        <div className="bank three">
          {subjectsPane}
          {topicsPane}
          {listPane ?? <div />}
        </div>
      ) : (
        <div className="bank">{listPane ?? topicsPane ?? subjectsPane}</div>
      )}
      {adding ? <AddTaskSheet subject={activeSubject?.id ?? null} topic={activeTopic} onClose={() => setAdding(false)} /> : null}
      {pick ? <DayPicker t={pick} onClose={() => setPick(null)} /> : null}
    </div>
  );
}
