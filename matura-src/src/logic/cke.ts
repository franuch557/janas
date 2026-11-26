// Arkusze CKE z data/exams.json w postaci używanej przez aplikację.
// Plik danych może mieć tylko część pól z kontraktu, więc każde pole jest
// sprawdzane osobno, a zadanie bez punktacji nie trafia do katalogu.

import type { Family, Level } from '../types';
import { subjectFor, type SubjectId } from '../model';

export interface ClosedItem {
  id: string;
  label: string | null;
  options: string[];
  correct: string | null;
}

export type Scoring = 'each' | 'all' | Record<string, number>;

export interface ClosedAnswer {
  items: ClosedItem[];
  scoring: Scoring;
  /** „Wybierz dwie odpowiedzi”: pozycje to litery w kolejności alfabetycznej, porównywane jako zbiór. */
  unordered?: boolean;
}

export interface EssayInfo {
  minWords: number | null;
  maxWords: number | null;
  criteria: string;
}

/** Punktacja zadania otwartego z zasad CKE (poziomy od najwyższego) i wynik końcowy z klucza. */
export interface Rubric {
  levels: { points: number; text: string }[];
  result: string | null;
}

export interface CkeTask {
  id: string;
  examId: string;
  subjectId: SubjectId;
  nr: string;
  maxPoints: number;
  type: 'zamknięte' | 'otwarte';
  /** Zamknięte z kluczem odpowiedzi: sprawdzane automatycznie. */
  auto: boolean;
  answer: ClosedAnswer | null;
  topics: string[];
  summary: string | null;
  context: string | null;
  audio: { start: number | null; end: number | null } | null;
  alternative: string | null;
  essay: EssayInfo | null;
  rubric: Rubric | null;
  partId: string | null;
  minutes: number;
  year: number;
  session: string;
}

export interface CkePart {
  id: string;
  name: string;
  /** 0 = brak w danych (liczony proporcjonalnie do punktów). */
  minutes: number;
  maxPoints: number | null;
  taskIds: string[];
}

export interface CkeExam {
  id: string;
  subjectId: SubjectId;
  family: Family;
  level: Level;
  year: number;
  session: string;
  maxPoints: number | null;
  minutes: number | null;
  audio: string | null;
  parts: CkePart[];
  tasks: CkeTask[];
  /** Suma punktów zadań zgadza się z maksimum arkusza. */
  complete: boolean;
}

export function taskIdFor(examId: string, nr: string): string {
  return `${examId}-n${nr.replace(/[^A-Za-z0-9]+/g, '-')}`;
}

type Raw = Record<string, unknown>;
const isObj = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : null);

function readAnswer(x: unknown): ClosedAnswer | null {
  if (!isObj(x) || !Array.isArray(x.items) || x.items.length === 0) return null;
  const items: ClosedItem[] = [];
  for (const it of x.items) {
    if (!isObj(it) || !Array.isArray(it.options)) return null;
    const options = it.options.filter((o): o is string => typeof o === 'string');
    if (options.length < 2) return null;
    const correct = str(it.correct);
    items.push({ id: String(it.id ?? items.length + 1), label: str(it.label), options, correct: correct && options.includes(correct) ? correct : null });
  }
  let scoring: Scoring = 'each';
  if (x.scoring === 'all' || x.scoring === 'each') scoring = x.scoring;
  else if (isObj(x.scoring)) {
    const rec: Record<string, number> = {};
    for (const [k, v] of Object.entries(x.scoring)) if (typeof v === 'number') rec[k] = v;
    scoring = rec;
  }
  const same = items.length > 1 && items.every((i) => i.options.join() === items[0].options.join());
  const unordered = same && items.every((i) => /alfabetycznie/i.test(i.label ?? ''));
  return unordered ? { items, scoring, unordered } : { items, scoring };
}

function readRubric(x: unknown, max: number): Rubric | null {
  if (!isObj(x) || !Array.isArray(x.levels)) return null;
  const levels = x.levels
    .filter(isObj)
    .map((l) => ({ points: num(l.points) ?? -1, text: str(l.text) ?? '' }))
    .filter((l) => l.points >= 0 && l.points <= max && l.text)
    .sort((a, b) => b.points - a.points);
  if (levels.length < 2 || levels[0].points !== max) return null;
  return { levels, result: str(x.result) };
}

function readEssay(x: unknown): EssayInfo | null {
  if (!isObj(x)) return null;
  return { minWords: num(x.minWords), maxWords: num(x.maxWords), criteria: str(x.criteria) ?? '' };
}

/** Część arkusza z numeru zadania polskiego („A1.5” = arkusz 1). */
function partFromNr(nr: string): string | null {
  const m = /^A(\d)\./.exec(nr);
  return m ? `A${m[1]}` : null;
}

/** Punkty arkusza: zadania z tym samym kluczem `alternative` liczą się raz. */
export function pointSum(tasks: { maxPoints: number; alternative: string | null }[]): number {
  const seen = new Set<string>();
  let sum = 0;
  for (const t of tasks) {
    if (t.alternative) {
      if (seen.has(t.alternative)) continue;
      seen.add(t.alternative);
    }
    sum += t.maxPoints;
  }
  return sum;
}

export function normalizeExams(raw: unknown): CkeExam[] {
  const list = isObj(raw) && Array.isArray(raw.exams) ? raw.exams : [];
  const out: CkeExam[] = [];
  for (const e of list) {
    if (!isObj(e) || typeof e.id !== 'string') continue;
    // formuła 2015 (2015–2022): tylko matematyka, bo polski i angielski wyglądały zupełnie inaczej
    if (e.formula != null && e.formula !== '2023' && !(e.formula === '2015' && e.family === 'matematyka')) continue;
    const family = e.family as Family;
    const level = e.level as Level;
    const sub = subjectFor(family, level);
    if (!sub) continue;
    const maxPoints = num(e.maxPoints);
    const minutes = num(e.minutes);
    const year = num(e.year) ?? 0;
    const session = str(e.session) ?? 'maj';
    const pace = (minutes ?? sub.mockMinutes) / (maxPoints ?? 50);
    const rawParts = Array.isArray(e.parts) ? e.parts.filter(isObj) : [];
    const tasks: CkeTask[] = [];
    let allPointed = true;
    let missingAudio = false;
    for (const t of Array.isArray(e.tasks) ? e.tasks : []) {
      if (!isObj(t) || typeof t.nr !== 'string') continue;
      const mp = num(t.maxPoints);
      if (mp == null || mp <= 0) {
        allPointed = false;
        continue;
      }
      const answer = readAnswer(t.answer);
      const declared = t.type === 'zamknięte' ? 'zamknięte' : 'otwarte';
      const auto = declared === 'zamknięte' && answer != null && answer.items.every((i) => i.correct != null);
      const essay = readEssay(t.essay);
      const partRaw = rawParts.find((p) => Array.isArray(p.tasks) && p.tasks.includes(t.nr));
      const partId = partRaw ? String(partRaw.id) : partFromNr(t.nr);
      let mins = Math.max(2, Math.round(pace * mp));
      if (essay) mins = sub.family === 'polski' ? 90 : 30;
      const audioRaw = isObj(t.audio) ? { start: num(t.audio.start), end: num(t.audio.end) } : null;
      // zadanie ze słuchania bez nagrania w pakiecie: pomijam (arkusz nie jest wtedy pełny)
      if (audioRaw && !str(e.audio)) {
        missingAudio = true;
        continue;
      }
      tasks.push({
        id: taskIdFor(e.id, t.nr),
        examId: e.id,
        subjectId: sub.id,
        nr: t.nr,
        maxPoints: mp,
        // zamknięte bez klucza odpowiedzi są oceniane jak otwarte (samoocena)
        type: auto ? 'zamknięte' : 'otwarte',
        auto,
        answer: auto ? answer : null,
        topics: Array.isArray(t.topics) ? t.topics.filter((x): x is string => typeof x === 'string') : [],
        summary: str(t.summary)?.replace(/\uFFFD/g, '').replace(/\s+/g, ' ').trim() || null,
        context: str(t.context),
        audio: audioRaw,
        alternative: str(t.alternative),
        essay,
        rubric: auto || essay ? null : readRubric(t.rubric, mp),
        partId,
        minutes: mins,
        year,
        session,
      });
    }
    const parts: CkePart[] = rawParts.map((p) => ({
      id: String(p.id),
      name: str(p.name) ?? String(p.id),
      minutes: num(p.minutes) ?? 0,
      maxPoints: num(p.maxPoints),
      taskIds: ((Array.isArray(p.tasks) ? p.tasks : []) as unknown[]).filter((x): x is string => typeof x === 'string').map((nr) => taskIdFor(e.id as string, nr)),
    }));
    const sum = pointSum(tasks);
    out.push({
      id: e.id,
      subjectId: sub.id,
      family,
      level,
      year,
      session,
      maxPoints,
      minutes,
      audio: str(e.audio),
      parts,
      tasks,
      // zbiór zadań nie jest arkuszem próbnym
      complete: session !== 'zbiór' && !missingAudio && tasks.length > 0 && allPointed && maxPoints != null && sum === maxPoints,
    });
  }
  return out.sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
}

const MONTHS_NOM: Record<string, string> = { styczeń: 'styczeń (próbna)', marzec: 'marzec (próbna)', maj: 'maj', czerwiec: 'czerwiec', 'sierpień': 'sierpień', wrzesień: 'wrzesień (diagnostyczna)', grudzień: 'grudzień (diagnostyczna)' };
/** Arkusze próbne i diagnostyczne CKE są w formule 2023 także przed 2023 rokiem. */
export const NEW_FORMULA_EXTRA = new Set(['styczeń', 'marzec', 'wrzesień', 'grudzień']);

/** Nazwa źródła zadania spoza arkuszy: zbiór zadań CKE (2022) albo informator CKE (2024). */
export function bookLabel(id: string): string {
  return id.startsWith('INF-') ? 'Informator CKE' : 'Zbiór zadań CKE';
}

export function examLabel(e: { year: number; session: string; id?: string; examId?: string }): string {
  if (e.session === 'zbiór') return bookLabel(e.id ?? e.examId ?? '');
  return `CKE ${e.year}, ${MONTHS_NOM[e.session] ?? e.session}${e.year < 2023 && !NEW_FORMULA_EXTRA.has(e.session) ? ', stara formuła' : ''}`;
}

/** Numer jak w arkuszu CKE: polski „A1.7.1” → „7.1”, temat wypracowania „A2.1” → „temat 1”. */
export function displayNr(nr: string): string {
  const a1 = /^A1\.(.+)$/.exec(nr);
  if (a1) return a1[1];
  const a2 = /^A2\.(.+)$/.exec(nr);
  if (a2) return `temat ${a2[1]}`;
  return nr;
}

export function taskLabel(t: { year: number; session: string; nr: string }): string {
  const n = displayNr(t.nr);
  return n.startsWith('temat') ? `${examLabel(t)}, wypracowanie, ${n}` : `${examLabel(t)}, zad. ${n}`;
}

/** Czas arkusza (albo części) w minutach. */
export function examMinutes(e: CkeExam, partId: string | null): number {
  if (partId) {
    const p = e.parts.find((x) => x.id === partId);
    if (p?.minutes) return p.minutes;
    const total = e.minutes ?? subjectMinutes(e.subjectId);
    const pts = p?.maxPoints ?? pointSum(examTasks(e, partId));
    if (e.maxPoints && pts) return Math.round((total * pts) / e.maxPoints / 5) * 5;
  }
  return e.minutes ?? subjectMinutes(e.subjectId);
}

function subjectMinutes(id: SubjectId): number {
  return id === 'pol-p' ? 240 : id === 'ang-p' ? 120 : 180;
}

/** Zadania arkusza albo jego części, w kolejności arkusza. */
export function examTasks(e: CkeExam, partId: string | null): CkeTask[] {
  if (!partId) return e.tasks;
  const p = e.parts.find((x) => x.id === partId);
  if (p && p.taskIds.length) return e.tasks.filter((t) => p.taskIds.includes(t.id));
  return e.tasks.filter((t) => t.partId === partId);
}

/** Części, na które dzielę arkusz w planie (polski: arkusz 1 i 2). */
export function examPartIds(e: CkeExam): (string | null)[] {
  if (e.parts.length > 1) return e.parts.map((p) => p.id);
  const ids = [...new Set(e.tasks.map((t) => t.partId).filter(Boolean))] as string[];
  return ids.length > 1 ? ids.sort() : [null];
}

export function partName(e: CkeExam, partId: string | null): string | null {
  if (!partId) return null;
  const n = partId.replace(/\D/g, '');
  return n ? `Arkusz ${n}` : e.parts.find((p) => p.id === partId)?.name ?? partId;
}

// ---------- Pakiet obrazów ----------

export interface CkePack {
  zad: Record<string, string>;
  odp: Record<string, string>;
  ctx: Record<string, string>;
}

export function readPack(raw: unknown): CkePack | null {
  if (!isObj(raw) || !isObj(raw.zad)) return null;
  const pick = (x: unknown) => {
    const o: Record<string, string> = {};
    if (isObj(x)) for (const [k, v] of Object.entries(x)) if (typeof v === 'string') o[k] = v;
    return o;
  };
  return { zad: pick(raw.zad), odp: pick(raw.odp), ctx: pick(raw.ctx) };
}
