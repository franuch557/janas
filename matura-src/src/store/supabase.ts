// Konta na stronie (poza artefaktem): Supabase Auth z nazwą użytkownika i hasłem
// oraz tabela `docs` z tymi samymi dokumentami ucznia, które artefakt trzyma w capability `db`.
// Klucz publiczny (publishable) może być w kodzie strony: dostęp do danych pilnują reguły RLS.

import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ovbqtprmhjfdksdqqecv.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_HvXUwg3a3PsE6m3iZ2HJ_A_C14SU9d6';
/** Supabase Auth wymaga e-maila: nazwa użytkownika jest zapisana pod tą domeną (bez wysyłania poczty). */
const DOMAIN = 'konto.matura2027.app';

let client: SupabaseClient | null = null;
export function supa(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, storageKey: 'matura2027-sesja' } });
  return client;
}

export const normUser = (u: string) => u.trim().toLowerCase();
export const validUser = (u: string) => /^[a-z0-9][a-z0-9_.-]{2,29}$/.test(normUser(u));
export const userEmail = (u: string) => `${normUser(u)}@${DOMAIN}`;
export const usernameOf = (s: Session | null) => (s?.user.user_metadata?.username as string | undefined) ?? s?.user.email?.split('@')[0] ?? '';

export type AuthError = 'nazwa' | 'haslo' | 'zajeta' | 'zle-dane' | 'siec' | 'serwer';
export const AUTH_TEXT: Record<AuthError, string> = {
  nazwa: 'Nazwa: 3–30 znaków, małe litery, cyfry, kropka, myślnik lub podkreślnik.',
  haslo: 'Hasło musi mieć co najmniej 8 znaków.',
  zajeta: 'Ta nazwa jest zajęta. Wybierz inną albo zaloguj się.',
  'zle-dane': 'Zła nazwa użytkownika albo hasło.',
  siec: 'Brak połączenia z serwerem. Sprawdź internet.',
  serwer: 'Serwer nie odpowiedział poprawnie. Spróbuj za chwilę.',
};

export async function signIn(username: string, password: string): Promise<AuthError | null> {
  if (!validUser(username)) return 'zle-dane';
  try {
    const { error } = await supa().auth.signInWithPassword({ email: userEmail(username), password });
    if (!error) return null;
    return /invalid|credentials/i.test(error.message) ? 'zle-dane' : 'serwer';
  } catch {
    return 'siec';
  }
}

export async function signUp(username: string, password: string): Promise<AuthError | null> {
  if (!validUser(username)) return 'nazwa';
  if (password.length < 8) return 'haslo';
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/rejestracja`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ username: normUser(username), password }),
    });
    const body = (await r.json().catch(() => ({}))) as { error?: AuthError };
    if (!r.ok) return body.error && body.error in AUTH_TEXT ? body.error : 'serwer';
  } catch {
    return 'siec';
  }
  return signIn(username, password);
}

export async function signOut() {
  await supa().auth.signOut();
}

export async function changePassword(password: string): Promise<AuthError | null> {
  if (password.length < 8) return 'haslo';
  try {
    const { error } = await supa().auth.updateUser({ password });
    return error ? 'serwer' : null;
  } catch {
    return 'siec';
  }
}

// ---------- Adapter dokumentów (ten sam interfejs co capability `db` artefaktu) ----------

type Rec = Record<string, unknown>;
type DocSnap = { id: string; exists: boolean; data(): Rec | undefined };
type QuerySnap = { docs: DocSnap[]; metadata: { fromCache: boolean; hasPendingWrites: boolean } };
const snap = (id: string, data: Rec | undefined): DocSnap => ({ id, exists: data !== undefined, data: () => data });
const lastSeg = (path: string) => path.split('/').pop()!;
const err = (e: { message?: string; code?: string } | null) => ({ code: e?.code === '23514' ? 'invalid_argument' : 'unavailable', message: e?.message ?? 'błąd' });

export function supaDb(uid: string) {
  const sb = supa();
  const fetchAll = async (excludeTyp: string | null): Promise<QuerySnap> => {
    let q = sb.from('docs').select('id,data');
    if (excludeTyp) q = q.or(`typ.is.null,typ.neq.${excludeTyp}`);
    const { data, error } = await q;
    if (error) throw err(error);
    return { docs: (data ?? []).map((r) => snap(r.id as string, r.data as Rec)), metadata: { fromCache: false, hasPendingWrites: false } };
  };
  const query = (exclude: string | null) => ({
    where(_f: string, op: string, v: unknown) {
      return query(op === '!=' ? String(v) : exclude);
    },
    get: () => fetchAll(exclude),
    onSnapshot(next: (s: QuerySnap) => void, onErr?: (e: { code?: string; message?: string }) => void) {
      let alive = true;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const load = () =>
        fetchAll(exclude).then(
          (s) => alive && next(s),
          (e) => alive && onErr?.(e),
        );
      void load();
      // zmiany z innego urządzenia: po każdej zmianie pobieram kolekcję ponownie (zbijając serie)
      const ch = sb
        .channel(`docs-${uid}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `user_id=eq.${uid}` }, () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void load(), 400);
        })
        .subscribe();
      return () => {
        alive = false;
        if (timer) clearTimeout(timer);
        void sb.removeChannel(ch);
      };
    },
  });
  return {
    doc(path: string) {
      const id = lastSeg(path);
      return {
        async get() {
          const { data, error } = await sb.from('docs').select('data').eq('id', id).maybeSingle();
          if (error) throw err(error);
          return snap(id, (data?.data as Rec | undefined) ?? undefined);
        },
        async set(d: Rec) {
          const { error } = await sb.from('docs').upsert({ user_id: uid, id, typ: typeof d.typ === 'string' ? d.typ : null, data: d, updated_at: new Date().toISOString() });
          if (error) throw err(error);
        },
        async delete() {
          const { error } = await sb.from('docs').delete().eq('id', id);
          if (error) throw err(error);
        },
      };
    },
    collection: (_path: string) => query(null),
  };
}
