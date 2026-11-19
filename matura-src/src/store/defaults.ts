import type { AppState, Settings, SubjectConfig } from '../types';
import { todayISO } from '../logic/dates';

/**
 * Daty egzaminów: komunikat dyrektora CKE z 20.08.2026 o harmonogramie 2027
 * (termin główny, godz. 9:00). Polski i angielski rozszerzony są wyłączone,
 * bo użytkownik zdaje je tylko na poziomie podstawowym (decyzja 1).
 */
export const DEFAULT_SUBJECTS: SubjectConfig[] = [
  {
    id: 'mat-r',
    family: 'matematyka',
    level: 'rozszerzony',
    name: 'Matematyka rozszerzona',
    enabled: true,
    examDate: '2027-05-11',
    oralDate: null,
    targetPct: null,
    priority: 3,
    mockMinutes: 180,
    diagnosisTasks: 15,
    diagnosisMinutes: 30,
  },
  {
    id: 'mat-p',
    family: 'matematyka',
    level: 'podstawowy',
    name: 'Matematyka podstawowa',
    enabled: true,
    examDate: '2027-05-05',
    oralDate: null,
    targetPct: null,
    priority: 2,
    mockMinutes: 180,
    diagnosisTasks: 15,
    diagnosisMinutes: 30,
  },
  {
    id: 'pol-p',
    family: 'polski',
    level: 'podstawowy',
    name: 'Język polski',
    enabled: true,
    examDate: '2027-05-04',
    oralDate: null,
    targetPct: null,
    priority: 1.5,
    mockMinutes: 240,
    diagnosisTasks: 6,
    diagnosisMinutes: 30,
  },
  {
    id: 'ang-p',
    family: 'angielski',
    level: 'podstawowy',
    name: 'Język angielski',
    enabled: true,
    examDate: '2027-05-06',
    oralDate: null,
    targetPct: null,
    priority: 1,
    mockMinutes: null, // czasu arkusza nie potwierdziłem w źródle CKE
    diagnosisTasks: 6,
    diagnosisMinutes: 30,
  },
  {
    id: 'pol-r',
    family: 'polski',
    level: 'rozszerzony',
    name: 'Język polski rozszerzony',
    enabled: false,
    examDate: '2027-05-20',
    oralDate: null,
    targetPct: null,
    priority: 1,
    mockMinutes: null,
    diagnosisTasks: 6,
    diagnosisMinutes: 30,
  },
  {
    id: 'ang-r',
    family: 'angielski',
    level: 'rozszerzony',
    name: 'Język angielski rozszerzony',
    enabled: false,
    examDate: '2027-05-07',
    oralDate: null,
    targetPct: null,
    priority: 1,
    mockMinutes: null,
    diagnosisTasks: 6,
    diagnosisMinutes: 30,
  },
];

export function defaultSettings(): Settings {
  const weekday = [{ start: '17:00', end: '18:30' }];
  return {
    subjects: DEFAULT_SUBJECTS.map((s) => ({ ...s })),
    newTopicsEnd: '2027-04-01',
    mockPhaseStart: '2027-05-01',
    yearFrom: 2023,
    yearTo: 2026,
    includeOldFormula: false,
    excludedExams: [],
    weekWindows: {
      0: [{ start: '09:30', end: '13:00' }],
      1: weekday,
      2: weekday,
      3: weekday,
      4: weekday,
      5: weekday,
      6: [{ start: '10:00', end: '13:00' }],
    },
    blockedAfter: '22:00',
    blockedBefore: '06:00',
    events: [
      {
        id: 'korepetycje-ang',
        name: 'Korepetycje z angielskiego',
        weekday: 6,
        date: null,
        start: '15:15',
        minutes: 60,
        subjectId: 'ang-p',
        countsAsStudy: true,
        skipDates: [],
      },
    ],
    maxSubjectsPerDay: 2,
    maxTasksPerDay: 5,
    missedDays: 'przelicz',
    weightMode: 'bazowo',
    manualWeights: {},
    lessonNotesEnabled: false,
    theme: 'jasny',
    defaultTaskMinutes: 15,
    diagnosisOnePerDay: true,
    introHidden: false,
    recruitment: {
      name: 'Politechnika Poznańska, Automatyka i Robotyka',
      formula: 'W = 0,5·JP + 0,5·JO + 2,5·(M podst. + M rozsz.) + 2·X',
      threshold: null,
      extraSubjectPct: null,
      verified: false,
    },
  };
}

export const SCHEMA = 2;

export function emptyState(): AppState {
  return {
    schema: SCHEMA,
    settings: defaultSettings(),
    bank: [],
    diagnoses: [],
    dayLog: {},
    mocks: [],
    errors: [],
    lessonNotes: [],
    weightSuggestionsSeen: [],
    backlog: [],
    missedHandled: [],
    startedAt: todayISO(),
  };
}
