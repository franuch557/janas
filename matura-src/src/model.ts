// Typy aplikacji w wersji 3 (stan ucznia, zdarzenia wyników, sesje, plan).
// Typy danych arkuszy CKE w postaci używanej przez aplikację są w logic/cke.ts.

import type { Family, Level } from './types';

export type SubjectId = 'mat-p' | 'mat-r' | 'pol-p' | 'ang-p';

export interface SubjectDef {
  id: SubjectId;
  family: Family;
  level: Level;
  name: string;
  /** Nazwa w dopełniaczu: „z matematyki podstawowej”. */
  genitive: string;
  short: string;
  examDate: string;
  /** Ważność przedmiotu przy rozdziale czasu. */
  priority: number;
  /** Domyślny czas arkusza, gdy w danych go brak. */
  mockMinutes: number;
}

/** Daty z komunikatu dyrektora CKE z 20.08.2026 (termin główny). */
export const SUBJECTS: SubjectDef[] = [
  { id: 'pol-p', family: 'polski', level: 'podstawowy', name: 'Język polski', genitive: 'języka polskiego', short: 'pol.', examDate: '2027-05-04', priority: 1.5, mockMinutes: 240 },
  { id: 'mat-p', family: 'matematyka', level: 'podstawowy', name: 'Matematyka podstawowa', genitive: 'matematyki podstawowej', short: 'mat. p.', examDate: '2027-05-05', priority: 2, mockMinutes: 180 },
  { id: 'ang-p', family: 'angielski', level: 'podstawowy', name: 'Język angielski', genitive: 'języka angielskiego', short: 'ang.', examDate: '2027-05-06', priority: 1, mockMinutes: 120 },
  { id: 'mat-r', family: 'matematyka', level: 'rozszerzony', name: 'Matematyka rozszerzona', genitive: 'matematyki rozszerzonej', short: 'mat. r.', examDate: '2027-05-11', priority: 3, mockMinutes: 180 },
];

export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

export function subjectDef(id: string | null | undefined): SubjectDef | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export function subjectFor(family: Family, level: Level): SubjectDef | undefined {
  return SUBJECTS.find((s) => s.family === family && s.level === level);
}

// ---------- Plan ----------

export type PlanKind =
  | 'zadanie'
  | 'powtórka'
  | 'arkusz'
  | 'diagnoza'
  | 'wypracowanie'
  | 'przegląd'
  | 'korepetycje'
  | 'fiszki';

/** Pozycja planu. `ref` jest tożsamością pozycji (nadpisania, odhaczanie). */
export interface PlanItem {
  ref: string;
  kind: PlanKind;
  subjectId: SubjectId | null;
  topicId: string | null;
  taskId: string | null;
  examId: string | null;
  partId: string | null;
  minutes: number;
  reason: string;
  /** Pozycja dodana lub zmieniona ręcznie. */
  manual: boolean;
}

export interface DayPlan {
  date: string;
  weekday: number;
  available: number;
  used: number;
  items: PlanItem[];
  notes: string[];
}

/** Ręczne zmiany jednego dnia. Planer je stosuje przy każdym przeliczeniu. */
export interface DayOverride {
  add: PlanItem[];
  remove: string[];
  order?: string[];
  /** Czas ostatniej zmiany (scalanie z innym urządzeniem). */
  at?: number;
}

// ---------- Stan ucznia (dokument „stan”) ----------

export interface UserTask {
  id: string; // „u-…”
  subjectId: SubjectId;
  topicId: string;
  url: string | null;
  ref: string;
  text: string | null;
  /** Identyfikator obrazu w dokumencie „obraz-<id>”. */
  imageId: string | null;
  maxPoints: number;
  type: 'zamknięte' | 'otwarte';
  source: 'zadania.info' | 'własne';
  createdAt: string;
  /** Czas dodania (scalanie, usuwanie danych). */
  at?: number;
}

/** Stałe zajęcia z przedmiotu (korepetycje): plan liczy je jako naukę tego przedmiotu. */
export interface Lesson {
  id: string;
  subj: SubjectId;
  /** Dzień tygodnia, 0 = niedziela. */
  weekday: number;
  start: string;
  minutes: number;
}

export interface Stan {
  typ: 'stan';
  v: 3;
  updatedAt: number;
  onboarded: boolean;
  startedAt: string;
  enabled: Record<SubjectId, boolean>;
  /** Minuty nauki w dniu tygodnia, indeks 0 = niedziela. */
  dayMinutes: number[];
  /** Starsze pole (jedne korepetycje z angielskiego); od wersji z kontami: `lessons`. */
  tutoring: { enabled: boolean; weekday: number; start: string; minutes: number };
  lessons: Lesson[];
  reminder: { enabled: boolean; time: string };
  theme: 'system' | 'jasny' | 'ciemny';
  textSize: 'normalny' | 'duży';
  overrides: Record<string, DayOverride>;
  reported: string[];
  userTasks: UserTask[];
  /** Data ostatniego powiadomienia systemowego. */
  notifiedOn: string | null;
  /** Czas usunięcia wszystkich danych: starsze zdarzenia z innych urządzeń są pomijane. */
  resetAt: number;
  /** Oczekiwany wynik przedmiotu dodatkowego do rekrutacji (egzamin zawodowy), w %. */
  extraPct: number;
  /** Czas ostatniej zmiany każdego pola ustawień (scalanie po polach). */
  fieldAt?: Record<string, number>;
}

export function defaultStan(today: string): Stan {
  return {
    typ: 'stan',
    v: 3,
    updatedAt: 0,
    onboarded: false,
    startedAt: today,
    enabled: { 'mat-p': true, 'mat-r': true, 'pol-p': true, 'ang-p': true },
    dayMinutes: [90, 45, 45, 45, 45, 45, 90],
    tutoring: { enabled: false, weekday: 6, start: '15:15', minutes: 60 },
    lessons: [],
    reminder: { enabled: true, time: '18:00' },
    theme: 'system',
    textSize: 'normalny',
    overrides: {},
    reported: [],
    userTasks: [],
    notifiedOn: null,
    resetAt: 0,
    extraPct: 70,
  };
}

// ---------- Zdarzenia wyników (dokumenty „wyniki-RRRR-MM”) ----------

export interface ResultEvent {
  id: string;
  k: 'w';
  at: number;
  d: string;
  task: string;
  subj: SubjectId;
  topics: string[];
  pts: number;
  max: number;
  sec: number;
  src: 'zadanie' | 'arkusz' | 'diagnoza' | 'wypracowanie';
  /** Wybrane odpowiedzi w zadaniu zamkniętym. */
  choice?: Record<string, string>;
  note?: string;
  session?: string;
  /** Zdarzenie wyniku arkusza, do którego należy ten wynik (kaskada cofania). */
  sev?: string;
  /** Kto ocenił zadanie otwarte. */
  by?: 'claude' | 'samoocena' | 'automat';
  /** Uzasadnienie oceny Claude'a. */
  feedback?: string;
}

export interface UndoEvent {
  id: string;
  k: 'c';
  at: number;
  d: string;
  target: string;
}

export interface SessionEvent {
  id: string;
  k: 's';
  at: number;
  d: string;
  mode: 'arkusz' | 'diagnoza';
  exam: string | null;
  part: string | null;
  subj: SubjectId;
  pts: number;
  max: number;
  graded: number;
  total: number;
  sec: number;
  perTopic: Record<string, [number, number]>;
  session: string;
}

/** Odhaczenie pozycji planu bez wyniku (przegląd, korepetycje). */
export interface TickEvent {
  id: string;
  k: 'o';
  at: number;
  d: string;
  ref: string;
}

export type AppEvent = ResultEvent | UndoEvent | SessionEvent | TickEvent;

// ---------- Sesje (dokumenty „sesja-<id>”) ----------

export interface SessionAnswer {
  choice?: Record<string, string>;
  paper?: boolean;
  flagged?: boolean;
  /** Punkty z samooceny po zakończeniu. */
  self?: number | null;
  text?: string;
  criteria?: Record<string, number>;
  /** Kto ocenił (samoocena albo Claude) i uzasadnienie oceny Claude'a. */
  by?: 'claude' | 'samoocena' | 'automat';
  feedback?: string;
}

export interface Session {
  typ: 'sesja';
  id: string;
  mode: 'arkusz' | 'diagnoza' | 'wypracowanie';
  subjectId: SubjectId;
  examId: string | null;
  partId: string | null;
  taskIds: string[];
  createdAt: number;
  updatedAt: number;
  /** Czas aktywny przed ostatnim wznowieniem. */
  elapsedMs: number;
  /** Znacznik czasu wznowienia; null = wstrzymana. */
  runningSince: number | null;
  limitMs: number | null;
  current: number;
  answers: Record<string, SessionAnswer>;
  plays: Record<string, number>;
  status: 'trwa' | 'ocena' | 'koniec';
  gradeIndex: number;
  planDate: string | null;
  finishedAt: number | null;
  /** Wypracowanie: wybrany temat, tekst i stoper. */
  essayTaskId?: string | null;
  timerOn?: boolean;
}

// ---------- Wypracowania (dokument „wypracowania”) ----------

export interface Essay {
  id: string;
  taskId: string;
  subjectId: SubjectId;
  text: string;
  words: number;
  criteria: Record<string, number>;
  points: number;
  max: number;
  date: string;
  sec: number;
  updatedAt: number;
  by?: 'claude' | 'samoocena' | 'automat';
}

// ---------- Funkcje z Claude'em (dokumenty wyjasnienia-*, pamiec, fiszki, raporty, ustny) ----------

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Explanation {
  taskId: string;
  hint: string | null;
  full: string | null;
  chat: ChatTurn[];
  at: number;
}

export type MistakeType = 'rachunkowy' | 'koncepcyjny' | 'zapis' | 'brak kroku' | 'inne';

/** Notatka o trudności ucznia (pamięć). */
export interface MemoryNote {
  id: string;
  subj: SubjectId;
  topic: string | null;
  type: MistakeType;
  note: string;
  count: number;
  at: number;
  deleted?: boolean;
}

export interface Flashcard {
  id: string;
  subj: SubjectId;
  /** Skąd fiszka: id zadania, „slabe”, id lektury. */
  deck: string;
  deckName: string;
  front: string;
  back: string;
  example: string | null;
  step: number;
  due: string;
  reviews: number;
  /** Dzień ostatniej powtórki. */
  reviewedOn?: string;
  /** Dzień pierwszej nauki (limit nowych kart na dzień). */
  firstOn?: string;
  /** Współczynnik łatwości SM-2 (domyślnie 2,5). */
  ease?: number;
  /** Bieżący odstęp w dniach; 0 = nowa albo w nauce. */
  ivl?: number;
  /** Liczba pomyłek po nauczeniu. */
  lapses?: number;
  at: number;
  deleted?: boolean;
}

export interface WeeklyNote {
  week: string;
  seen: boolean;
  summary: string | null;
  at: number;
}

export interface OralNote {
  nr: string;
  text: string;
  plan: { teza: string; argumenty: string[]; kontekst: string; zakonczenie: string } | null;
  at: number;
}

export interface LocalData {
  stan: Stan;
  events: AppEvent[];
  sessions: Record<string, Session>;
  essays: Essay[];
  explanations: Record<string, Explanation>;
  memory: MemoryNote[];
  cards: Flashcard[];
  reports: Record<string, WeeklyNote>;
  oral: Record<string, OralNote>;
}
