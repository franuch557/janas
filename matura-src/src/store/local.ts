// Kopia stanu w localStorage. Każdy odczyt i zapis w try/catch: przeglądarka
// może blokować pamięć (tryb prywatny, ramka bez dostępu), a aplikacja ma
// wtedy działać dalej na stanie w pamięci.

import { defaultStan, type Lesson, type LocalData, type Stan } from '../model';
import { mergeEvents } from '../logic/events';
import { parseSession } from '../logic/session';

export let LS_KEY = 'matura2027-v3';
export let LS_PULSE = 'matura2027-v3-puls';
export let LS_IMG = 'matura2027-v3-obraz-';

/** Osobna kopia lokalna dla każdego konta na stronie z logowaniem (wywołać przed startem aplikacji). */
export function setStorageScope(uid: string | null) {
  const base = uid ? `matura2027-v3-u-${uid}` : 'matura2027-v3';
  LS_KEY = base;
  LS_PULSE = `${base}-puls`;
  LS_IMG = `${base}-obraz-`;
}

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

/** Puste dane funkcji z Claude'em (wyjaśnienia, pamięć, fiszki, raporty, ustny). */
export const EMPTY_AI = (): Pick<LocalData, 'explanations' | 'memory' | 'cards' | 'reports' | 'oral'> => ({ explanations: {}, memory: [], cards: [], reports: {}, oral: {} });

export function emptyData(today: string): LocalData {
  return { stan: defaultStan(today), events: [], sessions: {}, essays: [], ...EMPTY_AI() };
}

const objOr = <T,>(x: unknown, d: T): T => (x && typeof x === 'object' && !Array.isArray(x) ? (x as T) : d);
const arrOr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

const validLesson = (l: unknown): l is Lesson => {
  const x = l as Lesson;
  return !!x && typeof x.id === 'string' && typeof x.subj === 'string' && Number.isInteger(x.weekday) && x.weekday >= 0 && x.weekday <= 6 && typeof x.start === 'string' && Number(x.minutes) > 0;
};

/** Zapis sprzed list zajęć: włączone korepetycje z angielskiego stają się jednymi zajęciami. */
function lessonsFromTutoring(t: Partial<Stan['tutoring']> | undefined): Lesson[] {
  if (!t || t.enabled === false) return [];
  return [{ id: 'k-ang', subj: 'ang-p', weekday: t.weekday ?? 6, start: t.start ?? '15:15', minutes: t.minutes ?? 60 }];
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
    targets: s.targets && typeof s.targets === 'object' ? Object.fromEntries(Object.entries(s.targets).filter(([, v]) => Number.isFinite(Number(v))).map(([k, v]) => [k, Math.max(0, Math.min(100, Number(v)))])) : {},
    lessons: Array.isArray(s.lessons) ? s.lessons.filter(validLesson) : lessonsFromTutoring(s.tutoring),
    reminder: { ...d.reminder, ...(s.reminder ?? {}) },
    overrides: s.overrides && typeof s.overrides === 'object' ? s.overrides : {},
    reported: Array.isArray(s.reported) ? s.reported : [],
    userTasks: Array.isArray(s.userTasks) ? s.userTasks : [],
    extraPct: Number.isFinite(Number(s.extraPct)) ? Math.max(0, Math.min(100, Number(s.extraPct))) : 70,
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
      explanations: objOr(o.explanations, {}),
      memory: arrOr(o.memory),
      cards: arrOr(o.cards),
      reports: objOr(o.reports, {}),
      oral: objOr(o.oral, {}),
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
