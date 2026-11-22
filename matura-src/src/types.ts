// Wspólne typy danych aplikacji.

export type Family = 'matematyka' | 'polski' | 'angielski';
export type Level = 'podstawowy' | 'rozszerzony';
export type TaskType = 'zamknięte' | 'otwarte';

/** Przedmiot zdawany na danym poziomie, np. matematyka rozszerzona. */
export interface SubjectConfig {
  id: string; // np. 'mat-r'
  family: Family;
  level: Level;
  name: string;
  enabled: boolean;
  examDate: string; // RRRR-MM-DD
  oralDate: string | null;
  targetPct: number | null;
  /** Ile ważny jest przedmiot przy rozdziale czasu (edytowalne). */
  priority: number;
  /** Czas arkusza próbnego w minutach; null = brak danych, użytkownik musi ustawić. */
  mockMinutes: number | null;
  diagnosisTasks: number;
  diagnosisMinutes: number;
}

export interface Topic {
  id: string;
  family: Family;
  name: string;
  /** Poziomy, na których temat występuje. */
  levels: Level[];
  note?: string;
}

// ---------- Arkusze CKE (data/exams.json) ----------

/**
 * Odpowiedź zadania zamkniętego (docs/kontrakt-danych.md). Każda pozycja to jedno pole wyboru
 * na karcie odpowiedzi; `correct` pochodzi wyłącznie z zasad oceniania CKE (wersja A arkusza
 * wariantu 100), null = nie odczytano.
 */
export interface ClosedAnswer {
  items: { id: string; label: string | null; options: string[]; correct: string | null }[];
  /** 'each' – 1 pkt za pozycję; 'all' – maxPoints tylko za komplet; mapa: liczba poprawnych → punkty. */
  scoring: 'each' | 'all' | Record<string, number>;
}

export interface ExamTask {
  nr: string; // „5”, „6.1”; polski: „A1.5” (arkusz 1), „A2.1” (arkusz 2, temat 1); angielski: „5.1-5.3”
  /** Po imporcie zawsze liczba; null tylko w danych bez importu PDF. */
  maxPoints: number | null;
  type: TaskType | null;
  topics: string[];
  summary: string | null;
  proof: boolean | null;
  cases: boolean | null;
  page: number | null;
  source: string; // „ręcznie: …” = poprawione ręcznie, skrypt nie nadpisuje
  answer?: ClosedAnswer | null; // tylko zamknięte; null = nie odczytano (opis w exams-issues.md)
  context?: string | null; // klucz wspólnego materiału w ctx/ pakietu arkusza
  audio?: { start: number | null; end: number | null } | null; // angielski, słuchanie; sekundy w mp3 arkusza
  alternative?: string | null; // zadania do wyboru mają ten sam klucz; liczy się jedno
  essay?: { minWords: number | null; maxWords: number | null; criteria: string } | null;
}

/** Grupa zadań, dla której znana jest tylko łączna punktacja. */
export interface ExamGroup {
  tasks: string[];
  points: number;
  topics: string[];
  note: string;
}

export interface Exam {
  id: string; // kod arkusza CKE
  family: Family;
  level: Level;
  year: number;
  session: 'marzec' | 'maj' | 'czerwiec' | 'sierpień' | 'zbiór';
  formula: '2023' | '2015';
  maxPoints: number | null;
  minutes: number | null;
  urls: { arkusz: string[]; zasady: string[] };
  status: 'pełny' | 'częściowy' | 'tylko metadane';
  tasks: ExamTask[];
  groups: ExamGroup[];
  sources: string[];
  /** Nazwa pliku mp3 w pakiecie (`<id>.mp3`), tylko angielski. */
  audio?: string | null;
  /** Części egzaminu (polski: arkusz 1 i 2). minutes = null, gdy CKE podaje tylko łączny czas. */
  parts?: { id: string; name: string; minutes: number | null; maxPoints?: number | null; tasks: string[] }[];
}

export interface ExamsFile {
  version: number;
  note: string;
  exams: Exam[];
}

// ---------- Bank zadań ----------

export type TaskSource = 'zadania.info' | 'CKE' | 'książka' | 'własne';
export type TaskStatus = 'nowe' | 'w trakcie' | 'zrobione' | 'do powtórki';

export interface BankTask {
  id: string;
  subjectId: string;
  source: TaskSource;
  url: string | null;
  page: number | null;
  ref: string; // identyfikator w źródle, np. numer zadania
  topicId: string;
  type: TaskType | null;
  difficulty: 1 | 2 | 3 | null;
  minutes: number;
  maxPoints: number | null;
  status: TaskStatus;
  lastSolved: string | null;
  result: number | null; // 0–100
  nextReview: string | null;
  reviewStep: number; // 0..4, indeks odstępu powtórki
  note: string;
  /** Klucz obrazu w IndexedDB (zrzut ekranu albo wycinek arkusza). */
  imageKey: string | null;
  /** Obraz odpowiedzi (wycinek zasad oceniania albo zrzut wklejony przez użytkownika). */
  answerImageKey?: string | null;
  answerText?: string | null;
  text: string | null; // treść wklejona przez użytkownika
  attribution: string | null;
  examId: string | null;
  history: { date: string; result: number; minutes: number | null }[];
}

// ---------- Diagnoza ----------

export interface DiagnosisItem {
  taskId: string;
  topicId: string;
  points: number | null;
  maxPoints: number;
}

export interface DiagnosisResult {
  id: string;
  subjectId: string;
  date: string;
  kind: 'test' | 'samoocena';
  /** Wynik na temat w procentach (test) albo samoocena 1–5 (samoocena). */
  perTopic: Record<string, number>;
  items: DiagnosisItem[];
  minutes: number | null;
}

// ---------- Plan ----------

export type PlanItemKind =
  | 'zadanie'
  | 'powtórka'
  | 'arkusz'
  | 'diagnoza'
  | 'podsumowanie'
  | 'przegląd'
  | 'brak-zadań'
  | 'korepetycje'
  | 'zajęcia';

export interface PlanItem {
  key: string;
  kind: PlanItemKind;
  subjectId: string | null;
  topicId: string | null;
  taskId: string | null;
  examId: string | null;
  minutes: number;
  label: string;
  reason: string;
}

export interface DayPlan {
  date: string;
  weekday: number; // 0 = niedziela
  available: number;
  used: number;
  phase: Record<string, Phase>;
  items: PlanItem[];
  shifted: { item: PlanItem; reason: string }[];
  notes: string[];
}

export type Phase = 'diagnoza' | 'nowe tematy' | 'powtórka' | 'arkusze' | 'przegląd' | 'po egzaminie';

export interface TimeWindow {
  start: string; // HH:MM
  end: string;
}

export interface FixedEvent {
  id: string;
  name: string;
  weekday: number | null; // stałe co tydzień
  date: string | null; // jednorazowe
  start: string;
  minutes: number;
  subjectId: string | null;
  countsAsStudy: boolean;
  skipDates: string[];
}

export interface DayLogEntry {
  date: string;
  items: PlanItem[];
  done: Record<string, { result: number | null; minutes: number | null; note: string }>;
  frozen: boolean;
}

// ---------- Arkusze próbne ----------

export interface MockResult {
  id: string;
  subjectId: string;
  examId: string | null;
  bankTaskIds: string[];
  date: string;
  minutesLimit: number;
  minutesUsed: number;
  points: Record<string, number | null>; // klucz: nr zadania albo id zadania z banku
  maxPoints: number;
  earned: number;
}

// ---------- Dziennik błędów ----------

export type ErrorType =
  | 'rachunkowy'
  | 'koncepcyjny'
  | 'brak czasu'
  | 'zapomniany wzór'
  | 'brak argumentacji'
  | 'błąd językowy';

export interface ErrorEntry {
  id: string;
  subjectId: string;
  taskId: string | null;
  topicId: string | null;
  type: ErrorType;
  note: string;
  date: string;
}

// ---------- Ustawienia ----------

export type WeightMode = 'bazowo' | 'trend' | 'mocno trend';

export interface Settings {
  subjects: SubjectConfig[];
  newTopicsEnd: string;
  /** Początek fazy 3 (arkusze co dwa dni). */
  mockPhaseStart: string;
  yearFrom: number;
  yearTo: number;
  includeOldFormula: boolean;
  excludedExams: string[];
  weekWindows: Record<number, TimeWindow[]>; // 0 = niedziela
  blockedAfter: string; // HH:MM
  blockedBefore: string; // HH:MM
  events: FixedEvent[];
  maxSubjectsPerDay: number;
  maxTasksPerDay: number;
  missedDays: 'przelicz' | 'zaległe' | 'pytaj';
  weightMode: WeightMode;
  manualWeights: Record<string, number>; // klucz: subjectId:topicId
  lessonNotesEnabled: boolean;
  theme: 'ciemny' | 'jasny' | 'system';
  defaultTaskMinutes: number;
  diagnosisOnePerDay: boolean;
  introHidden: boolean;
  recruitment: {
    name: string;
    formula: string;
    threshold: number | null;
    extraSubjectPct: number | null;
    verified: boolean;
  };
}

export interface LessonNote {
  id: string;
  date: string;
  subjectId: string;
  topicId: string | null;
  text: string;
}

export interface AppState {
  schema: number;
  settings: Settings;
  bank: BankTask[];
  diagnoses: DiagnosisResult[];
  dayLog: Record<string, DayLogEntry>;
  mocks: MockResult[];
  errors: ErrorEntry[];
  lessonNotes: LessonNote[];
  weightSuggestionsSeen: string[];
  /** Zadania na liście zaległych (planer ich nie rusza). */
  backlog: string[];
  /** Dni opuszczone, o które aplikacja już zapytała. */
  missedHandled: string[];
  startedAt: string;
}
