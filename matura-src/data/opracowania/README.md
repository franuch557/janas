# Opracowania lektur (źródło zakładki „Lektury”)

- `01-…md`–`11-…md` – opracowania z osobnego czatu (pliki pobrane przez użytkownika; 23.11.2026 sprawdzone merytorycznie i poprawione: m.in. od nowa „Odprawa posłów greckich”, „Dziady” cz. II i III, „Zemsta”, „Antygona w Nowym Jorku”; poprawione fabuły „Pana Tadeusza”, „Balladyny”, „Wesela”, „Przedwiośnia”, „Szewców”, „Lalki”, „Skąpca”, „Dżumy”, „Roku 1984”, „Małej apokalipsy”, „Profesora Andrewsa” i daty). Mają pierwszeństwo.
- `z-*.md` – opracowania zastępcze dla lektur obowiązkowych, których pliki czatu nie omawiają (ze znacznikiem `<!-- id: … -->`). `z-dodatki.md` dopisuje sekcje do opracowań z czatu (`<!-- dodatek -->`), np. treny IX–XI.
- Po zmianie plików: `node scripts/opracowania-import.mjs` → `data/lektury/<id>.json` i `data/lektury/epoki-opisy.json`. Skrypt zgłasza lektury bez opracowania.
- Lista lektur obowiązkowych jest w `data/lektury/index.json` (rozporządzenie z 28.06.2024). Lektury z plików czatu spoza tej listy mają `obowiazkowa: false` i oznaczenie w aplikacji.
