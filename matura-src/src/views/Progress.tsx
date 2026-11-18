import { useApp } from '../store/context';
import { Header } from '../components/common';
import { LineChart, Legend, type Series } from '../components/charts';
import { topicName } from '../data/taxonomy';
import { forecast, observations, resultDropped } from '../logic/mastery';
import { weeklySuggestions } from '../logic/planner';
import { addDays, weekday } from '../logic/dates';
import { manualKey } from '../logic/priorities';

export default function Progress() {
  const { state, update, priorities, exams, today } = useApp();
  const subs = state.settings.subjects.filter((s) => s.enabled);

  // seria wyników: średnia dzienna wszystkich wyników przedmiotu (zadania, arkusze, diagnozy testowe)
  const series: Series[] = subs.map((s) => {
    const byDate = new Map<string, number[]>();
    for (const t of state.bank) if (t.subjectId === s.id) for (const h of t.history) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h.result]);
    for (const m of state.mocks) if (m.subjectId === s.id && m.maxPoints) byDate.set(m.date, [...(byDate.get(m.date) ?? []), (m.earned / m.maxPoints) * 100]);
    for (const d of state.diagnoses) if (d.subjectId === s.id && d.kind === 'test') {
      const vals = Object.values(d.perTopic);
      if (vals.length) byDate.set(d.date, [...(byDate.get(d.date) ?? []), vals.reduce((a, b) => a + b, 0) / vals.length]);
    }
    return { name: s.name, points: [...byDate.entries()].map(([date, v]) => ({ date, value: v.reduce((a, b) => a + b, 0) / v.length })) };
  });

  const dates = series.flatMap((x) => x.points.map((p) => p.date)).sort();
  const from = dates[0] && dates[0] < addDays(today, -14) ? dates[0] : addDays(today, -14);
  const to = dates.length && dates[dates.length - 1] > today ? dates[dates.length - 1] : today;
  const isSunday = weekday(today) === 0;
  const topicIds = Object.fromEntries(Object.entries(priorities).map(([id, sp]) => [id, sp.topics.map((t) => t.topicId)]));
  const suggestions = weeklySuggestions(today, state.startedAt, subs, state.bank, topicIds, (sid, tid) =>
    resultDropped(observations(sid, tid, state.bank, state.mocks, exams, state.diagnoses)),
  ).filter((x) => !state.weightSuggestionsSeen.includes(x.id));

  const weekAgo = addDays(today, -6);
  const weekMinutes = state.bank.flatMap((t) => t.history).filter((h) => h.date >= weekAgo && h.date <= today).reduce((a, h) => a + (h.minutes ?? 0), 0);
  const weekTasks = state.bank.flatMap((t) => t.history).filter((h) => h.date >= weekAgo && h.date <= today).length;

  const rec = state.settings.recruitment;
  const fc = Object.fromEntries(
    subs.map((s) => {
      const sp = priorities[s.id];
      const w = Object.fromEntries(sp.topics.map((t) => [t.topicId, t.weight]));
      const m = Object.fromEntries(sp.topics.map((t) => [t.topicId, t.mastery]));
      const n = sp.topics.reduce((a, t) => a + observations(s.id, t.topicId, state.bank, state.mocks, exams, state.diagnoses).filter((o) => o.source !== 'samoocena').length, 0);
      return [s.id, forecast(w, m, n)];
    }),
  );
  const pctOf = (id: string) => fc[id]?.pct ?? null;
  const W = (k: (id: string) => number | null) => {
    const jp = k('pol-p');
    const jo = k('ang-p');
    const mp = k('mat-p');
    const mr = k('mat-r');
    if ([jp, jo, mp, mr].some((x) => x == null)) return null;
    return 0.5 * jp! + 0.5 * jo! + 2.5 * (mp! + mr!) + 2 * (rec.extraSubjectPct ?? 0);
  };
  const wMid = W(pctOf);
  const wLow = W((id) => fc[id]?.low ?? null);
  const wHigh = W((id) => fc[id]?.high ?? null);

  return (
    <section>
      <Header title="Postęp">Prognoza liczona z wag tematów i biegłości (trzy ostatnie wyniki). Zakres pokazuje niepewność: im mniej wyników, tym szerszy.</Header>

      <h2>Cel: {rec.name}</h2>
      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Przedmiot</th><th className="num">Prognoza</th><th className="num">Zakres</th><th className="num">Cel</th><th className="num">Do celu</th><th className="num">Wyniki</th></tr></thead>
          <tbody>
            {subs.map((s) => {
              const f = fc[s.id];
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td className="num">{f.pct}%</td>
                  <td className="num">{f.low}–{f.high}%</td>
                  <td className="num">{s.targetPct != null ? `${s.targetPct}%` : '–'}</td>
                  <td className="num">{s.targetPct != null ? (f.pct >= s.targetPct ? 'cel osiągnięty w prognozie' : `${s.targetPct - f.pct} p.p.`) : 'ustaw cel'}</td>
                  <td className="num">{f.basis}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Punkty rekrutacyjne (wzór {rec.formula}{rec.verified ? '' : ', niepotwierdzony na stronie uczelni'}):{' '}
        {wMid == null ? 'brak prognozy dla wszystkich czterech przedmiotów.' : <strong className="liczby">{wMid.toFixed(1)} (zakres {wLow?.toFixed(1)}–{wHigh?.toFixed(1)})</strong>}
        {rec.extraSubjectPct == null && ' Przedmiot X (2×X) nie jest ustawiony, więc liczę go jako 0; ustaw go w Ustawieniach.'}
        {rec.threshold != null && ` Próg: ${rec.threshold}.`}
      </p>
      <p className="olowek">Prognoza tematów bez wyników liczy je jako 50% z pełną niepewnością. Samoocena nie zwiększa liczby wyników.</p>

      <h2>Wyniki w czasie</h2>
      <Legend series={series} />
      <LineChart series={series} from={from} to={to} title="Wyniki przedmiotów w czasie" target={null} />
      <p className="liczby">Ostatnie 7 dni: {weekTasks} zadań, {weekMinutes} min zmierzonego czasu.</p>

      <h2>Mapa tematów</h2>
      {subs.map((s) => (
        <div key={s.id}>
          <h3>{s.name}</h3>
          <div className="mapa">
            {priorities[s.id].topics.map((t) => (
              <div key={t.topicId}>
                <div>{topicName(t.topicId)}</div>
                <small className="liczby">{t.mastery == null ? 'brak wyników' : `biegłość ${Math.round(t.mastery * 100)}%`} · waga {(t.weight * 100).toFixed(0)}%</small>
                <div className="pasek" aria-hidden="true"><span style={{ width: `${Math.round((t.mastery ?? 0) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h2>Podsumowanie tygodnia</h2>
      {!isSunday && <p className="olowek">Propozycje zmian wag pojawiają się w planie w niedzielę; poniżej stan na dziś.</p>}
      {suggestions.length === 0 ? (
        <p>Brak propozycji: każdy temat miał rozwiązane zadanie w ostatnich 14 dniach i wyniki nie spadły (albo minęło mniej niż 14 dni nauki).</p>
      ) : (
        <ul className="lista">
          {suggestions.map((x) => {
            const sp = priorities[x.subjectId];
            const info = sp?.topics.find((t) => t.topicId === x.topicId);
            const proposed = Math.min(1, (info?.manual ?? info?.weight ?? 0.05) * 1.3);
            return (
              <li key={x.id} className="rzad" style={{ justifyContent: 'space-between' }}>
                <span>
                  {sp?.subject.name} · {topicName(x.topicId)}: {x.reason} Propozycja: waga {(proposed * 100).toFixed(1)}%.
                </span>
                <span className="rzad">
                  <button type="button" className="maly" onClick={() => update((s) => ({
                    ...s,
                    settings: { ...s.settings, manualWeights: { ...s.settings.manualWeights, [manualKey(x.subjectId, x.topicId)]: proposed } },
                    weightSuggestionsSeen: [...s.weightSuggestionsSeen, x.id],
                  }))}>Zastosuj</button>
                  <button type="button" className="maly" onClick={() => update((s) => ({ ...s, weightSuggestionsSeen: [...s.weightSuggestionsSeen, x.id] }))}>Pomiń</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
