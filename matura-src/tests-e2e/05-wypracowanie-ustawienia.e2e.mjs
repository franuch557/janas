// 9. Wypracowanie (polski), 11. Ustawienia.
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, clickVisible, waitReady, diagnosedState, softChecks,
  tid, url, imagesLoaded, sleep, shot, KRYTERIA, rawTask, setTime, getTime,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

const ID = tid('MPOP-P1-P2-2505', 'A2.1');
const WORDS = 'Literatura pokazuje, że człowiek w obliczu cierpienia szuka sensu, a bohaterowie lektur dają na to różne odpowiedzi.';
const essayText = (n) => Array.from({ length: n }, () => WORDS).join(' ');
const countWords = (s) => s.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;

async function openTab(page, device, name) {
  if (device === 'telefon') await page.getByRole('radiogroup', { name: 'Widok' }).getByRole('radio', { name, exact: true }).click();
  else if (name === 'Ocena') await page.getByRole('button', { name: 'Oceń tekst' }).click();
  else if (name === 'Tekst' && (await page.getByRole('button', { name: 'Wróć do tekstu' }).count())) await page.getByRole('button', { name: 'Wróć do tekstu' }).click();
}

bothDevices(test, '9. Polski: wypracowanie', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: `#wypracowanie-${ID}` });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  const raw = rawTask('MPOP-P1-P2-2505', 'A2.1');
  const area = page.locator('textarea#essay');
  await area.waitFor();
  if (device === 'telefon') {
    await openTab(page, device, 'Temat');
    const imgs = await imagesLoaded(page);
    sc.ok(imgs[0]?.w > 0, 'obraz tematu wczytany');
    await checkScreen(page, 'wypracowanie-temat');
    await openTab(page, device, 'Tekst');
  } else {
    const imgs = await imagesLoaded(page);
    sc.ok(imgs[0]?.w > 0, 'obraz tematu wczytany');
  }
  const text1 = essayText(10);
  await area.fill(text1);
  const n1 = countWords(text1);
  const counter = page.locator('.essay-foot');
  await counter.getByText(`${n1} z min. ${raw.essay.minWords} słów`).waitFor();
  sc.ok(n1 < raw.essay.minWords, `tekst ${n1} słów < minimum ${raw.essay.minWords}`);
  await checkScreen(page, 'wypracowanie-pisanie');
  // autozapis co 5 s → odświeżenie
  await sleep(6000);
  await counter.getByText('zapisano').waitFor({ timeout: 3000 }).catch(() => sc.ok(false, 'wskaźnik „zapisano” po autozapisie'));
  await page.reload();
  await waitReady(page);
  await area.waitFor();
  sc.ok((await area.inputValue()) === text1, 'po odświeżeniu (po autozapisie) tekst zostaje');
  // dopisanie i odświeżenie przed upływem 5 s (uczeń zamyka kartę zaraz po pisaniu)
  const text2 = `${text1} ${essayText(18)}`;
  await area.fill(text2);
  await sleep(1500);
  await page.reload();
  await waitReady(page);
  await area.waitFor();
  const v2 = await area.inputValue();
  sc.ok(v2 === text2, `odświeżenie 1,5 s po pisaniu nie gubi tekstu (zostało ${countWords(v2)} z ${countWords(text2)} słów)`);
  if (v2 !== text2) {
    await shot(page, 'BLAD-wypracowanie-utrata-tekstu');
    await area.fill(text2);
  }
  const n2 = countWords(text2);
  await counter.getByText(`${n2} z min. ${raw.essay.minWords} słów`).waitFor();
  sc.ok(n2 >= raw.essay.minWords, `tekst ${n2} słów ≥ minimum`);
  // samoocena
  await openTab(page, device, 'Ocena');
  const set = KRYTERIA[raw.essay.criteria];
  const save = page.getByRole('button', { name: 'Zapisz ocenę' });
  sc.ok(await save.isDisabled(), '„Zapisz ocenę” nieaktywne przed oceną wszystkich kryteriów');
  let sum = 0;
  const crit = set.groups.flatMap((g) => g.criteria);
  for (const [i, c] of crit.entries()) {
    const v = c.values[Math.min(c.values.length - 1, (i % 3) + 1)];
    await page.getByRole('radiogroup', { name: c.name, exact: true }).getByRole('radio', { name: String(v).replace('.', ','), exact: true }).click();
    sum += v;
  }
  sum = Math.min(raw.maxPoints, sum);
  const sumText = await page.getByText(/^Szacowany wynik:/).innerText();
  sc.ok(sumText === `Szacowany wynik: ${String(sum).replace('.', ',')} z ${set.max} pkt`, `suma punktów: oczekiwano ${sum} z ${set.max}, jest „${sumText}”`);
  await checkScreen(page, 'wypracowanie-ocena');
  await save.click();
  await page.getByText(`Zapisano ocenę: ${String(sum).replace('.', ',')} z ${set.max} pkt.`).waitFor();
  await sleep(600);
  const st = await lsState(page);
  sc.ok(st.essays.length === 1 && st.essays[0].points === sum && st.essays[0].words === n2, `zapisane wypracowanie: ${sum} pkt, ${n2} słów (jest ${JSON.stringify(st.essays.map((e) => [e.points, e.words]))})`);
  const ev = st.events.filter((e) => e.k === 'w' && e.task === ID);
  sc.ok(ev.length === 1 && ev[0].pts === sum, 'zdarzenie wyniku wypracowania');
  await page.goto(url('#postep'));
  await waitReady(page);
  await checkScreen(page, 'postep-po-wypracowaniu');
  if (sc.fails.length) await shot(page, 'BLAD-wypracowanie');
  sc.done();
  return env;
}, { timeout: 180_000 });

bothDevices(test, '11. Ustawienia', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#ustawienia' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.getByRole('heading', { name: 'Ustawienia' }).waitFor();
  await checkScreen(page, 'ustawienia');
  const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const motyw = page.getByRole('radiogroup', { name: 'Motyw' });
  await motyw.getByRole('radio', { name: 'ciemny' }).click();
  await sleep(300);
  const darkBg = await bg();
  sc.ok((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'motyw ciemny: data-theme=dark');
  await checkScreen(page, 'ustawienia-ciemny');
  await motyw.getByRole('radio', { name: 'jasny' }).click();
  await sleep(300);
  const lightBg = await bg();
  sc.ok((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'light', 'motyw jasny: data-theme=light');
  sc.ok(darkBg !== lightBg, `tło zmienia się z motywem (${darkBg} / ${lightBg})`);
  const lum = (c) => c.match(/\d+/g).slice(0, 3).map(Number).reduce((a, b) => a + b, 0);
  sc.ok(lum(darkBg) < lum(lightBg), 'ciemny motyw ma ciemniejsze tło');
  await motyw.getByRole('radio', { name: 'ciemny' }).click();

  // przypomnienie: włączenie i godzina
  const sw = page.getByRole('switch', { name: 'Przypominaj o nauce' });
  if (!(await sw.isChecked())) await sw.check();
  const time = page.locator('#rem-time-h');
  sc.ok(await time.isEnabled(), 'pole godziny aktywne po włączeniu przypomnienia');
  await setTime(page, 'rem-time', '19:45');
  // czas nauki: poniedziałek 90 min
  await page.getByRole('radiogroup', { name: 'Minuty nauki: poniedziałek' }).getByRole('radio', { name: '90', exact: true }).click();
  const toast = page.locator('.toast', { hasText: 'Zmieniono czas nauki.' });
  await toast.waitFor();
  sc.ok(await toast.getByRole('button', { name: 'Przelicz plan od dziś' }).isVisible(), 'toast z „Przelicz plan od dziś”');
  await sleep(600);
  let st = await lsState(page);
  sc.ok(st.stan.theme === 'ciemny' && st.stan.reminder.time === '19:45' && st.stan.reminder.enabled && st.stan.dayMinutes[1] === 90, `ustawienia zapisane (${JSON.stringify({ theme: st.stan.theme, reminder: st.stan.reminder, pn: st.stan.dayMinutes[1] })})`);
  await page.reload();
  await waitReady(page);
  sc.ok((await getTime(page, 'rem-time')) === '19:45', 'godzina przypomnienia po odświeżeniu');
  sc.ok((await page.getByRole('radiogroup', { name: 'Minuty nauki: poniedziałek' }).getByRole('radio', { name: '90', exact: true }).getAttribute('aria-checked')) === 'true', 'czas nauki po odświeżeniu');
  sc.ok((await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'motyw po odświeżeniu');
  // plan uwzględnia 90 min w poniedziałek
  await page.goto(url('#plan'));
  await waitReady(page);
  const mon = await page.locator('#dzien-2026-11-23').innerText();
  t.diagnostic(`poniedziałek w planie: ${mon.split('\n').slice(0, 2).join(' ')}`);

  // usuń wszystkie dane: anulowanie, potem potwierdzenie
  await page.goto(url('#ustawienia'));
  await waitReady(page);
  await page.getByRole('button', { name: 'Usuń wszystkie dane' }).click();
  const dlg = page.getByRole('dialog', { name: 'Usunąć wszystkie dane?' });
  await dlg.waitFor();
  await checkScreen(page, 'ustawienia-usun-potwierdzenie');
  await dlg.getByRole('button', { name: 'Anuluj' }).click();
  await sleep(400);
  sc.ok((await lsState(page)).events.length > 0, 'anulowanie nie usuwa danych');
  await page.getByRole('button', { name: 'Usuń wszystkie dane' }).click();
  await dlg.getByRole('button', { name: 'Usuń dane' }).click();
  await page.waitForURL(/#powitanie/, { timeout: 5000 }).catch(() => sc.ok(false, 'po usunięciu danych aplikacja wraca do powitania'));
  await sleep(800);
  st = await lsState(page);
  sc.ok(st && st.events.length === 0 && st.stan.onboarded === false && st.stan.resetAt > 0, `dane usunięte (zdarzenia ${st?.events.length}, onboarded ${st?.stan.onboarded}, resetAt ${st?.stan.resetAt})`);
  await page.reload();
  await waitReady(page);
  sc.ok(/#powitanie/.test(page.url()), 'po odświeżeniu nadal powitanie (dane nie wróciły)');
  await checkScreen(page, 'po-usunieciu');
  if (sc.fails.length) await shot(page, 'BLAD-ustawienia');
  sc.done();
  return env;
});
