// Zadania dodane przez ucznia (np. z zadania.info). Aplikacja nic nie pobiera
// z serwisu: numer zadania odczytuje z adresu wklejonego przez ucznia.

export const ZADANIA_INFO_ATTRIBUTION = 'Materiał pobrany z portalu zadania.info';

/** Najdłuższa treść zadania wklejona do aplikacji (dokument „stan” ma limit 256 KiB). */
export const TEXT_LIMIT = 4000;

/** Numer zadania z adresu zadania.info (ostatni segment z cyfr). */
export function parseZadaniaInfoUrl(raw: string): { url: string; ref: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!/(^|\.)zadania\.info$/.test(u.hostname)) return null;
  const segs = u.pathname.split('/').filter(Boolean);
  const last = [...segs].reverse().find((x) => /^\d+(_\d+)?$/.test(x));
  return { url: u.toString(), ref: last ? `nr ${last}` : '' };
}

export interface UserTaskDraft {
  url: string;
  text: string;
  image: string | null;
  topicId: string | null;
  maxPoints: number | null;
}

/** Błędy formularza; pusta lista = można zapisać. Puste zadanie nie zapisuje się. */
export function validateDraft(d: UserTaskDraft): string[] {
  const errs: string[] = [];
  if (!d.image && !d.text.trim()) errs.push('Dodaj zrzut ekranu albo wklej treść zadania.');
  if (d.url.trim() && !/^https?:\/\//.test(d.url.trim())) errs.push('Adres musi zaczynać się od https://.');
  if (d.text.length > TEXT_LIMIT) errs.push(`Treść może mieć najwyżej ${TEXT_LIMIT} znaków.`);
  if (!d.topicId) errs.push('Wybierz temat.');
  if (!d.maxPoints || d.maxPoints < 1) errs.push('Wybierz liczbę punktów.');
  return errs;
}
