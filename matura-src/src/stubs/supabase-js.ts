// Zaślepka @supabase/supabase-js w wersji jednoplikowej (artefakt): tam dane trzyma capability `db`,
// a kod biblioteki zawiera wywołania niedozwolone w artefakcie (confirm/alert).
export type Session = { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } };
export type SupabaseClient = never;
export function createClient(): never {
  throw new Error('Supabase jest niedostępny w artefakcie');
}
