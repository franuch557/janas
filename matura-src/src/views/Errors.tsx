import { useState } from 'react';
import { useApp, subjectName } from '../store/context';
import { Field, Header } from '../components/common';
import { topicName, topicsFor } from '../data/taxonomy';
import { ERROR_TYPES } from './Today';
import { newId } from '../store/bank';
import { errorBoost } from '../logic/mastery';
import type { ErrorType } from '../types';

export default function Errors({ params }: { params: Record<string, string> }) {
  const { state, update, today } = useApp();
  const subs = state.settings.subjects.filter((s) => s.enabled);
  const [filterSub, setFilterSub] = useState(params.przedmiot ?? '');
  const [filterType, setFilterType] = useState<ErrorType | ''>('');
  const [subjectId, setSubjectId] = useState(params.przedmiot || subs[0]?.id || '');
  const sub = subs.find((s) => s.id === subjectId);
  const topics = sub ? topicsFor(sub.family, sub.level) : [];
  const [topicId, setTopicId] = useState(topics[0]?.id ?? '');
  const [type, setType] = useState<ErrorType>('koncepcyjny');
  const [task, setTask] = useState('');
  const [note, setNote] = useState('');

  const list = state.errors
    .filter((e) => (!filterSub || e.subjectId === filterSub) && (!filterType || e.type === filterType))
    .sort((a, b) => b.date.localeCompare(a.date));
  const counts = ERROR_TYPES.map((t) => [t, state.errors.filter((e) => e.type === t && (!filterSub || e.subjectId === filterSub)).length] as const);
  const boosted = subs.flatMap((s) =>
    topicsFor(s.family, s.level)
      .map((t) => ({ s, t, b: errorBoost(state.errors, s.id, t.id, today) }))
      .filter((x) => x.b > 0),
  );

  return (
    <section>
      <Header title="Dziennik błędów">Powtarzający się błąd koncepcyjny w temacie (od dwóch w 30 dni) podnosi priorytet tematu w planie.</Header>
      <form
        className="ramka"
        onSubmit={(e) => {
          e.preventDefault();
          if (!sub) return;
          update((s) => ({ ...s, errors: [...s.errors, { id: newId('b'), subjectId, taskId: null, topicId: topicId || null, type, note: [task, note].filter(Boolean).join(': '), date: today }] }));
          setNote('');
          setTask('');
        }}
      >
        <div className="rzad">
          <Field label="Przedmiot">
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); const s = subs.find((x) => x.id === e.target.value); setTopicId(s ? topicsFor(s.family, s.level)[0]?.id ?? '' : ''); }}>
              {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Temat">
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Typ błędu">
            <select value={type} onChange={(e) => setType(e.target.value as ErrorType)}>
              {ERROR_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Zadanie">
            <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="np. CKE 2025 zad. 5" />
          </Field>
        </div>
        <Field label="Notatka">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button type="submit" className="glowny">Dodaj wpis</button>
      </form>

      {boosted.length > 0 && (
        <p>
          Podniesiony priorytet: {boosted.map((x) => `${x.s.name} · ${x.t.name} (+${Math.round(x.b * 100)}%)`).join('; ')}.
        </p>
      )}

      <div className="rzad">
        <Field label="Filtr: przedmiot">
          <select value={filterSub} onChange={(e) => setFilterSub(e.target.value)}>
            <option value="">wszystkie</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Filtr: typ">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as ErrorType | '')}>
            <option value="">wszystkie</option>
            {ERROR_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <p className="olowek liczby">{counts.map(([t, n]) => `${t}: ${n}`).join(' · ')}</p>
      {list.length === 0 ? (
        <p className="pusty">Brak wpisów. Wpisy dodajesz tutaj, po zadaniu w widoku „Dziś” albo po arkuszu próbnym.</p>
      ) : (
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Data</th><th>Przedmiot</th><th>Temat</th><th>Typ</th><th>Notatka</th><th></th></tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td>
                  <td>{subjectName(state, e.subjectId)}</td>
                  <td>{topicName(e.topicId)}</td>
                  <td>{e.type}</td>
                  <td>{e.note}</td>
                  <td><button type="button" className="maly" onClick={() => update((s) => ({ ...s, errors: s.errors.filter((x) => x.id !== e.id) }))}>Usuń</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
