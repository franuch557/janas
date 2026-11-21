import { describe, expect, it } from 'vitest';
// @ts-expect-error moduł JS bez typów
import { parseFileName, parseHeader, findHeads, findMeta, isClosed, needsProof, guessTopics, summarize, tasksFromPages, versionA, solutionTokens, mkLine, pageLimits } from '../scripts/cke-parse.mjs';
// @ts-expect-error moduł JS bez typów
import { buildAnswer, scoringFrom, letterRange } from '../scripts/cke-answers.mjs';
// @ts-expect-error moduł JS bez typów
import { examIssues, pointSum } from '../scripts/validate-exams.mjs';
// @ts-expect-error moduł JS bez typów
import { groupLines } from '../scripts/cke-pdf.mjs';

// Linie mają sztuczną treść w układzie nagłówków CKE; nie są to prawdziwe zadania.
const page = (n: number, lines: string[]) => ({ page: n, width: 595, height: 842, lines: lines.map((text, i) => mkLine(text, 100 + i * 20)) });

describe('nazwy plików CKE', () => {
  it('arkusz matematyki rozszerzonej', () => {
    const r = parseFileName('MMAP-R0-100-A-2505-arkusz.pdf');
    expect(r).toMatchObject({ family: 'matematyka', level: 'rozszerzony', year: 2025, session: 'maj', examId: 'MMAP-R0-100-2505', adapted: false, kind: 'arkusz' });
  });
  it('arkusze 2023 bez końcówki „-arkusz”', () => {
    expect(parseFileName('MMAP-P0-100-2305.pdf')).toMatchObject({ kind: 'arkusz', examId: 'MMAP-P0-100-2305' });
    expect(parseFileName('MPOP-P1-100-2305.pdf')).toMatchObject({ kind: 'arkusz', examId: 'MPOP-P1-P2-2305', part: 1 });
    expect(parseFileName('MJAP-P0-100-2305.pdf')).toMatchObject({ kind: 'arkusz', examId: 'MJAP-P0-100-2305' });
  });
  it('zasady oceniania', () => {
    expect(parseFileName('MMAP-R0-100-2605-zasady.pdf')).toMatchObject({ kind: 'zasady', examId: 'MMAP-R0-100-2605' });
  });
  it('zasady i nagrania angielskiego o złożonych nazwach', () => {
    const id = (f: string) => parseFileName(f)?.examId;
    expect(parseFileName('MJAP-P0-100-200-660-2505_MJAU-P0-100-2505-zasady.pdf')).toMatchObject({ kind: 'zasady', examId: 'MJAP-P0-100-2505', adapted: false });
    expect(id('MJAP-P0-100-200-660-K00-MJAU-100-2405-zasady.pdf')).toBe('MJAP-P0-100-2405');
    expect(id('MJAP-P0-100-200-660-2605-zasady.pdf')).toBe('MJAP-P0-100-2605');
    expect(id('MJAP-P0-100-2305-zasady.pdf')).toBe('MJAP-P0-100-2305');
    expect(parseFileName('MJAP-P0-100-660-K00-2405-transkrypcja.pdf')).toMatchObject({ kind: 'transkrypcja', examId: 'MJAP-P0-100-2405' });
    expect(parseFileName('MJAP-P0-100-2305.mp3')).toMatchObject({ kind: 'nagranie', examId: 'MJAP-P0-100-2305' });
    expect(parseFileName('MJA-P-100-2405.mp3')).toMatchObject({ kind: 'nagranie', examId: 'MJAP-P0-100-2405' });
    expect(id('MJAP-P-100-2505_MJAU-P-100-2505.mp3')).toBe('MJAP-P0-100-2505');
    expect(id('MJAP-P-100-2605.mp3')).toBe('MJAP-P0-100-2605');
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

describe('nagłówki z rozbitymi spacjami (tekst z pdfjs)', () => {
  it('„Z adanie 4 . (0 – 1)” i podpunkty', () => {
    expect(parseHeader('Z adanie 4 . (0 – 1)')).toEqual({ main: 4, sub: null, nr: '4', points: 1 });
    expect(parseHeader('Zadanie 1 2 . 1. (0 – 2 )')).toEqual({ main: 12, sub: 1, nr: '12.1', points: 2 });
    expect(parseHeader('Zadani e 1 4 . 4 . (0 – 2 )')).toMatchObject({ nr: '14.4', points: 2 });
    expect(parseHeader('Zadanie 1 5 . (0 – 35)')).toMatchObject({ nr: '15', points: 35 });
    expect(parseHeader('Zadanie 1 2 .')).toEqual({ main: 12, sub: null, nr: '12', points: null });
    expect(parseHeader('Zadania egzaminacyjne są wydrukowane')).toBeNull();
  });
  it('czas i maksimum ze strony tytułowej („C ZAS TRWANIA”, „UZY SKANIA”)', () => {
    const p = [page(1, ['C ZAS TRWANIA : 180 minut', 'L ICZBA PUNKTÓW DO UZY SKANIA : 50'])];
    expect(findMeta(p)).toMatchObject({ maxPoints: 50, minutes: 180, jointTime: false });
    const pl = [page(1, ['C ZAS TRWANIA : 240 minut', '(łącznie na rozwiązanie testów i napisanie wypracowania )', 'L ICZBA PUNKTÓW DO UZY SKANIA ZA ARKUSZ 1 . ( TESTY ) : 25'])];
    expect(findMeta(pl)).toMatchObject({ maxPoints: 25, minutes: 240, jointTime: true });
    const pl23 = [page(1, ['CZAS TRWANIA: 240 minut', 'ŁĄCZNA LICZBA PUNKTÓW DO UZYSKANIA ZA CZĘŚĆ 1. i 2.: 25'])];
    expect(findMeta(pl23).maxPoints).toBe(25);
  });
  it('łączenie kawałków tekstu tylko przy przerwie', () => {
    const [l] = groupLines([
      { x: 85, x1: 97, y: 100, h: 10, s: 'Us' }, { x: 97, x1: 100, y: 100, h: 10, s: 'ł' }, { x: 100, x1: 130, y: 100, h: 10, s: 'yszysz' },
      { x: 135, x1: 180, y: 100, h: 10, s: 'dwukrotnie' },
    ]);
    expect(l.text).toBe('Usłyszysz dwukrotnie');
  });
  it('stopka „Strona X z Y” i kod arkusza poza treścią', () => {
    const p = { page: 2, width: 595, height: 842, lines: [mkLine('Treść', 100), mkLine('Strona 2 z 29', 795, 265), mkLine('MMAP - R0 _ 100', 805, 469)] };
    expect(pageLimits(p).bottom).toBeLessThan(790);
  });
});

describe('zadania i polecenia wspólne', () => {
  const pages = [
    page(2, ['Czas pracy: 180 minut', 'Za rozwiązanie wszystkich zadań można otrzymać łącznie 50 punktów.']),
    page(3, ['Zadanie 1. (0–2)', 'Treść testowa pierwsza.', 'Zadanie 2.', 'Wspólny wstęp testowy.', 'Zadanie 2.1. (0–1)', 'A. a', 'B. b', 'C. c', 'D. d']),
    page(4, ['Zadanie 2.2. (0–3)', 'Wykaż, że coś testowego.']),
  ];
  it('punkty, podpunkty i polecenie wspólne', () => {
    const h = findHeads(pages, 'matematyka');
    expect(h.map((x: { nr: string; points: number | null }) => [x.nr, x.points])).toEqual([['1', 2], ['2', null], ['2.1', 1], ['2.2', 3]]);
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

describe('odpowiedzi z zasad oceniania', () => {
  it('„Wersja A Wersja B / B C” → kolumna wersji A', () => {
    const lines = [mkLine('Rozwiązanie', 100), { ...mkLine('Wersja A Wersja B', 114), items: [{ x: 71, x1: 110, y: 114, h: 11, s: 'Wersja A' }, { x: 298, x1: 340, y: 114, h: 11, s: 'Wersja B' }] },
      { ...mkLine('B C', 128), items: [{ x: 71, x1: 78, y: 128, h: 11, s: 'B' }, { x: 298, x1: 305, y: 128, h: 11, s: 'C' }] }];
    const t = solutionTokens(lines);
    expect([...t]).toEqual(['B']);
    expect(t.versions).toBe(true);
  });
  it('bez wersji: kolejne linie po „Rozwiązanie”', () => {
    expect([...versionA(['Rozwiązanie', 'P F'])]).toEqual(['PF']);
  });
  it('punktacja „2 pkt – trzy poprawne odpowiedzi, 1 pkt – dwie”', () => {
    expect(scoringFrom([{ points: 2, text: 'trzy poprawne odpowiedzi.' }, { points: 1, text: 'dwie poprawne odpowiedzi.' }, { points: 0, text: 'brak' }], 3, 2)).toEqual({ '3': 2, '2': 1 });
    expect(scoringFrom([], 2, 1)).toBe('all');
    expect(scoringFrom([], 1, 1)).toBe('each');
  });
  it('zakres liter z polecenia', () => {
    expect(letterRange('Do każdej wypowiedzi dopasuj zdanie (A–F).')).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(letterRange('Zakreśl jedną z liter: A, B albo C.')).toEqual(['A', 'B', 'C']);
  });
  it('zadanie z wyborem A–D i P/F', () => {
    const info = { family: 'matematyka' };
    const one = buildAnswer({ info, task: { nr: '3', maxPoints: 1 }, body: 'Dokończ zdanie.\nA. 1\nB. 2\nC. 3\nD. 4', rule: { tokens: Object.assign(['C'], { versions: true }), scoring: [] } });
    expect(one.answer).toEqual({ items: [{ id: '3', label: null, options: ['A', 'B', 'C', 'D'], correct: 'C' }], scoring: 'each' });
    const pf = buildAnswer({ info, task: { nr: '8', maxPoints: 1 }, body: 'Oceń prawdziwość. Wybierz P, jeśli…\nZdanie pierwsze. P F\nZdanie drugie. P F', rule: { tokens: ['FP'], scoring: [] } });
    expect(pf.answer.items.map((i: { correct: string }) => i.correct)).toEqual(['F', 'P']);
    expect(pf.answer.scoring).toBe('all');
  });
  it('angielski: odpowiedzi tabeli dla pozycji 1.1–1.5', () => {
    const r = buildAnswer({ info: { family: 'angielski' }, task: { nr: '1', maxPoints: 2, itemIds: ['1.1', '1.2'] }, body: 'Dopasuj zdanie (A–C).', rule: { answers: { '1.1': 'B', '1.2': 'A' } } });
    expect(r.answer).toEqual({ items: [{ id: '1.1', label: '1.1', options: ['A', 'B', 'C'], correct: 'B' }, { id: '1.2', label: '1.2', options: ['A', 'B', 'C'], correct: 'A' }], scoring: 'each' });
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
      tasks: [{ nr: '1', maxPoints: 3, topics: ['logarytmy'] }] };
    expect(examIssues(e).join(' ')).toMatch(/Suma punktów zadań to 3/);
  });
  it('zadania z tym samym alternative liczone raz', () => {
    const e = { tasks: [{ nr: 'A2.1', maxPoints: 35, alternative: 'a' }, { nr: 'A2.2', maxPoints: 35, alternative: 'a' }], groups: [] };
    expect(pointSum(e).known).toBe(35);
  });
  it('zadanie zamknięte bez odpowiedzi jest zgłaszane', () => {
    const e = { id: 'X', maxPoints: 1, minutes: 1, urls: { arkusz: ['u'], zasady: [] }, groups: [],
      tasks: [{ nr: '1', maxPoints: 1, topics: ['logarytmy'], type: 'zamknięte', answer: null }] };
    expect(examIssues(e).join(' ')).toMatch(/brak odpowiedzi/);
  });
});
