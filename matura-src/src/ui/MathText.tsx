// Tekst od Claude'a: akapity, listy, pogrubienie i wzory $…$ / $$…$$ (KaTeX).

import katex from 'katex';
import { useMemo } from 'react';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(s: string): string {
  const parts = s.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g);
  return parts
    .map((p) => {
      if (/^\$\$[^$]+\$\$$/.test(p)) return katex.renderToString(p.slice(2, -2), { throwOnError: false, displayMode: true });
      if (/^\$[^$\n]+\$$/.test(p)) return katex.renderToString(p.slice(1, -1), { throwOnError: false });
      return esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    })
    .join('');
}

export function mathHtml(text: string): string {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split('\n');
      if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
        const ordered = /^\s*\d/.test(lines[0]);
        const items = lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>`).join('');
        return ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
      }
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => mathHtml(text), [text]);
  return <div className={`math-text${className ? ` ${className}` : ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
