// Sekcja „Konto” w ustawieniach strony z logowaniem: nazwa, zmiana hasła, wylogowanie.

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Sync } from '../store/sync';
import { AUTH_TEXT, changePassword, signOut, supa, usernameOf } from '../store/supabase';

export function AccountSection() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (!Sync.account) return;
    void supa()
      .auth.getSession()
      .then(({ data }) => setSession(data.session));
  }, []);
  if (!Sync.account || !session) return null;
  const save = async () => {
    const r = await changePassword(pass);
    setMsg(r ? { ok: false, text: AUTH_TEXT[r] } : { ok: true, text: 'Hasło zmienione.' });
    if (!r) {
      setPass('');
      setOpen(false);
    }
  };
  return (
    <section className="stack">
      <h2>Konto</h2>
      <div className="card stack-2">
        <p>
          Zalogowano jako <strong>{usernameOf(session)}</strong>. Plan, czas nauki, korepetycje i wyniki są zapisane na tym koncie.
        </p>
        {open ? (
          <div className="field">
            <label htmlFor="acc-pass">Nowe hasło (co najmniej 8 znaków)</label>
            <input id="acc-pass" className="input" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} maxLength={72} />
            <div className="row">
              <button type="button" className="btn btn-primary btn-sm" disabled={pass.length < 8} onClick={() => void save()}>
                Zapisz hasło
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
                Anuluj
              </button>
            </div>
          </div>
        ) : null}
        {msg ? <p className={msg.ok ? 'small ok-text' : 'error'}>{msg.text}</p> : null}
        <div className="row">
          {!open ? (
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
              Zmień hasło
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={() => void signOut()}>
            Wyloguj się
          </button>
        </div>
      </div>
    </section>
  );
}
