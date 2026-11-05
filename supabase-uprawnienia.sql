-- Uprawnienia według ról JANAS (uruchom PO supabase.sql i PO pierwszym logowaniu szefa).
-- Supabase → SQL Editor → New query → wklej całość → Run.
--
-- Pracownicy (szef, magazynier, pracownik, kierowca): widzą i zmieniają dane firmy.
-- Klient: widzi produkty, listę pracowników (do powiadomień) i TYLKO swoje:
--         profil, koszyk, ulubione, zamówienia, zapytania i powiadomienia.
-- Role w zakładce Użytkownicy może zmieniać tylko szef.

create or replace function public.janas_me() returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.docs
  where col = 'users'
    and lower(data->>'login') = lower(auth.jwt()->>'email')
    and coalesce((data->>'_del')::boolean, false) = false
  limit 1
$$;

create or replace function public.janas_role() returns text
language sql stable security definer set search_path = public as $$ select public.janas_me()->>'role' $$;

create or replace function public.janas_uid() returns text
language sql stable security definer set search_path = public as $$ select public.janas_me()->>'id' $$;

create or replace function public.janas_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.janas_role() in ('szef','magazynier','pracownik','kierowca'), false)
$$;

drop policy if exists "docs_select" on public.docs;
drop policy if exists "docs_insert" on public.docs;
drop policy if exists "docs_update" on public.docs;
drop policy if exists "docs_delete" on public.docs;

-- ODCZYT
create policy "docs_select" on public.docs for select to authenticated using (
  public.janas_staff()
  or col = 'products'
  or (col = 'users' and (coalesce(data->>'role','') <> 'klient'
                         or lower(data->>'login') = lower(auth.jwt()->>'email')))
  or (col in ('carts','favs') and id = public.janas_uid())
  or (col in ('corders','inq') and data->>'uid' = public.janas_uid())
  or (col = 'notifs' and public.janas_uid() in (data->>'uid', data->>'from'))
);

-- DODAWANIE
create policy "docs_insert" on public.docs for insert to authenticated with check (
  (col <> 'users' and public.janas_staff())
  or (col = 'users' and (public.janas_role() = 'szef'
        or (lower(data->>'login') = lower(auth.jwt()->>'email') and data->>'role' = 'klient')))
  or (col in ('carts','favs') and id = public.janas_uid())
  or (col in ('corders','inq') and data->>'uid' = public.janas_uid())
  or (col = 'notifs' and data->>'from' = public.janas_uid())   -- klient powiadamia szefa o zamówieniu
);

-- ZMIANA
create policy "docs_update" on public.docs for update to authenticated
using (
  (col <> 'users' and public.janas_staff())
  or (col = 'users' and (public.janas_role() = 'szef' or lower(data->>'login') = lower(auth.jwt()->>'email')))
  or (col in ('carts','favs') and id = public.janas_uid())
  or (col in ('corders','inq','notifs') and data->>'uid' = public.janas_uid())
)
with check (
  (col <> 'users' and public.janas_staff())
  or (col = 'users' and (public.janas_role() = 'szef' or lower(data->>'login') = lower(auth.jwt()->>'email')))
  or (col in ('carts','favs') and id = public.janas_uid())
  or (col in ('corders','inq','notifs') and data->>'uid' = public.janas_uid())
);

-- USUWANIE
create policy "docs_delete" on public.docs for delete to authenticated using (
  (col <> 'users' and public.janas_staff())
  or (col = 'users' and public.janas_role() = 'szef')
  or (col in ('carts','favs') and id = public.janas_uid())
);

-- Tylko szef może zmienić komuś rolę (także sobie nikt inny nie nada roli pracownika).
create or replace function public.janas_guard_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.col = 'users'
     and (new.data->>'role') is distinct from (old.data->>'role')
     and coalesce(public.janas_role(), '') <> 'szef' then
    raise exception 'Tylko szef może zmieniać role';
  end if;
  return new;
end $$;

drop trigger if exists janas_guard_role on public.docs;
create trigger janas_guard_role before update on public.docs
  for each row execute function public.janas_guard_role();
