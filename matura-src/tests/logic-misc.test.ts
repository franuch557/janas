import { describe, expect, it } from 'vitest';
import { intervalFor, nextSrs, NEW_SRS } from '../src/logic/srs';
import { forecast } from '../src/logic/mastery';
import { selectDiagnosis } from '../src/logic/diagnosis';
import { normalizeExams, taskIdFor } from '../src/logic/cke';
import { parseZadaniaInfoUrl, validateDraft } from '../src/logic/userTasks';
import { count, dni, fmtNum, plural } from '../src/logic/format';
import { parseHash, hrefOf } from '../src/ui/router';
import { ckeTask } from './helpers';

describe('powtórki 1, 3, 7, 14 dni', () => {
  it('odstęp zależy od wyniku', () => {
    expect([30, 55, 75, 95].map(intervalFor)).toEqual([1, 3, 7, 14]);
  });
  it('wynik ≥ 90% po powtórce 14-dniowej kończy zadanie', () => {
    let s = nextSrs(NEW_SRS, 95, '2026-12-01');
    expect(s.status).toBe('do powtórki');
    s = nextSrs(s, 92, '2026-12-15');
    expect(s.status).toBe('zrobione');
    expect(s.nextReview).toBeNull();
  });
});

describe('prognoza dopiero przy minimum danych', () => {
  const w = { a: 0.5, b: 0.3, c: 0.2 };
  it('bez danych: brak prognozy', () => {
    expect(forecast(w, {}, false).pct).toBeNull();
  });
  it('kilka wyników z jednego tematu: nadal brak', () => {
    expect(forecast(w, { a: { value: 0.8, results: 3 } }, false).pct).toBeNull();
  });
  it('po diagnozie: prognoza z tematów z wynikami', () => {
    expect(forecast(w, { a: { value: 0.8, results: 1 }, b: { value: 0.4, results: 1 } }, true).pct).toBe(65);
  });
  it('bez diagnozy: 8 wyników i 40% wagi wystarczy', () => {
    expect(forecast(w, { a: { value: 0.6, results: 8 } }, false).pct).toBe(60);
  });
});

describe('diagnoza z prawdziwych zadań', () => {
  const topics = ['logarytmy', 'ciagi', 'planimetria', 'procenty', 'stereometria', 'potegi', 'trygonometria'];
  const pool = topics.flatMap((t, i) => [
    ckeTask(`${t}-z`, { topics: [t], auto: true, type: 'zamknięte', minutes: 4, year: 2023 + (i % 3) }),
    ckeTask(`${t}-z2`, { topics: [t], auto: true, type: 'zamknięte', minutes: 4, year: 2025 }),
    ckeTask(`${t}-o`, { topics: [t], maxPoints: 2, minutes: 8 }),
  ]);
  const sel = selectDiagnosis(pool, topics);
  it('6–12 zadań z różnych tematów, ok. 30 minut', () => {
    expect(sel.taskIds.length).toBeGreaterThanOrEqual(6);
    expect(sel.taskIds.length).toBeLessThanOrEqual(12);
    expect(sel.minutes).toBeLessThanOrEqual(36);
    expect(sel.topics.length).toBeGreaterThanOrEqual(6);
    expect(sel.enough).toBe(true);
  });
  it('głównie zamknięte, sprawdzane automatycznie', () => {
    const auto = sel.taskIds.filter((id) => id.endsWith('-z') || id.endsWith('-z2')).length;
    expect(auto / sel.taskIds.length).toBeGreaterThanOrEqual(0.75);
  });
  it('przedmiot bez zamkniętych z kluczem: najkrótsze otwarte, do 45 minut', () => {
    const open = topics.flatMap((t, i) => [ckeTask(`${t}-a`, { topics: [t], maxPoints: 2, minutes: 7 }), ckeTask(`${t}-b`, { topics: [t], maxPoints: 3, minutes: 11 + i })]);
    const s = selectDiagnosis(open, topics);
    expect(s.taskIds.length).toBe(6);
    expect(s.minutes).toBeLessThanOrEqual(45);
    expect(s.taskIds.every((id) => id.endsWith('-a'))).toBe(true);
  });
  it('za mało zadań: diagnoza niedostępna', () => {
    expect(selectDiagnosis(pool.slice(0, 3), topics).enough).toBe(false);
  });
});

describe('dane arkuszy według kontraktu', () => {
  const raw = {
    exams: [
      {
        id: 'MPOP-P1-P2-2505', family: 'polski', level: 'podstawowy', year: 2025, session: 'maj', formula: '2023', maxPoints: 36, minutes: 240, audio: null,
        parts: [{ id: 'A1', name: 'Arkusz 1.', minutes: null, maxPoints: 1, tasks: ['A1.1'] }, { id: 'A2', name: 'Arkusz 2.', minutes: null, maxPoints: 35, tasks: ['A2.1', 'A2.2'] }],
        tasks: [
          { nr: 'A1.1', maxPoints: 1, type: 'zamknięte', topics: ['pol-jezyk'], answer: { items: [{ id: '1', label: null, options: ['A', 'B'], correct: 'A' }], scoring: 'each' } },
          { nr: 'A2.1', maxPoints: 35, type: 'otwarte', topics: ['pol-wyp-kompetencje'], alternative: 't', essay: { minWords: 300, maxWords: null, criteria: 'pol-2023' } },
          { nr: 'A2.2', maxPoints: 35, type: 'otwarte', topics: ['pol-wyp-kompetencje'], alternative: 't', essay: { minWords: 300, maxWords: null, criteria: 'pol-2023' } },
        ],
      },
      { id: 'X', family: 'matematyka', level: 'podstawowy', year: 2024, maxPoints: 2, tasks: [{ nr: '1', maxPoints: 1, type: 'zamknięte', topics: [], answer: { items: [{ id: '1', options: ['A', 'B', 'C', 'D'], correct: null }], scoring: 'each' } }, { nr: '2', maxPoints: null }] },
    ],
  };
  const ex = normalizeExams(raw);
  it('zadania do wyboru liczą się raz, arkusz jest pełny', () => {
    const pol = ex.find((e) => e.id === 'MPOP-P1-P2-2505')!;
    expect(pol.complete).toBe(true);
    expect(pol.tasks[0].auto).toBe(true);
    expect(pol.tasks[1].partId).toBe('A2');
  });
  it('zamknięte bez klucza są oceniane jak otwarte; zadanie bez punktacji pominięte', () => {
    const x = ex.find((e) => e.id === 'X')!;
    expect(x.tasks).toHaveLength(1);
    expect(x.tasks[0].auto).toBe(false);
    expect(x.complete).toBe(false);
  });
  it('„wybierz dwie”: pozycje alfabetyczne oznaczone jako zbiór, dopasowanie 1.1–1.5 nie', () => {
    const r = normalizeExams({ exams: [{ id: 'Y', family: 'matematyka', level: 'podstawowy', year: 2023, maxPoints: 3, tasks: [
      { nr: '11', maxPoints: 2, type: 'zamknięte', topics: ['ciagi'], answer: { items: [{ id: 'a', label: 'litera 1 (alfabetycznie)', options: ['A', 'B', 'C'], correct: 'A' }, { id: 'b', label: 'litera 2 (alfabetycznie)', options: ['A', 'B', 'C'], correct: 'C' }], scoring: 'each' } },
      { nr: '12', maxPoints: 1, type: 'zamknięte', topics: ['ciagi'], answer: { items: [{ id: '1', label: '1.1', options: ['A', 'B'], correct: 'A' }, { id: '2', label: '1.2', options: ['A', 'B'], correct: 'B' }], scoring: 'all' } },
    ] }] })[0];
    expect(r.tasks[0].answer?.unordered).toBe(true);
    expect(r.tasks[1].answer?.unordered).toBeUndefined();
  });
  it('identyfikator zadania pasuje do adresu', () => {
    expect(taskIdFor('MMAP-R0-100-2505', '6.1')).toBe('MMAP-R0-100-2505-n6-1');
    expect(parseHash('#zadanie-MMAP-R0-100-2505-n6-1')).toEqual({ name: 'zadanie', id: 'MMAP-R0-100-2505-n6-1' });
  });
});

describe('adresy', () => {
  it('tylko litery ASCII, cyfry i myślniki', () => {
    const routes = [
      parseHash('#zadania-mat-r-logarytmy'),
      parseHash('#arkusz-MPOP-P1-P2-2505'),
      parseHash('#arkusz-MPOP-P1-P2-2505-czesc-A2'),
      parseHash('#diagnoza-pol-p'),
      parseHash('#postep-ang-p'),
    ];
    expect(routes[0]).toEqual({ name: 'zadania', subject: 'mat-r', topic: 'logarytmy' });
    expect(routes[1]).toEqual({ name: 'arkusz', examId: 'MPOP-P1-P2-2505', partId: null });
    expect(routes[2]).toEqual({ name: 'arkusz', examId: 'MPOP-P1-P2-2505', partId: 'A2' });
    for (const r of routes) expect(hrefOf(r)).toMatch(/^#[A-Za-z0-9-]+$/);
  });
});

describe('zadania dodane przez ucznia', () => {
  it('numer z adresu zadania.info', () => {
    expect(parseZadaniaInfoUrl('https://www.zadania.info/d1/12345')?.ref).toBe('nr 12345');
    expect(parseZadaniaInfoUrl('https://example.com/12')).toBeNull();
  });
  it('puste zadanie nie zapisuje się', () => {
    expect(validateDraft({ url: '', text: '', image: null, topicId: 'ciagi', maxPoints: 2 })).toContain('Dodaj zrzut ekranu albo wklej treść zadania.');
    expect(validateDraft({ url: 'https://www.zadania.info/d1/1', text: '', image: 'data:image/jpeg;base64,x', topicId: 'ciagi', maxPoints: 2 })).toEqual([]);
  });
});

describe('odmiana i liczby po polsku', () => {
  it('liczebniki', () => {
    expect(dni(1)).toBe('1 dzień');
    expect(dni(3)).toBe('3 dni');
    expect(count(2, 'zadanie', 'zadania', 'zadań')).toBe('2 zadania');
    expect(count(12, 'zadanie', 'zadania', 'zadań')).toBe('12 zadań');
    expect(count(22, 'zadanie', 'zadania', 'zadań')).toBe('22 zadania');
    expect(plural(5, 'a', 'b', 'c')).toBe('c');
  });
  it('przecinek dziesiętny', () => {
    expect(fmtNum(2.5)).toBe('2,5');
  });
});
