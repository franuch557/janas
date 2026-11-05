-- Miejsce na zdjęcia produktów (Supabase Storage).
-- Każdy widzi zdjęcia w sklepie, wgrywać mogą tylko pracownicy.
-- Supabase → SQL Editor → New query → wklej → Run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produkty', 'produkty', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "produkty_odczyt"  on storage.objects;
drop policy if exists "produkty_dodaj"   on storage.objects;
drop policy if exists "produkty_zmien"   on storage.objects;
drop policy if exists "produkty_usun"    on storage.objects;

create policy "produkty_odczyt" on storage.objects for select
  using (bucket_id = 'produkty');
create policy "produkty_dodaj" on storage.objects for insert to authenticated
  with check (bucket_id = 'produkty' and public.janas_staff());
create policy "produkty_zmien" on storage.objects for update to authenticated
  using (bucket_id = 'produkty' and public.janas_staff());
create policy "produkty_usun" on storage.objects for delete to authenticated
  using (bucket_id = 'produkty' and public.janas_staff());
