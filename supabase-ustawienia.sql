-- Ustawienia strony (np. pasek komunikatów), które ustawia szef i widzą wszyscy, także goście.
-- Uruchom PO supabase-uprawnienia.sql. Zapis: tylko personel (obecna reguła docs_insert/docs_update).
drop policy if exists "docs_select_cfg_anon" on public.docs;
create policy "docs_select_cfg_anon" on public.docs for select to anon using (col = 'cfg');
drop policy if exists "docs_select_cfg_auth" on public.docs;
create policy "docs_select_cfg_auth" on public.docs for select to authenticated using (col = 'cfg');
