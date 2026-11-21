import { useState } from 'react';
import { subjectDef, type SubjectId } from '../model';
import { newId, useStore } from '../store/AppStore';
import { newSession } from '../logic/session';
import { DIAGNOSIS_MINUTES } from '../logic/diagnosis';
import { count, zadan } from '../logic/format';
import { Empty, SubjectTag } from '../ui/common';
import { go } from '../ui/router';
import { Focus } from './Exams';
import { ResultView, Runner, sessionTasks } from './Runner';
import { shortTopic } from './planParts';

export function DiagnosisView({ subject }: { subject: SubjectId }) {
  const { d, data, putSession, today } = useStore();
  const [again, setAgain] = useState(false);
  const sub = subjectDef(subject)!;
  const title = `Diagnoza: ${sub.name.toLowerCase()}`;
  const ss = Object.values(data.sessions)
    .filter((s) => s.mode === 'diagnoza' && s.subjectId === subject)
    .sort((a, b) => b.createdAt - a.createdAt);
  const running = ss.find((s) => s.status !== 'koniec');
  const done = ss.find((s) => s.status === 'koniec');
  if (running) return <Runner sessionId={running.id} title={title} />;
  if (done && !again)
    return (
      <>
        <ResultView s={done} tasks={sessionTasks(done, d.tasks)} title={title} />
        <div className="actionbar">
          <div className="inner" style={{ maxWidth: 760 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAgain(true)}>
              Powtórz diagnozę
            </button>
          </div>
        </div>
      </>
    );

  const sel = d.diagnosis[subject];
  const start = () => {
    const s = newSession({
      id: newId('diagnoza'),
      mode: 'diagnoza',
      subjectId: subject,
      examId: null,
      partId: null,
      taskIds: sel.taskIds,
      limitMs: Math.max(DIAGNOSIS_MINUTES, sel.minutes) * 60_000,
      planDate: today,
      now: Date.now(),
    });
    putSession(s);
  };
  if (!sel.enough) {
    return (
      <Focus title={title}>
        <Empty
          text={d.packsLoading ? 'Ładowanie zadań…' : `Za mało zadań z obrazem, żeby złożyć diagnozę ${sub.genitive.replace(/^/, 'z ')}.`}
          action={{ label: 'Przejdź do planu', run: () => go('#plan') }}
        />
      </Focus>
    );
  }
  const auto = sel.taskIds.filter((id) => d.tasks.get(id)?.auto).length;
  return (
    <Focus title="Diagnoza">
      <div className="page" style={{ maxWidth: 640, margin: 0 }}>
        <div className="stack">
          <SubjectTag id={subject} />
          <h1>{title}</h1>
          <p>
            Około {Math.max(DIAGNOSIS_MINUTES, sel.minutes)} minut, {zadan(sel.taskIds.length)} z prawdziwych arkuszy CKE z {count(sel.topics.length, 'tematu', 'tematów', 'tematów')}.{' '}
            {auto === sel.taskIds.length
              ? 'Wszystkie sprawdzają się automatycznie.'
              : auto === 0
                ? 'Wszystkie zadania są otwarte, ocenisz je po zakończeniu.'
                : `Zamknięte (${auto}) sprawdzą się automatycznie, otwarte ocenisz po zakończeniu.`}
          </p>
          <p className="muted">Wynik ustawi plan i prognozę. Odpowiedzi zobaczysz po zakończeniu.</p>
        </div>
        <div className="stack-2">
          <h2>Tematy w diagnozie</h2>
          <ul className="topic-list">
            {sel.topics.slice(0, 12).map((t) => (
              <li key={t}>{shortTopic(t)}</li>
            ))}
          </ul>
        </div>
        <div>
          <button type="button" className="btn btn-primary btn-phone-block" onClick={start}>
            Zacznij diagnozę
          </button>
        </div>
      </div>
    </Focus>
  );
}
