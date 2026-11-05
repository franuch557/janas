-- Wspólna baza dla sklepu i magazynu JANAS.
-- Uruchom raz: Supabase → SQL Editor → New query → wklej całość → Run.

create table if not exists public.docs (
  col        text        not null,   -- kolekcja: users, products, orders, corders, carts, ...
  id         text        not null,   -- id rekordu w aplikacji
  data       jsonb       not null,   -- treść rekordu
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

-- Dostęp tylko dla zalogowanych (anonimowy internet nie widzi niczego).
alter table public.docs enable row level security;

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;

create policy "docs_select" on public.docs for select to authenticated using (true);
create policy "docs_insert" on public.docs for insert to authenticated with check (true);
create policy "docs_update" on public.docs for update to authenticated using (true) with check (true);
create policy "docs_delete" on public.docs for delete to authenticated using (true);

-- Zmiany na żywo (zamówienie klienta od razu widzi magazyn i szef).
alter table public.docs replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null;
end $$;
