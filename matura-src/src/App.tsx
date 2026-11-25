import { MemoryMapView, ReviewView } from './views/Review';
import { PracticeView } from './views/Practice';
import { CommuteView } from './views/Commute';
import { MistakesView, QuizView } from './views/Quiz';
import { useEffect, useRef } from 'react';
import { useStore } from './store/AppStore';
import { FOCUS_ROUTES, go, useRoute, type Route } from './ui/router';
import { Icon } from './ui/icons';
import { useNow } from './ui/common';
import { dni, fmtAgo } from './logic/format';
import { StartView } from './views/Start';
import { PlanView } from './views/Plan';
import { BankView } from './views/Bank';
import { TaskView } from './views/Task';
import { ExamsView, ExamView } from './views/Exams';
import { DiagnosisView } from './views/Diagnosis';
import { EssayView } from './views/Essay';
import { ProgressView } from './views/Progress';
import { SettingsView } from './views/Settings';
import { Onboarding } from './views/Onboarding';
import { useReminder } from './views/reminder';
import { FlashcardsView } from './views/Flashcards';
import { QuickMode } from './views/QuickMode';
import { BookView, BooksView, OralQuestionView, OralView } from './views/Books';
import { TheoryView } from './views/Theory';

const TITLES: Record<string, string> = { plan: 'Plan', zadania: 'Zadania', arkusze: 'Arkusze', postep: 'Postęp', ustawienia: 'Ustawienia', fiszki: 'Fiszki', lektury: 'Lektury', lektura: 'Lektury', ustny: 'Ustny polski', 'ustny-pytanie': 'Ustny polski', 'mapa-pamieci': 'Mapa pamięci', teoria: 'Teoria' };

const NAV = [
  { name: 'start', label: 'Start', icon: 'start' },
  { name: 'plan', label: 'Plan', icon: 'plan' },
  { name: 'zadania', label: 'Zadania', icon: 'zadania' },
  { name: 'arkusze', label: 'Arkusze', icon: 'arkusze' },
  { name: 'fiszki', label: 'Fiszki', icon: 'fiszki' },
  { name: 'lektury', label: 'Lektury', icon: 'lektury' },
  { name: 'postep', label: 'Postęp', icon: 'postep' },
] as const;


export function useSyncInfo() {
  const { sync } = useStore();
  const now = useNow(30_000);
  const text =
    sync.state === 'lokalnie'
      ? 'Zapis na tym urządzeniu'
      : sync.state === 'laczenie'
        ? 'Łączenie z zapisem w chmurze'
        : sync.state === 'zapisywanie'
          ? 'Zapisywanie…'
          : sync.state === 'blad'
            ? 'Błąd zapisu w chmurze'
            : sync.state === 'offline'
              ? 'Brak połączenia z chmurą'
              : sync.lastSavedAt
                ? `Zapisano ${fmtAgo(sync.lastSavedAt, now)}`
                : 'Zapisano';
  const icon = sync.state === 'lokalnie' ? 'urzadzenie' : sync.state === 'blad' || sync.state === 'offline' ? 'chmuraBlad' : 'chmura';
  const color = sync.state === 'blad' ? 'var(--zle)' : sync.state === 'offline' ? 'var(--seria)' : undefined;
  return { text, icon, color };
}

export function SyncButton() {
  const { text, icon, color } = useSyncInfo();
  return (
    <button type="button" className="btn btn-icon" aria-label={text} title={text} style={{ color }} onClick={() => go('#ustawienia')}>
      <Icon name={icon} />
    </button>
  );
}

function Shell({ route, children }: { route: Route; children: React.ReactNode }) {
  const { d, toasts, dismissToast } = useStore();
  const sync = useSyncInfo();
  const active = route.name === 'zadanie' || route.name === 'teoria' ? 'zadania' : ['lektura', 'ustny', 'ustny-pytanie'].includes(route.name) ? 'lektury' : route.name === 'mapa-pamieci' ? 'postep' : route.name;
  const focus = FOCUS_ROUTES.has(route.name);
  const toastsEl = (
    <div className={`toasts${focus ? ' focus-mode' : ''}`} aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="t">{t.text}</span>
          {t.action ? (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
  if (focus) {
    return (
      <>
        {children}
        {toastsEl}
      </>
    );
  }
  return (
    <div className="app with-nav">
      <a href="#tresc" className="skip" onClick={(e) => { e.preventDefault(); document.getElementById('tresc')?.focus(); }}>
        Przejdź do treści
      </a>
      <nav className="sidebar" aria-label="Nawigacja główna">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Matura 2027
        </div>
        {NAV.map((n) => (
          <a key={n.name} href={`#${n.name}`} className="navitem" aria-current={active === n.name ? 'page' : undefined}>
            <span className="pill">
              <Icon name={n.icon} />
            </span>
            {n.label}
          </a>
        ))}
        <div className="spacer" />
        <div className="side-extra">
          <span style={{ color: 'var(--seria)', fontWeight: 650 }}>Seria: {dni(d.streak)}</span>
          <span className="row" style={{ color: sync.color ?? 'var(--tekst-2)' }} title={sync.text}>
            <Icon name={sync.icon} size={18} /> {sync.text}
          </span>
        </div>
        <a href="#ustawienia" className="navitem" aria-current={active === 'ustawienia' ? 'page' : undefined}>
          <span className="pill">
            <Icon name="ustawienia" />
          </span>
          Ustawienia
        </a>
      </nav>
      <div>
        <header className="topbar">
          <span className="brand-mark" aria-hidden="true" />
          <span className="title" aria-hidden={route.name !== 'start' ? true : undefined}>
            {TITLES[route.name] ?? 'Matura 2027'}
          </span>
          <SyncButton />
          <button type="button" className="btn btn-icon" aria-label="Ustawienia" title="Ustawienia" onClick={() => go('#ustawienia')}>
            <Icon name="ustawienia" />
          </button>
        </header>
        <main className="main" id="tresc" tabIndex={-1}>
          {children}
        </main>
      </div>
      <nav className="bottomnav" aria-label="Nawigacja główna">
        {NAV.map((n) => (
          <a key={n.name} href={`#${n.name}`} className="navitem" aria-current={active === n.name ? 'page' : undefined}>
            <span className="pill">
              <Icon name={n.icon} />
            </span>
            {n.label}
          </a>
        ))}
      </nav>
      {toastsEl}
    </div>
  );
}

function useTheme() {
  const { data } = useStore();
  const { theme, textSize } = data.stan;
  useEffect(() => {
    const el = document.documentElement;
    el.lang = 'pl';
    if (theme === 'jasny') el.setAttribute('data-theme', 'light');
    else if (theme === 'ciemny') el.setAttribute('data-theme', 'dark');
    else el.removeAttribute('data-theme');
    el.setAttribute('data-size', textSize);
  }, [theme, textSize]);
}

/** Skróty klawiszowe: g s, g p, g z, g a, g o. */
function useShortcuts(enabled: boolean) {
  const last = useRef<{ key: string; t: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const prev = last.current;
      if (prev && prev.key === 'g' && Date.now() - prev.t < 1200) {
        const map: Record<string, string> = { s: '#start', p: '#plan', z: '#zadania', a: '#arkusze', o: '#postep' };
        if (map[e.key]) go(map[e.key]);
        last.current = null;
        return;
      }
      last.current = { key: e.key, t: Date.now() };
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [enabled]);
}

export default function App() {
  const route = useRoute();
  const { data, ready } = useStore();
  useTheme();
  useReminder();
  const focus = FOCUS_ROUTES.has(route.name);
  useShortcuts(!focus);

  // Decyzja o powitaniu dopiero po pierwszej odpowiedzi zapisu w chmurze: drugie
  // urządzenie dostaje wtedy stan z pierwszego i nie zaczyna od nowa.
  useEffect(() => {
    if (!ready) return;
    if (!data.stan.onboarded && route.name !== 'powitanie' && route.name !== 'diagnoza') go('#powitanie', true);
    if (data.stan.onboarded && route.name === 'powitanie') go('#start', true);
  }, [ready, data.stan.onboarded, route.name]);

  let view: React.ReactNode;
  switch (route.name) {
    case 'powitanie':
      view = <Onboarding />;
      break;
    case 'plan':
      view = <PlanView />;
      break;
    case 'zadania':
      view = <BankView subject={route.subject} topic={route.topic} />;
      break;
    case 'zadanie':
      view = <TaskView key={route.id} id={route.id} />;
      break;
    case 'arkusze':
      view = <ExamsView />;
      break;
    case 'arkusz':
      view = <ExamView key={`${route.examId}-${route.partId}`} examId={route.examId} partId={route.partId} />;
      break;
    case 'diagnoza':
      view = <DiagnosisView key={route.subject} subject={route.subject} />;
      break;
    case 'wypracowanie':
      view = <EssayView key={route.id} id={route.id} />;
      break;
    case 'postep':
      view = <ProgressView subject={route.subject} />;
      break;
    case 'ustawienia':
      view = <SettingsView />;
      break;
    case 'fiszki':
      view = <FlashcardsView />;
      break;
    case 'piec-minut':
      view = <QuickMode key="5" minutes={5} />;
      break;
    case 'dziesiec-minut':
      view = <QuickMode key="10" minutes={10} />;
      break;
    case 'cwiczenie':
      view = <PracticeView key={`${route.subject}-${route.topic}`} subject={route.subject} topic={route.topic} />;
      break;
    case 'sprawdzian':
      view = <QuizView />;
      break;
    case 'tramwaj':
      view = <CommuteView />;
      break;
    case 'bledy':
      view = <MistakesView />;
      break;
    case 'powtorki':
      view = <ReviewView key={`${route.subject}-${route.topic}`} subject={route.subject} topic={route.topic} />;
      break;
    case 'mapa-pamieci':
      view = <MemoryMapView />;
      break;
    case 'teoria':
      view = <TheoryView key={route.topic ?? ''} topic={route.topic} />;
      break;
    case 'lektury':
      view = <BooksView />;
      break;
    case 'lektura':
      view = <BookView key={route.id} id={route.id} />;
      break;
    case 'ustny':
      view = <OralView />;
      break;
    case 'ustny-pytanie':
      view = <OralQuestionView key={route.nr} nr={route.nr} />;
      break;
    default:
      view = <StartView />;
  }
  return <Shell route={route}>{view}</Shell>;
}
