// Składa build z trybu „jeden-plik” w jeden plik dla artefaktu claude.ai:
// bez <!doctype>, <html>, <head>, <body> (platforma owija plik sama), na górze
// tytuł i meta, potem style, #root i skrypt modułu. Font jest w CSS jako data URI.
import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';

const dir = new URL('../dist-jeden-plik/', import.meta.url);
const assetsDir = new URL('assets/', dir);
const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
const js = assets.filter((f) => f.endsWith('.js'));
const css = assets.filter((f) => f.endsWith('.css'));
const other = assets.filter((f) => !f.endsWith('.js') && !f.endsWith('.css'));
if (js.length !== 1 || css.length !== 1 || other.length) {
  console.error(`Błąd: oczekiwano jednego pliku JS i jednego CSS, a jest: ${assets.join(', ')}`);
  process.exit(1);
}
const code = readFileSync(new URL(`assets/${js[0]}`, dir), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(new URL(`assets/${css[0]}`, dir), 'utf8').replace(/<\/style/gi, '<\\/style');
if (!/data:font\/woff2/.test(style)) {
  console.error('Błąd: font nie jest wbudowany w CSS.');
  process.exit(1);
}
const html = `<title>Matura 2027</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>${style}</style>
<div id="root"></div>
<script type="module">${code}</script>
`;
writeFileSync(new URL('matura2027.html', dir), html);
rmSync(assetsDir, { recursive: true, force: true });
const index = new URL('index.html', dir);
if (existsSync(index)) rmSync(index);
console.log(`Zapisano dist-jeden-plik/matura2027.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB).`);
