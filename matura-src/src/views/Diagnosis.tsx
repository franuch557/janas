import { useMemo, useState } from 'react';
import { useApp } from '../store/context';
import { Countdown, Field, Header, MathText, TaskImage, Tabs } from '../components/common';
import { ENGLISH_WRITING_CRITERIA, POLISH_ESSAY_CRITERIA, topicName, topicsFor } from '../data/taxonomy';
import { buildDiagnosisResult, buildSelfAssessment, selectDiagnosisTasks } from '../logic/diagnosis';
import { newId } from '../store/bank';
import type { DiagnosisItem, SubjectConfig } from '../types';

export default function Diagnosis({ params, go }: { params: Record<string, string>; go: (v: string, p?: Record<string, string>) => void }) {
  const { state } = useApp();
  const subjects = state.settings.subjects.filter((s) => s.enabled);
  const [subjectId, setSubjectId] = useState(params.przedmiot && subjects.some((s) => s.id === params.przedmiot) ? params.przedmiot : subjects[0]?.id ?? '');
  const sub = subjects.find((s) => s.id === subjectId);
  const [mode, setMode] = useState<'przegląd' | 'test' | 'samoocena'>('przegląd');
  if (!sub) return <p className="pusty">Włącz przynajmniej jeden przedmiot w Ustawieniach.</p>;
  return (
    <section>
      <Header title="Diagnoza">
        Krótki test przed startem planu, osobno dla każdego przedmiotu. Nie zastępuje arkusza. Można go powtórzyć w każdej chwili; nowa diagnoza ustawia wagi, poprzednie zostają w historii.
      </Header>
      <Tabs label="Przedmiot" items={subjects.map((s) => ({ id: s.id, name: s.name }))} value={subjectId} onChange={(v) => { setSubjectId(v); setMode('przegląd'); }} />
      {mode === 'przegląd' && <Overview sub={sub} onTest={() => setMode('test')} onSelf={() => setMode('samoocena')} go={go} />}
      {mode === 'test' && <TestRun sub={sub} onDone={() => setMode('przegląd')} />}
      {mode === 'samoocena' && <SelfForm sub={sub} onDone={() => setMode('przegląd')} />}
    </section>
  );
}

function Overview({ sub, onTest, onSelf, go }: { sub: SubjectConfig; onTest: () => void; onSelf: () => void; go: (v: string, p?: Record<string, string>) => void }) {
  const { state, priorities } = useApp();
  const history = state.diagnoses.filter((d) => d.subjectId === sub.id).sort((a, b) => b.date.localeCompare(a.date));
  const topics = topicsFor(sub.family, sub.level);
  const order = [...(priorities[sub.id]?.topics ?? [])].sort((a, b) => b.weight - a.weight).map((t) => t.topicId);
  const sel = useMemo(() => selectDiagnosisTasks(state.bank, sub, order), [state.bank, sub, order.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = history[0];
  return (
    <>
      <p>
        Test: do {sub.diagnosisTasks} zadań, {sub.diagnosisMinutes} min. Zadania biorę wyłącznie z banku (arkusze CKE, zadania.info, książka, treść wklejona przez Ciebie).
      </p>
      <p className="liczby">W banku jest {sel.tasks.length} zadań pasujących do diagnozy, łącznie {sel.minutes} min czasu wzorcowego.</p>
      {sel.missingParts.length > 0 && (
        <div className="pusty">
          Brakuje części diagnozy: {sel.missingParts.map((p) => `${p.label} (${p.have}/${p.need})`).join('; ')}.{' '}
          <button type="button" className="maly" onClick={() => go('zadania', { przedmiot: sub.id, temat: sel.missingParts[0].topicId })}>Dodaj zadania</button>
        </div>
      )}
      {sel.uncoveredTopics.length > 0 && (
        <p className="olowek">Tematy bez zadań w banku: {sel.uncoveredTopics.map(topicName).join(', ')}.</p>
      )}
      <div className="rzad" style={{ margin: '0.75rem 0 1rem' }}>
        <button type="button" className="glowny" onClick={onTest} disabled={sel.tasks.length === 0 && sub.family === 'matematyka'}>Rozpocznij test</button>
        <button type="button" onClick={onSelf}>Samoocena 1–5 zamiast testu</button>
      </div>
      {sel.tasks.length === 0 && sub.family === 'matematyka' && (
        <p>Test wymaga zadań w banku. Zaimportuj arkusze CKE (README) albo dodaj zadania w widoku „Zadania z tematu”. Do tego czasu możesz użyć samooceny.</p>
      )}

      <h2>Wynik według tematów</h2>
      {!latest ? (
        <p className="pusty">Brak diagnozy z tego przedmiotu. Do czasu diagnozy wagi wynikają tylko z arkuszy.</p>
      ) : (
        <div className="tabela-wrap">
          <table>
            <thead>
              <tr>
                <th>Temat</th>
                <th className="num">Ostatnia ({latest.kind}, {latest.date})</th>
                {history.slice(1, 4).map((h) => <th key={h.id} className="num">{h.date} ({h.kind})</th>)}
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td className="num">{fmt(latest.perTopic[t.id], latest.kind)}</td>
                  {history.slice(1, 4).map((h) => <td key={h.id} className="num">{fmt(h.perTopic[t.id], h.kind)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function fmt(v: number | undefined, kind: string) {
  if (v == null) return '–';
  return kind === 'test' ? `${v}%` : `${v}/5`;
}

function TestRun({ sub, onDone }: { sub: SubjectConfig; onDone: () => void }) {
  const { state, update, today, priorities } = useApp();
  const order = [...(priorities[sub.id]?.topics ?? [])].sort((a, b) => b.weight - a.weight).map((t) => t.topicId);
  const [sel] = useState(() => selectDiagnosisTasks(state.bank, sub, order));
  const [startedAt] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [maxes, setMaxes] = useState<Record<string, string>>({});
  const [crit, setCrit] = useState<Record<string, string>>({});
  const [critMax, setCritMax] = useState<Record<string, string>>({});
  const [writing, setWriting] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const criteria =
    sub.family === 'polski'
      ? POLISH_ESSAY_CRITERIA.map((c) => ({ id: c.id, name: c.name, max: c.max as number | null, topicId: c.topicId }))
      : sub.family === 'angielski'
        ? ENGLISH_WRITING_CRITERIA.map((c) => ({ id: c.id, name: c.name, max: c.max, topicId: 'ang-pisanie' }))
        : [];

  const save = () => {
    const items: DiagnosisItem[] = [];
    for (const t of sel.tasks) {
      const max = t.maxPoints ?? Number(maxes[t.id]);
      const p = points[t.id];
      if (p === undefined || p === '') continue;
      if (!max || max <= 0) {
        setErr(`Podaj maksimum punktów dla zadania ${t.ref || t.id}.`);
        return;
      }
      const v = Number(p.replace(',', '.'));
      if (!Number.isFinite(v) || v < 0 || v > max) {
        setErr(`Wynik zadania ${t.ref || t.id} musi być w zakresie 0–${max}.`);
        return;
      }
      items.push({ taskId: t.id, topicId: t.topicId, points: v, maxPoints: max });
    }
    for (const c of criteria) {
      const p = crit[c.id];
      if (p === undefined || p === '') continue;
      const max = c.max ?? Number(critMax[c.id]);
      if (!max) {
        setErr(`Podaj maksimum punktów dla kryterium „${c.name}”. Sprawdź je w zasadach oceniania CKE.`);
        return;
      }
      const v = Number(p.replace(',', '.'));
      if (!Number.isFinite(v) || v < 0 || v > max) {
        setErr(`Kryterium „${c.name}”: wynik w zakresie 0–${max}.`);
        return;
      }
      items.push({ taskId: `kryterium:${c.id}`, topicId: c.topicId, points: v, maxPoints: max });
    }
    if (!items.length) {
      setErr('Nie wpisano żadnego wyniku. Wpisz punkty co najmniej jednego zadania albo kryterium.');
      return;
    }
    const r = buildDiagnosisResult(newId('d'), sub.id, today, items, Math.round((Date.now() - startedAt) / 60000));
    update((s) => ({ ...s, diagnoses: [...s.diagnoses, r] }));
    onDone();
  };

  return (
    <div>
      {!finished ? (
        <div className="rzad" style={{ justifyContent: 'space-between' }}>
          <Countdown minutes={sub.diagnosisMinutes} startedAt={startedAt} onEnd={() => setFinished(true)} />
          <button type="button" onClick={() => setFinished(true)}>Zakończ i wpisz wyniki</button>
        </div>
      ) : (
        <p>Czas minął albo test zakończono. Sprawdź odpowiedzi w zasadach oceniania i wpisz punkty.</p>
      )}
      {err && <p className="ramka-bledu" role="alert">Błąd: {err}</p>}
      <ol className="lista" style={{ paddingLeft: 0 }}>
        {sel.tasks.map((t) => (
          <li key={t.id}>
            <strong>{topicName(t.topicId)}</strong> · {t.source} {t.ref} {t.page ? `· strona ${t.page}` : ''}
            {t.url && <> · <a href={t.url} target="_blank" rel="noreferrer noopener">otwórz źródło</a></>}
            <TaskImage imageKey={t.imageKey} alt={`Zadanie ${t.ref}`} />
            {t.text && <p><MathText text={t.text} /></p>}
            {finished && (
              <div className="rzad">
                <Field label={t.maxPoints ? `Punkty (0–${t.maxPoints})` : 'Punkty'}>
                  <input inputMode="decimal" value={points[t.id] ?? ''} onChange={(e) => setPoints({ ...points, [t.id]: e.target.value })} />
                </Field>
                {!t.maxPoints && (
                  <Field label="Maks. punktów">
                    <input type="number" min={1} value={maxes[t.id] ?? ''} onChange={(e) => setMaxes({ ...maxes, [t.id]: e.target.value })} />
                  </Field>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {criteria.length > 0 && (
        <fieldset>
          <legend>{sub.family === 'polski' ? 'Plan krótkiej rozprawki' : 'Krótka wypowiedź pisemna'}</legend>
          <p>
            {sub.family === 'polski'
              ? 'Napisz plan rozprawki do tematu z arkusza CKE albo podanego przez nauczyciela: teza, dwa argumenty z odwołaniem do lektury, kontekst, wniosek. Oceń plan według kryteriów CKE.'
              : 'Napisz krótką wypowiedź do polecenia z arkusza CKE (poziom podstawowy: 80–130 wyrazów). Oceń ją według kryteriów z zasad oceniania.'}
          </p>
          <Field label="Twój tekst (zostaje tylko w tej przeglądarce)">
            <textarea value={writing} onChange={(e) => setWriting(e.target.value)} rows={6} />
          </Field>
          {sub.family === 'angielski' && <small className="liczby">Wyrazy: {writing.trim() ? writing.trim().split(/\s+/).length : 0}</small>}
          {finished &&
            criteria.map((c) => (
              <div className="rzad" key={c.id}>
                <Field label={`${c.name}${c.max ? ` (0–${c.max})` : ''}`}>
                  <input inputMode="decimal" value={crit[c.id] ?? ''} onChange={(e) => setCrit({ ...crit, [c.id]: e.target.value })} />
                </Field>
                {!c.max && (
                  <Field label="Maks. (z zasad oceniania)">
                    <input type="number" min={1} value={critMax[c.id] ?? ''} onChange={(e) => setCritMax({ ...critMax, [c.id]: e.target.value })} />
                  </Field>
                )}
              </div>
            ))}
          {sub.family === 'polski' && <small>Maksima kryteriów z informatora CKE dotyczą całego wypracowania; przy ocenie planu oceniasz, na ile plan je spełnia.</small>}
        </fieldset>
      )}
      <div className="rzad">
        {finished && <button type="button" className="glowny" onClick={save}>Zapisz diagnozę</button>}
        <button type="button" onClick={onDone}>Anuluj</button>
      </div>
    </div>
  );
}

function SelfForm({ sub, onDone }: { sub: SubjectConfig; onDone: () => void }) {
  const { update, today } = useApp();
  const topics = topicsFor(sub.family, sub.level);
  const [levels, setLevels] = useState<Record<string, number>>({});
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        update((s) => ({ ...s, diagnoses: [...s.diagnoses, buildSelfAssessment(newId('s'), sub.id, today, levels)] }));
        onDone();
      }}
    >
      <p>Oceń swoją wiedzę: 1 – nie znam tematu, 5 – rozwiązuję zadania maturalne bez problemu. Zapisuję to jako samoocenę, nie jako wynik testu.</p>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Temat</th>
              {[1, 2, 3, 4, 5].map((n) => <th key={n} className="num">{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td id={`t-${t.id}`}>{t.name}</td>
                {[1, 2, 3, 4, 5].map((n) => (
                  <td key={n} className="num">
                    <input type="radio" name={t.id} aria-labelledby={`t-${t.id}`} aria-label={`${n}`} checked={levels[t.id] === n} onChange={() => setLevels({ ...levels, [t.id]: n })} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rzad">
        <button type="submit" className="glowny" disabled={!Object.keys(levels).length}>Zapisz samoocenę</button>
        <button type="button" onClick={onDone}>Anuluj</button>
      </div>
    </form>
  );
}
