import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { MATH_TOPICS } from '../src/data/taxonomy';
import { parseTheory } from '../src/logic/theory';

const dir = join(__dirname, '../data/teoria-matematyka');

describe('teoria z matematyki', () => {
  it('każdy dział ma plik z lekcjami i przykładami', () => {
    const files = new Set(readdirSync(dir).map((f) => f.replace(/\.md$/, '')));
    for (const t of MATH_TOPICS) {
      expect(files.has(t.id), t.id).toBe(true);
      const th = parseTheory(readFileSync(join(dir, `${t.id}.md`), 'utf8'));
      expect(th.lessons.length, t.id).toBeGreaterThanOrEqual(2);
      for (const l of th.lessons)
        for (const ex of l.examples) {
          expect(ex.task, `${t.id}: ${l.title}`).not.toBe('');
          expect(ex.steps.length, `${t.id}: ${ex.title}`).toBeGreaterThan(0);
          expect(ex.answer, `${t.id}: ${ex.title}`).not.toBe('');
        }
    }
  });

  it('wzory dają się złożyć w KaTeX', () => {
    const bad: string[] = [];
    for (const f of readdirSync(dir)) {
      const md = readFileSync(join(dir, f), 'utf8');
      for (const m of md.matchAll(/\$\$([^$]+)\$\$|\$([^$\n]+)\$/g)) {
        const tex = m[1] ?? m[2];
        try {
          katex.renderToString(tex, { throwOnError: true, displayMode: !!m[1] });
        } catch (e) {
          bad.push(`${f}: ${tex} – ${(e as Error).message.slice(0, 80)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('parser rozdziela treść, kroki i odpowiedź', () => {
    const th = parseTheory('# X\nWstęp\n## Lekcja\nTeoria:\n- punkt\n### Przykład: test\nOblicz $1+1$.\n1. Dodajemy.\n2. Wynik $2$.\nOdpowiedź: $2$\n');
    expect(th.intro).toBe('Wstęp');
    expect(th.lessons[0].theory).toBe('Teoria:\n\n- punkt');
    expect(th.lessons[0].examples[0]).toEqual({ title: 'test', task: 'Oblicz $1+1$.', steps: ['Dodajemy.', 'Wynik $2$.'], answer: '$2$' });
  });
});
