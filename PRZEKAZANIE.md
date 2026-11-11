# Przekazanie: sklep JANAS – stan na 2026-11-11

## Gdzie co jest
- Repozytorium (opublikowane): franuch557/janas, gałąź main → https://franuch557.github.io/janas/ (ostatni commit cc6124a + zmiany wcześniejsze).
- Niezacommitowane w repo: janas/supabase-zamowienia.sql (wyjątek `janas.deleting` dla usuwania konta).
- KOPIA w nowym wyglądzie: gałąź `nowy-wyglad` w repo (NIE opublikowana – Pages publikuje tylko main); wcześniej folder `janas-nowy/` obok repo (index.html, fonts/, img → symlink do janas/img, supabase-usun-konto.sql, supabase-ustawienia.sql).
  Uwaga: folder sesji jest tymczasowy – przed zamknięciem sesji trzeba go zachować (np. gałąź w repo).

## Kopia `janas-nowy` – co zawiera
- Układ wzorowany na Euro Płot (Poppins lokalnie, biały nagłówek z menu, hero foto, czarny pas O nas, oferta 6 kafelków, mozaika „Znajdź inspiracje”, „Co widzisz na zdjęciu?” z punktami, Dlaczego JANAS, pas doradcy, Sklep online, czarna stopka z kolumnami, okrągły telefon).
- Nowy podział produktów (8 grup), „Do czego?” przy kostce, filtry jako przyciski, „Więcej filtrów”.
- Regulamin + wzór odstąpienia, Polityka prywatności, Polityka cookies, baner cookies, zgoda w koszyku, przycisk „Zamawiam z obowiązkiem zapłaty”.
- Dane firmy: PW Produkcja Usługi Krzysztof Janas, NIP 5961587173, REGON 080003513 (CEIDG); płatność na miejscu (gotówka, karta, przelew); FB janascentrumogrodzen, IG janasbezpieczenstwoistyl.
- Usuwanie konta (RPC janas_delete_me), adresy ?p= ?k= ?v=, strona Kontakt i dojazd, pasek komunikatów (kolekcja cfg), prośba o wizytę, sekcja opinii (pusta tablica OPINIE).
- Bez usługi „Układanie kostki” (JANAS nie układa kostki).

## Do zrobienia
1. Zachować kopię (gałąź w repo) – wymaga zgody użytkownika.
2. Decyzja: czy kopia zastępuje główny sklep. Przy publikacji: wpisać datę „Obowiązuje od”, wgrać do prawdziwej bazy (za zgodą): supabase-zamowienia.sql (nowa wersja), supabase-usun-konto.sql, supabase-ustawienia.sql.
3. Usunąć „Układanie kostki” z obecnego sklepu (czeka na zgodę).
4. Później: formularz wyceny, poradniki/FAQ, Messenger, prawdziwe opinie Google (treść od użytkownika).

## Testowanie
- Lokalny Supabase w Dockerze: scratchpad/sbtest (konta *@janas.test, hasło w konta-testowe.txt), start: `npx supabase@2.54.11 start -x studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta,storage-api`.
- Detektor: `janas/.claude/skills/impeccable/scripts/impeccable detect --json <url>`.
