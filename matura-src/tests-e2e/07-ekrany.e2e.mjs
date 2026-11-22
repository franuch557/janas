// 13. Każdy ekran: brak błędów konsoli, brak poziomego przewijania, przyciski ≥ 44 px na telefonie,
// brak tekstów programisty. Przejście po wszystkich widokach w jasnym i ciemnym motywie.
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, clickVisible, waitReady, diagnosedState, softChecks,
  tid, url, sleep, hardProblems, imagesLoaded, seedState,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

async function visit(page, hash, label, extra) {
  await page.goto(url(hash));
  await waitReady(page);
  if (extra) await extra();
  await checkScreen(page, label);
}

for (const theme of ['jasny', 'ciemny']) {
  bothDevices(test, `13. Wszystkie ekrany (${theme})`, async (t, device, use) => {
    const env = await openApp(device, { state: diagnosedState({ stan: { theme, reminder: { enabled: true, time: '00:01' } } }), hash: '#start' });
    use(env);
    const { page } = env;
    const sc = softChecks(t);
    await checkScreen(page, `${theme}-start`);
    await page.getByRole('button', { name: 'Dodaj zadanie', exact: true }).last().click();
    await page.getByRole('dialog', { name: 'Dodaj zadanie' }).waitFor();
    await checkScreen(page, `${theme}-start-dodaj`);
    await page.keyboard.press('Escape');
    const card = page.locator('section[aria-labelledby="na-dzis"] .task-card').first();
    await card.getByRole('button', { name: 'Więcej działań' }).click();
    await checkScreen(page, `${theme}-start-menu`);
    await page.keyboard.press('Escape');
    await visit(page, '#plan', `${theme}-plan`);
    await page.getByRole('button', { name: 'Edytuj', exact: true }).click();
    await checkScreen(page, `${theme}-plan-edycja`);
    await visit(page, '#zadania', `${theme}-zadania`);
    await visit(page, '#zadania-mat-p', `${theme}-zadania-mat-p`);
    await page.locator('.bank .li').first().click();
    await sleep(500);
    await checkScreen(page, `${theme}-zadania-temat`);
    await page.getByRole('button', { name: 'Szukaj zadań' }).click();
    await page.getByLabel('Szukaj po temacie, roku i numerze').fill('2024 9');
    await checkScreen(page, `${theme}-zadania-szukaj`);
    await visit(page, `#zadanie-${tid('MMAP-P0-100-2405', '1')}`, `${theme}-zadanie`, async () => {
      await imagesLoaded(page);
      await page.locator('.abcd [role="radio"]').first().click();
      await clickVisible(page, 'Sprawdź');
      await clickVisible(page, 'Pokaż rozwiązanie');
      await imagesLoaded(page, '.reveal .kartka img');
    });
    await page.locator('.kartka').first().click();
    await checkScreen(page, `${theme}-zadanie-powiekszenie`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Więcej działań' }).click();
    await checkScreen(page, `${theme}-zadanie-menu`);
    await page.keyboard.press('Escape');
    await visit(page, `#zadanie-${tid('MMAP-R0-100-2405', '5')}`, `${theme}-zadanie-otwarte`, async () => {
      await clickVisible(page, 'Pokaż odpowiedź');
      await imagesLoaded(page, '.reveal .kartka img');
      await page.getByRole('button', { name: 'Dodaj notatkę do błędu' }).click();
    });
    await visit(page, `#zadanie-${tid('MJAP-P0-100-2405', '1')}`, `${theme}-zadanie-angielski`);
    await visit(page, `#zadanie-${tid('MPOP-P1-P2-2405', 'A1.3')}`, `${theme}-zadanie-polski`);
    await visit(page, '#arkusze', `${theme}-arkusze`);
    await visit(page, '#arkusz-MPOP-P1-P2-2405', `${theme}-arkusz-polski-czesci`);
    await visit(page, '#arkusz-MMAP-R0-100-2405', `${theme}-arkusz-intro`, async () => {
      await clickVisible(page, 'Zacznij arkusz');
      await page.getByText(/Zad\. 1 z/).waitFor();
      await imagesLoaded(page);
    });
    await clickVisible(page, 'Spis');
    await checkScreen(page, `${theme}-arkusz-spis`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Przerwij' }).click();
    await checkScreen(page, `${theme}-arkusz-przerwij`);
    await page.keyboard.press('Escape');
    await visit(page, '#diagnoza-mat-p', `${theme}-diagnoza-wynik-lub-intro`);
    await visit(page, `#wypracowanie-${tid('MJAP-P0-100-2405', '12')}`, `${theme}-wypowiedz-ang`);
    await visit(page, `#wypracowanie-${tid('MPOP-P1-P2-2405', 'A2.1')}`, `${theme}-wypracowanie`);
    await visit(page, `#zadanie-${tid('ZBIOR-MMAP-P0', '25.2')}`, `${theme}-zadanie-zbior`, async () => {
      await imagesLoaded(page);
      sc.ok((await page.locator('text=/Zbiór zadań CKE/ >> visible=true').count()) > 0, 'zadanie ze zbioru CKE podpisane');
    });
    await visit(page, `#zadanie-${tid('INF-MMAP-P0', '29')}`, `${theme}-zadanie-informator`, async () => {
      await imagesLoaded(page);
      sc.ok((await page.locator('.abcd [role="radiogroup"]').count()) === 2, 'informator: dwie pozycje odpowiedzi');
    });
    await visit(page, '#fiszki', `${theme}-fiszki`);
    await visit(page, '#lektury', `${theme}-lektury`);
    await visit(page, '#ustny', `${theme}-ustny`, async () => {
      await page.getByRole('radio', { name: /Zadanie 2: zbiór CKE/ }).click();
    });
    await visit(page, '#ustny-z2-2.7', `${theme}-ustny-zadanie2`, async () => {
      await page.locator('.kartka img').first().waitFor({ timeout: 8000 });
      await clickVisible(page, 'Pokaż przykładową realizację CKE');
      await page.getByRole('heading', { name: 'Przykładowa realizacja CKE' }).waitFor();
    });
    sc.ok((await page.locator('.sidebar .navitem, .bottomnav .navitem').filter({ hasText: 'Lektury' }).first().getAttribute('aria-current')) === 'page', 'ustny podświetla „Lektury” w menu');
    await visit(page, '#postep', `${theme}-postep`);
    await visit(page, '#postep-mat-p', `${theme}-postep-mat-p`);
    await visit(page, '#ustawienia', `${theme}-ustawienia`);
    await visit(page, '#nieistniejacy-widok', `${theme}-zly-adres`);
    await visit(page, '#zadanie-NIE-MA-TAKIEGO', `${theme}-brak-zadania`);
    await visit(page, '#arkusz-NIE-MA', `${theme}-brak-arkusza`);
    const hard = hardProblems(page);
    sc.ok(hard.length === 0, `problemy na ekranach: ${hard.length}`);
    sc.done();
    return env;
  }, { timeout: 240_000 });
}

bothDevices(test, '13. Powitanie i pusty stan (nowy uczeń)', async (t, device, use) => {
  const env = await openApp(device, { hash: '#start' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  await page.waitForURL(/#powitanie/);
  await checkScreen(page, 'powitanie-1');
  await clickVisible(page, 'Pomiń');
  await page.waitForURL(/#start/);
  await waitReady(page);
  await checkScreen(page, 'start-nowy-uczen');
  await visit(page, '#plan', 'plan-nowy-uczen');
  await visit(page, '#postep', 'postep-nowy-uczen');
  await visit(page, '#arkusze', 'arkusze-nowy-uczen');
  const hard = hardProblems(page);
  sc.ok(hard.length === 0, `problemy na ekranach: ${hard.length}`);
  sc.done();
  return env;
});
