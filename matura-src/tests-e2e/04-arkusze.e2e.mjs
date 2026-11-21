// 7. Arkusz próbny (matematyka podstawowa 2025, angielski 2025) z odświeżeniem w trakcie,
// 8. odtwarzacz nagrania przy zadaniu ze słuchania.
import { test, before, after } from 'node:test';
import {
  ensureServer, closeBrowser, openApp, bothDevices, checkScreen, lsState, clickVisible, waitReady, diagnosedState, softChecks,
  exam, tid, url, expectedClosed, isAuto, wrongOf, imagesLoaded, sleep, answerClosed, parseClock, shot, KRYTERIA,
} from './helpers.mjs';

before(ensureServer);
after(closeBrowser);

async function session(page, examId) {
  const st = await lsState(page);
  return Object.values(st.sessions).find((s) => s.mode === 'arkusz' && s.examId === examId);
}
const elapsedOf = (s, now) => s.elapsedMs + (s.runningSince != null ? Math.max(0, now - s.runningSince) : 0);

async function timerMs(page) {
  const txt = await page.locator('.focus-head [role="timer"]').innerText();
  return parseClock(txt.replace(/do końca/, '').trim());
}

async function currentNr(page) {
  const label = await page.locator('.focus-body .meta .small.muted').first().innerText();
  return label;
}

async function goToTask(page, idx) {
  await clickVisible(page, 'Spis');
  const dlg = page.getByRole('dialog', { name: 'Spis zadań' });
  await dlg.locator('.numgrid button').nth(idx).click();
  await sleep(200);
}

/**
 * Wspólny przebieg arkusza. plan: lista [nr, 'dobrze'|'źle'|'kartka'|'tekst'|'flaga'].
 */
async function runExam(t, page, sc, examId, plan, grades, label) {
  const ex = exam(examId);
  const ids = ex.tasks.map((x) => tid(examId, x.nr));
  await page.goto(url(`#arkusz-${examId}`));
  await waitReady(page);
  await checkScreen(page, `${label}-przed-startem`);
  await clickVisible(page, 'Zacznij arkusz');
  await page.getByText(`Zad. 1 z ${ids.length}`).waitFor();
  const t0 = Date.now();
  const startMs = await timerMs(page);
  sc.ok(Math.abs(startMs - ex.minutes * 60_000) < 3000, `${label}: odliczanie zaczyna się od ${ex.minutes} min (jest ${Math.round(startMs / 1000)} s)`);
  const imgs = await imagesLoaded(page);
  sc.ok(imgs[0]?.w > 0, `${label}: obraz pierwszego zadania wczytany`);
  await checkScreen(page, `${label}-w-trakcie`);

  const choices = {};
  const half = Math.ceil(plan.length / 2);
  const doStep = async ([nr, how]) => {
    const raw = ex.tasks.find((x) => x.nr === nr);
    await goToTask(page, ex.tasks.indexOf(raw));
    await page.getByText(`Zad. ${ex.tasks.indexOf(raw) + 1} z ${ids.length}`).waitFor();
    if (how === 'dobrze' || how === 'źle') {
      const ch = Object.fromEntries(raw.answer.items.map((it, i) => [it.id, how === 'źle' && i === 0 ? wrongOf(it) : it.correct]));
      choices[tid(examId, nr)] = ch;
      await answerClosed(page, raw, ch);
    } else if (how === 'kartka') {
      await page.getByRole('switch', { name: 'Zrobione na kartce' }).check();
    } else if (how === 'tekst') {
      await page.locator('.focus-body textarea').fill('I am writing to tell you about my weekend. ' .repeat(12));
      await sleep(5600); // autozapis w arkuszu co 5 s
    } else if (how === 'flaga') {
      await page.getByRole('button', { name: 'Oznacz do powrotu' }).click();
      await page.getByRole('button', { name: 'Oznaczone do powrotu' }).waitFor();
    }
    await sleep(350);
  };
  for (const st of plan.slice(0, half)) await doStep(st);

  // --- odświeżenie strony w trakcie ---
  await sleep(5500); // co najmniej jeden „puls” sesji
  const sBefore = await session(page, examId);
  const nowBefore = Date.now();
  const leftBefore = sBefore.limitMs - elapsedOf(sBefore, nowBefore);
  const shownBefore = await timerMs(page);
  const curBefore = await currentNr(page);
  const tReload = Date.now();
  await page.reload();
  await waitReady(page);
  await page.getByText(/Zad\. \d+ z \d+/).waitFor();
  await sleep(1500);
  const realGap = Date.now() - tReload;
  const shownAfter = await timerMs(page);
  const sAfter = await session(page, examId);
  const leftAfter = sAfter.limitMs - elapsedOf(sAfter, Date.now());
  t.diagnostic(`${label}: zegar przed odświeżeniem ${Math.round(shownBefore / 1000)} s, po ${Math.round(shownAfter / 1000)} s; odświeżenie trwało ${Math.round(realGap / 1000)} s`);
  sc.ok(shownAfter < ex.minutes * 60_000 - 5000, `${label}: po odświeżeniu czas nie wraca do pełnego limitu (${Math.round(shownAfter / 1000)} s)`);
  sc.ok(shownAfter <= shownBefore + 1500, `${label}: po odświeżeniu pozostały czas nie rośnie (przed ${Math.round(shownBefore / 1000)} s, po ${Math.round(shownAfter / 1000)} s)`);
  sc.ok(shownBefore - shownAfter <= realGap + 2500, `${label}: czas nie ubywa ponad rzeczywisty (ubyło ${Math.round((shownBefore - shownAfter) / 1000)} s przy ${Math.round(realGap / 1000)} s przerwy)`);
  sc.ok(Math.abs(leftAfter - shownAfter) < 2500, `${label}: zegar zgodny z sesją w pamięci`);
  sc.ok(JSON.stringify(sAfter.answers) === JSON.stringify(sBefore.answers), `${label}: odpowiedzi po odświeżeniu takie same`);
  sc.ok((await currentNr(page)) === curBefore, `${label}: po odświeżeniu to samo zadanie (${curBefore})`);
  for (const [id, ch] of Object.entries(choices)) {
    // UI: zaznaczone pola po odświeżeniu (sprawdzane przy przejściu do zadania)
    const idx = ids.indexOf(id);
    await goToTask(page, idx);
    const sel = await page.locator('.abcd [aria-checked="true"]').allInnerTexts();
    const exp = Object.values(ch);
    sc.ok(sel.map((x) => x.trim()).join(',') === exp.join(','), `${label}: zadanie ${ex.tasks[idx].nr} po odświeżeniu ma zaznaczone ${exp.join(',')} (jest ${sel.join(',')})`);
  }
  await clickVisible(page, 'Spis');
  const flagged = await page.getByRole('dialog', { name: 'Spis zadań' }).locator('.numgrid button.flag').count();
  sc.ok(flagged === plan.filter((p) => p[1] === 'flaga').length, `${label}: oznaczenie do powrotu po odświeżeniu (${flagged})`);
  await checkScreen(page, `${label}-spis`);
  await page.getByRole('dialog', { name: 'Spis zadań' }).getByRole('button', { name: 'Zamknij' }).click();

  // --- wyjście do innego widoku i powrót ---
  await page.getByRole('button', { name: 'Przerwij' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Przerwij', exact: true }).click();
  await page.waitForURL((u) => !/#arkusz-/.test(u.hash));
  const leftAtExit = await (async () => {
    await sleep(400);
    const s = await session(page, examId);
    return s.limitMs - elapsedOf(s, Date.now());
  })();
  const sExit = await session(page, examId);
  sc.ok(sExit.runningSince == null, `${label}: po wyjściu z arkusza czas jest wstrzymany`);
  await page.goto(url('#arkusze'));
  await waitReady(page);
  const card = page.locator('.task-card', { hasText: ex.year.toString() }).filter({ has: page.getByRole('button', { name: 'Wróć do arkusza' }) });
  sc.ok((await card.count()) >= 1, `${label}: na liście arkuszy jest „Wróć do arkusza”`);
  await checkScreen(page, `${label}-lista-arkuszy`);
  await sleep(3000);
  await card.first().getByRole('button', { name: 'Wróć do arkusza' }).click();
  await page.getByText(/Zad\. \d+ z \d+/).waitFor();
  await sleep(1200);
  const shownBack = await timerMs(page);
  sc.ok(Math.abs(shownBack - leftAtExit) < 3000, `${label}: czas poza arkuszem nie jest liczony (przy wyjściu ${Math.round(leftAtExit / 1000)} s, po powrocie ${Math.round(shownBack / 1000)} s)`);

  for (const st of plan.slice(half)) await doStep(st);

  // --- zakończenie ---
  await clickVisible(page, 'Spis');
  await page.getByRole('dialog', { name: 'Spis zadań' }).getByRole('button', { name: 'Zakończ arkusz' }).click();
  const confirm = page.getByRole('dialog', { name: 'Zakończyć arkusz?' });
  await confirm.waitFor();
  await confirm.getByRole('button', { name: 'Zakończ', exact: true }).click();

  // samoocena otwartych
  let expectedOpen = 0;
  const gradedOpen = [];
  for (let g = 0; g < 40; g++) {
    const head = page.getByText(/^Ocena: \d+ z \d+$/);
    if (!(await head.isVisible().catch(() => false))) {
      await sleep(500);
      if (!(await head.isVisible().catch(() => false))) break;
    }
    const [, cur, all] = (await head.innerText()).match(/Ocena: (\d+) z (\d+)/);
    if (g === 0) {
      const odp = await imagesLoaded(page, '.side .kartka img');
      sc.ok(odp[0]?.w > 0, `${label}: przy samoocenie widać obraz z zasad oceniania`);
      await checkScreen(page, `${label}-samoocena`);
    }
    const meta = await page.locator('.focus-body .meta .small.muted').first().innerText();
    const nr = meta.match(/zad\. ([^,]+),/)?.[1];
    const raw = ex.tasks.find((x) => x.nr === nr);
    if (raw?.essay) {
      const set = KRYTERIA[raw.essay.criteria];
      let sum = 0;
      for (const c of set.groups.flatMap((gr) => gr.criteria)) {
        const v = c.values[Math.min(1, c.values.length - 1)];
        await page.getByRole('radiogroup', { name: c.name, exact: true }).getByRole('radio', { name: String(v).replace('.', ','), exact: true }).click();
        sum += v;
      }
      expectedOpen += Math.min(raw.maxPoints, sum);
      gradedOpen.push(`${nr}:${sum}`);
    } else {
      const v = grades[nr] ?? 0;
      await page.getByRole('radiogroup', { name: 'Ile punktów przyznajesz sobie?' }).getByRole('radio', { name: String(v), exact: true }).click();
      expectedOpen += v;
      gradedOpen.push(`${nr}:${v}`);
    }
    await clickVisible(page, cur === all ? 'Pokaż wynik' : 'Dalej');
    await sleep(250);
  }
  t.diagnostic(`${label}: samoocena ${gradedOpen.join(' ')}`);
  await page.getByText('Wynik arkusza').first().waitFor({ timeout: 8000 });
  let expectedClosedPts = 0;
  let closedMax = 0;
  for (const raw of ex.tasks) {
    if (!isAuto(raw)) continue;
    closedMax += raw.maxPoints;
    const ch = choices[tid(examId, raw.nr)];
    if (ch) expectedClosedPts += expectedClosed(raw, ch);
  }
  const total = expectedClosedPts + expectedOpen;
  const max = ex.maxPoints;
  const big = (await page.locator('.big').first().innerText()).trim();
  const pctExp = Math.round((total / max) * 100);
  sc.ok(big === `${total} z ${max}, ${pctExp}%`, `${label}: wynik oczekiwany „${total} z ${max}, ${pctExp}%” (zamknięte ${expectedClosedPts}/${closedMax}, otwarte ${expectedOpen}), jest „${big}”`);
  const pageText = await page.locator('.focus-body').innerText();
  sc.ok(pageText.includes(`Zamknięte: ${expectedClosedPts} z ${closedMax} pkt`), `${label}: „Zamknięte: ${expectedClosedPts} z ${closedMax} pkt”`);
  const m = pageText.match(/Ocenione (\d+) z (\d+) zadań\. Czas: ([^.]+)\./);
  sc.ok(!!m, `${label}: wiersz „Ocenione … Czas: …” (${m?.[0]})`);
  if (m) {
    sc.ok(/\d+ s/.test(m[3]), `${label}: czas z sekundami (${m[3]})`);
  }
  await checkScreen(page, `${label}-wynik`);
  await sleep(600);
  const ev = (await lsState(page)).events.filter((e) => e.k === 's' && e.exam === examId);
  sc.ok(ev.length === 1 && ev[0].pts === total, `${label}: zdarzenie wyniku arkusza ${total} pkt (jest ${ev.map((e) => e.pts)})`);
  t.diagnostic(`${label}: cały arkusz trwał ${Math.round((Date.now() - t0) / 1000)} s`);
}

bothDevices(test, '7a. Arkusz: matematyka podstawowa 2025', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#arkusze' });
  use(env);
  const sc = softChecks(t);
  await runExam(t, env.page, sc, 'MMAP-P0-100-2505', [
    ['1', 'dobrze'], ['2', 'źle'], ['3', 'dobrze'], ['3', 'flaga'], ['5', 'kartka'], ['14.2', 'dobrze'],
    ['21', 'źle'], ['24', 'dobrze'], ['31', 'kartka'],
  ], { 5: 2, 31: 3 }, 'mat-p-2025');
  if (sc.fails.length) await shot(env.page, 'BLAD-arkusz-mat');
  sc.done();
  return env;
}, { timeout: 300_000 });

bothDevices(test, '7b. Arkusz: angielski 2025', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#arkusze' });
  use(env);
  const sc = softChecks(t);
  await runExam(t, env.page, sc, 'MJAP-P0-100-2505', [
    ['1', 'dobrze'], ['2', 'źle'], ['4', 'flaga'], ['6', 'dobrze'], ['8', 'źle'], ['12', 'tekst'],
  ], { 3: 2, '5.4-5.7': 1 }, 'ang-2025');
  if (sc.fails.length) await shot(env.page, 'BLAD-arkusz-ang');
  sc.done();
  return env;
}, { timeout: 300_000 });

async function checkAudio(t, page, sc, label, examId, nr) {
  const raw = exam(examId).tasks.find((x) => x.nr === nr);
  const player = page.locator('.player').first();
  await player.waitFor();
  await checkScreen(page, `${label}-odtwarzacz`);
  const pre = await page.$eval('.player audio', (a) => ({ src: a.getAttribute('src'), paused: a.paused }));
  sc.ok(pre.paused, `${label}: nagranie nie gra przed kliknięciem`);
  await player.getByRole('button', { name: 'Odtwórz nagranie' }).click();
  await page.waitForFunction(() => {
    const a = document.querySelector('.player audio');
    return a && !a.paused && a.readyState >= 2;
  }, null, { timeout: 15000 }).catch(() => {});
  await sleep(1200);
  const st = await page.$eval('.player audio', (a) => ({ src: a.getAttribute('src'), full: a.currentSrc, t: a.currentTime, rs: a.readyState, dur: a.duration, paused: a.paused, err: a.error?.code ?? null }));
  t.diagnostic(`${label}: audio ${JSON.stringify(st)}`);
  sc.ok(st.src === `cke/${examId}.mp3`, `${label}: src = cke/${examId}.mp3 (jest ${st.src})`);
  sc.ok(st.err == null && st.rs >= 1 && st.dur > 60, `${label}: plik się wczytał (readyState ${st.rs}, duration ${st.dur})`);
  sc.ok(!st.paused, `${label}: odtwarzanie trwa`);
  const start = raw.audio?.start ?? 0;
  sc.ok(st.t >= start - 0.1 && st.t < start + 6, `${label}: currentTime zaczyna się od audio.start=${start} (jest ${st.t.toFixed(2)})`);
  const r = await fetch(new URL(`cke/${examId}.mp3`, page.url()));
  sc.ok(r.ok && /audio/.test(r.headers.get('content-type') ?? ''), `${label}: serwer podaje mp3 (${r.status} ${r.headers.get('content-type')})`);
  // w arkuszu nagranie (z oboma odczytaniami) gra bez pauzy, jak na egzaminie
  if (label.startsWith('arkusz')) sc.ok(await player.getByRole('button', { name: 'Nagranie trwa' }).isDisabled(), `${label}: w arkuszu nie ma pauzy`);
  else await player.getByRole('button', { name: 'Wstrzymaj nagranie' }).click();
}

bothDevices(test, '8. Angielski: odtwarzacz nagrania', async (t, device, use) => {
  const env = await openApp(device, { state: diagnosedState(), hash: '#start' });
  use(env);
  const { page } = env;
  const sc = softChecks(t);
  // tryb nauki (pojedyncze zadanie), zadanie 2: start 510 s
  await page.goto(url(`#zadanie-${tid('MJAP-P0-100-2505', '2')}`));
  await waitReady(page);
  await checkAudio(t, page, sc, 'zadanie-2', 'MJAP-P0-100-2505', '2');
  // tryb nauki: przycisk „Cofnij 5 s” nie schodzi przed początek fragmentu
  await page.getByRole('button', { name: 'Cofnij 5 s' }).click();
  await page.getByRole('button', { name: 'Cofnij 5 s' }).click();
  const tt = await page.$eval('.player audio', (a) => a.currentTime);
  sc.ok(tt >= 510 - 0.1, `„Cofnij 5 s” nie wychodzi przed początek fragmentu (${tt.toFixed(1)})`);
  // arkusz (tryb egzaminu), zadanie 1: start 33,5 s, licznik odtworzeń
  await page.goto(url('#arkusz-MJAP-P0-100-2505'));
  await waitReady(page);
  await clickVisible(page, 'Zacznij arkusz');
  await page.getByText('Zad. 1 z 13').waitFor();
  await checkAudio(t, page, sc, 'arkusz-zad-1', 'MJAP-P0-100-2505', '1');
  sc.ok(await page.locator('.player').getByText('odtworzono 1 z 1').isVisible(), 'licznik odtworzeń 1 z 1 (fragment ma oba odczytania)');
  sc.ok(await page.locator('.player input[type="range"]').isDisabled(), 'w arkuszu nie da się przewijać');
  if (sc.fails.length) await shot(page, 'BLAD-audio');
  sc.done();
  return env;
});
