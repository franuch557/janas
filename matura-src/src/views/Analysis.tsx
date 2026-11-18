import { useState } from 'react';
import { useApp } from '../store/context';
import { Field, Header, Tabs, plural } from '../components/common';
import { BarChart } from '../components/charts';
import { topicName, topicsFor } from '../data/taxonomy';
import { availableYears, examLabel, filterExams, validateExam } from '../logic/exams';
import { computeWeights, topicStats } from '../logic/weights';
import { manualKey } from '../logic/priorities';
import type { WeightMode } from '../types';

export default function Analysis() {
  const { state, update, exams, priorities } = useApp();
  const s = state.settings;
  const subjects = s.subjects.filter((x) => x.enabled);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? '');
  const sub = subjects.find((x) => x.id === subjectId);
  if (!sub) return <p className="pusty">Włącz przynajmniej jeden przedmiot w Ustawieniach.</p>;
  const years = availableYears(exams, sub.family, sub.level);
  const filter = { family: sub.family, level: sub.level, yearFrom: s.yearFrom, yearTo: s.yearTo, includeOldFormula: s.includeOldFormula, excluded: s.excludedExams };
  const { current, old } = filterExams(exams, filter);
  const topics = topicsFor(sub.family, sub.level);
  const stats = topicStats(current, topics);
  const weights = computeWeights(stats, s.weightMode);
  const oldStats = old.length ? topicStats(old, topics) : [];
  const withData = current.filter((e) => e.tasks.length || e.groups.length);
  const sp = priorities[sub.id];
  const all = exams.filter((e) => e.family === sub.family && e.level === sub.level);
  const setS = (patch: Partial<typeof s>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }));

  return (
    <section>
      <Header title="Analiza wag tematów">Punkty z arkuszy CKE w wybranym zakresie lat. Wagi planu wynikają z tych danych i z wyników diagnozy.</Header>
      <Tabs label="Przedmiot" items={subjects.map((x) => ({ id: x.id, name: x.name }))} value={subjectId} onChange={setSubjectId} />
      <div className="rzad">
        <Field label="Rok od">
          <input type="number" min={2015} max={2030} value={s.yearFrom} onChange={(e) => setS({ yearFrom: Number(e.target.value) })} />
        </Field>
        <Field label="Rok do">
          <input type="number" min={2015} max={2030} value={s.yearTo} onChange={(e) => setS({ yearTo: Number(e.target.value) })} />
        </Field>
        <Field label="Tryb wag">
          <select value={s.weightMode} onChange={(e) => setS({ weightMode: e.target.value as WeightMode })}>
            <option value="bazowo">bazowo</option>
            <option value="trend">trend</option>
            <option value="mocno trend">mocno trend</option>
          </select>
        </Field>
        <label>
          <input type="checkbox" checked={s.includeOldFormula} onChange={(e) => setS({ includeOldFormula: e.target.checked })} /> pokaż poprzednią formułę (osobno)
        </label>
      </div>
      <p className="olowek">Lata w bazie: {years.join(', ') || 'brak'}. Arkusze z danymi zadań w zakresie: {withData.length} z {current.length}.</p>

      <fieldset>
        <legend>Arkusze w analizie</legend>
        {all.length === 0 && <p>Brak arkuszy tego przedmiotu w bazie.</p>}
        {all.map((e) => {
          const issues = validateExam(e);
          const inRange = e.year >= s.yearFrom && e.year <= s.yearTo;
          return (
            <div key={e.id}>
              <label>
                <input
                  type="checkbox"
                  checked={!s.excludedExams.includes(e.id)}
                  disabled={!inRange}
                  onChange={(ev) => setS({ excludedExams: ev.target.checked ? s.excludedExams.filter((x) => x !== e.id) : [...s.excludedExams, e.id] })}
                />
                {e.id} · {examLabel(e)} · {e.status}
                {!inRange ? ' · poza zakresem' : ''}
                {issues.length ? ` · ${plural(issues.length, 'uwaga', 'uwagi', 'uwag')}` : ''}
              </label>
            </div>
          );
        })}
        <small>Szczegóły braków: data/exams-issues.md. Dane zadań dodaje skrypt importu z PDF (README).</small>
      </fieldset>

      {withData.length === 0 ? (
        <div className="pusty">
          Brak punktacji zadań w wybranym zakresie. Wagi tego przedmiotu są równe dla wszystkich tematów, dopóki nie zaimportujesz arkuszy (README: „Import arkuszy CKE”).
        </div>
      ) : (
        <BarChart
          title={`Punkty tematów, ${sub.name}, ${s.yearFrom}–${s.yearTo}`}
          unit="pkt"
          bars={[...stats].sort((a, b) => b.points - a.points).map((st) => ({ label: topicName(st.topicId), value: st.points, note: st.trend != null && st.trend > 1.2 ? '↑' : st.trend != null && st.trend < 0.8 ? '↓' : '' }))}
        />
      )}

      <h2>Tabela tematów</h2>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr>
              <th>Temat</th>
              <th className="num">Punkty</th>
              <th className="num">Udział</th>
              <th className="num">Arkusze</th>
              <th className="num">Trend</th>
              <th className="num">Śr. zamknięte</th>
              <th className="num">Śr. otwarte</th>
              <th className="num">Waga</th>
              <th className="num">Biegłość</th>
              <th className="num">Priorytet</th>
              <th>Waga ręczna</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((st) => {
              const info = sp?.topics.find((t) => t.topicId === st.topicId);
              const key = manualKey(sub.id, st.topicId);
              const manual = s.manualWeights[key];
              return (
                <tr key={st.topicId}>
                  <td>{topicName(st.topicId)}</td>
                  <td className="num">{st.points}</td>
                  <td className="num">{(st.share * 100).toFixed(1)}%</td>
                  <td className="num">{st.examCount}</td>
                  <td className="num">{st.trend == null ? '–' : st.trend.toFixed(2)}</td>
                  <td className="num">{st.avgByType.zamknięte?.toFixed(1) ?? '–'}</td>
                  <td className="num">{st.avgByType.otwarte?.toFixed(1) ?? '–'}</td>
                  <td className="num">{(weights[st.topicId] * 100).toFixed(1)}%</td>
                  <td className="num">{info?.mastery == null ? '–' : `${Math.round(info.mastery * 100)}%`}</td>
                  <td className="num">{info ? info.priority.toFixed(3) : '–'}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      aria-label={`Waga ręczna w procentach: ${topicName(st.topicId)}`}
                      value={manual == null ? '' : Math.round(manual * 1000) / 10}
                      placeholder="auto"
                      onChange={(e) => {
                        const v = e.target.value;
                        const mw = { ...s.manualWeights };
                        if (v === '') delete mw[key];
                        else mw[key] = Math.max(0, Number(v)) / 100;
                        setS({ manualWeights: mw });
                      }}
                    />
                    {manual != null && <small> wyliczona {(weights[st.topicId] * 100).toFixed(1)}%</small>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="olowek">
        Trend: średnia punktów na arkusz w dwóch ostatnich latach zakresu podzielona przez średnią z pozostałych lat. Priorytet = waga × (1,5 − biegłość) × (1 + błędy koncepcyjne).
        Waga ręczna zastępuje wyliczoną; puste pole przywraca wyliczoną.
      </p>

      {oldStats.length > 0 && (
        <>
          <h2>Poprzednia formuła (nie wchodzi do wag)</h2>
          <p className="olowek">Arkusze sprzed formuły 2023. Pokazuję je osobno, bo mają inną strukturę i punktację.</p>
          <BarChart title="Punkty tematów, poprzednia formuła" unit="pkt" bars={oldStats.filter((x) => x.points > 0).map((x) => ({ label: topicName(x.topicId), value: x.points }))} />
        </>
      )}
    </section>
  );
}
