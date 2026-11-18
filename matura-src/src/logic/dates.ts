// Daty jako napisy RRRR-MM-DD w czasie lokalnym (bez stref czasowych).

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(s: string, n: number): string {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86400000);
}

export function weekday(s: string): number {
  return fromISO(s).getDay();
}

export function hm(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const DAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const DAYS_SHORT = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

export function dayName(wd: number, short = false): string {
  return short ? DAYS_SHORT[wd] : DAYS[wd];
}

export function fmtLong(s: string): string {
  const d = fromISO(s);
  const name = DAYS[d.getDay()];
  return `${name[0].toUpperCase()}${name.slice(1)}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtShort(s: string): string {
  const d = fromISO(s);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Poniedziałek tygodnia, w którym leży data. */
export function weekStart(s: string): string {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}
