// 6. Plan: zamiana, usunięcie z cofnięciem, przeniesienie na jutro, trwałość po odświeżeniu.
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, waitReady, seedState, diagnosedState, softChecks, url, sleep, TODAY, shot,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

const TOMORROW = '2026-11-24';

/** Lista pozycji dnia na ekranie Start: tytuł + źródło (np. „CKE 2024, maj, zad. 5”). */
async function startItems(page) {
  return page.locator('section[aria-labelledby="na-dzis"] .task-card').evaluateAll((cards) =>
    cards.map((c) => c.querySelector('.meta')?.innerText.replace(/\s+/g, ' ').trim() + ' | ' + c.querySelector('.title')?.innerText.trim()),
  );
}

async function cardMenu(page, index, action) {
  const card = page.locator('section[aria-labelledby="na-dzis"] .task-card').nth(index);
  await card.getByRole('button', { name: 'Więcej działań' }).click();
  await card.getByRole('menuitem', { name: action }).click();
}

/** Indeks pierwszej karty z zadaniem (ma „Zamień na inne” w menu). */
async function firstTaskCard(page, skip = 0) {
  const cards = page.locator('section[aria-labelledby="na-dzis"] .task-card');
  const n = await cards.count();
  let seen = 0;
  for (let i = 0; i < n; i++) {
    const txt = await cards.nth(i).innerText();
    if (/(zamknięte|otwarte|wypracowanie|wypowiedź), \d+ pkt/.test(txt) && !/zrobione/.test(txt)) {
      if (seen++ === skip) return i;
    }
  }
  return -1;
}

bothDevices(test, '6. Plan: zmiany i trwałość', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#start' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.locator('section[aria-labelledby="na-dzis"] .task-card').first().waitFor();
  const before0 = await startItems(page);
  t.diagnostic(`Plan na dziś (${before0.length}): ${before0.join(' || ')}`);
  sc.ok(before0.length >= 2, `plan na dziś ma co najmniej 2 pozycje (jest ${before0.length})`);

  // --- zamiana ---
  const iSwap = await firstTaskCard(page, 0);
  sc.ok(iSwap >= 0, 'jest pozycja z zadaniem do zamiany');
  const swappedOld = before0[iSwap];
  await cardMenu(page, iSwap, 'Zamień na inne');
  const sheet = page.getByRole('dialog', { name: 'Zamień na inne' });
  await sheet.waitFor();
  await checkScreen(page, 'plan-zamiana');
  let options = await sheet.getByRole('button', { name: 'Wybierz to zadanie' }).count();
  if (!options) {
    await sheet.getByRole('button', { name: 'Inny temat' }).click();
    options = await sheet.getByRole('button', { name: 'Wybierz to zadanie' }).count();
  }
  sc.ok(options > 0, 'zamiana proponuje inne zadania');
  const pickedLabel = (await sheet.locator('.task-card').first().locator('.meta').innerText()).replace(/\s+/g, ' ').trim();
  await sheet.getByRole('button', { name: 'Wybierz to zadanie' }).first().click();
  await page.getByText('Zamieniono zadanie.').waitFor();
  const afterSwap = await startItems(page);
  sc.ok(!afterSwap.includes(swappedOld), `po zamianie nie ma „${swappedOld}”`);
  sc.ok(afterSwap[iSwap]?.split(' | ')[0] === pickedLabel, `na miejscu zamienionej pozycji jest wybrane zadanie (oczekiwano „${pickedLabel}”, jest „${afterSwap[iSwap]}”)`);
  sc.ok(afterSwap.length === before0.length, `liczba pozycji bez zmian po zamianie (przed ${before0.length}, po ${afterSwap.length}): ${afterSwap.join(' || ')}`);

  // --- usunięcie z cofnięciem ---
  const iDel = await firstTaskCard(page, 1);
  const delText = afterSwap[iDel];
  await cardMenu(page, iDel, 'Usuń z planu');
  const toast = page.locator('.toast', { hasText: 'Usunięto z planu.' });
  await toast.waitFor();
  sc.ok(!(await startItems(page)).includes(delText), 'pozycja usunięta');
  await checkScreen(page, 'plan-usunieto-toast');
  await toast.getByRole('button', { name: 'Cofnij' }).click();
  await sleep(300);
  const afterUndo = await startItems(page);
  sc.ok(afterUndo.includes(delText), `„Cofnij” przywraca pozycję (${delText})`);
  sc.ok(afterUndo.includes(afterSwap[iSwap]), '„Cofnij” usunięcia nie cofa wcześniejszej zamiany');
  // usuwam na stałe
  await cardMenu(page, afterUndo.indexOf(delText), 'Usuń z planu');
  await page.locator('.toast', { hasText: 'Usunięto z planu.' }).last().waitFor();
  await sleep(300);
  const afterDel = await startItems(page);
  sc.ok(!afterDel.includes(delText), 'pozycja usunięta na stałe');
  sc.ok(afterDel.length === afterUndo.length - 1, `usunięcie zmienia tylko tę pozycję (przed ${afterUndo.length}, po ${afterDel.length}): ${afterDel.join(' || ')}`);

  // --- przeniesienie na jutro ---
  const iMove = await firstTaskCard(page, 0);
  const moveText = afterDel[iMove];
  await cardMenu(page, iMove, 'Przenieś na jutro');
  await page.getByText('Przeniesiono na jutro.').waitFor();
  await sleep(500);
  const afterMove = await startItems(page);
  sc.ok(!afterMove.includes(moveText), `przeniesiona pozycja znika z dziś (${moveText})`);
  sc.ok(afterMove.length === afterDel.length - 1, `przeniesienie zmienia tylko tę pozycję (przed ${afterDel.length}, po ${afterMove.length}): ${afterMove.join(' || ')}`);
  const st = await lsState(page);
  const ovT = st.stan.overrides[TODAY];
  const ovN = st.stan.overrides[TOMORROW];
  sc.ok(ovT && ovT.remove.length >= 1, 'nadpisanie dnia dzisiejszego zapisane');
  sc.ok(ovN && ovN.add.length === 1, 'pozycja dodana na jutro w nadpisaniach');
  await checkScreen(page, 'start-po-zmianach');

  // --- Plan tygodnia: pozycja jutro, tryb edycji ---
  await page.goto(url('#plan'));
  await waitReady(page);
  const tomorrowCard = page.locator(`#dzien-${TOMORROW}`);
  const movedTitle = moveText.split(' | ')[1];
  await tomorrowCard.waitFor();
  const tmText = await tomorrowCard.innerText();
  sc.ok(tmText.includes(movedTitle) && tmText.includes('zmienione przez ciebie'), `jutro w planie jest „${movedTitle}” ze znacznikiem zmiany`);
  await checkScreen(page, 'plan-tydzien');
  await page.getByRole('button', { name: 'Edytuj', exact: true }).click();
  const todayCard = page.locator(`#dzien-${TODAY}`);
  const rowsBefore = await todayCard.locator('.plan-row .tt').allInnerTexts();
  await todayCard.getByRole('button', { name: 'Niżej' }).first().click();
  await sleep(300);
  const rowsAfter = await todayCard.locator('.plan-row .tt').allInnerTexts();
  sc.ok(rowsAfter[0] === rowsBefore[1] && rowsAfter[1] === rowsBefore[0], `„Niżej” zmienia kolejność (${rowsBefore.slice(0, 2)} → ${rowsAfter.slice(0, 2)})`);
  await checkScreen(page, 'plan-edycja');
  await page.getByRole('button', { name: 'Gotowe', exact: true }).click();

  // --- odświeżenie strony: zmiany zostają ---
  await page.goto(url('#start'));
  await waitReady(page);
  const beforeReload = await startItems(page);
  await page.reload();
  await waitReady(page);
  await page.locator('section[aria-labelledby="na-dzis"] .task-card').first().waitFor();
  const afterReload = await startItems(page);
  sc.ok(JSON.stringify(afterReload) === JSON.stringify(beforeReload), `po odświeżeniu plan dnia taki sam\n   przed: ${beforeReload.join(' || ')}\n   po:    ${afterReload.join(' || ')}`);
  sc.ok(!afterReload.includes(delText) && !afterReload.includes(moveText) && !afterReload.includes(swappedOld), 'po odświeżeniu usunięte/przeniesione/zamienione nie wracają');
  await page.goto(url('#plan'));
  await waitReady(page);
  sc.ok((await page.locator(`#dzien-${TOMORROW}`).innerText()).includes(movedTitle), 'po odświeżeniu pozycja jest jutro');
  if (sc.fails.length) await shot(page, 'BLAD-plan');
  sc.done();
  return env;
});
