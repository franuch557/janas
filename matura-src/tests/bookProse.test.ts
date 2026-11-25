import { describe, expect, it } from 'vitest';
import { chunks } from '../src/views/Books';

describe('dzielenie długich akapitów lektur', () => {
  it('krótki akapit zostaje bez zmian', () => {
    expect(chunks('Jedno zdanie. Drugie zdanie.')).toEqual(['Jedno zdanie. Drugie zdanie.']);
  });
  it('długi akapit dzieli po zdaniach i nie gubi tekstu', () => {
    const t = Array.from({ length: 12 }, (_, i) => `To jest zdanie numer ${i + 1}, które ma trochę słów, żeby było dłuższe.`).join(' ');
    const c = chunks(t);
    expect(c.length).toBeGreaterThan(1);
    expect(c.join(' ')).toBe(t);
    for (const x of c) expect(x).toMatch(/\.$/);
  });
});
