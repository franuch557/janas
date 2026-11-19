// Składa build z trybu „jeden-plik” w jeden plik HTML: skrypt i style w środku.
// Wynik: dist-jeden-plik/matura2027.html (działa też otwarty bezpośrednio z dysku).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dir = new URL('../dist-jeden-plik/', import.meta.url);
const assets = readdirSync(new URL('assets/', dir));
const js = assets.find((f) => f.endsWith('.js'));
const css = assets.find((f) => f.endsWith('.css'));
if (!js || !css || assets.length !== 2) {
  console.error(`Błąd: oczekiwałem jednego pliku JS i jednego CSS, a jest: ${assets.join(', ')}`);
  process.exit(1);
}
const code = readFileSync(new URL(`assets/${js}`, dir), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(new URL(`assets/${css}`, dir), 'utf8');
const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Matura 2027</title>
<style>${style}</style>
</head>
<body>
<div id="root"></div>
<script type="module">${code}</script>
</body>
</html>
`;
writeFileSync(new URL('matura2027.html', dir), html);
console.log(`Zapisano dist-jeden-plik/matura2027.html (${Math.round(html.length / 1024)} kB).`);
