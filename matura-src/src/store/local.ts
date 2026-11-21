// Kopia stanu w localStorage. Każdy odczyt i zapis w try/catch: przeglądarka
// może blokować pamięć (tryb prywatny, ramka bez dostępu), a aplikacja ma
// wtedy działać dalej na stanie w pamięci.

import { defaultStan, type LocalData, type Stan } from '../model';
import { mergeEvents } from '../logic/events';
import { parseSession } from '../logic/session';

export const LS_KEY = 'matura2027-v3';
export const LS_PULSE = 'matura2027-v3-puls';
export const LS_IMG = 'matura2027-v3-obraz-';

export function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function lsSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function lsRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* brak dostępu do pamięci */
  }
}

export function lsKeys(): string[] {
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
}

export function emptyData(today: string): LocalData {
  return { stan: defaultStan(today), events: [], sessions: {}, essays: [] };
}

/** Uzupełnia brakujące pola stanu wartościami domyślnymi (starsze zapisy). */
export function fixStan(raw: unknown, today: string): Stan {
  const d = defaultStan(today);
  if (typeof raw !== 'object' || raw === null) return d;
  const s = raw as Partial<Stan>;
  return {
    ...d,
    ...s,
    typ: 'stan',
    v: 3,
    enabled: { ...d.enabled, ...(s.enabled ?? {}) },
    dayMinutes: Array.isArray(s.dayMinutes) && s.dayMinutes.length === 7 ? s.dayMinutes.map((x) => Number(x) || 0) : d.dayMinutes,
    tutoring: { ...d.tutoring, ...(s.tutoring ?? {}) },
    reminder: { ...d.reminder, ...(s.reminder ?? {}) },
    overrides: s.overrides && typeof s.overrides === 'object' ? s.overrides : {},
    reported: Array.isArray(s.reported) ? s.reported : [],
    userTasks: Array.isArray(s.userTasks) ? s.userTasks : [],
    updatedAt: Number(s.updatedAt) || 0,
  };
}

export function parseLocal(raw: string | null, today: string): LocalData {
  if (!raw) return emptyData(today);
  try {
    const o = JSON.parse(raw) as Partial<LocalData>;
    const sessions: LocalData['sessions'] = {};
    for (const [k, v] of Object.entries(o.sessions ?? {})) {
      const s = parseSession(v);
      if (s) sessions[k] = s;
    }
    return {
      stan: fixStan(o.stan, today),
      events: mergeEvents(Array.isArray(o.events) ? o.events : []),
      sessions,
      essays: Array.isArray(o.essays) ? o.essays : [],
    };
  } catch {
    return emptyData(today);
  }
}

export function loadLocal(today: string): LocalData {
  return parseLocal(lsGet(LS_KEY), today);
}

export function saveLocal(data: LocalData): boolean {
  return lsSet(LS_KEY, JSON.stringify(data));
}
