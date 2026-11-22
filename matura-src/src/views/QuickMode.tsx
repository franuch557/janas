// Tryb „5 minut”: 3 szybkie zadania zamknięte z najsłabszych tematów i 3 fiszki.

import { useMemo, useState } from 'react';
import { subjectDef } from '../model';
import { useStore } from '../store/AppStore';
import { pickQuickCards, pickQuickTasks } from '../logic/quick';
import { scoreClosed } from '../logic/scoring';
import { fmtClock } from '../logic/format';
import { AnswerCard, checkMessage } from '../ui/AnswerCard';
import { TaskSheet } from '../ui/TaskImage';
import { Empty, SubjectTag, useNow } from '../ui/common';
import { Icon } from '../ui/icons';
import { goBack } from '../ui/router';
import { CardReview, fiszek } from './Flashcards';
import { zadan } from '../logic/format';

const LIMIT = 5 * 60_000;

export function QuickMode() {
  const { d, data, today, saveResult } = useStore();
  const [start] = useState(Date.now());
  const now = useNow(1000);
  // zestaw losuję raz na wejście (wyniki zmieniają się w trakcie)
  const tasks = useMemo(
    () => pickQuickTasks(Object.values(d.available).flat().filter((t) => data.stan.enabled[t.subjectId] && !t.user), d.srsBefore, (s, tp) => d.mastery[s as keyof typeof d.mastery]?.[tp]?.value ?? null, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const cards = useMemo(() => pickQuickCards(data.cards, today), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [okCount, setOkCount] = useState(0);
  const [cardsDone, setCardsDone] = useState<number | null>(null);
  const left = Math.max(0, LIMIT - (now - start));
  const timeUp = left === 0;
  const phase: 'zadania' | 'fiszki' | 'koniec' = timeUp ? 'koniec' : i < tasks.length ? 'zadania' : cards.length && cardsDone == null ? 'fiszki' : 'koniec';
  const t = tasks[i];

  const check = () => {
    if (!t?.answer || checked) return;
    const r = scoreClosed(t.answer, choice, t.maxPoints);
    setChecked(true);
    if (r.points === t.maxPoints) setOkCount((n) => n + 1);
    saveResult({ task: t.id, subj: t.subjectId, topics: t.topics, pts: r.points, max: t.maxPoints, sec: Math.round((Date.now() - start) / 1000 / Math.max(1, i + 1)), src: 'zadanie', choice }, { toast: false });
  };
  const next = () => {
    setChoice({});
    setChecked(false);
    setI((x) => x + 1);
  };
  const allChosen = t?.answer ? t.answer.items.every((x) => choice[x.id]) : false;
  const msg = t?.answer && checked ? checkMessage(t.answer, choice) : null;

  return (
    <div className="focus">
      <header className={`focus-head${left <= 60_000 ? ' warn' : ''}`}>
        <div className="bar">
          <button type="button" className="btn btn-icon" aria-label="Zamknij" title="Zamknij" onClick={goBack}>
            <Icon name="zamknij" />
          </button>
          <span className="where">5 minut</span>
          <span className="timer" role="timer" aria-label="Czas do końca">
            <Icon name="zegar" size={20} />
            {fmtClock(left)}
          </span>
        </div>
      </header>
      <div className="focus-body">
        <div className="page" style={{ maxWidth: 760 }}>
          {!tasks.length && !cards.length ? (
            <Empty text="Na razie nie ma krótkich zadań do szybkiej powtórki." action={{ label: 'Wróć', run: goBack }} />
          ) : phase === 'zadania' && t ? (
            <div className="stack">
              <div className="meta">
                <span className="small muted tnum">
                  Zadanie {i + 1} z {tasks.length}
                </span>
                <SubjectTag id={t.subjectId} />
                <span className="small muted">{t.label}</span>
              </div>
              <TaskSheet task={t} level={subjectDef(t.subjectId)!.level} />
              {t.answer ? <AnswerCard answer={t.answer} value={choice} onChange={(id, o) => !checked && setChoice((c) => ({ ...c, [id]: o }))} onAll={(v) => !checked && setChoice(v)} checked={checked} /> : null}
              {msg ? (
                <div className={`feedback ${msg.ok ? 'ok' : 'bad'} reveal`} aria-live="polite">
                  <Icon name={msg.ok ? 'ok' : 'zle'} />
                  <span>{msg.text}</span>
                </div>
              ) : null}
              {checked ? (
                <button type="button" className="btn btn-primary btn-block" onClick={next}>
                  Dalej
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-block" onClick={check} disabled={!allChosen}>
                  Sprawdź
                </button>
              )}
            </div>
          ) : phase === 'fiszki' ? (
            <CardReview cards={cards} onDone={setCardsDone} />
          ) : (
            <div className="stack">
              <h1>{timeUp ? 'Czas minął' : 'Gotowe'}</h1>
              <p className="big">
                {okCount} z {tasks.length}
              </p>
              <p className="muted">
                Dobrze rozwiązane: {zadan(okCount)}. Powtórzone fiszki: {fiszek(cardsDone ?? 0)}. To liczy się do serii.
              </p>
              <div>
                <button type="button" className="btn btn-primary" onClick={goBack}>
                  Zakończ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
