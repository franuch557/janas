import type { AppState } from '../types';
import { SCHEMA, defaultSettings, emptyState } from './defaults';
import { allImageKeys, blobToDataUrl, dataUrlToBlob, getImage, putImage } from './images';

const KEY = 'matura2027-stan';

export function loadState(): { state: AppState; error: string | null } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { state: emptyState(), error: 'Przeglądarka nie pozwala zapisywać danych (localStorage). Zmiany znikną po zamknięciu karty.' };
  }
  if (!raw) return { state: emptyState(), error: null };
  try {
    return { state: migrate(JSON.parse(raw)), error: null };
  } catch {
    return { state: emptyState(), error: 'Zapisane dane są uszkodzone. Wczytano stan początkowy; jeśli masz eksport, zaimportuj go w Ustawieniach.' };
  }
}

export function saveState(s: AppState): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return null;
  } catch {
    return 'Nie udało się zapisać danych w przeglądarce (brak miejsca albo tryb prywatny). Wyeksportuj dane do pliku.';
  }
}

/** Uzupełnia brakujące pola po zmianach w aplikacji. */
export function migrate(input: Partial<AppState>): AppState {
  const base = emptyState();
  const s: AppState = { ...base, ...input, schema: SCHEMA } as AppState;
  const def = defaultSettings();
  s.settings = { ...def, ...(input.settings ?? {}) };
  s.settings.recruitment = { ...def.recruitment, ...(input.settings?.recruitment ?? {}) };
  s.settings.weekWindows = { ...def.weekWindows, ...(input.settings?.weekWindows ?? {}) };
  // dopisz przedmioty, których nie było w starszym zapisie
  for (const d of def.subjects) if (!s.settings.subjects.some((x) => x.id === d.id)) s.settings.subjects.push(d);
  for (const k of ['bank', 'diagnoses', 'mocks', 'errors', 'lessonNotes', 'weightSuggestionsSeen', 'backlog', 'missedHandled'] as const) {
    if (!Array.isArray(s[k])) (s as unknown as Record<string, unknown>)[k] = [];
  }
  if (!s.dayLog || typeof s.dayLog !== 'object') s.dayLog = {};
  return s;
}

export interface ExportFile {
  app: 'matura-2027';
  exportedAt: string;
  state: AppState;
  images: Record<string, string>;
}

export async function exportAll(state: AppState, withImages: boolean): Promise<Blob> {
  const images: Record<string, string> = {};
  if (withImages) {
    for (const k of await allImageKeys()) {
      const b = await getImage(String(k));
      if (b) images[String(k)] = await blobToDataUrl(b);
    }
  }
  const file: ExportFile = { app: 'matura-2027', exportedAt: new Date().toISOString(), state, images };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function importAll(text: string): Promise<{ state: AppState; images: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Plik nie jest poprawnym JSON. Wybierz plik wyeksportowany z tej aplikacji.');
  }
  const f = parsed as Partial<ExportFile>;
  if (f.app !== 'matura-2027' || !f.state) {
    throw new Error('To nie jest eksport aplikacji Matura 2027 (brak pola „app”). Wybierz właściwy plik.');
  }
  let n = 0;
  for (const [k, v] of Object.entries(f.images ?? {})) {
    await putImage(k, await dataUrlToBlob(v));
    n++;
  }
  return { state: migrate(f.state), images: n };
}
