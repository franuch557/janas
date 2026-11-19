import { useCallback, useEffect, useState } from 'react';
import { AppProvider, useApp } from './store/context';
import Today from './views/Today';
import Week from './views/Week';
import Diagnosis from './views/Diagnosis';
import Bank from './views/Bank';
import Analysis from './views/Analysis';
import Mock from './views/Mock';
import Progress from './views/Progress';
import Errors from './views/Errors';
import Settings from './views/Settings';

const VIEWS = [
  { id: 'dzis', name: 'Dziś', short: 'Dziś' },
  { id: 'plan', name: 'Plan', short: 'Plan' },
  { id: 'zadania', name: 'Zadania z tematu', short: 'Zadania' },
  { id: 'postep', name: 'Postęp', short: 'Postęp' },
  { id: 'diagnoza', name: 'Diagnoza' },
  { id: 'arkusze', name: 'Arkusze próbne' },
  { id: 'bledy', name: 'Dziennik błędów' },
  { id: 'analiza', name: 'Analiza' },
  { id: 'ustawienia', name: 'Ustawienia' },
] as { id: string; name: string; short?: string }[];

function parseHash(): { view: string; params: Record<string, string> } {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [view, query] = h.split('?');
  const params = Object.fromEntries(new URLSearchParams(query ?? ''));
  return { view: VIEWS.some((v) => v.id === view) ? view : 'dzis', params };
}

function Shell() {
  const { error, setError, notice, setNotice } = useApp();
  const [route, setRoute] = useState(parseHash);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      setMore(false);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((view: string, params?: Record<string, string>) => {
    const q = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    window.location.hash = `${view}${q ? `?${q}` : ''}`;
    window.scrollTo(0, 0);
  }, []);
  useEffect(() => {
    document.getElementById('tresc')?.focus({ preventScroll: true });
  }, [route.view]);
  const key = `${route.view}?${new URLSearchParams(route.params).toString()}`;

  return (
    <div className="kratka">
      <a href="#tresc" className="skok">Przejdź do treści</a>
      <div className="uklad">
        <nav className="nawigacja" aria-label="Widoki">
          <div className="tytul">Matura 2027</div>
          <ul className={more ? 'otwarte' : ''}>
            {VIEWS.map((v) => (
              <li key={v.id} className={v.short ? 'glowne' : 'dodatkowe'}>
                <a href={`#${v.id}`} aria-current={route.view === v.id ? 'page' : undefined}>
                  <span className="pelna">{v.name}</span>
                  {v.short && <span className="krotka">{v.short}</span>}
                </a>
              </li>
            ))}
            <li className="wiecej">
              <button type="button" aria-expanded={more} onClick={() => setMore(!more)}>
                {more ? 'Zamknij' : 'Więcej'}
              </button>
            </li>
          </ul>
        </nav>
        <main id="tresc" className={`tresc${route.view === 'plan' ? ' szeroka' : ''}`} tabIndex={-1}>
          {error && (
            <div className="ramka-bledu" role="alert">
              Błąd: {error} <button type="button" className="maly" onClick={() => setError(null)}>Zamknij</button>
            </div>
          )}
          {notice && (
            <div className="ramka" role="status">
              {notice} <button type="button" className="maly" onClick={() => setNotice(null)}>Zamknij</button>
            </div>
          )}
          <div key={key}>
            {route.view === 'dzis' && <Today go={go} />}
            {route.view === 'plan' && <Week />}
            {route.view === 'diagnoza' && <Diagnosis params={route.params} go={go} />}
            {route.view === 'zadania' && <Bank params={route.params} />}
            {route.view === 'arkusze' && <Mock params={route.params} />}
            {route.view === 'postep' && <Progress />}
            {route.view === 'bledy' && <Errors params={route.params} />}
            {route.view === 'analiza' && <Analysis />}
            {route.view === 'ustawienia' && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
