import { useState } from 'react';
import { useApp } from '../store/context';
import { ConfirmButton, Countdown, Field, Header, TaskImage } from '../components/common';
import { topicName } from '../data/taxonomy';
import { examLabel, filterExams } from '../logic/exams';
import { recordMock } from '../store/actions';
import { newId } from '../store/bank';
import { ERROR_TYPES } from './Today';
import type { BankTask, ErrorType, Exam, MockResult, SubjectConfig } from '../types';

interface Slot {
  key: string; // nr zadania arkusza albo id zadania z banku
  label: string;
  max: number | null;
  topicId: string | null;
  bankId: string | null;
  imageKey: string | null;
  url: string | null;
  page: number | null;
}

export default function Mock({ params }: { params: Record<string, string> }) {
  const { state, exams } = useApp();
  const s = state.settings;
  const subjects = s.subjects.filter((x) => x.enabled);
  const [subjectId, setSubjectId] = useState(params.przedmiot && subjects.some((x) => x.id === params.przedmiot) ? params.przedmiot : subjects[0]?.id ?? '');
  const sub = subjects.find((x) => x.id === subjectId);
  const [examId, setExamId] = useState(params.arkusz ?? '');
  const [running, setRunning] = useState<{ slots: Slot[]; exam: Exam | null; minutes: number; startedAt: number } | null>(null);
  const [bankCount, setBankCount] = useState(10);
  const [minutesInput, setMinutesInput] = useState<string>('');
  if (!sub) return <p className="pusty">Włącz przynajmniej jeden przedmiot w Ustawieniach.</p>;
  const { current } = filterExams(exams, { family: sub.family, level: sub.level, yearFrom: s.yearFrom, yearTo: s.yearTo, includeOldFormula: false, excluded: s.excludedExams });
  const minutes = minutesInput ? Number(minutesInput) : sub.mockMinutes;

  if (running) return <Running sub={sub} run={running} onEnd={() => setRunning(null)} />;

  const startExam = () => {
    const exam = current.find((e) => e.id === examId);
    if (!exam || !minutes) return;
    const slots: Slot[] = exam.tasks.map((t) => {
      const bt = state.bank.find((b) => b.id === `cke:${exam.id}:${t.nr}`);
      return { key: t.nr, label: `Zadanie ${t.nr}`, max: t.maxPoints, topicId: t.topics[0] ?? null, bankId: bt?.id ?? null, imageKey: bt?.imageKey ?? null, url: exam.urls.arkusz[0] ?? null, page: t.page };
    });
    setRunning({ slots, exam, minutes, startedAt: Date.now() });
  };
  const startBank = () => {
    if (!minutes) return;
    const pool = state.bank.filter((t) => t.subjectId === sub.id && t.status !== 'zrobione');
    const picked: BankTask[] = [];
    const byTopic = new Map<string, BankTask[]>();
    for (const t of pool) byTopic.set(t.topicId, [...(byTopic.get(t.topicId) ?? []), t]);
    while (picked.length < bankCount && [...byTopic.values()].some((v) => v.length)) {
      for (const v of byTopic.values()) if (v.length && picked.length < bankCount) picked.push(v.shift()!);
    }
    const slots: Slot[] = picked.map((t) => ({ key: t.id, label: `${topicName(t.topicId)} · ${t.source} ${t.ref}`, max: t.maxPoints, topicId: t.topicId, bankId: t.id, imageKey: t.imageKey, url: t.url, page: t.page }));
    setRunning({ slots, exam: null, minutes, startedAt: Date.now() });
  };
  const chosen = current.find((e) => e.id === examId);

  return (
    <section>
      <Header title="Arkusze próbne">Tryb egzaminacyjny: odliczanie czasu, rozwiązania ukryte do końca. Po zakończeniu wpisujesz punkty według zasad oceniania CKE.</Header>
      <div className="rzad">
        <Field label="Przedmiot">
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setExamId(''); }}>
            {subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Czas (min)">
          <input type="number" min={10} value={minutesInput || (sub.mockMinutes ?? '')} onChange={(e) => setMinutesInput(e.target.value)} />
        </Field>
      </div>
      {!minutes && <p className="ramka-bledu">Brak czasu arkusza dla tego przedmiotu w sprawdzonych źródłach CKE. Wpisz czas powyżej albo w Ustawieniach.</p>}

      <h2>Arkusz CKE z bazy</h2>
      {current.length === 0 ? (
        <p className="pusty">Brak arkuszy tego przedmiotu w zakresie lat {s.yearFrom}–{s.yearTo}.</p>
      ) : (
        <>
          <Field label="Arkusz">
            <select value={examId} onChange={(e) => setExamId(e.target.value)}>
              <option value="">wybierz</option>
              {current.map((e) => (
                <option key={e.id} value={e.id}>
                  {examLabel(e)} · {e.id} · {e.tasks.length ? `${e.tasks.length} zadań` : 'brak listy zadań'}
                  {state.mocks.some((m) => m.examId === e.id) ? ' · już rozwiązany' : ''}
                </option>
              ))}
            </select>
          </Field>
          {chosen && chosen.tasks.length === 0 && (
            <p className="pusty">Ten arkusz nie ma jeszcze listy zadań i punktacji w bazie. Zaimportuj PDF skryptem (README) albo użyj zestawu z banku.</p>
          )}
          {chosen?.urls.arkusz[0] && (
            <p>
              PDF arkusza: <a href={chosen.urls.arkusz[0]} target="_blank" rel="noreferrer noopener">{chosen.urls.arkusz[0].split('/').pop()}</a>. Zasady oceniania otwórz dopiero po zakończeniu.
            </p>
          )}
          <button type="button" className="glowny" disabled={!chosen || !chosen.tasks.length || !minutes} onClick={startExam}>Rozpocznij arkusz</button>
        </>
      )}

      <h2>Zestaw z banku</h2>
      <div className="rzad">
        <Field label="Liczba zadań">
          <input type="number" min={1} max={40} value={bankCount} onChange={(e) => setBankCount(Number(e.target.value) || 1)} />
        </Field>
        <button type="button" disabled={!minutes || !state.bank.some((t) => t.subjectId === sub.id)} onClick={startBank}>Rozpocznij zestaw</button>
      </div>

      <h2>Historia</h2>
      {state.mocks.filter((m) => m.subjectId === sub.id).length === 0 ? (
        <p className="olowek">Brak rozwiązanych arkuszy.</p>
      ) : (
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Data</th><th>Arkusz</th><th className="num">Wynik</th><th className="num">Czas</th></tr></thead>
            <tbody>
              {state.mocks.filter((m) => m.subjectId === sub.id).map((m) => (
                <tr key={m.id}>
                  <td>{m.date}</td>
                  <td>{m.examId ?? 'zestaw z banku'}</td>
                  <td className="num">{m.earned}/{m.maxPoints} ({m.maxPoints ? Math.round((m.earned / m.maxPoints) * 100) : 0}%)</td>
                  <td className="num">{m.minutesUsed}/{m.minutesLimit} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Running({ sub, run, onEnd }: { sub: SubjectConfig; run: { slots: Slot[]; exam: Exam | null; minutes: number; startedAt: number }; onEnd: () => void }) {
  const { update, today } = useApp();
  const [finished, setFinished] = useState(false);
  const [usedMin, setUsedMin] = useState<number | null>(null);
  const [pts, setPts] = useState<Record<string, string>>({});
  const [maxes, setMaxes] = useState<Record<string, string>>({});
  const [errT, setErrT] = useState<Record<string, ErrorType | ''>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<MockResult | null>(null);

  const finish = () => {
    setFinished(true);
    setUsedMin(Math.min(run.minutes, Math.round((Date.now() - run.startedAt) / 60000)));
  };
  const save = () => {
    const points: Record<string, number | null> = {};
    const taskPct: Parameters<typeof recordMock>[2] = {};
    let earned = 0;
    let max = 0;
    for (const sl of run.slots) {
      const m = sl.max ?? (maxes[sl.key] ? Number(maxes[sl.key]) : null);
      const raw = pts[sl.key];
      const v = raw === undefined || raw === '' ? null : Number(raw.replace(',', '.'));
      if (v != null && (!Number.isFinite(v) || v < 0 || (m != null && v > m))) {
        setErr(`${sl.label}: wynik musi być w zakresie 0–${m ?? '?'}.`);
        return;
      }
      if (v != null && m == null) {
        setErr(`${sl.label}: podaj maksimum punktów.`);
        return;
      }
      points[sl.key] = v;
      if (m != null) max += m;
      if (v != null) earned += v;
      taskPct[sl.key] = { bankId: sl.bankId, pct: v != null && m ? (v / m) * 100 : null, errorType: errT[sl.key] || null, note: notes[sl.key] ?? '', topicId: sl.topicId };
    }
    const mock: MockResult = {
      id: newId('a'),
      subjectId: sub.id,
      examId: run.exam?.id ?? null,
      bankTaskIds: run.exam ? [] : run.slots.map((s) => s.key),
      date: today,
      minutesLimit: run.minutes,
      minutesUsed: usedMin ?? run.minutes,
      points,
      maxPoints: run.exam?.maxPoints ?? max,
      earned,
    };
    update((s) => recordMock(s, mock, taskPct));
    setResult(mock);
  };

  if (result) {
    const byTopic = new Map<string, { p: number; m: number }>();
    for (const sl of run.slots) {
      const v = result.points[sl.key];
      const m = sl.max ?? Number(maxes[sl.key] || 0);
      if (!sl.topicId || v == null || !m) continue;
      const a = byTopic.get(sl.topicId) ?? { p: 0, m: 0 };
      a.p += v;
      a.m += m;
      byTopic.set(sl.topicId, a);
    }
    const weak = run.slots.filter((sl) => {
      const v = result.points[sl.key];
      const m = sl.max ?? Number(maxes[sl.key] || 0);
      return v != null && m > 0 && v / m < 0.5;
    });
    return (
      <section>
        <Header title={`Wynik: ${result.earned}/${result.maxPoints} pkt (${result.maxPoints ? Math.round((result.earned / result.maxPoints) * 100) : 0}%)`}>
          {sub.name} · {run.exam ? run.exam.id : 'zestaw z banku'} · {result.minutesUsed} z {result.minutesLimit} min
        </Header>
        <h2>Rozbicie na tematy</h2>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Temat</th><th className="num">Punkty</th><th className="num">%</th></tr></thead>
            <tbody>
              {[...byTopic.entries()].map(([t, a]) => (
                <tr key={t}><td>{topicName(t)}</td><td className="num">{a.p}/{a.m}</td><td className="num">{Math.round((a.p / a.m) * 100)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>Do powtórki</h2>
        {weak.length === 0 ? <p>Żadne zadanie nie ma wyniku poniżej 50%.</p> : (
          <ul>{weak.map((w) => <li key={w.key}><span className="zakreslacz">do powtórki</span> {w.label} · {topicName(w.topicId)}</li>)}</ul>
        )}
        <p className="olowek">Zadania z wynikiem trafiły do harmonogramu powtórek, a wybrane typy błędów do dziennika błędów.</p>
        <button type="button" onClick={onEnd}>Wróć do listy arkuszy</button>
      </section>
    );
  }

  return (
    <section>
      <Header title={`${sub.name}: ${run.exam ? `arkusz ${run.exam.id}` : 'zestaw z banku'}`}>
        {finished ? 'Zakończono. Teraz otwórz zasady oceniania i wpisz punkty.' : 'Tryb egzaminacyjny. Rozwiązania i zasady oceniania są ukryte do końca.'}
      </Header>
      {!finished ? (
        <div className="rzad" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
          <Countdown minutes={run.minutes} startedAt={run.startedAt} onEnd={finish} />
          <ConfirmButton label="Zakończ arkusz" question="Zakończyć arkusz przed czasem?" yes="Zakończ" onConfirm={finish} />
        </div>
      ) : (
        run.exam?.urls.zasady[0] && <p><a href={run.exam.urls.zasady[0]} target="_blank" rel="noreferrer noopener">Zasady oceniania (PDF CKE)</a></p>
      )}
      {err && <p className="ramka-bledu" role="alert">Błąd: {err}</p>}
      {run.exam?.urls.arkusz[0] && !finished && (
        <p>Arkusz: <a href={run.exam.urls.arkusz[0]} target="_blank" rel="noreferrer noopener">otwórz PDF</a> (jeśli nie masz zaimportowanych obrazów zadań).</p>
      )}
      <ol className="lista" style={{ paddingLeft: 0 }}>
        {run.slots.map((sl) => (
          <li key={sl.key}>
            <strong>{sl.label}</strong>
            {sl.max != null && <small> · {sl.max} pkt</small>}
            {sl.page && <small> · strona {sl.page}</small>}
            {!run.exam && sl.url && <> · <a href={sl.url} target="_blank" rel="noreferrer noopener">źródło</a></>}
            <TaskImage imageKey={sl.imageKey} alt={sl.label} />
            {finished && (
              <div className="rzad">
                <Field label={sl.max != null ? `Punkty (0–${sl.max})` : 'Punkty'}>
                  <input inputMode="decimal" value={pts[sl.key] ?? ''} onChange={(e) => setPts({ ...pts, [sl.key]: e.target.value })} />
                </Field>
                {sl.max == null && (
                  <Field label="Maks.">
                    <input type="number" min={1} value={maxes[sl.key] ?? ''} onChange={(e) => setMaxes({ ...maxes, [sl.key]: e.target.value })} />
                  </Field>
                )}
                <Field label="Błąd">
                  <select value={errT[sl.key] ?? ''} onChange={(e) => setErrT({ ...errT, [sl.key]: e.target.value as ErrorType | '' })}>
                    <option value="">bez wpisu</option>
                    {ERROR_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                {errT[sl.key] && (
                  <Field label="Notatka">
                    <input value={notes[sl.key] ?? ''} onChange={(e) => setNotes({ ...notes, [sl.key]: e.target.value })} />
                  </Field>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {finished && (
        <div className="rzad">
          <Field label="Czas rozwiązywania (min)">
            <input type="number" min={0} value={usedMin ?? ''} onChange={(e) => setUsedMin(Number(e.target.value))} />
          </Field>
          <button type="button" className="glowny" onClick={save}>Zapisz wynik</button>
          <button type="button" onClick={onEnd}>Odrzuć</button>
        </div>
      )}
    </section>
  );
}
