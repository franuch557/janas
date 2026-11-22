// Zrzuty ekranu kluczowych widoków (Playwright + serwer Vite w tym samym procesie).
// Użycie: node tools/zrzuty.mjs <katalog wyjściowy> [filtr nazw]
// Stan ucznia do zrzutów jest wstrzykiwany do localStorage przed wczytaniem strony;
// aplikacja nie ma trybu przykładowych danych.
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sampleScript } from '../tests-e2e/fake-sample.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = process.argv[2] ?? 'zrzuty';
const only = process.argv[3] ?? '';
mkdirSync(out, { recursive: true });
const exams = JSON.parse(readFileSync(`${root}data/exams.json`, 'utf8')).exams;
const tid = (e, nr) => `${e}-n${nr.replace(/[^A-Za-z0-9]+/g, '-')}`;

const TODAY = '2026-11-21';
function state(onboarded = true) {
  const mp = exams.find((e) => e.id === 'MMAP-P0-100-2305');
  const closed = mp.tasks.filter((t) => t.answer && t.topics.length).slice(0, 8);
  const events = [];
  let at = Date.parse('2026-11-17T17:00:00');
  const days = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'];
  closed.forEach((t, i) => {
    const d = days[i % days.length];
    events.push({ id: `w-z${i}`, k: 'w', at: at + i * 1000, d, task: tid(mp.id, t.nr), subj: 'mat-p', topics: t.topics, pts: i % 3 ? t.maxPoints : 0, max: t.maxPoints, sec: 180, src: i < 6 ? 'diagnoza' : 'zadanie', session: i < 6 ? 'diag-1' : undefined });
  });
  events.push({ id: 's-diag', k: 's', at: at + 9000, d: '2026-11-17', mode: 'diagnoza', exam: null, part: null, subj: 'mat-p', pts: 4, max: 6, graded: 6, total: 6, sec: 1500, perTopic: {}, session: 'diag-1' });
  return {
    stan: {
      typ: 'stan', v: 3, updatedAt: 1, onboarded, startedAt: '2026-11-17',
      enabled: { 'mat-p': true, 'mat-r': true, 'pol-p': true, 'ang-p': true },
      dayMinutes: [90, 45, 45, 45, 45, 45, 90],
      tutoring: { enabled: true, weekday: 6, start: '15:15', minutes: 60 },
      reminder: { enabled: true, time: '18:00' }, theme: 'system', textSize: 'normalny',
      overrides: {}, reported: [], userTasks: [], notifiedOn: null, resetAt: 0,
    },
    events: onboarded ? events : [],
    sessions: {},
    essays: [],
  };
}

const server = await createServer({ root, logLevel: 'error', server: { port: 5199 } });
await server.listen();
const base = 'http://localhost:5199/';
const browser = await chromium.launch();

async function shot(name, width, scheme, fn, opts = {}) {
  if (only && !name.includes(only)) return;
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 860 }, deviceScaleFactor: width < 700 ? 2 : 1, colorScheme: scheme, locale: 'pl-PL' });
  if (opts.sample) await ctx.addInitScript(sampleScript);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const st = opts.state ?? state();
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('zainicjowano')) {
      localStorage.setItem('matura2027-v3', JSON.stringify(s));
      sessionStorage.setItem('zainicjowano', '1');
    }
  }, st);
  await page.goto(`${base}?dzis=${TODAY}#start`);
  await page.waitForTimeout(800);
  await fn(page);
  await page.waitForTimeout(700);
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  const file = `${out}/${width}-${name}${scheme === 'dark' ? '-ciemny' : ''}.png`;
  await page.screenshot({ path: file, fullPage: opts.full ?? true });
  console.log(`${file}${w > width ? `  POZIOME PRZEWIJANIE: ${w}px` : ''}${errors.length ? `  BŁĘDY: ${errors.join(' | ').slice(0, 300)}` : ''}`);
  await ctx.close();
}

const go = (h) => async (p) => {
  await p.evaluate((x) => (location.hash = x), h);
  await p.waitForTimeout(1200);
};

const scenarios = [
  ['onboarding', async (p) => { await p.waitForTimeout(300); }, { state: state(false) }],
  ['onboarding-3', async (p) => { await p.getByRole('button', { name: 'Dalej' }).click(); await p.getByRole('button', { name: 'Dalej' }).click(); }, { state: state(false) }],
  ['start', async (p) => { await p.waitForTimeout(1500); }],
  ['zadanie-zamkniete', async (p) => {
    await go('#zadanie-MMAP-P0-100-2505-n1')(p);
    await p.waitForTimeout(1500);
    await p.getByRole('radio', { name: 'A' }).first().click();
    await p.getByRole('button', { name: 'Sprawdź' }).first().click();
  }],
  ['zadanie-otwarte', async (p) => {
    await go('#zadanie-MMAP-R0-100-2505-n1')(p);
    await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'Pokaż odpowiedź' }).first().click();
    await p.waitForTimeout(600);
    await p.getByRole('radio', { name: '1' }).first().click();
  }],
  ['plan-edycja', async (p) => { await go('#plan')(p); await p.getByRole('button', { name: 'Edytuj' }).click(); }],
  ['bank', async (p) => { await go('#zadania-mat-p-ciagi')(p); }],
  ['bank-przedmioty', async (p) => { await go('#zadania')(p); }],
  ['arkusz-trwa', async (p) => {
    await go('#arkusz-MMAP-P0-100-2505')(p);
    await p.getByRole('button', { name: 'Zacznij arkusz' }).click();
    await p.waitForTimeout(1500);
    await p.getByRole('radio', { name: 'C' }).first().click();
    await p.getByRole('button', { name: 'Następne' }).first().click();
    await p.waitForTimeout(800);
    await p.getByRole('radio', { name: 'B' }).first().click();
  }, { full: false }],
  ['arkusz-wynik', async (p) => {
    await go('#arkusz-MMAP-P0-100-2505')(p);
    await p.getByRole('button', { name: 'Zacznij arkusz' }).click();
    await p.waitForTimeout(1200);
    for (const l of ['B', 'C', 'A']) {
      await p.getByRole('radio', { name: l }).first().click();
      await p.getByRole('button', { name: 'Następne' }).first().click();
      await p.waitForTimeout(300);
    }
    await p.getByRole('button', { name: 'Spis' }).click();
    await p.getByRole('dialog').getByRole('button', { name: 'Zakończ arkusz' }).click();
    await p.getByRole('button', { name: 'Zakończ', exact: true }).click();
    await p.waitForTimeout(800);
    const skip = p.getByRole('button', { name: 'Pomiń ocenę' });
    if (await skip.count()) await skip.click();
  }],
  ['wypracowanie', async (p) => {
    await go('#wypracowanie-MPOP-P1-P2-2505-nA2-1')(p);
    await p.waitForTimeout(800);
    await p.locator('#essay').fill('Nadzieja bywa w literaturze siłą, która pozwala przetrwać. W „Dżumie” Alberta Camus doktor Rieux walczy z chorobą, choć nie wie, czy zwycięży. '.repeat(8));
  }, { full: false }],
  ['postep', async (p) => { await go('#postep')(p); }],
  ['claude-ocena', async (p) => {
    await go('#zadanie-MMAP-R0-100-2505-n1')(p);
    await p.waitForTimeout(1200);
    await p.getByLabel('Twój wynik lub kluczowe kroki').fill('k = 1,25, więc wzrost o 25%');
    await p.getByRole('button', { name: 'Sprawdź z kluczem' }).click();
    await p.getByText(/Częściowo: 1 z 2 pkt/).waitFor();
  }, { sample: true }],
  ['claude-wyjasnienie', async (p) => {
    await go('#zadanie-MMAP-P0-100-2505-n1')(p);
    await p.waitForTimeout(1200);
    await p.getByRole('radio', { name: 'A' }).first().click();
    await p.getByRole('button', { name: 'Sprawdź' }).first().click();
    await p.getByRole('button', { name: 'Wyjaśnij' }).click();
    await p.getByText('Podpowiedź', { exact: true }).waitFor();
    await p.getByRole('button', { name: 'Pokaż pełne rozwiązanie' }).click();
    await p.getByText('Pełne rozwiązanie', { exact: true }).waitFor();
  }, { sample: true }],
  ['claude-wypracowanie', async (p) => {
    await go('#wypracowanie-MPOP-P1-P2-2505-nA2-1')(p);
    await p.locator('#essay').fill('Nadzieja pomaga przetrwać trudne chwile. '.repeat(40));
    const tab = p.getByRole('radiogroup', { name: 'Widok' });
    if (await tab.isVisible().catch(() => false)) await tab.getByRole('radio', { name: 'Ocena', exact: true }).click();
    else await p.getByRole('button', { name: 'Oceń tekst' }).click();
    await p.getByRole('button', { name: 'Oceń z Claude’em' }).click();
    await p.getByText('Wskazówki').waitFor();
  }, { sample: true, full: false }],
  ['fiszki', async (p) => {
    await go('#zadanie-MJAP-P0-100-2505-n4')(p);
    await p.getByRole('button', { name: 'Utwórz fiszki z tego zadania' }).click();
    await p.getByText(/Dodano fiszki/).waitFor();
    await go('#fiszki')(p);
  }, { sample: true }],
  ['fiszki-powtorka', async (p) => {
    await go('#zadanie-MJAP-P0-100-2505-n4')(p);
    await p.getByRole('button', { name: 'Utwórz fiszki z tego zadania' }).click();
    await p.getByText(/Dodano fiszki/).waitFor();
    await go('#fiszki')(p);
    await p.getByRole('button', { name: /^Powtórz/ }).click();
    await p.getByRole('button', { name: 'Pokaż odpowiedź' }).click();
  }, { sample: true }],
  ['piec-minut', async (p) => { await go('#piec-minut')(p); await p.waitForTimeout(1500); }, { full: false }],
  ['lektury', async (p) => { await go('#lektury')(p); }],
  ['ustny', async (p) => { await go('#ustny')(p); }],
  ['ustawienia', async (p) => { await go('#ustawienia')(p); }],
];

for (const [name, fn, opts] of scenarios) {
  for (const width of [390, 1280]) {
    for (const scheme of ['light', 'dark']) {
      try {
        await shot(name, width, scheme, fn, opts);
      } catch (e) {
        console.log(`${width}-${name}-${scheme}: NIE UDAŁO SIĘ: ${String(e).split('\n')[0]}`);
      }
    }
  }
}
await browser.close();
await server.close();
