-- Ochrona zamówień klientów (uruchom PO supabase-uprawnienia.sql).
-- Supabase → SQL Editor → New query → wklej całość → Run.
--
-- Klient może zmienić swoje zamówienie TYLKO tak, jak pozwala sklep:
--   złożyć nowe (status „nowe”, bez kosztu dowozu i akceptacji),
--   anulować nowe, zaakceptować wyceniony koszt dowozu,
--   zmienić dowóz na odbiór osobisty, oznaczyć prośbę o opinię jako obejrzaną.
-- Statusy, pozycje, ceny i koszt dowozu zmienia wyłącznie personel.

create or replace function public.janas_guard_corders() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb;
  n jsonb := new.data;
  free text[] := array['status','cancel','dacc','deliv','addr','dcost','reviewed','updated'];
  s numeric;
begin
  if new.col <> 'corders' or public.janas_staff() then return new; end if;

  if tg_op = 'INSERT' then
    -- upsert istniejącego rekordu sprawdza gałąź UPDATE
    if exists (select 1 from public.docs d where d.col = new.col and d.id = new.id) then return new; end if;
    if coalesce(n->>'status', 'nowe') <> 'nowe' then raise exception 'Nowe zamówienie musi mieć status „nowe”'; end if;
    if coalesce(n->>'dacc', 'null') = 'true' then raise exception 'Koszt dowozu akceptuje się po wycenie'; end if;
    if n->>'deliv' = 'dowoz' and jsonb_typeof(n->'dcost') = 'number' then raise exception 'Koszt dowozu ustala sklep'; end if;
    if coalesce(n->>'assignee', '') <> '' or n ? 'plan' then raise exception 'Zlecenia ustala sklep'; end if;
    select coalesce(sum((i->>'qty')::numeric * (i->>'price')::numeric), 0) into s from jsonb_array_elements(coalesce(n->'items', '[]'::jsonb)) i;
    if abs(s - coalesce((n->>'total')::numeric, 0)) > 0.05 then raise exception 'Suma zamówienia się nie zgadza'; end if;
    return new;
  end if;

  o := old.data;
  if (o - free) is distinct from (n - free) then raise exception 'Klient nie może zmieniać pozycji ani danych zamówienia'; end if;
  if (n->>'status') is distinct from (o->>'status') then
    if not (coalesce(o->>'status', 'nowe') = 'nowe' and n->>'status' = 'anulowane') then
      raise exception 'Klient może tylko anulować nowe zamówienie';
    end if;
  end if;
  if (n->'cancel') is distinct from (o->'cancel') and n->>'status' <> 'anulowane' then raise exception 'Niedozwolona zmiana'; end if;
  if (n->>'dacc') is distinct from (o->>'dacc') then
    if not (n->>'dacc' = 'true' and jsonb_typeof(o->'dcost') = 'number' and coalesce(o->>'status', 'nowe') = 'nowe')
       and not (n->>'deliv' = 'odbior' and o->>'deliv' = 'dowoz') then
      raise exception 'Koszt dowozu można zaakceptować dopiero po wycenie';
    end if;
  end if;
  if (n->>'deliv') is distinct from (o->>'deliv') then
    if not (o->>'deliv' = 'dowoz' and n->>'deliv' = 'odbior' and coalesce(o->>'status', 'nowe') = 'nowe') then
      raise exception 'Można tylko zmienić dowóz na odbiór w nowym zamówieniu';
    end if;
  end if;
  if (n->'dcost') is distinct from (o->'dcost') and not (n->>'deliv' = 'odbior' and coalesce((n->>'dcost')::numeric, 0) = 0) then
    raise exception 'Koszt dowozu ustala sklep';
  end if;
  if (n->>'addr') is distinct from (o->>'addr') and not (n->>'deliv' = 'odbior' and coalesce(n->>'addr', '') = '') then
    raise exception 'Niedozwolona zmiana adresu';
  end if;
  if (n->'reviewed') is distinct from (o->'reviewed') and n->>'reviewed' <> 'true' then raise exception 'Niedozwolona zmiana'; end if;
  return new;
end $$;

drop trigger if exists janas_guard_corders on public.docs;
create trigger janas_guard_corders before insert or update on public.docs
  for each row execute function public.janas_guard_corders();
