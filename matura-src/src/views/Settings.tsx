import { useState } from 'react';
import { useApp } from '../store/context';
import { Field, Header, downloadBlob } from '../components/common';
import { dayName } from '../logic/dates';
import { exportAll, importAll } from '../store/persist';
import { importImageZip } from '../store/images';
import { emptyState } from '../store/defaults';
import { withDemo, withoutDemo } from '../store/demo';
import { newId } from '../store/bank';
import type { FixedEvent, Settings as S, SubjectConfig, TimeWindow } from '../types';

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function Settings() {
  const { state, update, today, setNotice, setError } = useApp();
  const s = state.settings;
  const set = (patch: Partial<S>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));
  const setSub = (id: string, patch: Partial<SubjectConfig>) => set({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const setWin = (wd: number, wins: TimeWindow[]) => set({ weekWindows: { ...s.weekWindows, [wd]: wins } });
  const setEv = (id: string, patch: Partial<FixedEvent>) => set({ events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const [withImages, setWithImages] = useState(true);
  const [demoResults, setDemoResults] = useState(false);

  return (
    <section>
      <Header title="Ustawienia">Każda zmiana przelicza plan od dziś. Dni zatwierdzone i minione zostają z zapisanymi wynikami.</Header>

      <h2>Egzaminy</h2>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Zdaję</th><th>Przedmiot</th><th>Data egzaminu</th><th>Matura ustna</th><th>Cel %</th><th>Ważność</th><th>Arkusz (min)</th><th>Diagnoza: zadań / min</th>
            </tr>
          </thead>
          <tbody>
            {s.subjects.map((x) => (
              <tr key={x.id}>
                <td><input type="checkbox" aria-label={`Zdaję: ${x.name}`} checked={x.enabled} onChange={(e) => setSub(x.id, { enabled: e.target.checked })} /></td>
                <td>{x.name}</td>
                <td><input type="date" aria-label={`Data egzaminu: ${x.name}`} value={x.examDate} onChange={(e) => e.target.value && setSub(x.id, { examDate: e.target.value })} /></td>
                <td><input type="date" aria-label={`Matura ustna: ${x.name}`} value={x.oralDate ?? ''} onChange={(e) => setSub(x.id, { oralDate: e.target.value || null })} /></td>
                <td><input type="number" min={0} max={100} aria-label={`Cel: ${x.name}`} value={x.targetPct ?? ''} onChange={(e) => setSub(x.id, { targetPct: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                <td><input type="number" min={0.1} step={0.1} aria-label={`Ważność: ${x.name}`} value={x.priority} onChange={(e) => setSub(x.id, { priority: Math.max(0.1, Number(e.target.value) || 1) })} /></td>
                <td><input type="number" min={10} aria-label={`Czas arkusza: ${x.name}`} value={x.mockMinutes ?? ''} placeholder="brak" onChange={(e) => setSub(x.id, { mockMinutes: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                <td>
                  <input type="number" min={1} aria-label={`Liczba zadań diagnozy: ${x.name}`} value={x.diagnosisTasks} onChange={(e) => setSub(x.id, { diagnosisTasks: Math.max(1, Number(e.target.value) || 1) })} />{' '}
                  <input type="number" min={5} aria-label={`Czas diagnozy: ${x.name}`} value={x.diagnosisMinutes} onChange={(e) => setSub(x.id, { diagnosisMinutes: Math.max(5, Number(e.target.value) || 5) })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="olowek">
        Daty z komunikatu CKE o harmonogramie 2027. Czas arkusza z angielskiego jest pusty, bo nie potwierdziłem go w źródle CKE; wpisz go z informatora.
        Polski: 240 min na oba arkusze; jeśli nie mieści się w jednym dniu, planer to zgłosi.
      </p>
      <div className="rzad">
        <Field label="Koniec nauki nowych tematów"><input type="date" value={s.newTopicsEnd} onChange={(e) => e.target.value && set({ newTopicsEnd: e.target.value })} /></Field>
        <Field label="Początek fazy arkuszy"><input type="date" value={s.mockPhaseStart} onChange={(e) => e.target.value && set({ mockPhaseStart: e.target.value })} /></Field>
        <Field label="Arkusze od roku"><input type="number" value={s.yearFrom} onChange={(e) => set({ yearFrom: Number(e.target.value) })} /></Field>
        <Field label="do roku"><input type="number" value={s.yearTo} onChange={(e) => set({ yearTo: Number(e.target.value) })} /></Field>
        <label><input type="checkbox" checked={s.includeOldFormula} onChange={(e) => set({ includeOldFormula: e.target.checked })} /> poprzednia formuła w analizie (osobno)</label>
      </div>

      <h2>Tydzień</h2>
      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Dzień</th><th>Godziny nauki</th><th></th></tr></thead>
          <tbody>
            {ORDER.map((wd) => {
              const wins = s.weekWindows[wd] ?? [];
              return (
                <tr key={wd}>
                  <td>{dayName(wd)}</td>
                  <td>
                    {wins.length === 0 && <span className="olowek">wolne</span>}
                    {wins.map((w, i) => (
                      <span key={i} className="rzad" style={{ marginBottom: '0.25rem' }}>
                        <input type="time" aria-label={`${dayName(wd)}: od`} value={w.start} onChange={(e) => setWin(wd, wins.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))} />
                        –
                        <input type="time" aria-label={`${dayName(wd)}: do`} value={w.end} onChange={(e) => setWin(wd, wins.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))} />
                        <button type="button" className="maly" onClick={() => setWin(wd, wins.filter((_, k) => k !== i))}>Usuń</button>
                      </span>
                    ))}
                  </td>
                  <td><button type="button" className="maly" onClick={() => setWin(wd, [...wins, { start: '17:00', end: '18:00' }])}>Dodaj godziny</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="olowek">Godziny weekendu ustawiłem jako przykład (nie podałeś ich); popraw je.</p>
      <div className="rzad">
        <Field label="Nie uczę się przed"><input type="time" value={s.blockedBefore} onChange={(e) => set({ blockedBefore: e.target.value })} /></Field>
        <Field label="Nie uczę się po"><input type="time" value={s.blockedAfter} onChange={(e) => set({ blockedAfter: e.target.value })} /></Field>
        <Field label="Przedmiotów dziennie"><input type="number" min={1} max={6} value={s.maxSubjectsPerDay} onChange={(e) => set({ maxSubjectsPerDay: Math.max(1, Number(e.target.value) || 1) })} /></Field>
        <Field label="Zadań dziennie"><input type="number" min={1} max={30} value={s.maxTasksPerDay} onChange={(e) => set({ maxTasksPerDay: Math.max(1, Number(e.target.value) || 1) })} /></Field>
        <Field label="Domyślny czas zadania (min)"><input type="number" min={1} value={s.defaultTaskMinutes} onChange={(e) => set({ defaultTaskMinutes: Math.max(1, Number(e.target.value) || 1) })} /></Field>
        <Field label="Opuszczony dzień">
          <select value={s.missedDays} onChange={(e) => set({ missedDays: e.target.value as S['missedDays'] })}>
            <option value="przelicz">plan przelicza się sam</option>
            <option value="zaległe">lista zaległych</option>
            <option value="pytaj">pytaj za każdym razem</option>
          </select>
        </Field>
        <label><input type="checkbox" checked={s.diagnosisOnePerDay} onChange={(e) => set({ diagnosisOnePerDay: e.target.checked })} /> jedna diagnoza dziennie</label>
      </div>

      <h2>Zajęcia stałe i korepetycje</h2>
      <ul className="lista">
        {s.events.map((e) => (
          <li key={e.id}>
            <div className="rzad">
              <Field label="Nazwa"><input value={e.name} onChange={(ev) => setEv(e.id, { name: ev.target.value })} /></Field>
              <Field label="Dzień">
                <select value={e.weekday ?? ''} onChange={(ev) => setEv(e.id, { weekday: ev.target.value === '' ? null : Number(ev.target.value), date: ev.target.value === '' ? e.date ?? today : null })}>
                  <option value="">jednorazowo</option>
                  {ORDER.map((wd) => <option key={wd} value={wd}>{dayName(wd)}</option>)}
                </select>
              </Field>
              {e.weekday == null && <Field label="Data"><input type="date" value={e.date ?? ''} onChange={(ev) => setEv(e.id, { date: ev.target.value })} /></Field>}
              <Field label="Godzina"><input type="time" value={e.start} onChange={(ev) => setEv(e.id, { start: ev.target.value })} /></Field>
              <Field label="Długość (min)"><input type="number" min={5} value={e.minutes} onChange={(ev) => setEv(e.id, { minutes: Math.max(5, Number(ev.target.value) || 5) })} /></Field>
              <Field label="Przedmiot">
                <select value={e.subjectId ?? ''} onChange={(ev) => setEv(e.id, { subjectId: ev.target.value || null })}>
                  <option value="">brak</option>
                  {s.subjects.filter((x) => x.enabled).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </Field>
              <label><input type="checkbox" checked={e.countsAsStudy} onChange={(ev) => setEv(e.id, { countsAsStudy: ev.target.checked })} /> to nauka (odejmuje pełny czas)</label>
              <button type="button" className="maly" onClick={() => set({ events: s.events.filter((x) => x.id !== e.id) })}>Usuń</button>
            </div>
            <Field label="Daty bez zajęć (np. ferie), oddzielone przecinkiem, RRRR-MM-DD">
              <input value={e.skipDates.join(', ')} onChange={(ev) => setEv(e.id, { skipDates: ev.target.value.split(',').map((x) => x.trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)) })} style={{ width: '100%' }} />
            </Field>
          </li>
        ))}
      </ul>
      <div className="rzad" style={{ marginTop: '0.5rem' }}>
        <button type="button" onClick={() => set({ events: [...s.events, { id: newId('e'), name: 'Zajęcia', weekday: 1, date: null, start: '16:00', minutes: 60, subjectId: null, countsAsStudy: false, skipDates: [] }] })}>Dodaj zajęcia</button>
        <label><input type="checkbox" checked={s.lessonNotesEnabled} onChange={(e) => set({ lessonNotesEnabled: e.target.checked })} /> zapisywanie tematów z korepetycji</label>
      </div>

      <h2>Wygląd</h2>
      <Field label="Motyw">
        <select value={s.theme} onChange={(e) => set({ theme: e.target.value as S['theme'] })}>
          <option value="ciemny">ciemny</option>
          <option value="jasny">jasny</option>
          <option value="system">zgodny z systemem</option>
        </select>
      </Field>

      <h2>Rekrutacja</h2>
      <div className="rzad">
        <Field label="Uczelnia i kierunek"><input value={s.recruitment.name} onChange={(e) => set({ recruitment: { ...s.recruitment, name: e.target.value } })} style={{ minWidth: '18rem' }} /></Field>
        <Field label="Próg punktowy"><input type="number" value={s.recruitment.threshold ?? ''} onChange={(e) => set({ recruitment: { ...s.recruitment, threshold: e.target.value === '' ? null : Number(e.target.value) } })} /></Field>
        <Field label="Przedmiot X (wynik %, np. fizyka)"><input type="number" min={0} max={100} value={s.recruitment.extraSubjectPct ?? ''} onChange={(e) => set({ recruitment: { ...s.recruitment, extraSubjectPct: e.target.value === '' ? null : Number(e.target.value) } })} /></Field>
        <label><input type="checkbox" checked={s.recruitment.verified} onChange={(e) => set({ recruitment: { ...s.recruitment, verified: e.target.checked } })} /> wzór sprawdzony na stronie uczelni</label>
      </div>
      <p className="olowek">Wzór: {s.recruitment.formula}. Źródło: kalkulator otouczelnie.pl, nie strona uczelni.</p>

      <h2>Dane</h2>
      <p>Dane są tylko w tej przeglądarce. Telefon i komputer mają osobne dane; przenoś je eksportem i importem.</p>
      <div className="rzad">
        <label><input type="checkbox" checked={withImages} onChange={(e) => setWithImages(e.target.checked)} /> z obrazami zadań</label>
        <button type="button" className="glowny" onClick={async () => downloadBlob(await exportAll(state, withImages), `matura2027-${today}.json`)}>Eksportuj do pliku</button>
        <label className="przycisk">
          Importuj z pliku
          <input
            type="file"
            accept="application/json,.json"
            className="tylko-czytnik"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const r = await importAll(await f.text());
                if (!confirm('Import zastąpi wszystkie obecne dane w tej przeglądarce. Kontynuować?')) return;
                update(() => r.state);
                setNotice(`Zaimportowano dane i ${r.images} obrazów.`);
              } catch (err) {
                setError((err as Error).message);
              }
              e.target.value = '';
            }}
          />
        </label>
        <label className="przycisk">
          Obrazy arkuszy CKE (ZIP)
          <input
            type="file"
            accept=".zip,application/zip"
            className="tylko-czytnik"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const n = await importImageZip(f);
                setNotice(n ? `Zaimportowano ${n} obrazów zadań.` : 'W pliku nie było obrazów w układzie <kod arkusza>/<nr>.png. Użyj pliku cke-obrazy.zip ze skryptu importu.');
              } catch {
                setError('Nie udało się odczytać pliku ZIP. Wybierz plik cke-obrazy.zip utworzony przez skrypt importu.');
              }
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <h3>Przykładowe dane</h3>
      <p>Odwołania do stron z zadaniami w książce (ze spisu treści). Opcjonalnie przykładowe wyniki do obejrzenia wykresów; są oznaczone i nie są Twoje.</p>
      <div className="rzad">
        <label><input type="checkbox" checked={demoResults} onChange={(e) => setDemoResults(e.target.checked)} /> z przykładowymi wynikami</label>
        <button type="button" onClick={() => update((st) => withDemo(st, today, demoResults))}>Wczytaj przykładowe dane</button>
        <button type="button" onClick={() => update(withoutDemo)}>Usuń przykładowe dane</button>
      </div>
      <h3>Reset</h3>
      <button
        type="button"
        onClick={() => {
          if (confirm('Usunąć wszystkie dane i wrócić do ustawień początkowych? Najpierw zrób eksport, jeśli chcesz je zachować.')) update(() => emptyState());
        }}
      >
        Usuń wszystkie dane
      </button>
    </section>
  );
}
