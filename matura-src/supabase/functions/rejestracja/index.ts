// Rejestracja konta nazwą użytkownika i hasłem (bez e-maila).
// Supabase Auth wymaga adresu e-mail, więc nazwa jest zapisana jako <nazwa>@konto.matura2027.app;
// konto jest od razu potwierdzone i żaden e-mail nie jest wysyłany.
// Wdrożona w projekcie Supabase „matura-2027” z verify_jwt = false (sama sprawdza dane).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const DOMAIN = "konto.matura2027.app";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "metoda" }, 405);
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "dane" }, 400);
  }
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(username)) return json({ error: "nazwa" }, 400);
  if (password.length < 8 || password.length > 72) return json({ error: "haslo" }, 400);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.createUser({
    email: `${username}@${DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    const taken = /already|registered|exists/i.test(error.message);
    return json({ error: taken ? "zajeta" : "serwer" }, taken ? 409 : 500);
  }
  return json({ ok: true });
});
