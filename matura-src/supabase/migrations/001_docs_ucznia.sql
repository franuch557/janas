-- Dokumenty ucznia (te same co w capability db artefaktu): stan, wyniki, fiszki, obrazy.
create table public.docs (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  id text not null check (char_length(id) between 1 and 200),
  typ text,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.docs enable row level security;
create policy "docs: własne czytanie" on public.docs for select to authenticated using ((select auth.uid()) = user_id);
create policy "docs: własne dodawanie" on public.docs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "docs: własna zmiana" on public.docs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "docs: własne usuwanie" on public.docs for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.docs add constraint docs_rozmiar check (pg_column_size(data) < 3000000);
alter table public.docs replica identity full;
alter publication supabase_realtime add table public.docs;
