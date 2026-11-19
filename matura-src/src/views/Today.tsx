import { useEffect, useMemo, useState } from 'react';
import { useApp, subjectName } from '../store/context';
import { Header, MathText, Stopwatch, TaskImage } from '../components/common';
import { diffDays, fmtLong } from '../logic/dates';
import { recordItem, undoItem, missedItems, freezeDay } from '../store/actions';
import type { DayPlan, ErrorType, PlanItem } from '../types';
import { topicName } from '../data/taxonomy';
import { newId, blankTask } from '../store/bank';

export const ERROR_TYPES: ErrorType[] = ['rachunkowy', 'koncepcyjny', 'brak czasu', 'zapomniany wzór', 'brak argumentacji', 'błąd językowy'];

export default function Today({ go }: { go: (view: string, params?: Record<string, string>) => void }) {
  const { state, update, plan, today } = useApp();
  const day = plan.find((d) => d.date === today);
  const missed = useMemo(() => missedItems(state, today), [state, today]);
  const askMissed = state.settings.missedDays === 'pytaj' ? missed.filter((m) => !state.missedHandled.includes(m.date)) : [];
  const backlogTasks = state.bank.filter((t) => state.backlog.includes(t.id));

  // przy trybie „zaległe” niewykonane zadania trafiają na listę zaległych
  const toBacklog = state.settings.missedDays === 'zaległe' ? missed.filter((m) => !state.backlog.includes(m.item.taskId!)).map((m) => m.item.taskId!) : [];
  useEffect(() => {
    if (toBacklog.length) update((s) => ({ ...s, backlog: [...new Set([...s.backlog, ...toBacklog])] }));
  }, [toBacklog.join(','), update]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = state.settings.subjects
    .filter((s) => s.enabled && s.examDate >= today)
    .sort((a, b) => a.examDate.localeCompare(b.examDate));

  return (
    <section aria-labelledby="dzis-h">
      <Header title={fmtLong(today)}>
        {next.length
          ? `Do pierwszego egzaminu (${next[0].name.toLowerCase()}) zostało ${diffDays(next[0].examDate, today)} dni.`
          : 'Wszystkie egzaminy z planu są za Tobą.'}
      </Header>

      {askMissed.length > 0 && (
        <div className="ramka" role="region" aria-label="Opuszczone dni">
          <p>
            Masz {askMissed.length} niewykonanych zadań z dni {[...new Set(askMissed.map((m) => m.date))].join(', ')}. Co z nimi zrobić?
          </p>
          <div className="rzad">
            <button type="button" onClick={() => update((s) => ({ ...s, missedHandled: [...s.missedHandled, ...askMissed.map((m) => m.date)] }))}>
              Przelicz plan (zadania wrócą automatycznie)
            </button>
            <button
              type="button"
              onClick={() =>
                update((s) => ({
                  ...s,
                  backlog: [...new Set([...s.backlog, ...askMissed.map((m) => m.item.taskId!)])],
                  missedHandled: [...s.missedHandled, ...askMissed.map((m) => m.date)],
                }))
              }
            >
              Przenieś na listę zaległych
            </button>
          </div>
        </div>
      )}

      {!state.settings.introHidden && <Intro go={go} />}

      {!day ? (
        <p className="pusty">Na dziś nie ma planu: wszystkie przedmioty są wyłączone albo egzaminy już się odbyły. Zmień to w Ustawieniach.</p>
      ) : (
        <DayView day={day} go={go} />
      )}

      {backlogTasks.length > 0 && (
        <>
          <h2>Zaległe</h2>
          <p className="olowek">Planer nie rusza tych zadań. Przywróć je do planu albo rozwiąż w widoku „Zadania z tematu”.</p>
          <ul className="lista">
            {backlogTasks.map((t) => (
              <li key={t.id} className="rzad">
                <span>
                  {subjectName(state, t.subjectId)} · {topicName(t.topicId)} · {t.ref || t.source}
                </span>
                <button type="button" className="maly" onClick={() => update((s) => ({ ...s, backlog: s.backlog.filter((x) => x !== t.id) }))}>
                  Wróć do planu
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function DayView({ day, go }: { day: DayPlan; go: (view: string, params?: Record<string, string>) => void }) {
  const { state, update } = useApp();
  const log = state.dayLog[day.date];
  const items = day.items.filter((i) => i.kind !== 'brak-zadań');
  const missing = day.items.filter((i) => i.kind === 'brak-zadań');
  const phaseValues = [...new Set(Object.values(day.phase))];
  const phaseText =
    phaseValues.length === 1
      ? `Etap: ${phaseValues[0]}`
      : Object.entries(day.phase).map(([id, p]) => `${subjectName(state, id)}: ${p}`).join(' · ');
  const left = day.available - day.used;
  return (
    <>
      <p className="liczby">
        Dziś {day.used} z {day.available} min{left > 0 ? `, ${left} min wolne` : ''}. <span className="olowek">{phaseText}.</span>
      </p>
      {day.notes.map((n) => (
        <p key={n}>{n}</p>
      ))}
      <ul className="lista" aria-label="Plan dnia">
        {items.map((it) => (
          <li key={it.key}>
            <ItemRow day={day} item={it} go={go} />
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="pusty">Na ten dzień nie ma zadań.</p>}
      {missing.length > 0 && (
        <div className="pusty">
          <p style={{ marginTop: 0 }}>
            Planer chciał dać zadania z tematów, dla których bank jest pusty. Dodaj kilka zadań, a pojawią się w planie:
          </p>
          <ul>
            {missing.map((m) => (
              <li key={m.key}>
                <button type="button" className="maly" onClick={() => go('zadania', { przedmiot: m.subjectId ?? '', temat: m.topicId ?? '' })}>
                  Dodaj
                </button>{' '}
                {subjectName(state, m.subjectId)}: {topicName(m.topicId)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!log?.frozen && items.length > 0 && (
        <p>
          <button type="button" onClick={() => update((s) => freezeDay(s, day))}>
            Zatwierdź plan dnia
          </button>{' '}
          <small>Po zatwierdzeniu plan na dziś się nie zmieni, nawet gdy zmienisz ustawienia.</small>
        </p>
      )}
      {day.shifted.length > 0 && (
        <details>
          <summary>Nie zmieściło się dziś: {day.shifted.length} {day.shifted.length === 1 ? 'pozycja' : 'pozycji'} (wrócą w kolejnych dniach)</summary>
          <ul className="lista">
            {day.shifted.slice(0, 8).map((s) => (
              <li key={s.item.key}>
                {subjectName(state, s.item.subjectId)} · {s.item.label} ({s.item.minutes} min)
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Intro({ go }: { go: (view: string, params?: Record<string, string>) => void }) {
  const { state, update } = useApp();
  const own = state.bank.filter((t) => t.source !== 'CKE').length;
  const steps = [
    { done: state.dayLog && Object.keys(state.dayLog).length > 0 || state.settings.introHidden, text: 'Ustaw, kiedy się uczysz (godziny w każdym dniu).', view: 'ustawienia', btn: 'Ustawienia' },
    { done: own >= 10, text: `Dodaj zadania: link z zadania.info i zrzut ekranu albo stronę z książki. Masz ${own}.`, view: 'zadania', btn: 'Dodaj zadania' },
    { done: state.diagnoses.length > 0, text: 'Zrób diagnozę albo samoocenę 1–5 z każdego przedmiotu.', view: 'diagnoza', btn: 'Diagnoza' },
  ];
  return (
    <div className="ramka" role="region" aria-label="Pierwsze kroki">
      <h2 style={{ marginTop: 0 }}>Pierwsze kroki</h2>
      <ol style={{ paddingLeft: '1.2rem' }}>
        {steps.map((s) => (
          <li key={s.text} style={{ marginBottom: '0.4rem' }}>
            {s.done ? <s>{s.text}</s> : s.text}{' '}
            <button type="button" className="maly" onClick={() => go(s.view)}>{s.btn}</button>
          </li>
        ))}
      </ol>
      <button type="button" className="maly" onClick={() => update((st) => ({ ...st, settings: { ...st.settings, introHidden: true } }))}>Ukryj</button>
    </div>
  );
}

/** Odpowiedź do zadania: wycinek zasad oceniania, zrzut albo tekst. Ukryta do kliknięcia. */
export function AnswerToggle({ imageKey, text, url }: { imageKey: string | null | undefined; text: string | null | undefined; url?: string | null }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button type="button" className="maly" aria-expanded={show} onClick={() => setShow(!show)}>
        {show ? 'Ukryj odpowiedź' : 'Pokaż odpowiedź'}
      </button>
      {show && (
        <div>
          <TaskImage imageKey={imageKey ?? null} alt="Odpowiedź i zasady oceniania" />
          {text && <p><MathText text={text} /></p>}
          {!text && (
            <small>
              Jeśli nie widać obrazu odpowiedzi, otwórz zasady oceniania{url ? <> (<a href={url} target="_blank" rel="noreferrer noopener">PDF</a>)</> : ''} albo dodaj odpowiedź w widoku „Zadania z tematu”.
            </small>
          )}
        </div>
      )}
    </div>
  );
}

function ItemRow({ day, item, go }: { day: DayPlan; item: PlanItem; go: (view: string, params?: Record<string, string>) => void }) {
  const { state, update, exams } = useApp();
  const done = state.dayLog[day.date]?.done[item.key];
  const task = item.taskId ? state.bank.find((t) => t.id === item.taskId) : undefined;
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [score, setScore] = useState('');
  const [note, setNote] = useState('');
  const [errType, setErrType] = useState<ErrorType | ''>('');
  const [err, setErr] = useState<string | null>(null);
  const [lesson, setLesson] = useState('');
  const isTask = item.kind === 'zadanie' || item.kind === 'powtórka';
  const toDo = isTask && !done;
  const zasady = task?.examId ? exams.find((e) => e.id === task.examId)?.urls.zasady[0] ?? null : null;

  const save = () => {
    let result: number | null = null;
    if (score.trim() !== '') {
      const v = Number(score.replace(',', '.'));
      if (!Number.isFinite(v) || v < 0) {
        setErr('Wynik musi być liczbą nieujemną. Wpisz punkty albo procent.');
        return;
      }
      if (task?.maxPoints) {
        if (v > task.maxPoints) {
          setErr(`Maksimum za to zadanie to ${task.maxPoints} pkt. Popraw wynik.`);
          return;
        }
        result = (v / task.maxPoints) * 100;
      } else {
        if (v > 100) {
          setErr('Procent nie może przekraczać 100. Popraw wynik.');
          return;
        }
        result = v;
      }
    } else if (isTask) {
      setErr('Wpisz wynik, żeby zaplanować powtórkę.');
      return;
    }
    setErr(null);
    update((s) => recordItem(s, day, item, { result, minutes, note, errorType: errType || null }));
    setOpen(false);
    setExpanded(false);
  };

  const action = () => {
    if (item.kind === 'diagnoza') go('diagnoza', { przedmiot: item.subjectId ?? '' });
    else if (item.kind === 'arkusz') go('arkusze', { przedmiot: item.subjectId ?? '', arkusz: item.examId ?? '' });
    else if (item.kind === 'podsumowanie') go('postep');
    else if (item.kind === 'przegląd') go('bledy', { przedmiot: item.subjectId ?? '' });
  };
  const actionLabel =
    item.kind === 'diagnoza' ? 'Zacznij diagnozę' : item.kind === 'arkusz' ? 'Otwórz arkusz' : item.kind === 'podsumowanie' ? 'Otwórz podsumowanie' : 'Otwórz dziennik błędów';

  const saveLesson = () => {
    if (!lesson.trim() || !item.subjectId) return;
    update((s) => {
      const t = blankTask(item.subjectId!, 'własne', 'ang-srodki', s.settings.defaultTaskMinutes);
      t.ref = `Temat z korepetycji ${day.date}`;
      t.text = lesson.trim();
      return { ...s, lessonNotes: [...s.lessonNotes, { id: newId('k'), date: day.date, subjectId: item.subjectId!, topicId: null, text: lesson.trim() }], bank: [...s.bank, t] };
    });
    setLesson('');
  };

  const title = isTask ? `${subjectName(state, item.subjectId)}, ${topicName(item.topicId).toLowerCase()}` : item.label;

  return (
    <div className={`zadanie-dnia${done ? ' zrobione' : ''}`}>
      {isTask ? (
        <input
          type="checkbox"
          aria-label={`Zrobione: ${item.label}`}
          checked={!!done}
          onChange={() => {
            if (done) update((s) => undoItem(s, day.date, item.key));
            else {
              setExpanded(true);
              setOpen(true);
            }
          }}
        />
      ) : (
        <span aria-hidden="true" />
      )}
      <div>
        {isTask ? (
          <button type="button" className="tytul" style={{ textDecoration: 'none', textAlign: 'left', padding: 0 }} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
            {title}
          </button>
        ) : (
          <div className="tytul">{title}</div>
        )}
        <div className="olowek">{isTask ? item.label : item.reason}</div>
      </div>
      <div className="czas">
        {item.minutes > 0 ? `${item.minutes} min` : ''}
        {toDo && (
          <div>
            <span className="zakreslacz">{item.kind === 'powtórka' ? 'do powtórki' : 'do zrobienia'}</span>
          </div>
        )}
        {done && done.result != null && <div>{Math.round(done.result)}%</div>}
      </div>
      <div className="szczegoly">
        {!isTask && item.kind !== 'korepetycje' && item.kind !== 'zajęcia' && (
          <button type="button" className="maly" onClick={action}>{actionLabel}</button>
        )}
        {item.kind === 'korepetycje' && state.settings.lessonNotesEnabled && (
          <div className="rzad">
            <label className="pole" style={{ flex: '1 1 18rem' }}>
              <span>Temat lekcji</span>
              <input value={lesson} onChange={(e) => setLesson(e.target.value)} />
            </label>
            <button type="button" onClick={saveLesson}>Zapisz temat</button>
          </div>
        )}
        {isTask && expanded && task && (
          <div style={{ marginTop: '0.5rem' }}>
            <TaskImage imageKey={task.imageKey} alt={`Treść zadania: ${item.label}`} />
            {task.text && <p><MathText text={task.text} /></p>}
            {task.attribution && <small>{task.attribution}</small>}
            {task.source === 'książka' && <p>Książka, strona {task.page ?? '?'}{task.ref ? `, zadanie ${task.ref}` : ''}.</p>}
            <div className="rzad">
              {task.url && (
                <a href={task.url} target="_blank" rel="noreferrer noopener">
                  {task.source === 'CKE' ? `Arkusz PDF${task.page ? `, strona ${task.page}` : ''}` : 'Otwórz źródło'}
                </a>
              )}
              {task.maxPoints != null && <small>{task.maxPoints} pkt</small>}
            </div>
            <AnswerToggle imageKey={task.answerImageKey} text={task.answerText} url={zasady} />
            {!done && (
              <div className="rzad" style={{ marginTop: '0.4rem' }}>
                <Stopwatch label={item.label} onStop={(m) => { setMinutes(m); setOpen(true); }} />
                {minutes != null && <small>{minutes} min</small>}
                {!open && <button type="button" className="maly" onClick={() => setOpen(true)}>Wpisz wynik</button>}
              </div>
            )}
          </div>
        )}
        {open && !done && (
          <div style={{ marginTop: '0.75rem' }}>
            {err && <p className="ramka-bledu" role="alert">{err}</p>}
            <div className="rzad">
              <label className="pole">
                <span>{task?.maxPoints ? `Punkty (z ${task.maxPoints})` : 'Wynik w %'}</span>
                <input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} autoFocus />
              </label>
              <label className="pole">
                <span>Czas (min)</span>
                <input type="number" min={0} value={minutes ?? ''} onChange={(e) => setMinutes(e.target.value === '' ? null : Number(e.target.value))} />
              </label>
              <label className="pole">
                <span>Błąd</span>
                <select value={errType} onChange={(e) => setErrType(e.target.value as ErrorType | '')}>
                  <option value="">bez błędu</option>
                  {ERROR_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            {errType && (
              <label className="pole">
                <span>Co poszło nie tak</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            )}
            <div className="rzad">
              <button type="button" className="glowny" onClick={save}>Zapisz wynik</button>
              <button type="button" onClick={() => setOpen(false)}>Anuluj</button>
            </div>
          </div>
        )}
        {done?.note && <small>Notatka: {done.note}</small>}
      </div>
    </div>
  );
}
