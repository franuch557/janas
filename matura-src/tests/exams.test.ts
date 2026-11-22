import { describe, expect, it } from 'vitest';
import examsFile from '../data/exams.json';
import type { ExamsFile } from '../src/types';
import { availableYears, examPointSum, filterExams, validateExam } from '../src/logic/exams';
import type { Exam, ExamTask } from '../src/types';
import kryteria from '../data/kryteria.json';
import { examLabel, normalizeExams } from '../src/logic/cke';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const imgDir = fileURLToPath(new URL('../cke-obrazy/', import.meta.url));

// Dane testowe ze sztucznymi identyfikatorami (lokalnie, żeby test danych nie zależał od src/store).
function examTask(nr: string, maxPoints: number | null, topics: string[], type: ExamTask['type'] = 'otwarte'): ExamTask {
  return { nr, maxPoints, type, topics, summary: null, proof: null, cases: null, page: null, source: 'test' };
}
function exam(over: Partial<Exam> & { id: string; year: number }): Exam {
  return { family: 'matematyka', level: 'rozszerzony', session: 'maj', formula: '2023', maxPoints: 10, minutes: 180,
    urls: { arkusz: [], zasady: [] }, status: 'pełny', tasks: [], groups: [], sources: ['test'], ...over };
}

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

  it('tematy do wyboru (alternative) liczą się raz', () => {
    const a = { ...examTask('A2.1', 35, ['x']), alternative: 'A2.temat' };
    const b = { ...examTask('A2.2', 35, ['x']), alternative: 'A2.temat' };
    const e = exam({ id: 'X', year: 2025, maxPoints: 60, tasks: [examTask('A1.1', 25, ['x']), a, b] });
    expect(examPointSum(e).known).toBe(60);
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

  it('ma 12 zadań (12.1 i 12.2 to podpunkty zadania 12), 50 pkt i 180 minut', () => {
    expect(new Set(ref.tasks.map((t) => t.nr.split('.')[0])).size).toBe(12);
    expect(ref.maxPoints).toBe(50);
    expect(ref.minutes).toBe(180);
  });

  it('suma punktów zadań równa się 50, bez grup', () => {
    const { known, unknownTasks } = examPointSum(ref);
    expect(unknownTasks).toEqual([]);
    expect(known).toBe(50);
    expect(ref.groups).toEqual([]);
  });

  it('punktacja zgodna z arkuszem PDF', () => {
    const pts = Object.fromEntries(ref.tasks.map((t) => [t.nr, t.maxPoints]));
    expect(pts).toEqual({ '1': 2, '2': 3, '3': 3, '4': 3, '5': 4, '6': 4, '7': 4, '8': 5, '9': 5, '10': 5, '11': 6, '12.1': 2, '12.2': 4 });
  });

  it('tematy zadań zgodne z treścią', () => {
    const top = (nr: string) => ref.tasks.find((t) => t.nr === nr)!.topics;
    expect(top('12.2')).toContain('pochodne');
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

describe('wszystkie arkusze z importu PDF', () => {
  const imported = data.exams.filter((e) => e.tasks.length > 0);

  it('jest 16 arkuszy z sesji majowej (4 przedmioty × lata 2023–2026) i arkusze z innych sesji', () => {
    expect(imported.filter((e) => e.session === 'maj')).toHaveLength(16);
    expect(imported.length).toBeGreaterThanOrEqual(16);
  });

  it('każdy arkusz ma sumę punktów równą maksimum (alternative liczone raz)', () => {
    for (const e of imported) {
      const { known, unknownTasks } = examPointSum(e);
      expect(unknownTasks, e.id).toEqual([]);
      expect(known, e.id).toBe(e.maxPoints);
      if (e.session !== 'zbiór') expect(e.minutes, e.id).toBeGreaterThan(0);
    }
  });

  it('każde zadanie zamknięte z sesji majowej ma answer z opcjami', () => {
    for (const e of imported.filter((x) => x.session === 'maj')) {
      for (const t of e.tasks.filter((x) => x.type === 'zamknięte')) {
        expect(t.answer, `${e.id} ${t.nr}`).toBeTruthy();
        for (const i of t.answer!.items) {
          expect(i.options.length, `${e.id} ${t.nr}`).toBeGreaterThan(1);
          expect(i.options, `${e.id} ${t.nr}`).toContain(i.correct);
        }
      }
    }
  });

  it('odpowiedzi z innych sesji: poprawne opcje albo brak (null), nigdy zgadywanie', () => {
    for (const e of imported.filter((x) => x.session !== 'maj')) {
      for (const t of e.tasks.filter((x) => x.type === 'zamknięte' && x.answer)) {
        for (const i of t.answer!.items) {
          expect(i.options.length, `${e.id} ${t.nr}`).toBeGreaterThan(1);
          if (i.correct != null) expect(i.options, `${e.id} ${t.nr}`).toContain(i.correct);
        }
      }
    }
  });

  it('angielski ma nagranie i wypowiedź pisemną, polski ma dwa tematy wypracowania', () => {
    for (const e of imported.filter((x) => x.family === 'angielski' && x.session === 'maj')) {
      expect(e.audio).toBe(`${e.id}.mp3`);
      expect(e.tasks.find((t) => t.nr === '12')!.essay?.criteria).toBe('ang-pp-2023');
      for (const nr of ['1', '2', '3']) {
        const a = e.tasks.find((t) => t.nr === nr)!.audio!;
        expect(a.start!, `${e.id} ${nr}`).toBeLessThan(a.end!);
      }
    }
    for (const e of imported.filter((x) => x.family === 'polski')) {
      const essays = e.tasks.filter((t) => t.essay);
      expect(essays.map((t) => t.nr)).toEqual(['A2.1', 'A2.2']);
      expect(new Set(essays.map((t) => t.alternative)).size).toBe(1);
      expect(essays[0].essay).toEqual({ minWords: 300, maxWords: null, criteria: 'pol-2023' });
      expect(e.parts?.map((p) => p.id)).toEqual(['A1', 'A2']);
    }
  });

  it('kryteria wypracowania sumują się do maksimum zadania', () => {
    const k = kryteria as unknown as Record<string, { max: number; groups: { criteria: { max: number }[] }[] }>;
    for (const key of ['pol-2023', 'ang-pp-2023']) {
      const sum = k[key].groups.flatMap((g) => g.criteria).reduce((s, c) => s + c.max, 0);
      expect(sum).toBe(k[key].max);
    }
    expect(k['pol-2023'].max).toBe(35);
  });

  it.skipIf(!existsSync(imgDir))('każde zadanie ma obraz w cke-obrazy/zad/', () => {
    for (const e of imported) {
      for (const t of e.tasks) expect(existsSync(join(imgDir, 'zad', e.id, `${t.nr}.jpg`)), `${e.id} ${t.nr}`).toBe(true);
    }
  });
});

describe('zbiory zadań i informatory CKE', () => {
  const books = data.exams.filter((e) => e.session === 'zbiór');
  it('są cztery (zbiór i informator, podstawa i rozszerzenie), każde zadanie ma temat i punkty', () => {
    expect(books.map((e) => e.id).sort()).toEqual(['INF-MMAP-P0', 'INF-MMAP-R0', 'ZBIOR-MMAP-P0', 'ZBIOR-MMAP-R0']);
    for (const e of books) for (const t of e.tasks) {
      expect(t.topics.length, `${e.id} ${t.nr}`).toBeGreaterThan(0);
      expect(t.maxPoints, `${e.id} ${t.nr}`).toBeGreaterThan(0);
    }
  });
  it('każde zadanie zamknięte ma klucz z opcji', () => {
    for (const e of books) for (const t of e.tasks.filter((x) => x.type === 'zamknięte')) {
      expect(t.answer, `${e.id} ${t.nr}`).toBeTruthy();
      for (const i of t.answer!.items) expect(i.options, `${e.id} ${t.nr}`).toContain(i.correct);
    }
  });
  it('nie są arkuszami próbnymi i nie zmieniają lat arkuszy', () => {
    expect(availableYears(data.exams, 'matematyka', 'podstawowy')).not.toContain(2022);
    const n = normalizeExams(data).filter((e) => e.session === 'zbiór');
    expect(n).toHaveLength(4);
    expect(n.every((e) => !e.complete)).toBe(true);
    expect(examLabel({ year: 2024, session: 'zbiór', id: 'INF-MMAP-P0' })).toBe('Informator CKE');
    expect(examLabel({ year: 2022, session: 'zbiór', examId: 'ZBIOR-MMAP-R0' })).toBe('Zbiór zadań CKE');
  });
});

describe('plik exams.json', () => {
  it('każdy arkusz ma wymagane pola', () => {
    for (const e of data.exams) {
      expect(['matematyka', 'polski', 'angielski']).toContain(e.family);
      expect(['podstawowy', 'rozszerzony']).toContain(e.level);
      expect(e.year).toBeGreaterThanOrEqual(e.session === 'zbiór' ? 2022 : 2023);
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
