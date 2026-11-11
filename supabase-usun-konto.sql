-- Usunięcie konta przez klienta (uruchom PO supabase-uprawnienia.sql i PO aktualnym supabase-zamowienia.sql).
-- Usuwa logowanie, profil, koszyk, ulubione, powiadomienia i zapytania.
-- Zamówienia zostają bez telefonu i adresu (obowiązek przechowywania dokumentów sprzedaży).
create or replace function public.janas_delete_me() returns void
language plpgsql security definer set search_path = public as $$
declare u text := public.janas_uid();
begin
  if u is null then raise exception 'Nie znaleziono konta'; end if;
  if public.janas_staff() then raise exception 'Konto pracownika usuwa szef w zakładce Użytkownicy'; end if;
  if exists (select 1 from docs where col='corders' and data->>'uid'=u
             and coalesce(data->>'status','nowe') in ('nowe','zlecone','w_kompletacji','skompletowane','zaladowane','w_drodze')) then
    raise exception 'Masz zamówienie w realizacji – konto można usunąć po jego zakończeniu';
  end if;
  perform set_config('janas.deleting', '1', true);
  update docs set data = data - 'phone' - 'addr' where col='corders' and data->>'uid'=u;
  delete from docs where col in ('carts','favs') and id=u;
  delete from docs where col='notifs' and data->>'uid'=u;
  delete from docs where col='inq' and data->>'uid'=u;
  update docs set data = jsonb_build_object('id',u,'name','Konto usunięte','role','klient','login','usuniete-'||u,'_del',true) where col='users' and id=u;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.janas_delete_me() from public;
grant execute on function public.janas_delete_me() to authenticated;
