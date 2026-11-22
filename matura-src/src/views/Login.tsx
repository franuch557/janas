// Logowanie na stronie (poza artefaktem): nazwa użytkownika i hasło.
// Każde konto ma własne dane (plan, czas nauki, korepetycje, wyniki) zapisane na serwerze.

import { useState } from 'react';
import { AUTH_TEXT, signIn, signUp, type AuthError } from '../store/supabase';

export function Login() {
  const [mode, setMode] = useState<'login' | 'nowe'>('login');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(null);
    if (mode === 'nowe' && pass !== pass2) {
      setErr('Hasła się różnią.');
      return;
    }
    setBusy(true);
    const r: AuthError | null = mode === 'login' ? await signIn(user, pass) : await signUp(user, pass);
    setBusy(false);
    if (r) setErr(AUTH_TEXT[r]);
  };
  return (
    <div className="onb">
      <form className="onb-body onb-card stack" onSubmit={(e) => void submit(e)} noValidate>
        <h1>{mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}</h1>
        <p className="muted">Matura 2027. Plan, wyniki i fiszki są zapisane na twoim koncie, więc otworzysz je w każdej przeglądarce.</p>
        <div className="field">
          <label htmlFor="lg-user">Nazwa użytkownika</label>
          <input id="lg-user" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} value={user} onChange={(e) => setUser(e.target.value)} maxLength={30} required />
          {mode === 'nowe' ? <span className="hint">3–30 znaków: małe litery, cyfry, kropka, myślnik, podkreślnik.</span> : null}
        </div>
        <div className="field">
          <label htmlFor="lg-pass">Hasło</label>
          <input id="lg-pass" className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} maxLength={72} required />
          {mode === 'nowe' ? <span className="hint">Co najmniej 8 znaków. Zapamiętaj je: bez e-maila nie da się go odzyskać.</span> : null}
        </div>
        {mode === 'nowe' ? (
          <div className="field">
            <label htmlFor="lg-pass2">Powtórz hasło</label>
            <input id="lg-pass2" className="input" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} maxLength={72} required />
          </div>
        ) : null}
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !user.trim() || !pass}>
          {busy ? 'Chwileczkę…' : mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
        </button>
        <button
          type="button"
          className="btn btn-quiet btn-block"
          onClick={() => {
            setMode(mode === 'login' ? 'nowe' : 'login');
            setErr(null);
          }}
        >
          {mode === 'login' ? 'Nie masz konta? Załóż konto' : 'Masz już konto? Zaloguj się'}
        </button>
      </form>
    </div>
  );
}
