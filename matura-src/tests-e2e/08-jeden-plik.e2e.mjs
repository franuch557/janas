// Artefakt: dist-jeden-plik/matura2027.html owinięty w <!doctype html>…, z katalogiem cke/ obok
// (serwer statyczny). Sprawdzenie startu i zadania z obrazem.
// Budowanie: npm run build:jeden-plik (pomijane, gdy E2E_SKIP_BUILD=1).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import path from 'node:path';
import {
  ROOT, closeBrowser, openApp, checkScreen, clickVisible, softChecks, diagnosedState, imagesLoaded, sleep, reportScreens, shot, tid, rawTask, answerClosed, waitReady,
} from './helpers.mjs';

const FILE = path.join(ROOT, 'dist-jeden-plik/matura2027.html');
let server;
let base;

before(async () => {
  if (!process.env.E2E_SKIP_BUILD) execSync('npm run build:jeden-plik', { cwd: ROOT, stdio: 'pipe', timeout: 300_000 });
  const html = readFileSync(FILE, 'utf8');
  const page = `<!doctype html><html><head><meta charset=utf8></head><body>${html}</body></html>`;
  const types = { '.json': 'application/json', '.mp3': 'audio/mpeg' };
  server = createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/' || u === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(req.method === 'HEAD' ? undefined : page);
    }
    if (u.startsWith('/cke/')) {
      const f = path.join(ROOT, 'public', u);
      if (!f.startsWith(path.join(ROOT, 'public/cke')) || !existsSync(f)) {
        res.writeHead(404);
        return res.end();
      }
      const size = statSync(f).size;
      const type = types[path.extname(f)] ?? 'application/octet-stream';
      const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
      if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Number(range[2]) : size - 1;
        res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1 });
        if (req.method === 'HEAD') return res.end();
        return createReadStream(f, { start, end }).pipe(res);
      }
      res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes' });
      if (req.method === 'HEAD') return res.end();
      return createReadStream(f).pipe(res);
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
});
after(async () => {
  await closeBrowser();
  await new Promise((r) => server?.close(r));
});

test('Artefakt jeden plik: budowa i zawartość', () => {
  const html = readFileSync(FILE, 'utf8');
  const kb = Math.round(statSync(FILE).size / 1024);
  assert.ok(html.startsWith('<title>Matura 2027</title>'), 'plik zaczyna się od <title>');
  assert.ok(html.includes('<meta name="claude:viewport-fit-sides" content="cover">'), 'meta claude:viewport-fit-sides');
  assert.ok(!/<!doctype|<html|<head|<body/i.test(html.slice(0, 2000)), 'bez doctype/html/head/body na początku');
  assert.ok(!/<script[^>]+src=|<link[^>]+href="(?!data:)/i.test(html), 'bez zewnętrznych skryptów i stylów');
  assert.ok(!/\balert\(|\bconfirm\(|window\.print\(/.test(html), 'bez alert/confirm/print');
  assert.ok(kb < 16 * 1024, `rozmiar ${kb} KB < 16 MB`);
});

for (const device of ['telefon', 'komputer']) {
  test(`Artefakt jeden plik: start i zadanie z obrazem [${device}]`, { timeout: 120_000 }, async (t) => {
    const sc = softChecks(t);
    const env = await openApp(device, { state: diagnosedState(), go: false });
    const { page, ctx } = env;
    try {
      const failed = [];
      // HEAD (sprawdzanie pakietów) i mp3 (odtwarzacz ponawia żądanie z Range) Chromium zgłasza jako ERR_ABORTED przy poprawnej odpowiedzi, więc pomijam.
      page.on('requestfailed', (r) => r.method() !== 'HEAD' && !/\.mp3$/.test(r.url()) && failed.push(`${r.method()} ${r.url().split('/').pop()} ${r.failure()?.errorText}`));
      page.on('response', (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));
      await page.goto(`${base}#start`);
      await waitReady(page);
      await page.locator('section.summary').waitFor({ timeout: 15000 });
      sc.ok(await page.locator('section[aria-labelledby="na-dzis"] .task-card').count() > 0, 'start: plan na dziś z zadaniami (pakiety cke/ wczytane)');
      sc.ok(!(await page.getByText('Nie udało się wczytać zadań z arkuszy CKE.').count()), 'start: bez banera błędu pakietów');
      await checkScreen(page, 'artefakt-start');
      const id = tid('MMAP-P0-100-2505', '1');
      await page.evaluate((h) => (location.hash = h), `#zadanie-${id}`);
      await waitReady(page);
      const imgs = await imagesLoaded(page);
      sc.ok(imgs[0]?.w > 0, `zadanie: obraz z cke/ wczytany (naturalWidth ${imgs[0]?.w})`);
      await answerClosed(page, rawTask('MMAP-P0-100-2505', '1'), { 1: 'B' });
      await clickVisible(page, 'Sprawdź');
      sc.ok((await page.locator('.feedback').innerText()).includes('Wynik: 1 z 1 pkt.'), 'zadanie: sprawdzanie działa');
      await clickVisible(page, 'Pokaż rozwiązanie');
      const odp = await imagesLoaded(page, '.reveal .kartka img');
      sc.ok(odp[0]?.w > 0, 'zadanie: obraz z zasad oceniania');
      await checkScreen(page, 'artefakt-zadanie');
      // nagranie
      await page.evaluate((h) => (location.hash = h), `#zadanie-${tid('MJAP-P0-100-2505', '1')}`);
      await waitReady(page);
      await page.getByRole('button', { name: 'Odtwórz nagranie' }).click();
      await sleep(1500);
      const a = await page.$eval('.player audio', (x) => ({ src: x.currentSrc, rs: x.readyState, t: x.currentTime, err: x.error?.code ?? null }));
      sc.ok(a.err == null && a.rs >= 1 && a.t >= 33, `artefakt: nagranie gra od 33,5 s (${JSON.stringify(a)})`);
      // font wbudowany
      const font = await page.evaluate(() => document.fonts.check('16px "Atkinson Hyperlegible Next Variable"'));
      sc.ok(font, 'font Atkinson Hyperlegible Next dostępny');
      sc.ok(failed.length === 0, `brak nieudanych żądań (${failed.slice(0, 5).join(', ')})`);
      if (sc.fails.length) await shot(page, 'BLAD-artefakt');
      reportScreens(page, t);
    } finally {
      await ctx.close();
    }
    sc.done();
  });
}
