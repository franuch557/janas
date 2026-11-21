// 10. Synchronizacja telefon–komputer przez symulowaną capability db (wspólny magazyn w procesie testu).
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, checkScreen, lsState, clickVisible, waitReady, diagnosedState, softChecks,
  tid, url, sleep, shot, TODAY, rawTask, answerClosed, reportScreens, seedState, setTime,
} from './helpers.mjs';
import { FakeDb, DOC_LIMIT } from './fake-db.mjs';

before(ensureServer);
after(closeBrowser);

const UID = 'uczen-e2e';
const COL = `data/users/${UID}`;

function activeResults(st) {
  const undone = new Set(st.events.filter((e) => e.k === 'c').map((e) => e.target));
  return st.events.filter((e) => e.k === 'w' && !undone.has(e.id));
}

async function device(db, name, device, state) {
  const env = await openApp(device, { state, go: false });
  await db.attach(env.ctx, name, UID);
  db.track(env.page);
  await env.page.goto(url('#start'));
  await waitReady(env.page);
  return env;
}

async function waitFor(fn, ms = 10000, step = 250) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await sleep(step);
  }
}

/** Czeka, aż przez `quiet` ms nie będzie żadnego zapisu. */
async function settle(db, quiet = 2500, max = 20000) {
  const start = Date.now();
  const end = start + max;
  for (;;) {
    const last = Math.max(start, db.writes.length ? db.writes[db.writes.length - 1].t : 0);
    if (Date.now() - last >= quiet) return true;
    if (Date.now() > end) return false;
    await sleep(250);
  }
}

async function solveClosed(page, examId, nr, correct = true) {
  const raw = rawTask(examId, nr);
  await page.goto(url(`#zadanie-${tid(examId, nr)}`));
  await waitReady(page);
  await page.locator('.abcd').waitFor();
  const ch = Object.fromEntries(raw.answer.items.map((it) => [it.id, correct ? it.correct : it.options.find((o) => o !== it.correct)]));
  await answerClosed(page, raw, ch);
  await clickVisible(page, 'Sprawdź');
  await page.locator('.feedback').waitFor();
}

async function syncText(page) {
  return page.evaluate(() => document.querySelector('.sidebar .side-extra')?.innerText ?? document.querySelector('.topbar .btn-icon')?.getAttribute('aria-label'));
}

test('10. Synchronizacja telefon ↔ komputer (db)', { timeout: 300_000 }, async (t) => {
  const db = new FakeDb();
  const sc = softChecks(t);
  const envs = [];
  try {
    // --- A: telefon z danymi ---
    const A = await device(db, 'A', 'telefon', diagnosedState());
    envs.push(A);
    await settle(db);
    sc.ok(db.docs.has(`${COL}/stan`), 'A zapisał dokument „stan” po pierwszej odpowiedzi serwera');
    sc.ok([...db.docs.keys()].some((k) => k.startsWith(`${COL}/wyniki-`)), 'A zapisał dokument wyników');
    t.diagnostic(`A: wskaźnik synchronizacji: ${await syncText(A.page)}`);
    await checkScreen(A.page, 'sync-A-start');

    // A: wynik zadania
    await solveClosed(A.page, 'MMAP-P0-100-2505', '1');
    await sleep(400);
    const aResult = activeResults(await lsState(A.page)).find((e) => e.task === tid('MMAP-P0-100-2505', '1'));
    // A: zmiana planu (usunięcie pierwszej pozycji z zadaniem)
    await A.page.goto(url('#start'));
    await waitReady(A.page);
    const cards = A.page.locator('section[aria-labelledby="na-dzis"] .task-card');
    await cards.first().waitFor();
    let delIdx = -1;
    for (let i = 0; i < (await cards.count()); i++) if (/(zamknięte|otwarte), \d+ pkt/.test(await cards.nth(i).innerText())) { delIdx = i; break; }
    const delTitle = await cards.nth(delIdx).locator('.meta').first().innerText();
    await cards.nth(delIdx).getByRole('button', { name: 'Więcej działań' }).click();
    await cards.nth(delIdx).getByRole('menuitem', { name: 'Usuń z planu' }).click();
    await sleep(400);
    const aStan = (await lsState(A.page)).stan;
    const removedRef = aStan.overrides[TODAY]?.remove?.[0];
    sc.ok(!!removedRef, 'A: usunięcie zapisane w nadpisaniach');
    await settle(db);
    const dbStan = JSON.parse(db.docs.get(`${COL}/stan`) ?? '{}');
    sc.ok(dbStan.overrides?.[TODAY]?.remove?.includes(removedRef), 'db: stan zawiera zmianę planu z A');
    const dbEvents = [...db.docs.entries()].filter(([k]) => k.includes('/wyniki-')).flatMap(([, v]) => JSON.parse(v).events);
    sc.ok(dbEvents.some((e) => e.id === aResult?.id), 'db: wynik zadania z A');

    // --- B: komputer z pustym localStorage ---
    const B = await device(db, 'B', 'komputer', null);
    envs.push(B);
    const bHas = await waitFor(async () => {
      const st = await lsState(B.page);
      return st && st.stan.onboarded && st.events.some((e) => e.id === aResult?.id) ? st : null;
    }, 10000);
    sc.ok(!!bHas, 'B widzi wynik zadania z A (i stan „po powitaniu”)');
    sc.ok(bHas?.stan.overrides?.[TODAY]?.remove?.includes(removedRef), 'B widzi zmianę planu z A');
    await sleep(800);
    const bHash = await B.page.evaluate(() => location.hash);
    sc.ok(!/powitanie/.test(bHash), `B (drugie urządzenie) nie zostaje na ekranie powitania po wczytaniu danych z chmury (adres ${bHash})`);
    if (/powitanie/.test(bHash)) await shot(B.page, 'BLAD-sync-B-powitanie');
    await B.page.goto(url('#start'));
    await waitReady(B.page);
    const bCards = await B.page.locator('section[aria-labelledby="na-dzis"] .task-card .meta').allInnerTexts();
    sc.ok(!bCards.some((x) => x === delTitle), `B: usunięta na A pozycja („${delTitle.replace(/\n/g, ' ')}”) nie jest w planie`);
    await checkScreen(B.page, 'sync-B-start');
    await B.page.goto(url(`#zadanie-${tid('MMAP-P0-100-2505', '1')}`));
    await waitReady(B.page);
    sc.ok(await B.page.locator('.feedback').getByText('Wynik: 1 z 1 pkt.').isVisible().catch(() => false), 'B: zadanie rozwiązane na A pokazuje wynik');

    // --- kierunek odwrotny: B → A (A nie odświeża strony) ---
    await solveClosed(B.page, 'MMAP-P0-100-2505', '3', false);
    await sleep(300);
    const bResult = activeResults(await lsState(B.page)).find((e) => e.task === tid('MMAP-P0-100-2505', '3'));
    await B.page.goto(url('#ustawienia'));
    await waitReady(B.page);
    await B.page.getByRole('radiogroup', { name: 'Motyw' }).getByRole('radio', { name: 'ciemny' }).click();
    const aSees = await waitFor(async () => {
      const st = await lsState(A.page);
      return st.events.some((e) => e.id === bResult?.id) && st.stan.theme === 'ciemny';
    }, 10000);
    sc.ok(aSees, 'A (bez odświeżania) widzi wynik i zmianę motywu z B');
    sc.ok((await A.page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark', 'A: motyw ciemny zastosowany na żywo');
    await settle(db);

    // --- konflikt: oba urządzenia zmieniają jednocześnie ---
    await A.page.goto(url('#ustawienia'));
    await waitReady(A.page);
    await settle(db);
    const solveA = solveClosed(B.page, 'MMAP-P0-100-2505', '4');
    const solveB = solveClosed(A.page, 'MMAP-P0-100-2505', '6');
    await Promise.all([solveA, solveB]);
    await A.page.goto(url('#ustawienia'));
    await B.page.goto(url('#ustawienia'));
    await Promise.all([waitReady(A.page), waitReady(B.page)]);
    await Promise.all([
      A.page.locator('#rem-time-h').isEnabled().then(async (en) => {
        if (!en) await A.page.getByRole('switch', { name: 'Przypominaj o nauce' }).check();
        await setTime(A.page, 'rem-time', '20:30');
      }),
      B.page.getByRole('radiogroup', { name: 'Rozmiar tekstu' }).getByRole('radio', { name: 'duży' }).click(),
    ]);
    await settle(db, 3000);
    await sleep(1500);
    const [sa, sb] = [await lsState(A.page), await lsState(B.page)];
    const ids = (st) => new Set(activeResults(st).map((e) => e.task));
    for (const nr of ['1', '3', '4', '6']) {
      const id = tid('MMAP-P0-100-2505', nr);
      sc.ok(ids(sa).has(id) && ids(sb).has(id), `konflikt: wynik zadania ${nr} jest na obu urządzeniach`);
    }
    const dbAll = [...db.docs.entries()].filter(([k]) => k.includes('/wyniki-')).flatMap(([, v]) => JSON.parse(v).events);
    for (const nr of ['4', '6']) sc.ok(dbAll.some((e) => e.k === 'w' && e.task === tid('MMAP-P0-100-2505', nr)), `konflikt: wynik zadania ${nr} jest w db`);
    sc.ok(sa.stan.updatedAt === sb.stan.updatedAt && JSON.stringify(sa.stan) === JSON.stringify(sb.stan), 'konflikt: oba urządzenia mają ten sam stan');
    const keptA = sa.stan.reminder.time === '20:30';
    const keptB = sa.stan.textSize === 'duży';
    t.diagnostic(`konflikt ustawień: godzina z A ${keptA ? 'zachowana' : 'utracona'}, rozmiar tekstu z B ${keptB ? 'zachowany' : 'utracony'} (stan scalany w całości wg updatedAt)`);
    sc.ok(keptA && keptB, `konflikt: obie równoczesne zmiany ustawień zachowane (godzina z A: ${keptA}, rozmiar tekstu z B: ${keptB})`);

    // --- wyczyszczenie localStorage: dane wracają z db ---
    await B.page.evaluate(() => localStorage.clear());
    await B.page.goto(url('#start'));
    await B.page.reload();
    await waitReady(B.page);
    const back = await waitFor(async () => {
      const st = await lsState(B.page);
      return st && st.stan.onboarded && activeResults(st).length >= 4 ? st : null;
    }, 10000);
    sc.ok(!!back, `po wyczyszczeniu localStorage dane wracają z db (wyników: ${back ? activeResults(back).length : 0})`);
    await sleep(800);
    const hashAfterClear = await B.page.evaluate(() => location.hash);
    sc.ok(!/powitanie/.test(hashAfterClear), `po wyczyszczeniu localStorage B nie pokazuje powitania (adres ${hashAfterClear})`);
    if (/powitanie/.test(hashAfterClear)) await shot(B.page, 'BLAD-sync-po-wyczyszczeniu');

    // --- brak zapisów w pętli: 10 s bezczynności ---
    await settle(db, 3000);
    await A.page.goto(url('#start'));
    await B.page.goto(url('#plan'));
    await Promise.all([waitReady(A.page), waitReady(B.page)]);
    await settle(db, 3000);
    const t0 = Date.now();
    await sleep(10_000);
    const idle = db.writesSince(t0);
    sc.ok(idle.length === 0, `10 s bezczynności: ${idle.length} zapisów set/update (${idle.slice(0, 5).map((w) => `${w.ctx}:${w.path.split('/').pop()}`).join(', ')})`);
    // subskrypcje: jedna na stronę
    const subs = await Promise.all([A.page, B.page].map((p) => p.evaluate(() => window.__fakeDbSubs)));
    sc.ok(subs.every((n) => n === 1), `jedna subskrypcja onSnapshot na stronę (jest ${subs.join(', ')})`);

    // --- rozmiar dokumentów ---
    t.diagnostic(`największy dokument: ${db.maxSizePath} (${db.maxSize} B); zapisów razem: ${db.writes.length}`);
    sc.ok(db.maxSize <= DOC_LIMIT && db.rejected.length === 0, `dokumenty ≤ 256 KiB (max ${db.maxSize} B, odrzucone ${db.rejected.length})`);
    for (const e of envs) reportScreens(e.page, t);
  } finally {
    for (const e of envs) await e.ctx.close().catch(() => {});
  }
  sc.done();
});

test('10b. Duża historia: wyniki dzielone na dokumenty ≤ 256 KiB', { timeout: 120_000 }, async (t) => {
  const db = new FakeDb();
  const sc = softChecks(t);
  const ex = rawTask('MMAP-P0-100-2505', '1');
  const events = [];
  const at = Date.parse('2026-11-01T10:00:00Z');
  for (let i = 0; i < 4000; i++) {
    const d = `2026-11-${String(1 + (i % 22)).padStart(2, '0')}`;
    events.push({ id: `w-big-${i}`, k: 'w', at: at + i * 1000, d, task: tid('MMAP-P0-100-2505', '1'), subj: 'mat-p', topics: ex.topics, pts: i % 2, max: 1, sec: 60, src: 'zadanie', choice: { 1: 'B' }, note: 'Notatka do błędu, żeby wynik był dłuższy niż zwykle.' });
  }
  const C = await device(db, 'C', 'komputer', seedState({ events }));
  try {
    await settle(db, 3000, 30000);
    const parts = [...db.docs.keys()].filter((k) => k.includes('/wyniki-'));
    const stored = parts.flatMap((k) => JSON.parse(db.docs.get(k)).events).length;
    t.diagnostic(`dokumenty wyników: ${parts.map((k) => `${k.split('/').pop()} (${Buffer.byteLength(db.docs.get(k))} B)`).join(', ')}`);
    sc.ok(db.maxSize <= DOC_LIMIT && db.rejected.length === 0, `wszystkie dokumenty ≤ 256 KiB (max ${db.maxSize} B, odrzucone ${db.rejected.length})`);
    sc.ok(stored === events.length, `wszystkie ${events.length} zdarzeń trafiły do db (jest ${stored})`);
    const t0 = Date.now();
    await sleep(10_000);
    sc.ok(db.writesSince(t0).length === 0, `10 s bezczynności bez zapisów (jest ${db.writesSince(t0).length})`);
    reportScreens(C.page, t);
  } finally {
    await C.ctx.close().catch(() => {});
  }
  sc.done();
});
