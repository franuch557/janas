import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Session } from '@supabase/supabase-js';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import '@fontsource-variable/bricolage-grotesque/standard.css';
import 'katex/dist/katex.min.css';
import './styles/app.css';
import App from './App';
import { AppStore } from './store/AppStore';
import { setStorageScope } from './store/local';
import { Sync } from './store/sync';
import { supa } from './store/supabase';
import { Login } from './views/Login';

// W artefakcie (window.claude) dane trzyma capability `db`; na stronie GitHub Pages (tryb `pages`)
// konto w Supabase. Serwer deweloperski i testy działają jak dotąd, bez logowania.
const accounts = import.meta.env.MODE === 'pages' && !(window as unknown as { claude?: unknown }).claude;

function Accounts() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const sb = supa();
    void sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession((cur) => (cur?.user.id === s?.user.id ? cur : s)));
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined)
    return (
      <div className="onb">
        <p className="muted" aria-busy="true">
          Ładowanie…
        </p>
      </div>
    );
  if (!session) return <Login />;
  const uid = session.user.id;
  setStorageScope(uid);
  Sync.account = uid;
  return (
    <AppStore key={uid}>
      <App />
    </AppStore>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {!accounts ? (
      <AppStore>
        <App />
      </AppStore>
    ) : (
      <Accounts />
    )}
  </StrictMode>,
);
