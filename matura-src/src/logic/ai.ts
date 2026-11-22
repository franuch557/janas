// Prompty i odczyt odpowiedzi Claude'a (capability `sample`). Odpowiedzi JSON
// są sprawdzane pole po polu i przycinane do dozwolonych wartości: model może
// zwrócić coś niepełnego albo spoza zakresu.

import type { MistakeType } from '../model';
import { MISTAKE_TYPES } from './memory';

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown, max = 800): string => (typeof x === 'string' ? x.replace(/\s+\n/g, '\n').trim().slice(0, max) : '');

// ---------- Ocena zadania otwartego ----------

export interface GradeResult {
  points: number;
  max: number;
  verdict: 'dobrze' | 'częściowo' | 'źle';
  feedback: string;
  mistakes: { type: MistakeType; note: string }[];
}

export function parseGrade(raw: unknown, max: number): GradeResult | null {
  if (!isObj(raw)) return null;
  const n = Number(raw.points);
  if (!Number.isFinite(n)) return null;
  const points = Math.max(0, Math.min(max, Math.round(n)));
  const v = String(raw.verdict ?? '');
  const verdict: GradeResult['verdict'] = v === 'dobrze' || v === 'częściowo' || v === 'źle' ? v : points === max ? 'dobrze' : points === 0 ? 'źle' : 'częściowo';
  const mistakes = (Array.isArray(raw.mistakes) ? raw.mistakes : [])
    .filter(isObj)
    .map((m) => ({ type: (MISTAKE_TYPES as string[]).includes(String(m.type)) ? (m.type as MistakeType) : 'inne', note: str(m.note, 160) }))
    .filter((m) => m.note)
    .slice(0, 5);
  return { points, max, verdict, feedback: str(raw.feedback, 600) || 'Brak uzasadnienia.', mistakes };
}

export function gradePrompt(p: { subject: string; label: string; max: number; answer: string; hasPhoto: boolean; hasKey: boolean; memory: string }): string {
  return [
    '[typ: ocena]',
    `Jesteś egzaminatorem matury (${p.subject}). Oceń rozwiązanie ucznia zadania ${p.label} za 0–${p.max} pkt.`,
    `Obrazy: 1) treść zadania z arkusza CKE${p.hasKey ? ', 2) zasady oceniania CKE (klucz)' : ''}${p.hasPhoto ? `, ${p.hasKey ? 3 : 2}) zdjęcie rozwiązania ucznia z kartki` : ''}.`,
    'Oceniaj według zasad punktowania CKE: liczy się sens i poprawność rozumowania, nie dosłowne brzmienie. Przyznaj punkty tak, jak zrobiłby to egzaminator.',
    p.memory ? `Kontekst o uczniu: ${p.memory}` : '',
    p.answer ? `Odpowiedź ucznia (wynik lub kluczowe kroki):\n"""\n${p.answer.slice(0, 4000)}\n"""` : 'Odpowiedź ucznia jest na zdjęciu.',
    `Odpowiedz wyłącznie obiektem JSON: {"points": liczba całkowita 0..${p.max}, "max": ${p.max}, "verdict": "dobrze"|"częściowo"|"źle", "feedback": "krótkie uzasadnienie po polsku (2–3 zdania)", "mistakes": [{"type": "rachunkowy"|"koncepcyjny"|"zapis"|"brak kroku"|"inne", "note": "krótko, po polsku"}]}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---------- Wyjaśnienia ----------

export function explainPrompt(p: { stage: 'hint' | 'full'; subject: string; label: string; memory: string; hasKey: boolean; hint?: string | null }): string {
  const common = `Uczeń przygotowuje się do matury (${p.subject}). Zadanie: ${p.label}. Obrazy: treść zadania z arkusza CKE${p.hasKey ? ' i zasady oceniania CKE (klucz)' : ''}.${p.memory ? ` ${p.memory}` : ''}`;
  if (p.stage === 'hint')
    return `[typ: podpowiedz]\n${common}\n\nDaj jedną podpowiedź: tylko pierwszy krok albo pytanie naprowadzające. Nie podawaj wyniku ani dalszych kroków. Po polsku, najwyżej 3 zdania. Wzory zapisuj w $…$.`;
  return `[typ: rozwiazanie]\n${common}\n${p.hint ? `\nPodpowiedź, którą uczeń już dostał: ${p.hint}\n` : ''}\nPokaż pełne rozwiązanie krok po kroku, zgodne z kluczem CKE: numerowane kroki, na końcu wynik i jak egzaminator przyznaje punkty. Po polsku, zwięźle. Wzory zapisuj w $…$.`;
}

export function chatIntro(p: { subject: string; label: string; hint: string | null; full: string | null; memory: string }): string {
  return `[typ: dopytaj]\nJesteś korepetytorem przed maturą (${p.subject}). Rozmawiamy o zadaniu ${p.label}.${p.memory ? ` ${p.memory}` : ''}\n${p.full ? `Rozwiązanie, które uczeń widział:\n${p.full.slice(0, 3000)}` : p.hint ? `Podpowiedź: ${p.hint}` : ''}\nOdpowiadaj krótko (do 5 zdań), po polsku, wzory w $…$. Nie wymyślaj treści zadania.`;
}

// ---------- Wypracowanie i wypowiedź pisemna ----------

export interface CriterionDef {
  id: string;
  name: string;
  max: number;
  values: number[];
  description: string;
}

export interface EssayGrade {
  values: Record<string, number>;
  reasons: Record<string, string>;
  tips: string[];
}

/** Najbliższa dozwolona wartość kryterium. */
export function snapValue(v: number, allowed: number[]): number {
  if (!allowed.length) return 0;
  return allowed.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), allowed[0]);
}

export function parseEssayGrade(raw: unknown, criteria: CriterionDef[]): EssayGrade | null {
  if (!isObj(raw)) return null;
  const src = isObj(raw.criteria) ? raw.criteria : raw;
  const values: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  for (const c of criteria) {
    const e = src[c.id];
    const v = isObj(e) ? Number(e.value ?? e.points) : Number(e);
    if (!Number.isFinite(v)) continue;
    values[c.id] = snapValue(v, c.values);
    if (isObj(e)) reasons[c.id] = str(e.reason ?? e.uzasadnienie, 400);
  }
  if (!Object.keys(values).length) return null;
  const tips = (Array.isArray(raw.tips) ? raw.tips : []).map((t) => str(t, 300)).filter(Boolean).slice(0, 3);
  return { values, reasons, tips };
}

export function essayPrompt(p: { subject: string; text: string; criteria: CriterionDef[]; minWords: number | null; words: number; memory: string }): string {
  const list = p.criteria.map((c) => `- ${c.id}: ${c.name} (dozwolone wartości: ${c.values.join(', ')})${c.description ? ` – ${c.description.slice(0, 600)}` : ''}`).join('\n');
  return [
    '[typ: wypracowanie]',
    `Jesteś egzaminatorem matury (${p.subject}). Oceń tekst ucznia według kryteriów CKE. Obraz: temat z arkusza CKE.`,
    `Liczba słów: ${p.words}${p.minWords ? ` (minimum ${p.minWords})` : ''}.`,
    p.memory ? `Kontekst o uczniu: ${p.memory}` : '',
    `Kryteria:\n${list}`,
    `Tekst ucznia:\n"""\n${p.text.slice(0, 12000)}\n"""`,
    `Odpowiedz wyłącznie obiektem JSON: {"criteria": {"<id kryterium>": {"value": jedna z dozwolonych wartości, "reason": "krótkie uzasadnienie po polsku"}}, "tips": ["3 konkretne wskazówki po polsku"]}.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---------- Fiszki ----------

export interface CardDraft {
  front: string;
  back: string;
  example: string | null;
}

export function parseCards(raw: unknown, max = 20): CardDraft[] {
  const list = Array.isArray(raw) ? raw : isObj(raw) && Array.isArray(raw.fiszki) ? raw.fiszki : isObj(raw) && Array.isArray(raw.cards) ? raw.cards : [];
  const seen = new Set<string>();
  const out: CardDraft[] = [];
  for (const c of list) {
    if (!isObj(c)) continue;
    const front = str(c.front ?? c.przod ?? c.pytanie, 200);
    const back = str(c.back ?? c.tyl ?? c.odpowiedz, 400);
    if (!front || !back || seen.has(front.toLowerCase())) continue;
    seen.add(front.toLowerCase());
    out.push({ front, back, example: str(c.example ?? c.przyklad, 300) || null });
    if (out.length >= max) break;
  }
  return out;
}

export function cardsFromTaskPrompt(label: string): string {
  return `[typ: fiszki-zadanie]\nObraz: zadanie z arkusza CKE z języka angielskiego (${label}) z tekstem lub transkrypcją. Wybierz 10–15 słówek i zwrotów przydatnych na maturze podstawowej. Odpowiedz wyłącznie tablicą JSON: [{"front": "słowo lub zwrot po angielsku", "back": "znaczenie po polsku", "example": "krótkie przykładowe zdanie po angielsku"}].`;
}

export function cardsFromWeakPrompt(subject: string, notes: string, wrong: string): string {
  return `[typ: fiszki-slabe]\nUczeń przygotowuje się do matury (${subject}). Na podstawie jego trudności przygotuj 10–15 fiszek pytanie → odpowiedź (wzory, definicje, epoki, środki stylistyczne, gramatyka – co pasuje do przedmiotu). Krótko i poprawnie merytorycznie.\n\nTrudności: ${notes || 'brak notatek'}\nTematy błędnych zadań: ${wrong || 'brak'}\n\nOdpowiedz wyłącznie tablicą JSON: [{"front": "pytanie", "back": "odpowiedź", "example": null}]. Wzory w $…$.`;
}

export function cardsFromBookPrompt(title: string, summary: string): string {
  return `[typ: fiszki-lektura]\nPrzygotuj 10–15 fiszek do lektury „${title}” na maturę z polskiego (bohaterowie, problematyka, motywy, konteksty). Korzystaj tylko z poniższego opracowania, nie dodawaj faktów spoza niego.\n\n${summary.slice(0, 12000)}\n\nOdpowiedz wyłącznie tablicą JSON: [{"front": "pytanie", "back": "odpowiedź", "example": null}].`;
}

// ---------- Ustny polski ----------

export interface OralPlan {
  teza: string;
  argumenty: string[];
  kontekst: string;
  zakonczenie: string;
}

export function parseOralPlan(raw: unknown): OralPlan | null {
  if (!isObj(raw)) return null;
  const teza = str(raw.teza, 500);
  const argumenty = (Array.isArray(raw.argumenty) ? raw.argumenty : []).map((a) => str(a, 600)).filter(Boolean).slice(0, 3);
  if (!teza || !argumenty.length) return null;
  return { teza, argumenty, kontekst: str(raw.kontekst, 600), zakonczenie: str(raw.zakonczenie, 400) };
}

export function oralPrompt(question: string, lektura: string | null, material: string): string {
  return `[typ: ustny]\nMatura ustna z języka polskiego. Pytanie jawne: „${question}”${lektura ? ` (lektura: ${lektura})` : ''}.\n${material ? `Opracowanie lektury:\n${material.slice(0, 8000)}\n` : ''}Przygotuj plan wypowiedzi na 5 minut: teza, 2 argumenty z lektury, kontekst, zakończenie. Po polsku, zwięźle. Odpowiedz wyłącznie obiektem JSON: {"teza": "…", "argumenty": ["…", "…"], "kontekst": "…", "zakonczenie": "…"}.`;
}

// ---------- Kody błędów ----------

const HIDE = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

/** Czy błąd oznacza, że funkcje z Claude'em trzeba ukryć do końca wizyty. */
export function hidesFeature(code: string | undefined): boolean {
  return HIDE.has(code ?? '');
}

export function errorText(code: string | undefined): string | null {
  switch (code) {
    case 'cancelled':
      return null;
    case 'rate_limited':
      return 'Za dużo zapytań do Claude’a w krótkim czasie. Spróbuj za chwilę.';
    case 'session_expired':
      return 'Sesja wygasła. Zaloguj się ponownie i spróbuj jeszcze raz.';
    case 'image_rejected':
      return 'Nie udało się wysłać zdjęcia. Wybierz inne zdjęcie.';
    case 'images_unavailable':
      return 'Tutaj nie da się wysłać obrazów do Claude’a.';
    case 'refused':
      return 'Claude nie odpowiedział na to pytanie. Zmień treść i spróbuj ponownie.';
    case 'empty_completion':
    case 'invalid_json':
      return 'Odpowiedź Claude’a była niepełna. Spróbuj ponownie.';
    case 'prompt_too_large':
      return 'Za dużo tekstu naraz. Skróć odpowiedź.';
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'Funkcje z Claude’em są tu niedostępne.';
    default:
      return 'Nie udało się połączyć z Claude’em. Spróbuj ponownie.';
  }
}

// ---------- Przycinanie dokumentów ----------

/** Zostawia najnowsze elementy, aż JSON zmieści się w limicie bajtów. */
export function trimToBytes<T extends { at: number }>(items: T[], limitBytes: number, wrap: (items: T[]) => unknown = (x) => x): T[] {
  let list = [...items].sort((a, b) => b.at - a.at);
  const size = (l: T[]) => new TextEncoder().encode(JSON.stringify(wrap(l))).length;
  if (size(list) <= limitBytes) return items;
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (size(list.slice(0, mid)) <= limitBytes) lo = mid;
    else hi = mid - 1;
  }
  list = list.slice(0, lo);
  const keep = new Set(list);
  return items.filter((x) => keep.has(x));
}
