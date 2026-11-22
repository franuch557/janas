// Podpowiedzi krok po kroku do zadań CKE z matematyki (bez Claude'a): kolejne fragmenty
// wzorcowego rozwiązania z zasad oceniania. Każda odsłonięta podpowiedź obniża wkład wyniku w biegłość.

import { useEffect, useState } from 'react';
import type { AppTask } from '../store/derived';

let hintsData: Promise<Record<string, string[]>> | null = null;
const loadHints = () => (hintsData ??= import('../data/rozwiazania-matematyka.json').then((m) => m.default as unknown as Record<string, string[]>));

export function useHintSteps(t: AppTask): string[] | null {
  const [steps, setSteps] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    setSteps(null);
    if (t.subjectId !== 'mat-p' && t.subjectId !== 'mat-r') return;
    void loadHints().then((h) => alive && setSteps(h[t.id] ?? null));
    return () => {
      alive = false;
    };
  }, [t.id, t.subjectId]);
  return steps;
}

export function HintSteps({ steps, shown, onShow }: { steps: string[]; shown: number; onShow: () => void }) {
  return (
    <section className="card stack-2">
      <h3>Podpowiedzi krok po kroku</h3>
      {shown ? (
        <ol className="steps">
          {steps.slice(0, shown).map((s, i) => (
            <li key={i} style={{ whiteSpace: 'pre-wrap' }}>
              {s}
            </li>
          ))}
        </ol>
      ) : (
        <p className="small muted">Utknąłeś? Odsłoń tylko następny krok rozwiązania CKE, a resztę zrób sam.</p>
      )}
      {shown < steps.length ? (
        <div>
          <button type="button" className="btn btn-secondary" onClick={onShow}>
            {shown ? `Następny krok (${shown + 1} z ${steps.length})` : `Pokaż pierwszy krok (z ${steps.length})`}
          </button>
        </div>
      ) : null}
      {shown ? <p className="small muted">Podpowiedzi obniżają wkład zadania w opanowanie tematu (−20% za każdą, najwyżej −60%).</p> : null}
    </section>
  );
}
