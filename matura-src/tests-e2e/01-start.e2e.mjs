// 1. Onboarding, 2. diagnoza do końca, 3. ekran Start.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, clickVisible, waitReady,
  EXAMS, TODAY, softChecks, setTime, expectedClosed, isAuto, wrongOf, imagesLoaded, sleep, shot, answerClosed,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

const rawById = new Map();
for (const e of EXAMS) for (const t of e.tasks) rawById.set(`${e.id}-n${t.nr.replace(/[^A-Za-z0-9]+/g, '-')}`, t);

function daysBetween(a, b) {
  return Math.round((Date.UTC(...a.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0))) - Date.UTC(...b.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)))) / 86400000);
}

bothDevices(test, '1-3. Onboarding, diagnoza, Start', async (t, device, use) => {
  const env = await openApp(device, { hash: '#start' });
  use(env);
  const { page } = env;

  // --- 1. Onboarding ---
  await page.waitForURL(/#powitanie/);
  await page.getByText('Krok 1 z 4').first().waitFor();
  await page.getByRole('heading', { name: 'Z czego zdajesz maturę?' }).waitFor();
  await checkScreen(page, 'onboarding-1');
  await page.getByRole('checkbox', { name: 'Matematyka rozszerzona' }).uncheck();
  await clickVisible(page, 'Dalej');

  await page.getByText('Krok 2 z 4').first().waitFor();
  await page.getByRole('radiogroup', { name: 'Dni powszednie' }).getByRole('radio', { name: '60', exact: true }).click();
  await page.getByRole('radiogroup', { name: 'Weekend' }).getByRole('radio', { name: '90', exact: true }).click();
  await page.getByText('Około 8 godzin tygodniowo.').waitFor();
  await checkScreen(page, 'onboarding-2');
  await clickVisible(page, 'Dalej');

  await page.getByText('Krok 3 z 4').first().waitFor();
  await setTime(page, 'onb-time', '00:05');
  const sw = page.getByRole('switch', { name: 'Przypominaj o nauce' });
  assert.equal(await sw.isChecked(), true, 'przypomnienie domyślnie włączone');
  await checkScreen(page, 'onboarding-3');
  await clickVisible(page, 'Dalej');

  await page.getByText('Krok 4 z 4').first().waitFor();
  await page.getByRole('heading', { name: 'Zacznij od diagnozy.' }).waitFor();
  await page.waitForFunction(() => !/Ładowanie zadań…/.test(document.body.innerText), null, { timeout: 20000 });
  const step4 = await page.locator('.onb-body').innerText();
  assert.ok(!/Matematyka rozszerzona/.test(step4), 'wyłączony przedmiot nie ma diagnozy w kroku 4');
  await checkScreen(page, 'onboarding-4');
  // Wychodzę przez „Zrobię później”, żeby sprawdzić baner przypomnienia.
  await clickVisible(page, 'Zrobię później');
  await page.waitForURL(/#start/);
  await waitReady(page);
  await sleep(500);
  const st = await lsState(page);
  assert.equal(st.stan.onboarded, true);
  assert.equal(st.stan.reminder.time, '00:05');
  assert.equal(st.stan.reminder.enabled, true);
  assert.deepEqual(st.stan.dayMinutes, [90, 60, 60, 60, 60, 60, 90]);
  assert.equal(st.stan.enabled['mat-r'], false);
  await page.getByText('Dziś jeszcze nic. 15 minut wystarczy, żeby utrzymać serię.').waitFor({ timeout: 5000 });
  await checkScreen(page, 'start-przed-diagnoza');

  // --- 2. Diagnoza matematyki podstawowej ---
  const matDiag = page.locator('.task-card', { hasText: 'Diagnoza: matematyka podstawowa' });
  assert.ok((await matDiag.count()) > 0, 'diagnoza matematyki jest w planie na dziś');
  await matDiag.first().getByRole('button', { name: 'Zacznij diagnozę' }).click();
  await page.waitForURL(/#diagnoza-mat-p/);
  await page.getByRole('heading', { name: 'Diagnoza: matematyka podstawowa' }).waitFor();
  await checkScreen(page, 'diagnoza-intro');
  await clickVisible(page, 'Zacznij diagnozę');
  await page.getByText(/Zad\. 1 z \d+/).waitFor();
  await sleep(500);
  let s = Object.values((await lsState(page)).sessions).find((x) => x.mode === 'diagnoza');
  assert.ok(s, 'sesja diagnozy w localStorage');
  const ids = s.taskIds;
  const choices = {};
  let expectedPts = 0;
  let expectedMax = 0;
  let openCount = 0;
  for (let i = 0; i < ids.length; i++) {
    await page.getByText(`Zad. ${i + 1} z ${ids.length}`).waitFor();
    const raw = rawById.get(ids[i]);
    assert.ok(raw, `zadanie ${ids[i]} jest w exams.json`);
    if (i === 0) {
      const imgs = await imagesLoaded(page);
      assert.ok(imgs.every((x) => x.w > 0), 'obraz zadania w diagnozie się wczytał');
      await checkScreen(page, 'diagnoza-zadanie');
    }
    if (isAuto(raw)) {
      // co trzecie zadanie błędnie
      const ch = Object.fromEntries(raw.answer.items.map((it) => [it.id, i % 3 === 2 ? wrongOf(it) : it.correct]));
      choices[ids[i]] = ch;
      await answerClosed(page, raw, ch);
      expectedPts += expectedClosed(raw, ch);
    } else {
      openCount++;
      await page.getByRole('switch', { name: 'Zrobione na kartce' }).check();
      expectedPts += Math.min(1, raw.maxPoints); // samoocena: 1 pkt
    }
    expectedMax += raw.maxPoints;
    await sleep(150);
    if (i < ids.length - 1) await clickVisible(page, 'Następne');
  }
  await clickVisible(page, 'Zakończ diagnozę');
  await page.getByRole('dialog').getByRole('button', { name: 'Zakończ', exact: true }).click();
  for (let g = 0; g < openCount; g++) {
    await page.getByText(new RegExp(`Ocena: ${g + 1} z ${openCount}`)).waitFor();
    await page.getByRole('radiogroup', { name: 'Ile punktów przyznajesz sobie?' }).getByRole('radio', { name: '1', exact: true }).click();
    if (g === 0) await checkScreen(page, 'diagnoza-samoocena');
    await clickVisible(page, g === openCount - 1 ? 'Pokaż wynik' : 'Dalej');
  }
  const sc = softChecks(t);
  await sc.step('2. ekran wyniku diagnozy po „Zakończ”', async () => {
    await page.getByText('Wynik diagnozy').first().waitFor({ timeout: 6000 });
    const big = (await page.locator('.big').first().innerText()).trim();
    const pctExp = Math.round((expectedPts / expectedMax) * 100);
    sc.ok(big === `${expectedPts} z ${expectedMax}, ${pctExp}%`, `wynik diagnozy: oczekiwano „${expectedPts} z ${expectedMax}, ${pctExp}%”, jest „${big}”`);
    await page.getByText(/Diagnoza z matematyki podstawowej zapisana/).waitFor({ timeout: 3000 });
    await checkScreen(page, 'diagnoza-wynik');
  });
  if (sc.fails.length) await shot(page, 'BLAD-diagnoza-po-zakonczeniu');
  await sleep(800);
  const st2 = await lsState(page);
  const sesEv = st2.events.filter((e) => e.k === 's' && e.mode === 'diagnoza');
  sc.ok(sesEv.length === 1, `jedno zdarzenie wyniku diagnozy (jest ${sesEv.length})`);
  sc.ok(sesEv[0]?.pts === expectedPts, `punkty w zdarzeniu diagnozy: oczekiwano ${expectedPts}, jest ${sesEv[0]?.pts}`);
  sc.ok(sesEv[0]?.d === TODAY, 'data zdarzenia = dziś');
  const sess = Object.values(st2.sessions).find((x) => x.mode === 'diagnoza');
  sc.ok(sess?.status === 'koniec', `sesja diagnozy po zakończeniu ma status „koniec” (jest „${sess?.status}”)`);

  // --- 3. Start ---
  await page.goto(page.url().replace(/#.*/, '#start'));
  await waitReady(page);
  const diagCard = page.locator('.task-card', { hasText: 'Diagnoza: matematyka podstawowa' });
  assert.ok((await diagCard.count()) > 0, 'diagnoza jest pozycją dzisiejszego planu');
  await diagCard.first().getByText('zrobione').waitFor({ timeout: 5000 });
  assert.match(await diagCard.first().innerText(), new RegExp(`${expectedPts} z ${expectedMax} pkt`));

  const summary = page.locator('section.summary');
  const firstExam = '2027-05-04';
  const n = daysBetween(firstExam, TODAY);
  assert.match(await summary.locator('.big').innerText(), new RegExp(`^${n} dni$`), 'dni do pierwszego egzaminu');
  assert.match(await summary.innerText(), /do pierwszego egzaminu, język polski 4 maja/);
  assert.match(await summary.innerText(), /Seria: 1 dzień/);
  assert.match(await summary.innerText(), /Prognoza/);
  const fc = await summary.getByRole('button', { name: /^Matematyka podstawowa: \d+%$/ }).count();
  assert.equal(fc, 1, 'prognoza matematyki po diagnozie');
  assert.ok(!/Dziś jeszcze nic/.test(await page.locator('main').innerText()), 'po nauce baner przypomnienia znika');
  const naDzis = page.locator('section[aria-labelledby="na-dzis"]');
  assert.match(await naDzis.innerText(), /\d+ z \d+, \d+ min/);
  await checkScreen(page, 'start-po-diagnozie');
  await page.getByRole('button', { name: 'Zacznij naukę', exact: true }).first().click();
  await page.waitForURL(/#(zadanie|arkusz|wypracowanie|diagnoza)-/);
  await waitReady(page);
  await checkScreen(page, 'pierwsza-pozycja-planu');
  sc.done();
  return env;
}, { timeout: 240_000 });
