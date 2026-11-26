// 4. Zadanie zamknięte, 5. zadanie otwarte, 12. własne zadanie z zadania.info.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// przycisk odsłaniający rozwiązanie CKE (przy zadaniach ocenianych automatycznie: „Nie wiem – pokaż rozwiązanie”)
const REVEAL = /^(Pokaż rozwiązanie CKE|Nie wiem – pokaż rozwiązanie)$/;
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, clickVisible, waitReady, seedState, softChecks,
  rawTask, tid, url, expectedClosed, imagesLoaded, sleep, answerClosed, shot,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

/** Aktywne wyniki (bez cofniętych). */
function activeResults(st) {
  const undone = new Set(st.events.filter((e) => e.k === 'c').map((e) => e.target));
  return st.events.filter((e) => e.k === 'w' && !undone.has(e.id));
}

// Przypadki: [arkusz, nr, wybór (null = poprawne), opis]
const CASES = [
  ['MMAP-P0-100-2505', '1', null, 'A–D poprawnie'],
  ['MMAP-P0-100-2505', '2', { 2: 'A' }, 'A–D błędnie'],
  ['MMAP-P0-100-2505', '14.2', null, 'P/F dwie pozycje (all) poprawnie'],
  ['MMAP-P0-100-2505', '21', { '21.1': 'F', '21.2': 'F' }, 'P/F (all) jedna błędna → 0'],
  ['MJAP-P0-100-2505', '2', { '2.1': 'B', '2.2': 'C', '2.3': 'B', '2.4': 'A', '2.5': 'A', '2.6': 'A' }, 'angielski 6 pozycji (each), część błędnie'],
  ['MPOP-P1-P2-2605', 'A1.1', { 'A1.1.1': 'P', 'A1.1.2': 'P', 'A1.1.3': 'F' }, 'P/F trzy pozycje, punktacja mapą {"2":1,"3":2}'],
  ['MMAP-P0-100-2305', '11', { '11.1': 'A', '11.2': 'C' }, 'wybór dwóch liter (alfabetycznie), jedna poprawna'],
];

bothDevices(test, '4. Zadanie zamknięte: sprawdzanie wg exams.json', async (t, device, use) => {
  const env = await openApp(device, { state: seedState(), hash: '#start' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  for (const [examId, nr, wanted, desc] of CASES) {
    const raw = rawTask(examId, nr);
    const id = tid(examId, nr);
    const choice = wanted ? Object.fromEntries(raw.answer.items.map((it) => [it.id, wanted[it.id] ?? it.correct])) : Object.fromEntries(raw.answer.items.map((it) => [it.id, it.correct]));
    const exp = expectedClosed(raw, choice);
    await sc.step(`${id} (${desc})`, async () => {
      await page.goto(url(`#zadanie-${id}`));
      await waitReady(page);
      const imgs = await imagesLoaded(page);
      sc.ok(imgs.length > 0 && imgs.every((i) => i.w > 0), `${id}: obraz zadania wczytany (naturalWidth: ${imgs.map((i) => i.w).join(',')})`);
      const check = page.getByRole('button', { name: 'Sprawdź', exact: true });
      sc.ok(await check.filter({ visible: true }).first().isDisabled(), `${id}: „Sprawdź” nieaktywne przed wyborem`);
      await answerClosed(page, raw, choice);
      await clickVisible(page, 'Sprawdź');
      const fb = page.locator('.feedback');
      await fb.waitFor();
      const text = await fb.innerText();
      sc.ok(text.includes(`Wynik: ${exp} z ${raw.maxPoints} pkt.`), `${id}: oczekiwano „Wynik: ${exp} z ${raw.maxPoints} pkt.”, jest „${text.trim()}”`);
      const allOk = raw.answer.items.every((it) => choice[it.id] === it.correct);
      sc.ok((await fb.getAttribute('class')).includes(allOk ? 'ok' : 'bad'), `${id}: kolor komunikatu (${allOk ? 'dobrze' : 'źle'})`);
      if (!allOk) {
        // błędna odpowiedź pokazuje poprawną
        const wrongItems = raw.answer.items.filter((it) => choice[it.id] !== it.correct);
        const isMany = raw.answer.items.every((i) => /alfabetycznie/i.test(i.label ?? ''));
        if (raw.answer.items.length === 1) sc.ok(text.includes(`Poprawna: ${raw.answer.items[0].correct}.`), `${id}: komunikat podaje poprawną odpowiedź`);
        else if (isMany) sc.ok(text.includes(`Poprawne: ${raw.answer.items.map((i) => i.correct).sort().join(', ')}`), `${id}: komunikat podaje poprawne litery`);
        else for (const it of wrongItems) sc.ok(text.includes(`${it.label ?? it.id}: ${it.correct}`), `${id}: komunikat podaje poprawną dla ${it.label}`);
        const should = await page.locator('.abcd .opt.should').allInnerTexts();
        sc.ok(should.length >= 1, `${id}: pole z poprawną odpowiedzią wyróżnione (.should), jest ${should.length}`);
      }
      await sleep(500);
      const res = activeResults(await lsState(page)).filter((e) => e.task === id);
      sc.ok(res.length === 1 && res[0].pts === exp, `${id}: zapisany wynik ${exp} pkt (jest ${res.map((r) => r.pts)})`);
      if (nr === '2' || nr === '14.2') await checkScreen(page, `zadanie-zamkniete-${nr}`);
      // Pokaż rozwiązanie → obraz z zasad oceniania
      await clickVisible(page, 'Pokaż rozwiązanie');
      const odp = await imagesLoaded(page, '.reveal .kartka img');
      sc.ok(odp.length > 0 && odp.every((i) => i.w > 0) && /Zasady oceniania/.test(odp[0].alt), `${id}: obraz z zasad oceniania (alt „${odp[0]?.alt}”, naturalWidth ${odp[0]?.w})`);
      if (nr === '1') await checkScreen(page, 'zadanie-zamkniete-odpowiedz');
    });
  }
  sc.done();
  return env;
}, { timeout: 240_000 });

bothDevices(test, '5. Zadanie otwarte: samoocena i cofnięcie', async (t, device, use) => {
  const env = await openApp(device, { state: seedState(), hash: '#start' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  const id = tid('MMAP-R0-100-2505', '1');
  const raw = rawTask('MMAP-R0-100-2505', '1');
  await page.goto(url(`#zadanie-${id}`));
  await waitReady(page);
  const imgs = await imagesLoaded(page);
  sc.ok(imgs[0]?.w > 0, 'obraz zadania otwartego wczytany');
  const save = page.getByRole('button', { name: 'Zapisz wynik', exact: true }).filter({ visible: true }).first();
  sc.ok(await save.isDisabled(), '„Zapisz wynik” nieaktywne przed pokazaniem odpowiedzi');
  await checkScreen(page, 'zadanie-otwarte');
  await clickVisible(page, REVEAL);
  const odp = await imagesLoaded(page, '.reveal .kartka img');
  sc.ok(odp[0]?.w > 0 && /Zasady oceniania/.test(odp[0].alt), 'obraz z zasad oceniania wczytany');
  const grade = page.getByRole('radiogroup', { name: 'Ile punktów przyznajesz sobie?' });
  const opts = await grade.getByRole('radio').allInnerTexts();
  sc.ok(opts.join(',') === Array.from({ length: raw.maxPoints + 1 }, (_, i) => i).join(','), `punkty 0..${raw.maxPoints} (są: ${opts.join(',')})`);
  await grade.getByRole('radio', { name: '1', exact: true }).click();
  await checkScreen(page, 'zadanie-otwarte-samoocena');
  await clickVisible(page, 'Zapisz wynik');
  await page.getByText(`Zapisano wynik: 1 z ${raw.maxPoints} pkt.`).waitFor();
  await sleep(500);
  let res = activeResults(await lsState(page)).filter((e) => e.task === id);
  sc.ok(res.length === 1 && res[0].pts === 1, `wynik 1 pkt zapisany (jest ${res.map((r) => r.pts)})`);
  // cofnięcie z toastu
  await page.locator('.toast').getByRole('button', { name: 'Cofnij' }).click();
  await page.getByText('Cofnięto wynik.').waitFor();
  await sleep(500);
  res = activeResults(await lsState(page)).filter((e) => e.task === id);
  sc.ok(res.length === 0, `po „Cofnij” w toaście brak aktywnego wyniku (jest ${res.length})`);
  // Po cofnięciu z toastu ekran powinien pozwolić ocenić ponownie (nie pokazywać wyniku jako zapisanego).
  const stillDone = await page.getByRole('button', { name: 'Cofnij wynik' }).count();
  sc.ok(stillDone === 0, `po cofnięciu z toastu ekran nadal pokazuje zapisany wynik („Cofnij wynik” widoczne: ${stillDone})`);
  if (stillDone) await shot(page, 'BLAD-otwarte-cofniecie-z-toastu');
  // drugi zapis i cofnięcie przyciskiem „Cofnij wynik”
  await page.reload();
  await waitReady(page);
  await clickVisible(page, REVEAL);
  await page.getByRole('radiogroup', { name: 'Ile punktów przyznajesz sobie?' }).getByRole('radio', { name: '2', exact: true }).click();
  await clickVisible(page, 'Zapisz wynik');
  await page.getByRole('button', { name: 'Cofnij wynik' }).waitFor();
  await sleep(400);
  res = activeResults(await lsState(page)).filter((e) => e.task === id);
  sc.ok(res.length === 1 && res[0].pts === 2, 'drugi wynik 2 pkt zapisany');
  await page.getByRole('button', { name: 'Cofnij wynik' }).click();
  await sleep(600);
  res = activeResults(await lsState(page)).filter((e) => e.task === id);
  sc.ok(res.length === 0, `po „Cofnij wynik” brak aktywnego wyniku (jest ${res.length})`);
  sc.ok(await page.getByRole('button', { name: REVEAL }).filter({ visible: true }).count() > 0, 'po cofnięciu można rozwiązać ponownie');
  sc.done();
  return env;
});

bothDevices(test, '12. Własne zadanie z zadania.info i wklejonym obrazem', async (t, device, use) => {
  const env = await openApp(device, { state: seedState(), hash: '#zadania-mat-p' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).click();
  const dlg = page.getByRole('dialog', { name: 'Dodaj zadanie' });
  await dlg.waitFor();
  await checkScreen(page, 'dodaj-zadanie');
  // puste zadanie się nie zapisuje
  await dlg.getByRole('button', { name: 'Zapisz zadanie' }).click();
  await dlg.getByText('Dodaj zrzut ekranu albo wklej treść zadania.').waitFor();
  sc.ok(await dlg.getByText('Wybierz liczbę punktów.').isVisible(), 'błąd: brak punktów');
  await sleep(400);
  sc.ok(((await lsState(page))?.stan.userTasks ?? []).length === 0, 'puste zadanie nie zapisało się');
  await checkScreen(page, 'dodaj-zadanie-bledy');
  // link + wklejony obraz
  await dlg.getByLabel('Link do zadania').fill('https://www.zadania.info/d29/1234567');
  await dlg.getByText('Zadanie zadania.info, nr 1234567.').waitFor();
  await dlg.getByRole('button', { name: 'Wklej zrzut ekranu skrótem Ctrl+V' }).click();
  await page.evaluate(async () => {
    const c = document.createElement('canvas');
    c.width = 800;
    c.height = 300;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 800, 300);
    g.fillStyle = '#000';
    g.font = '40px sans-serif';
    g.fillText('Zadanie testowe: oblicz 2 + 2', 40, 150);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'zrzut.png', { type: 'image/png' }));
    const target = document.querySelector('.kartka-ph[role="button"]');
    target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await dlg.getByRole('img', { name: 'Wklejony zrzut ekranu' }).waitFor({ timeout: 5000 });
  await dlg.getByRole('radiogroup', { name: 'Punkty za zadanie' }).getByRole('radio', { name: '2', exact: true }).click();
  await checkScreen(page, 'dodaj-zadanie-wypelnione');
  await dlg.getByRole('button', { name: 'Zapisz zadanie' }).click();
  await page.getByText('Dodano zadanie.').waitFor();
  await sleep(600);
  const st = await lsState(page);
  const u = st.stan.userTasks[0];
  sc.ok(st.stan.userTasks.length === 1, 'zapisano jedno zadanie');
  sc.ok(u?.source === 'zadania.info' && u?.ref === 'nr 1234567' && /zadania\.info\/d29\/1234567/.test(u?.url ?? ''), `źródło i numer zadania (${JSON.stringify(u && { source: u.source, ref: u.ref, url: u.url })})`);
  sc.ok(!!u?.imageId && u.maxPoints === 2 && u.subjectId === 'mat-p', 'obraz, punkty i przedmiot');
  const img = await page.evaluate((k) => localStorage.getItem(`matura2027-v3-obraz-${k}`), u?.imageId);
  sc.ok(img?.startsWith('data:image/jpeg') && img.length * 0.75 <= 150_000, `obraz JPEG ≤ 150 KB w localStorage (${img ? Math.round(img.length * 0.75 / 1024) : 0} KB)`);
  // zadanie otwiera się z obrazem i podpisem
  await page.goto(url(`#zadanie-${u.id}`));
  await waitReady(page);
  const imgs = await imagesLoaded(page);
  sc.ok(imgs[0]?.w > 0, 'zrzut ekranu widoczny w zadaniu');
  const cap = await page.locator('figcaption').first().innerText();
  sc.ok(/Materiał pobrany z portalu zadania\.info, zadanie nr 1234567/.test(cap), `podpis „${cap}”`);
  await checkScreen(page, 'wlasne-zadanie');
  // po odświeżeniu zadanie zostaje
  await page.reload();
  await waitReady(page);
  sc.ok((await imagesLoaded(page))[0]?.w > 0, 'po odświeżeniu obraz własnego zadania jest');
  sc.done();
  return env;
});
