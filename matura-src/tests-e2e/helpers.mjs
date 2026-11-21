// Wspólne narzędzia testów w przeglądarce (Playwright jako biblioteka + node:test).
// Uruchomienie: npm run e2e   (serwer Vite na porcie 5191 startuje sam, jeśli nie działa)
// Zmienne: E2E_BASE (adres serwera), E2E_SHOTS (katalog zrzutów), E2E_HEADED=1.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PORT = 5191;
export const BASE = process.env.E2E_BASE ?? `http://localhost:${PORT}/`;
export const SHOTS =
  process.env.E2E_SHOTS ??
  '/private/tmp/claude-501/-Users-franekjanas-Desktop-Nowy-folder-z-rzeczami/bf21fc26-7b52-4e01-90fa-fec68dcd981b/scratchpad/e2e';
mkdirSync(SHOTS, { recursive: true });

/** Stała „dzisiejsza” data dla planu (parametr ?dzis=), poniedziałek. */
export const TODAY = '2026-11-23';
export const url = (hash = '#start', today = TODAY) => `${BASE}?dzis=${today}${hash}`;

export const EXAMS = JSON.parse(readFileSync(path.join(ROOT, 'data/exams.json'), 'utf8')).exams;
export const KRYTERIA = JSON.parse(readFileSync(path.join(ROOT, 'data/kryteria.json'), 'utf8'));
export const tid = (examId, nr) => `${examId}-n${nr.replace(/[^A-Za-z0-9]+/g, '-')}`;
export const exam = (id) => EXAMS.find((e) => e.id === id);
export const rawTask = (examId, nr) => exam(examId).tasks.find((t) => t.nr === nr);

export const DEVICES = {
  telefon: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  komputer: { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
};

// ---------- serwer ----------

let viteServer = null;
export async function ensureServer() {
  try {
    const r = await fetch(BASE);
    if (r.ok) return;
  } catch {
    /* uruchamiam */
  }
  const { createServer } = await import('vite');
  viteServer = await createServer({ root: ROOT, logLevel: 'error', server: { port: PORT, strictPort: true } });
  await viteServer.listen();
}
export async function stopServer() {
  if (viteServer) await viteServer.close();
  viteServer = null;
}

let browser = null;
export async function getBrowser() {
  if (!browser) browser = await chromium.launch({ headless: !process.env.E2E_HEADED, args: ['--autoplay-policy=no-user-gesture-required'] });
  return browser;
}
export async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
}

// ---------- stan ucznia do wstrzyknięcia ----------

export function seedState(over = {}) {
  return {
    stan: {
      typ: 'stan', v: 3, updatedAt: 1, onboarded: true, startedAt: TODAY,
      enabled: { 'mat-p': true, 'mat-r': true, 'pol-p': true, 'ang-p': true },
      dayMinutes: [90, 45, 45, 45, 45, 45, 90],
      tutoring: { enabled: true, weekday: 6, start: '15:15', minutes: 60 },
      reminder: { enabled: false, time: '18:00' }, theme: 'system', textSize: 'normalny',
      overrides: {}, reported: [], userTasks: [], notifiedOn: null, resetAt: 0,
      ...(over.stan ?? {}),
    },
    events: over.events ?? [],
    sessions: over.sessions ?? {},
    essays: over.essays ?? [],
  };
}

// ---------- kontekst i strona ----------

/**
 * Nowy kontekst urządzenia. `state` (opcjonalny) trafia do localStorage tylko
 * przy pierwszym wczytaniu karty (sessionStorage), więc odświeżenie strony
 * zachowuje to, co zapisała aplikacja.
 */
export async function openApp(device, { state = null, hash = '#start', today = TODAY, initScripts = [], go = true } = {}) {
  const b = await getBrowser();
  const ctx = await b.newContext({ ...DEVICES[device], locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
  for (const s of initScripts) await ctx.addInitScript(s.fn, s.arg);
  if (state) {
    await ctx.addInitScript((s) => {
      try {
        if (!sessionStorage.getItem('e2e-zainicjowano')) {
          localStorage.setItem('matura2027-v3', JSON.stringify(s));
          sessionStorage.setItem('e2e-zainicjowano', '1');
        }
      } catch {
        /* */
      }
    }, state);
  }
  const page = await ctx.newPage();
  const log = { errors: [], soft: [] };
  page.on('pageerror', (e) => log.errors.push(`pageerror: ${String(e)}`));
  page.on('console', (m) => {
    if (m.type() === 'error') log.errors.push(`console.error: ${m.text()}`);
  });
  page.e2e = { device, log };
  if (go) {
    await page.goto(url(hash, today));
    await waitReady(page);
  }
  return { ctx, page, log };
}

/** Czeka, aż pakiety zadań się wczytają (znika „Ładowanie zadań…” w kluczowych miejscach). */
export async function waitReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => document.querySelector('#root')?.children.length > 0, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page
    .waitForFunction(() => !/Ładowanie zadań…/.test(document.body.innerText), null, { timeout: 20000 })
    .catch(() => {});
}

export async function shot(page, name) {
  const file = path.join(SHOTS, `${page.e2e?.device ?? 'x'}-${name.replace(/[^\w.-]+/g, '_')}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  return file;
}

const BANNED = [/\bREADME\b/i, /\bskrypt\w*/i, /\bundefined\b/, /\bNaN\b/, /\bnull\b/, /\[object Object\]/];

/**
 * Wymagania z każdego ekranu: brak błędów w konsoli, brak poziomego przewijania,
 * przyciski ≥ 44 px na telefonie, brak tekstów programisty. Zwraca listę problemów
 * (i dopisuje ją do page.e2e.log.soft).
 */
export async function checkScreen(page, label) {
  await page.waitForTimeout(250);
  const device = page.e2e.device;
  const r = await page.evaluate((phone) => {
    const out = { scroll: null, small: [], smallHidden: [], banned: [] };
    const sw = document.documentElement.scrollWidth;
    if (sw > window.innerWidth) out.scroll = `${sw} > ${window.innerWidth}`;
    if (phone) {
      for (const el of document.querySelectorAll('button, a.btn, [role="button"], [role="radio"], [role="link"], a.navitem')) {
        const st = getComputedStyle(el);
        if (st.visibility === 'hidden' || st.display === 'none') continue;
        const rc = el.getBoundingClientRect();
        if (rc.width === 0 || rc.height === 0) continue;
        if (el.closest('.sr-only')) continue;
        if (rc.height < 43.5) {
          const name = (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().slice(0, 40);
          const desc = `${name} (${Math.round(rc.height)} px)`;
          if (el.closest('[aria-hidden="true"]')) out.smallHidden.push(desc);
          else out.small.push(desc);
        }
      }
    }
    // Streszczenia zadań CKE (.clamp1, .clamp2) to treść arkuszy, nie teksty programisty.
    let body = document.body.innerText;
    for (const el of document.querySelectorAll('.clamp1, .clamp2')) body = body.split(el.innerText).join(' ');
    const texts = [body];
    for (const el of document.querySelectorAll('[aria-label],[title],img[alt],[placeholder]')) {
      for (const a of ['aria-label', 'title', 'alt', 'placeholder']) if (el.getAttribute(a)) texts.push(el.getAttribute(a));
    }
    out.text = texts.join('\n');
    return out;
  }, device === 'telefon');
  const problems = [];
  if (r.scroll) problems.push(`[${label}] poziome przewijanie: scrollWidth ${r.scroll}`);
  const uniq = (a) => [...new Set(a)];
  if (r.small.length) problems.push(`[${label}] przyciski < 44 px: ${uniq(r.small).slice(0, 12).join('; ')}`);
  if (r.smallHidden.length) problems.push(`[${label}] (uwaga) małe przyciski ukryte dla czytników (aria-hidden): ${uniq(r.smallHidden).length} szt., np. ${uniq(r.smallHidden).slice(0, 3).join('; ')}`);
  for (const re of BANNED) {
    const m = r.text.match(new RegExp(`.{0,40}${re.source}.{0,40}`, re.flags));
    if (m) problems.push(`[${label}] tekst programisty ${re}: „${m[0].replace(/\s+/g, ' ')}”`);
  }
  if (page.e2e.log.errors.length) {
    problems.push(`[${label}] błędy konsoli: ${uniq(page.e2e.log.errors).slice(0, 5).join(' | ').slice(0, 600)}`);
    page.e2e.log.errors.length = 0;
  }
  if (problems.length) {
    const f = await shot(page, `ekran-${label}`);
    problems.push(`[${label}] zrzut: ${f}`);
  }
  page.e2e.log.soft.push(...problems);
  return problems;
}

/** Problemy z ekranów (13), bez tych oznaczonych „(uwaga)”. */
export function hardProblems(page) {
  return page.e2e.log.soft.filter((p) => !p.includes('(uwaga)') && !p.includes('zrzut:'));
}

/** Wypisuje wszystkie problemy ekranów do konsoli testu (trafiają do raportu). */
export function reportScreens(page, t) {
  for (const p of page.e2e.log.soft) t.diagnostic(p);
}

// ---------- oczekiwane wyniki z exams.json (niezależnie od kodu aplikacji) ----------

/** Punkty za zadanie zamknięte wg answer.scoring z exams.json. */
export function expectedClosed(task, choice) {
  const a = task.answer;
  const items = a.items;
  let correct = 0;
  const unordered = items.length > 1 && items.every((i) => i.options.join() === items[0].options.join()) && items.every((i) => /alfabetycznie/i.test(i.label ?? ''));
  if (unordered) {
    const left = items.map((i) => i.correct);
    for (const it of items) {
      const k = left.indexOf(choice[it.id]);
      if (k >= 0) {
        left.splice(k, 1);
        correct++;
      }
    }
  } else for (const it of items) if (choice[it.id] != null && choice[it.id] === it.correct) correct++;
  let pts;
  if (a.scoring === 'each') pts = correct;
  else if (a.scoring === 'all') pts = correct === items.length ? task.maxPoints : 0;
  else pts = a.scoring[String(correct)] ?? 0;
  return Math.max(0, Math.min(task.maxPoints, pts));
}

/** Czy zadanie jest sprawdzane automatycznie (zamknięte z pełnym kluczem). */
export function isAuto(task) {
  return task.type === 'zamknięte' && task.answer && task.answer.items.length > 0 && task.answer.items.every((i) => i.correct != null && i.options.includes(i.correct));
}

/** Błędna opcja dla pozycji. */
export function wrongOf(item) {
  return item.options.find((o) => o !== item.correct);
}

export function parseClock(s) {
  // „2:59:12”, „59:12”
  const parts = s.trim().split(':').map(Number);
  return parts.reduce((a, b) => a * 60 + b, 0) * 1000;
}

export function lsState(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('matura2027-v3') ?? 'null');
    } catch {
      return null;
    }
  });
}

/** Kliknięcie przycisku widocznego na danym urządzeniu (przyciski mają wersje only-phone / only-desk). */
export async function clickVisible(page, name, opts = {}) {
  const loc = page.getByRole('button', { name, exact: opts.exact ?? true });
  const n = await loc.count();
  for (let i = 0; i < n; i++) {
    const el = loc.nth(i);
    if (await el.isVisible()) {
      await el.click(opts);
      return;
    }
  }
  throw new Error(`Brak widocznego przycisku „${name}” (znaleziono ${n})`);
}

export async function visibleButton(page, name, exact = true) {
  const loc = page.getByRole('button', { name, exact });
  const n = await loc.count();
  for (let i = 0; i < n; i++) if (await loc.nth(i).isVisible()) return loc.nth(i);
  return null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Obraz w kartce się wczytał (naturalWidth > 0). */
export async function imagesLoaded(page, selector = '.kartka img') {
  await page.waitForSelector(selector, { timeout: 20000 });
  await page.waitForFunction((sel) => [...document.querySelectorAll(sel)].every((i) => i.complete), selector, { timeout: 15000 });
  return page.$$eval(selector, (imgs) => imgs.map((i) => ({ alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })));
}

/** Wykonuje fn dla telefonu i komputera jako osobne testy. */
export function bothDevices(test, name, fn, opts = {}) {
  for (const device of opts.devices ?? ['telefon', 'komputer']) {
    test(`${name} [${device}]`, { timeout: opts.timeout ?? 120_000 }, async (t) => {
      let env = null;
      try {
        env = await fn(t, device, (e) => (env = e));
      } catch (e) {
        if (env?.page) t.diagnostic(`ZRZUT BŁĘDU: ${await shot(env.page, `BLAD-${name}`)} (adres: ${env.page.url()})`);
        throw e;
      } finally {
        if (env?.page) reportScreens(env.page, t);
        if (env?.ctx) await env.ctx.close().catch(() => {});
      }
    });
  }
}

/** Miękkie sprawdzenia: test idzie dalej, a na końcu zgłasza wszystkie niepowodzenia. */
export function softChecks(t) {
  const fails = [];
  return {
    fails,
    ok(cond, msg) {
      if (!cond) {
        fails.push(msg);
        t.diagnostic(`NIEPOWODZENIE: ${msg}`);
      }
      return !!cond;
    },
    async step(name, fn) {
      try {
        await fn();
      } catch (e) {
        const msg = `${name}: ${String(e.message ?? e).split('\n')[0]}`;
        fails.push(msg);
        t.diagnostic(`NIEPOWODZENIE: ${msg}`);
      }
    },
    done() {
      assert.deepEqual(fails, [], 'niepowodzenia w teście');
    },
  };
}

const OPT_NAMES = { P: 'P, prawda', F: 'F, fałsz', T: 'T, tak', N: 'N, nie' };
/** Zaznacza odpowiedzi w karcie A–D (arkusz, diagnoza, zadanie). */
export async function answerClosed(page, task, choice, scope = page) {
  const unordered = task.answer.items.length > 1 && task.answer.items.every((i) => /alfabetycznie/i.test(i.label ?? ''));
  if (unordered) {
    for (const v of new Set(Object.values(choice))) await scope.locator('.abcd').getByRole('checkbox', { name: v, exact: true }).click();
    return;
  }
  const groups = scope.locator('.abcd [role="radiogroup"]');
  for (let i = 0; i < task.answer.items.length; i++) {
    const it = task.answer.items[i];
    const v = choice[it.id];
    if (!v) continue;
    await groups.nth(i).getByRole('radio', { name: OPT_NAMES[v] ?? v, exact: true }).click();
  }
}


/** Stan ucznia po diagnozach wszystkich przedmiotów (wczoraj), z kilkoma wynikami. */
export function diagnosedState(over = {}) {
  const at = Date.parse('2026-11-22T17:00:00Z');
  const events = [];
  const subj = ['mat-p', 'mat-r', 'pol-p', 'ang-p'];
  subj.forEach((s, i) => {
    events.push({ id: `s-diag-${s}`, k: 's', at: at + i * 1000, d: '2026-11-22', mode: 'diagnoza', exam: null, part: null, subj: s, pts: 4, max: 8, graded: 6, total: 6, sec: 1500, perTopic: {}, session: `diag-${s}` });
  });
  const mp = exam('MMAP-P0-100-2305');
  mp.tasks.filter((t) => t.answer && t.topics.length).slice(0, 6).forEach((t, i) => {
    events.push({ id: `w-seed-${i}`, k: 'w', at: at - 5000 + i, d: '2026-11-22', task: tid(mp.id, t.nr), subj: 'mat-p', topics: t.topics, pts: i % 2 ? t.maxPoints : 0, max: t.maxPoints, sec: 120, src: 'diagnoza', session: 'diag-mat-p' });
  });
  return seedState({ ...over, events: [...events, ...(over.events ?? [])] });
}

/** Ustawia godzinę w polu z dwiema listami (godzina i minuty), np. id „rem-time”. */
export async function setTime(page, id, value) {
  const [h, m] = value.split(':');
  await page.locator(`#${id}-h`).selectOption(h);
  await page.locator(`#${id}-m`).selectOption(m);
}

/** Odczyt godziny z pola z dwiema listami. */
export async function getTime(page, id) {
  return `${await page.locator(`#${id}-h`).inputValue()}:${await page.locator(`#${id}-m`).inputValue()}`;
}
