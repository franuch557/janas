// 14. Funkcje z Claude'em (atrapa capability sample): sprawdzanie zadania otwartego
// (wpisany wynik i zdjęcie), wyjaśnienia, ocena wypracowania, fiszki, tryb 5 minut.
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, clickVisible, waitReady, diagnosedState, softChecks,
  tid, url, imagesLoaded, sleep, shot, rawTask, answerClosed,
} from './helpers.mjs';
import { sampleScript } from './fake-sample.mjs';

before(ensureServer);
after(closeBrowser);

const withSample = { initScripts: [{ fn: sampleScript }] };
const calls = (page) => page.evaluate(() => window.__sampleCalls ?? []);

// mały PNG wygenerowany w Node (zdjęcie „z kartki”)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVQI12P4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

bothDevices(test, '14a. Zadanie otwarte: sprawdzenie przez Claude’a (wynik i zdjęcie)', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#start', ...withSample });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  const id = tid('MMAP-R0-100-2505', '1');
  await page.goto(url(`#zadanie-${id}`));
  await waitReady(page);
  await imagesLoaded(page);
  await page.getByLabel('Twój wynik lub kluczowe kroki').fill('k = 1,25, więc wzrost o 25%');
  await checkScreen(page, 'claude-otwarte-przed');
  await page.getByRole('button', { name: 'Sprawdź z kluczem' }).click();
  await page.getByText('Częściowo: 1 z 2 pkt').waitFor({ timeout: 8000 });
  const odp = await imagesLoaded(page, '.reveal .kartka img');
  sc.ok(odp[0]?.w > 0 && /Zasady oceniania/.test(odp[0].alt), 'po sprawdzeniu widać obraz klucza z zasad oceniania');
  const radio = page.getByRole('radiogroup', { name: 'Ile punktów przyznajesz sobie?' }).getByRole('radio', { name: '1', exact: true });
  sc.ok((await radio.getAttribute('aria-checked')) === 'true', 'punkty z oceny Claude’a wpisane w samoocenę');
  const c1 = await calls(page);
  sc.ok(c1.at(-1)?.typ === 'ocena' && c1.at(-1)?.images >= 2, `wywołanie oceny z obrazem zadania i klucza (obrazów: ${c1.at(-1)?.images})`);
  await checkScreen(page, 'claude-otwarte-ocena');
  await clickVisible(page, 'Zapisz wynik');
  await sleep(500);
  const st = await lsState(page);
  const ev = st.events.filter((e) => e.k === 'w' && e.task === id).at(-1);
  sc.ok(ev?.by === 'claude' && /błąd w obliczeniach/.test(ev?.feedback ?? '') && ev?.pts === 1, `zdarzenie wyniku z oceną Claude’a (${JSON.stringify(ev && { by: ev.by, pts: ev.pts })})`);
  sc.ok(st.memory.some((m) => /procentu/.test(m.note)), 'błąd z oceny trafił do pamięci');

  // zdjęcie rozwiązania
  const id2 = tid('MMAP-R0-100-2405', '5');
  await page.goto(url(`#zadanie-${id2}`));
  await waitReady(page);
  await imagesLoaded(page);
  await page.locator('input[type="file"][aria-label="Zdjęcie rozwiązania z kartki"]').setInputFiles({ name: 'kartka.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('img', { name: 'Zdjęcie rozwiązania' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Sprawdź z kluczem' }).click();
  await page.getByText(/Częściowo: 1 z \d+ pkt/).waitFor({ timeout: 8000 });
  const c2 = await calls(page);
  sc.ok(c2.at(-1)?.images >= 3, `zdjęcie wysłane razem z zadaniem i kluczem (obrazów: ${c2.at(-1)?.images})`);
  await checkScreen(page, 'claude-otwarte-zdjecie');
  sc.done();
  return env;
});

bothDevices(test, '14b. Wyjaśnienie: podpowiedź, pełne rozwiązanie, dopytanie', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#start', ...withSample });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  const raw = rawTask('MMAP-P0-100-2505', '1');
  const id = tid('MMAP-P0-100-2505', '1');
  await page.goto(url(`#zadanie-${id}`));
  await waitReady(page);
  await answerClosed(page, raw, { 1: 'A' });
  await clickVisible(page, 'Sprawdź');
  await page.getByRole('button', { name: 'Wyjaśnij' }).click();
  await page.getByText('Podpowiedź', { exact: true }).waitFor({ timeout: 8000 });
  sc.ok((await page.locator('.math-text .katex').count()) > 0, 'wzory w podpowiedzi wyrenderowane (KaTeX)');
  await page.getByRole('button', { name: 'Pokaż pełne rozwiązanie' }).click();
  await page.getByText('Pełne rozwiązanie', { exact: true }).waitFor({ timeout: 8000 });
  await page.getByLabel('Dopytaj').fill('Dlaczego 25%?');
  await page.getByRole('button', { name: 'Wyślij' }).click();
  await page.locator('.chat-turn.assistant').first().waitFor({ timeout: 8000 });
  await checkScreen(page, 'claude-wyjasnienie');
  const n = (await calls(page)).length;
  const typs = (await calls(page)).map((c) => c.typ);
  sc.ok(typs.includes('podpowiedz') && typs.includes('rozwiazanie') && typs.includes('dopytaj'), `wywołania: ${typs.join(', ')}`);
  sc.ok((await calls(page)).find((c) => c.typ === 'dopytaj')?.cache === false, 'dopytanie bez pamięci podręcznej (cache: false)');
  await sleep(500);
  sc.ok(!!(await lsState(page)).explanations[id]?.full, 'wyjaśnienie zapisane');
  await page.reload();
  await waitReady(page);
  await page.getByText('Pełne rozwiązanie', { exact: true }).waitFor({ timeout: 5000 });
  sc.ok((await calls(page)).length === 0 && n > 0, 'po odświeżeniu wyjaśnienie jest z zapisu, bez nowego wywołania');
  sc.done();
  return env;
});

bothDevices(test, '14c. Wypracowanie: ocena przez Claude’a', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: `#wypracowanie-${tid('MPOP-P1-P2-2505', 'A2.1')}`, ...withSample });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.locator('textarea#essay').fill('Nadzieja pomaga człowiekowi przetrwać trudne chwile. '.repeat(40));
  await sleep(1200);
  if (device === 'telefon') await page.getByRole('radiogroup', { name: 'Widok' }).getByRole('radio', { name: 'Ocena', exact: true }).click();
  else await page.getByRole('button', { name: 'Oceń tekst' }).click();
  await page.getByRole('button', { name: 'Oceń z Claude’em' }).click();
  await page.getByText('Wskazówki').waitFor({ timeout: 8000 });
  const c = (await calls(page)).at(-1);
  sc.ok(c?.typ === 'wypracowanie' && c?.tier === 'complex' && c?.images >= 1, `ocena wypracowania modelem complex z obrazem tematu (${JSON.stringify(c)})`);
  await checkScreen(page, 'claude-wypracowanie');
  const save = page.getByRole('button', { name: 'Zapisz ocenę' });
  sc.ok(await save.isEnabled(), 'po ocenie Claude’a wszystkie kryteria wybrane');
  await save.click();
  await sleep(600);
  const st = await lsState(page);
  sc.ok(st.essays[0]?.by === 'claude', `zapis wypracowania ze źródłem oceny (${st.essays[0]?.by})`);
  sc.done();
  return env;
});

bothDevices(test, '14d. Fiszki i tryb 5 minut', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#start', ...withSample });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.goto(url(`#zadanie-${tid('MJAP-P0-100-2505', '4')}`));
  await waitReady(page);
  await page.getByRole('button', { name: 'Utwórz fiszki z tego zadania' }).click();
  await page.getByText(/Dodano fiszki: 12\./).waitFor({ timeout: 8000 });
  await page.goto(url('#fiszki'));
  await waitReady(page);
  await checkScreen(page, 'fiszki');
  await page.getByRole('button', { name: /^Powtórz \(\d+\)$/ }).click();
  for (let i = 0; i < 12; i++) {
    await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
    if (i === 0) await checkScreen(page, 'fiszki-odpowiedz');
    await page.getByRole('button', { name: i % 3 ? 'Umiem' : 'Nie umiem', exact: true }).click();
  }
  await page.getByText(/Gotowe\. Powtórzono: 12 fiszek\./).waitFor();
  await sleep(400);
  let st = await lsState(page);
  sc.ok(st.cards.length === 12 && st.cards.every((c) => c.reviews === 1), 'fiszki powtórzone');
  sc.ok(st.events.some((e) => e.k === 'o' && e.ref === 'f:2026-11-23'), 'pozycja „Fiszki” w planie odhaczona');
  // tryb 5 minut
  await page.goto(url('#start'));
  await waitReady(page);
  await page.getByRole('button', { name: '5 minut', exact: true }).click();
  await page.waitForURL(/#piec-minut/);
  await checkScreen(page, 'piec-minut');
  await sleep(600);
  const before = (await lsState(page)).events.filter((e) => e.k === 'w').length;
  for (let i = 0; i < 3; i++) {
    await page.getByText(`Zadanie ${i + 1} z 3`).waitFor({ timeout: 5000 });
    const first = page.locator('.abcd [role="radio"], .abcd [role="checkbox"]').first();
    await first.click();
    const groups = page.locator('.abcd [role="radiogroup"]');
    for (let g = 1; g < (await groups.count()); g++) await groups.nth(g).locator('[role="radio"]').first().click();
    const boxes = page.locator('.abcd [role="checkbox"]');
    if ((await boxes.count()) > 1) await boxes.nth(1).click();
    await page.getByRole('button', { name: 'Sprawdź', exact: true }).click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
  }
  // fiszki w trybie 5 minut (karty z jutrzejszym terminem też się nadają)
  for (let i = 0; i < 3 && (await page.getByRole('button', { name: 'Pokaż odpowiedź' }).count()); i++) {
    await page.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
    await page.getByRole('button', { name: 'Umiem', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Zakończ', exact: true }).waitFor({ timeout: 5000 });
  await checkScreen(page, 'piec-minut-koniec');
  await sleep(600);
  st = await lsState(page);
  sc.ok(st.events.filter((e) => e.k === 'w').length - before === 3, 'trzy wyniki z trybu 5 minut');
  if (sc.fails.length) await shot(page, 'BLAD-fiszki');
  sc.done();
  return env;
});
