import { describe, expect, it } from 'vitest';
// @ts-expect-error moduł JS bez typów
import { parseFileName, findTasks, findMeta, isClosed, needsProof, guessTopics, summarize, tasksFromPages } from '../scripts/cke-parse.mjs';
// @ts-expect-error moduł JS bez typów
import { examIssues } from '../scripts/validate-exams.mjs';

// Linie mają sztuczną treść w układzie nagłówków CKE; nie są to prawdziwe zadania.
const page = (n: number, lines: string[]) => ({ page: n, lines: lines.map((text, i) => ({ text, y: 100 + i * 20 })) });

describe('nazwy plików CKE', () => {
  it('arkusz matematyki rozszerzonej', () => {
    const r = parseFileName('MMAP-R0-100-A-2505-arkusz.pdf');
    expect(r).toMatchObject({ family: 'matematyka', level: 'rozszerzony', year: 2025, session: 'maj', examId: 'MMAP-R0-100-2505', adapted: false, kind: 'arkusz' });
  });
  it('zasady oceniania', () => {
    expect(parseFileName('MMAP-R0-100-2605-zasady.pdf')).toMatchObject({ kind: 'zasady', examId: 'MMAP-R0-100-2605' });
  });
  it('polski: dwa arkusze w jednym egzaminie', () => {
    const a = parseFileName('MPOP-P1-100-A-2605-arkusz.pdf');
    const b = parseFileName('MPOP-P2-100-A-2605-arkusz.pdf');
    expect(a.examId).toBe('MPOP-P1-P2-2605');
    expect(b.examId).toBe('MPOP-P1-P2-2605');
    expect(a.taskPrefix).toBe('A1.');
    expect(b.taskPrefix).toBe('A2.');
  });
  it('arkusz dostosowany jest oznaczony', () => {
    expect(parseFileName('MMAP-P0-200-A-2605-arkusz.pdf').adapted).toBe(true);
  });
  it('nieznana nazwa', () => {
    expect(parseFileName('cokolwiek.pdf')).toBeNull();
  });
});

describe('nagłówki zadań', () => {
  const pages = [
    page(2, ['Czas pracy: 180 minut', 'Za rozwiązanie wszystkich zadań można otrzymać łącznie 50 punktów.']),
    page(3, ['Zadanie 1. (0–2)', 'Treść testowa pierwsza.', 'Zadanie 2.', 'Wspólny wstęp testowy.', 'Zadanie 2.1. (0–1)', 'A. a', 'B. b', 'C. c', 'D. d']),
    page(4, ['Zadanie 2.2. (0–3)', 'Wykaż, że coś testowego.']),
  ];
  it('punkty, podpunkty i polecenie wspólne', () => {
    const t = findTasks(pages);
    expect(t.map((x: { nr: string; points: number }) => [x.nr, x.points])).toEqual([['1', 2], ['2.1', 1], ['2.2', 3]]);
    expect(t[1].stem).toContain('Wspólny wstęp');
  });
  it('czas i maksimum arkusza', () => {
    expect(findMeta(pages)).toEqual({ maxPoints: 50, minutes: 180 });
  });
  it('typ i dowód', () => {
    expect(isClosed('A. 1\nB. 2\nC. 3\nD. 4')).toBe(true);
    expect(isClosed('Oblicz pole.')).toBe(false);
    expect(needsProof('Wykaż, że x > 0.')).toBe(true);
  });
  it('wpisy do exams.json', () => {
    const info = parseFileName('MMAP-R0-100-A-2505-arkusz.pdf');
    const r = tasksFromPages(info, pages);
    expect(r.map((x: { nr: string; type: string; proof: boolean }) => [x.nr, x.type, x.proof])).toEqual([
      ['1', 'otwarte', false], ['2.1', 'zamknięte', false], ['2.2', 'otwarte', true],
    ]);
    expect(r[2].topics).toContain('dowody');
  });
});

describe('tematy i streszczenie', () => {
  it('słowa kluczowe matematyki', () => {
    expect(guessTopics('matematyka', 'Oblicz log_2 8', { level: 'rozszerzony' })).toContain('logarytmy');
    expect(guessTopics('matematyka', 'Wyznacz pochodną funkcji', { level: 'podstawowy' })).not.toContain('pochodne');
  });
  it('polski: test historycznoliteracki i wypracowanie', () => {
    expect(guessTopics('polski', 'x', { part: 2 })).toContain('pol-wyp-kompozycja');
    expect(guessTopics('polski', 'x', { part: 1, section: 'historycznoliteracki' })).toEqual(['pol-historycznoliteracki']);
    expect(guessTopics('polski', 'Uzupełnij interpunkcję', { part: 1 })).toEqual(['pol-jezyk']);
  });
  it('streszczenie to początek polecenia', () => {
    expect(summarize('a b c')).toBe('a b c');
    expect(summarize(Array(30).fill('x').join(' '))!.endsWith('…')).toBe(true);
  });
});

describe('skrypt walidacji', () => {
  it('rozbieżność sumy jest zapisywana', () => {
    const e = { id: 'X', maxPoints: 10, minutes: 180, urls: { arkusz: ['u'], zasady: [] }, groups: [],
      tasks: [{ nr: '1', maxPoints: 3, topics: ['a'] }] };
    expect(examIssues(e).join(' ')).toMatch(/Suma punktów zadań to 3/);
  });
});
