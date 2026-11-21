import { useMemo, useState } from 'react';
import { subjectDef, SUBJECTS, type DayOverride, type PlanItem, type SubjectId } from '../model';
import { useStore, type Flow } from '../store/AppStore';
import type { AppTask, Derived } from '../store/derived';
import { examLabel, partName } from '../logic/cke';
import { suggestTasks, taskRef } from '../logic/planner';
import { addDays, fmtWeekdayDay } from '../logic/dates';
import { topicName } from '../data/taxonomy';
import { zadan } from '../logic/format';
import { MoreMenu, Segmented, Sheet, SubjectTag, Tag } from '../ui/common';
import { go } from '../ui/router';

export function typeText(t: AppTask): string {
  if (t.essay) return `${t.subjectId === 'pol-p' ? 'wypracowanie' : 'wypowiedź pisemna'}, ${t.maxPoints} pkt`;
  return `${t.auto ? 'zamknięte' : 'otwarte'}, ${t.maxPoints} pkt`;
}

/** Streszczenie polecenia: w matematyce wzory z PDF są rozbite, więc go nie pokazuję. */
export function showSummary(t: AppTask | undefined): boolean {
  return !!t?.summary && t.subjectId !== 'mat-p' && t.subjectId !== 'mat-r';
}

export function shortTopic(id: string | null | undefined): string {
  const n = topicName(id).replace(/^Język polski w użyciu: /, '');
  return n ? n[0].toUpperCase() + n.slice(1) : n;
}

export function taskTitle(t: AppTask): string {
  const topic = shortTopic(t.topics[0]);
  if (t.essay) return t.subjectId === 'pol-p' ? 'Wypracowanie' : 'Wypowiedź pisemna';
  return topic;
}

export function itemTitle(it: PlanItem, d: Derived): string {
  const sub = subjectDef(it.subjectId);
  if (it.taskId) {
    const t = d.tasks.get(it.taskId);
    return t ? taskTitle(t) : 'Zadanie';
  }
  if (it.kind === 'arkusz') {
    const e = it.examId ? d.examById.get(it.examId) : undefined;
    const p = e ? partName(e, it.partId) : null;
    return `Arkusz próbny${p ? `, ${p.toLowerCase()}` : ''}`;
  }
  if (it.kind === 'diagnoza') return `Diagnoza: ${sub?.name.toLowerCase() ?? ''}`;
  if (it.kind === 'przegląd') return 'Przegląd błędów przed egzaminem';
  if (it.kind === 'korepetycje') return 'Korepetycje z angielskiego';
  return 'Zadanie';
}

export function itemSource(it: PlanItem, d: Derived): string | null {
  if (it.taskId) return d.tasks.get(it.taskId)?.label ?? null;
  if (it.kind === 'arkusz' && it.examId) {
    const e = d.examById.get(it.examId);
    return e ? examLabel(e) : null;
  }
  if (it.kind === 'diagnoza') return `${zadan(d.diagnosis[it.subjectId as SubjectId]?.taskIds.length ?? 0)} CKE`;
  return null;
}

export function itemType(it: PlanItem, d: Derived): string | null {
  if (it.taskId) {
    const t = d.tasks.get(it.taskId);
    return t ? typeText(t) : null;
  }
  if (it.kind === 'korepetycje') return it.reason.replace('Korepetycje z angielskiego, ', 'godz. ').replace(/\.$/, '');
  return null;
}

/** Otwiera pozycję planu na właściwym ekranie. */
export function openItem(it: PlanItem, d: Derived) {
  if (it.kind === 'wypracowanie' && it.taskId) return go({ name: 'wypracowanie', id: it.taskId });
  if (it.taskId) {
    const t = d.tasks.get(it.taskId);
    if (t?.essay) return go({ name: 'wypracowanie', id: it.taskId });
    return go({ name: 'zadanie', id: it.taskId });
  }
  if (it.kind === 'arkusz' && it.examId) return go({ name: 'arkusz', examId: it.examId, partId: it.partId });
  if (it.kind === 'diagnoza' && it.subjectId) return go({ name: 'diagnoza', subject: it.subjectId });
  if (it.kind === 'przegląd') return go({ name: 'postep', subject: it.subjectId });
}

/** Pozycje do przejścia „Zacznij naukę” / „Dalej”: niezrobione zadania dnia. */
export function flowFor(date: string, items: PlanItem[]): Flow {
  return { date, refs: items.filter((i) => i.kind !== 'korepetycje').map((i) => i.ref) };
}

/** Następna niezrobiona pozycja przejścia (plan dnia albo seria z banku). */
export function nextInFlow(flow: Flow | null, currentRef: string, d: Derived): PlanItem | null {
  if (!flow) return null;
  const day = d.plan.days.find((x) => x.date === flow.date);
  const idx = flow.refs.indexOf(currentRef);
  if (idx < 0) return null;
  for (const ref of [...flow.refs.slice(idx + 1), ...flow.refs.slice(0, idx)]) {
    const it = day?.items.find((i) => i.ref === ref);
    if (it) {
      if (it.kind !== 'przegląd' && it.kind !== 'korepetycje' && !d.doneOf(flow.date, it)) return it;
      continue;
    }
    if (ref.startsWith('t:')) {
      const id = ref.slice(2);
      const t = d.tasks.get(id);
      const doneToday = d.active.results.some((r) => r.task === id && r.d === flow.date);
      if (t && !doneToday) return taskPlanItem(t);
    }
  }
  return null;
}

// ---------- Edycja planu ----------

export function usePlanEdit() {
  const { editDay, updateStan, data, toast, today } = useStore();
  const restore = (date: string, prev: DayOverride | undefined) =>
    updateStan((s) => {
      const o = { ...s.overrides };
      if (prev) o[date] = prev;
      else delete o[date];
      return { ...s, overrides: o };
    });
  const snapshot = (date: string) => {
    const p = data.stan.overrides[date];
    return p ? JSON.parse(JSON.stringify(p)) as DayOverride : undefined;
  };
  const withoutItem = (o: DayOverride, it: PlanItem): DayOverride =>
    it.manual ? { ...o, add: o.add.filter((a) => a.ref !== it.ref) } : { ...o, remove: [...new Set([...o.remove, it.ref])] };

  return {
    remove(date: string, it: PlanItem) {
      const prev = snapshot(date);
      editDay(date, (o) => withoutItem(o, it));
      toast('Usunięto z planu.', { label: 'Cofnij', run: () => restore(date, prev) });
    },
    moveTomorrow(date: string, it: PlanItem) {
      const t = addDays(date, 1);
      editDay(date, (o) => withoutItem(o, it));
      editDay(t, (o) => ({ ...o, remove: o.remove.filter((r) => r !== it.ref), add: [...o.add.filter((a) => a.ref !== it.ref), { ...it, manual: true }] }));
      toast('Przeniesiono na jutro.');
    },
    add(date: string, it: PlanItem, silent = false) {
      editDay(date, (o) => ({ ...o, remove: o.remove.filter((r) => r !== it.ref), add: [...o.add.filter((a) => a.ref !== it.ref), { ...it, manual: true }] }));
      if (!silent) toast(`Dodano do planu na ${date === today ? 'dziś' : fmtWeekdayDay(date).toLowerCase()}.`);
    },
    replace(date: string, it: PlanItem, by: PlanItem) {
      editDay(date, (o, items) => {
        const base = withoutItem(o, it);
        const order = items.map((i) => (i.ref === it.ref ? by.ref : i.ref));
        return { ...base, add: [...base.add.filter((a) => a.ref !== by.ref), { ...by, manual: true }], remove: base.remove.filter((r) => r !== by.ref), order };
      });
      toast('Zamieniono zadanie.');
    },
    move(date: string, it: PlanItem, dir: -1 | 1) {
      editDay(date, (o, items) => {
        const refs = items.map((i) => i.ref);
        const i = refs.indexOf(it.ref);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= refs.length) return o;
        [refs[i], refs[j]] = [refs[j], refs[i]];
        return { ...o, order: refs };
      });
    },
  };
}

export function taskPlanItem(t: AppTask): PlanItem {
  return {
    ref: taskRef(t.id),
    kind: t.essay ? 'wypracowanie' : 'zadanie',
    subjectId: t.subjectId,
    topicId: t.topics[0] ?? null,
    taskId: t.id,
    examId: t.examId || null,
    partId: null,
    minutes: t.minutes,
    reason: 'Dodane przez ciebie.',
    manual: true,
  };
}

/** Zamiana: 3 propozycje z tego samego tematu albo z innego tematu. */
export function SwapSheet({ date, item, onClose }: { date: string; item: PlanItem; onClose: () => void }) {
  const { d } = useStore();
  const edit = usePlanEdit();
  const [other, setOther] = useState(false);
  const subject = item.subjectId as SubjectId;
  const day = d.plan.days.find((x) => x.date === date);
  const exclude = new Set((day?.items ?? []).map((i) => i.taskId).filter(Boolean) as string[]);
  const list = useMemo(() => {
    if (!other) return suggestTasks(d.plannable, d.srsBefore, subject, item.topicId, exclude, date, 3);
    const topics = Object.entries(d.priorities[subject] ?? {})
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .filter((k) => k !== item.topicId);
    const out = [];
    for (const tp of topics) {
      const s = suggestTasks(d.plannable, d.srsBefore, subject, tp, exclude, date, 1);
      out.push(...s);
      if (out.length >= 3) break;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other, d, subject, item.topicId, date]);
  return (
    <Sheet title="Zamień na inne" onClose={onClose}>
      <p className="muted">{other ? 'Zadania z innych tematów.' : `Zadania z tematu „${shortTopic(item.topicId)}”.`}</p>
      {list.length === 0 ? <p>Brak innych zadań do zamiany w tym temacie.</p> : null}
      <div className="stack">
        {list.map((p) => {
          const t = d.tasks.get(p.id)!;
          return (
            <div className="card task-card" key={p.id}>
              <div className="meta">
                <SubjectTag id={t.subjectId} />
                <span className="small muted">{t.label}</span>
                <span className="small muted">{t.minutes} min</span>
              </div>
              <div className="title">{taskTitle(t)}</div>
              <div className="small muted">{typeText(t)}</div>
              <div className="foot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    edit.replace(date, item, { ...taskPlanItem(t), kind: 'zadanie' });
                    onClose();
                  }}
                >
                  Wybierz to zadanie
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => setOther((o) => !o)}>
        {other ? 'Ten sam temat' : 'Inny temat'}
      </button>
    </Sheet>
  );
}

/** Dodanie zadania do dnia: propozycje z wybranego przedmiotu. */
export function AddSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { d, data } = useStore();
  const edit = usePlanEdit();
  const enabled = SUBJECTS.filter((s) => data.stan.enabled[s.id] && d.available[s.id].length > 0);
  const [subject, setSubject] = useState<SubjectId | null>(enabled[0]?.id ?? null);
  const day = d.plan.days.find((x) => x.date === date);
  const exclude = new Set((day?.items ?? []).map((i) => i.taskId).filter(Boolean) as string[]);
  const list = subject
    ? (() => {
        const topics = Object.entries(d.priorities[subject] ?? {}).sort((a, b) => b[1] - a[1]).map(([k]) => k);
        const out = [];
        for (const tp of topics) {
          out.push(...suggestTasks(d.plannable, d.srsBefore, subject, tp, exclude, date, 1));
          if (out.length >= 4) break;
        }
        return out;
      })()
    : [];
  return (
    <Sheet title="Dodaj zadanie" onClose={onClose}>
      <p className="muted">{fmtWeekdayDay(date)}</p>
      {enabled.length === 0 ? (
        <p>Zadania pojawią się, gdy wczytają się arkusze.</p>
      ) : (
        <Segmented label="Przedmiot" options={enabled.map((s) => s.id)} value={subject} onChange={setSubject} render={(id) => subjectDef(id)!.short} />
      )}
      <div className="stack">
        {list.map((p) => {
          const t = d.tasks.get(p.id)!;
          return (
            <div className="card task-card" key={p.id}>
              <div className="meta">
                <span className="small muted">{t.label}</span>
                <span className="small muted">{t.minutes} min</span>
              </div>
              <div className="title">{taskTitle(t)}</div>
              <div className="foot">
                <span className="small muted">{typeText(t)}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    edit.add(date, taskPlanItem(t));
                    onClose();
                  }}
                >
                  Dodaj do planu
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => {
          onClose();
          go(subject ? { name: 'zadania', subject, topic: null } : '#zadania');
        }}
      >
        Wybierz z banku zadań
      </button>
    </Sheet>
  );
}

/** Karta pozycji planu (start i plan dnia). */
export function PlanCard({ date, item, onSwap, editable = true }: { date: string; item: PlanItem; onSwap: () => void; editable?: boolean }) {
  const { d, tick } = useStore();
  const edit = usePlanEdit();
  const done = d.doneOf(date, item);
  const doing = !done && d.inProgress(item);
  const title = itemTitle(item, d);
  const src = itemSource(item, d);
  const type = itemType(item, d);
  const tickable = item.kind === 'przegląd' || item.kind === 'korepetycje';
  const open = () => (tickable ? item.kind === 'przegląd' && openItem(item, d) : openItem(item, d));
  const menu = [
    ...(item.taskId ? [{ label: 'Zamień na inne', run: onSwap }] : []),
    { label: 'Przenieś na jutro', run: () => edit.moveTomorrow(date, item) },
    { label: 'Usuń z planu', run: () => edit.remove(date, item), danger: true },
  ];
  const actionLabel =
    item.kind === 'arkusz' ? 'Zacznij arkusz' : item.kind === 'diagnoza' ? 'Zacznij diagnozę' : item.kind === 'wypracowanie' ? 'Pisz' : 'Rozwiąż';
  return (
    <div className={`card task-card${tickable ? '' : ' click'}${done ? ' done' : doing ? ' doing' : ''}`} onClick={tickable ? undefined : open}>
      <div className="meta">
        <SubjectTag id={item.subjectId} />
        {src ? <span className="small muted">{src}</span> : null}
        <span className="small muted" style={{ marginLeft: 'auto' }}>
          {item.minutes} min
        </span>
      </div>
      <div className="title">{title}</div>
      {item.taskId && showSummary(d.tasks.get(item.taskId)) ? <div className="small muted clamp1">{d.tasks.get(item.taskId)!.summary}</div> : null}
      <div className="meta">
        {type ? <span className="small muted">{type}</span> : null}
        {item.manual ? <Tag>zmienione przez ciebie</Tag> : null}
      </div>
      <div className="foot">
        {done ? (
          <span className="row">
            <Tag tone="ok">zrobione</Tag>
            {done.pts != null ? <span className="tnum" style={{ fontWeight: 650 }}>{done.pts} z {done.max} pkt</span> : null}
          </span>
        ) : tickable ? (
          <button type="button" className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); tick(item.ref); }}>
            Odhacz
          </button>
        ) : (
          <button type="button" className={`btn ${doing ? 'btn-primary' : 'btn-secondary'}`} onClick={(e) => { e.stopPropagation(); open(); }}>
            {doing ? 'Wróć do zadania' : actionLabel}
          </button>
        )}
        {done ? (
          tickable ? (
            <button type="button" className="btn btn-quiet" onClick={(e) => { e.stopPropagation(); tick(item.ref); }}>
              Cofnij
            </button>
          ) : (
            <button type="button" className="btn btn-quiet" onClick={(e) => { e.stopPropagation(); open(); }}>
              Zobacz
            </button>
          )
        ) : editable ? (
          <MoreMenu items={menu} />
        ) : null}
      </div>
    </div>
  );
}
