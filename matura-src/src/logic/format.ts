// Polskie formaty: odmiana liczebników, liczby z przecinkiem, czas.

/** Odmiana: 1 dzień, 2 dni, 5 dni; 1 zadanie, 2 zadania, 5 zadań. */
export function plural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n);
  if (a === 1) return one;
  const d = a % 10;
  const h = a % 100;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
  return many;
}

export function count(n: number, one: string, few: string, many: string): string {
  return `${fmtNum(n)} ${plural(n, one, few, many)}`;
}

export const dni = (n: number) => count(n, 'dzień', 'dni', 'dni');
export const zadan = (n: number) => count(n, 'zadanie', 'zadania', 'zadań');
export const pkt = (n: number) => `${fmtNum(n)} pkt`;
export const slow = (n: number) => count(n, 'słowo', 'słowa', 'słów');
export const minut = (n: number) => count(n, 'minuta', 'minuty', 'minut');

/** Liczba po polsku: przecinek dziesiętny, spacja tysięcy. */
export function fmtNum(n: number, digits = 1): string {
  if (Number.isInteger(n)) return new Intl.NumberFormat('pl-PL').format(n);
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: digits }).format(n);
}

/** 1:05:09 albo 05:09. */
export function fmtClock(ms: number, forceHours = false): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 || forceHours ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** „1 h 05 min 09 s”, „12 min 04 s”. */
export function fmtDuration(sec: number): string {
  const t = Math.max(0, Math.round(sec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')} s`;
  if (m > 0) return `${m} min ${String(s).padStart(2, '0')} s`;
  return `${s} s`;
}

/** Czas nauki w godzinach: „23 h”, „1,5 h”, „40 min”. */
export function fmtHours(sec: number): string {
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  return `${fmtNum(Math.round((sec / 3600) * 10) / 10)} h`;
}

/** „2 min temu”, „przed chwilą”. */
export function fmtAgo(ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 45) return 'przed chwilą';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min temu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h temu`;
  return dni(Math.round(h / 24)) + ' temu';
}
