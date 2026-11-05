-- Klient bez logowania widzi aktualny katalog (ceny i dostępność z bazy).
-- Tylko odczyt produktów – nic innego nie jest widoczne bez logowania.
-- Supabase → SQL Editor → New query → wklej → Run.

drop policy if exists "docs_select_anon_products" on public.docs;
create policy "docs_select_anon_products" on public.docs
  for select to anon using (col = 'products');
