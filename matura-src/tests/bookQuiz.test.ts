import { describe, expect, it } from 'vitest';
import { checkBookAnswer } from '../src/logic/bookQuiz';

describe('sprawdzanie odpowiedzi do pytań z lektur', () => {
  it('odmiana i wielkość liter nie przeszkadzają', () => {
    expect(checkBookAnswer('izabelę łęcką', 'Izabelę Łęcką.').verdict).toBe('dobrze');
    expect(checkBookAnswer('w Warszawie', 'Warszawa.').verdict).toBe('dobrze');
    expect(checkBookAnswer('Rieux', 'Rieux.').verdict).toBe('dobrze');
  });
  it('częściowo, źle i puste', () => {
    expect(checkBookAnswer('kupiec', 'Kupiec, były powstaniec.').verdict).toBe('czesciowo');
    expect(checkBookAnswer('Kraków', 'Warszawa.').verdict).toBe('zle');
    expect(checkBookAnswer('  ', 'Warszawa.').verdict).toBe('puste');
  });
  it('długi klucz: wystarczy trafić część myśli', () => {
    const key = 'Izabela ceni pozycję i luksus, a nie człowieka; Wokulski kocha wyobrażenie o niej.';
    expect(checkBookAnswer('Rzecki i narrator trzecioosobowy', 'Dwóch: narrator trzecioosobowy (wszechwiedzący) i Ignacy Rzecki w „Pamiętniku starego subiekta”.').verdict).toBe('dobrze');
    expect(checkBookAnswer('Rzecki', 'Dwóch: narrator trzecioosobowy (wszechwiedzący) i Ignacy Rzecki w „Pamiętniku starego subiekta”.').verdict).toBe('czesciowo');
    expect(checkBookAnswer('bo Izabela ceni luksus i pozycję, a Wokulski kocha wyobrażenie', key).verdict).toBe('dobrze');
  });
});
