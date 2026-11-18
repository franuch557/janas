import { describe, expect, it } from 'vitest';
import examsFile from '../data/exams.json';
import type { ExamsFile } from '../src/types';
import { availableYears, examPointSum, filterExams, validateExam } from '../src/logic/exams';
import { exam, examTask } from './helpers';

const data = examsFile as ExamsFile;

describe('zakres lat', () => {
  const exams = [
    exam({ id: 'A-2015', year: 2022, formula: '2015' }),
    exam({ id: 'A-2023', year: 2023 }),
    exam({ id: 'A-2024', year: 2024 }),
    exam({ id: 'A-2025', year: 2025 }),
    exam({ id: 'P-2024', year: 2024, level: 'podstawowy' }),
  ];
  const base = { family: 'matematyka' as const, level: 'rozszerzony' as const, includeOldFormula: false, excluded: [] };

  it('zwraca tylko arkusze formuły 2023 w zakresie', () => {
    const r = filterExams(exams, { ...base, yearFrom: 2023, yearTo: 2024 });
    expect(r.current.map((e) => e.id)).toEqual(['A-2023', 'A-2024']);
    expect(r.old).toEqual([]);
  });

  it('poprzednia formuła jest osobno i tylko po włączeniu', () => {
    const r = filterExams(exams, { ...base, yearFrom: 2020, yearTo: 2025, includeOldFormula: true });
    expect(r.current.map((e) => e.id)).not.toContain('A-2015');
    expect(r.old.map((e) => e.id)).toEqual(['A-2015']);
  });

  it('wyłączony arkusz nie trafia do analiz', () => {
    const r = filterExams(exams, { ...base, yearFrom: 2023, yearTo: 2025, excluded: ['A-2024'] });
    expect(r.current.map((e) => e.id)).toEqual(['A-2023', 'A-2025']);
  });

  it('nie miesza poziomów', () => {
    const r = filterExams(exams, { ...base, level: 'podstawowy', yearFrom: 2023, yearTo: 2026 });
    expect(r.current.map((e) => e.id)).toEqual(['P-2024']);
  });

  it('lata w bazie', () => {
    expect(availableYears(data.exams, 'matematyka', 'rozszerzony')).toEqual([2023, 2024, 2025, 2026]);
  });
});

describe('walidacja sumy punktów', () => {
  it('zgłasza rozbieżność sumy', () => {
    const e = exam({ id: 'X', year: 2024, maxPoints: 10, tasks: [examTask('1', 4, ['logarytmy']), examTask('2', 5, ['ciagi'])] });
    expect(validateExam(e).map((i) => i.kind)).toContain('suma');
  });

  it('suma zgodna nie daje błędu sumy', () => {
    const e = exam({ id: 'X', year: 2024, maxPoints: 9, tasks: [examTask('1', 4, ['logarytmy']), examTask('2', 5, ['ciagi'])] });
    expect(validateExam(e)).toEqual([]);
  });

  it('nieznane punkty zgłasza jako brak danych, nie jako błąd sumy', () => {
    const e = exam({ id: 'X', year: 2024, maxPoints: 9, tasks: [examTask('1', null, ['logarytmy']), examTask('2', 5, ['ciagi'])] });
    const kinds = validateExam(e).map((i) => i.kind);
    expect(kinds).toContain('brak punktów');
    expect(kinds).not.toContain('suma');
  });
});

describe('arkusz referencyjny MMAP-R0-100-2505', () => {
  const ref = data.exams.find((e) => e.id === 'MMAP-R0-100-2505')!;

  it('ma 12 zadań, 50 pkt i 180 minut', () => {
    expect(ref.tasks).toHaveLength(12);
    expect(ref.maxPoints).toBe(50);
    expect(ref.minutes).toBe(180);
  });

  it('suma punktów zadań i grup równa się 50', () => {
    const { known, unknownTasks } = examPointSum(ref);
    expect(unknownTasks).toEqual([]);
    expect(known).toBe(50);
  });

  it('rozkład punktów zgodny z założeniami', () => {
    const pts = Object.fromEntries(ref.tasks.map((t) => [t.nr, t.maxPoints]));
    expect(pts['11']).toBe(6);
    expect(pts['12']).toBe(6);
    expect([pts['8'], pts['9'], pts['10']]).toEqual([5, 5, 5]);
    expect(pts['6']).toBe(4);
    expect(pts['5']).toBe(4);
    expect(pts['4']).toBe(3);
    const g = (a: string, b: string) => ref.groups.find((x) => x.tasks.includes(a) && x.tasks.includes(b))!.points;
    expect(g('1', '2')).toBe(5);
    expect(g('3', '7')).toBe(7);
  });

  it('tematy zadań zgodne z założeniami', () => {
    const top = (nr: string) => ref.tasks.find((t) => t.nr === nr)!.topics;
    expect(top('12')).toContain('pochodne');
    expect(top('11')).toContain('kwadratowa-parametr');
    expect(top('8')).toContain('geometria-analityczna');
    expect(top('9')).toContain('trygonometria');
    expect(top('10')).toContain('stereometria');
    expect(top('5')).toContain('wartosc-bezwzgledna');
    expect(top('6')).toContain('ciagi');
  });

  it('nie zgłasza błędu sumy', () => {
    expect(validateExam(ref).filter((i) => i.kind === 'suma')).toEqual([]);
  });
});

describe('plik exams.json', () => {
  it('każdy arkusz ma wymagane pola', () => {
    for (const e of data.exams) {
      expect(['matematyka', 'polski', 'angielski']).toContain(e.family);
      expect(['podstawowy', 'rozszerzony']).toContain(e.level);
      expect(e.year).toBeGreaterThanOrEqual(2023);
      expect(e.formula).toBe('2023');
      expect(Array.isArray(e.tasks)).toBe(true);
      expect(e.sources.length).toBeGreaterThan(0);
    }
  });

  it('żaden znany wynik nie przekracza maksimum arkusza', () => {
    for (const e of data.exams) {
      if (e.maxPoints == null) continue;
      expect(examPointSum(e).known).toBeLessThanOrEqual(e.maxPoints);
    }
  });
});
