import { useState } from 'react';
import type { CriteriaSet } from '../store/catalog';
import { countWords } from '../logic/scoring';
import { slow } from '../logic/format';
import { Icon } from '../ui/icons';
import { Progress } from '../ui/common';
import { SelfGrade } from '../ui/AnswerCard';

export function WordCounter({ text, min, max, saved }: { text: string; min: number | null; max: number | null; saved?: string | null }) {
  const n = countWords(text);
  const ok = min == null || n >= min;
  const tooMany = max != null && n > max;
  return (
    <div className="stack-2">
      <div className="row-between">
        <span className="tnum" style={{ color: tooMany ? 'var(--seria)' : ok && min != null ? 'var(--dobrze)' : 'var(--tekst-2)', fontWeight: 650, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
          {ok && min != null && !tooMany ? <Icon name="ok" size={18} /> : null}
          {min != null ? `${n} z min. ${min} słów` : slow(n)}
          {max != null ? <span className="muted" style={{ fontWeight: 400 }}>, maks. {max}</span> : null}
        </span>
        {saved ? <span className="small muted">{saved}</span> : null}
      </div>
      {min != null ? <Progress value={Math.min(n, min)} max={min} color={ok ? 'var(--dobrze)' : undefined} label="Liczba słów" /> : null}
    </div>
  );
}

/** Lista kontrolna kryteriów CKE z sumą punktów. */
export function CriteriaForm({ set, values, onChange, fallbackMax }: { set: CriteriaSet | null; values: Record<string, number>; onChange: (v: Record<string, number>) => void; fallbackMax: number }) {
  const [openDesc, setOpenDesc] = useState<string | null>(null);
  if (!set) {
    return <SelfGrade max={fallbackMax} value={values.razem ?? null} onChange={(v) => onChange({ razem: v })} />;
  }
  const sum = set.groups.flatMap((g) => g.criteria).reduce((s, c) => s + (values[c.id] ?? 0), 0);
  return (
    <div className="stack">
      <h3>Samoocena według kryteriów CKE</h3>
      {set.groups.map((g) => (
        <div className="card flush" key={g.name}>
          {g.name ? (
            <div style={{ padding: '12px 16px 0', fontWeight: 650 }} className="small">
              {g.name}
            </div>
          ) : null}
          <div className="list">
            {g.criteria.map((c) => (
              <div className="li static" key={c.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="row-between">
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="small muted tnum">z {c.max} pkt</span>
                </div>
                <div className="seg" role="radiogroup" aria-label={c.name}>
                  {c.values.map((v) => (
                    <button type="button" role="radio" key={v} aria-checked={values[c.id] === v} onClick={() => onChange({ ...values, [c.id]: v })}>
                      {String(v).replace('.', ',')}
                    </button>
                  ))}
                </div>
                {c.description ? (
                  <div>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpenDesc(openDesc === c.id ? null : c.id)} aria-expanded={openDesc === c.id}>
                      {openDesc === c.id ? 'Ukryj opis kryterium' : 'Pokaż opis kryterium'}
                    </button>
                    {openDesc === c.id ? (
                      <p className="small reveal" style={{ whiteSpace: 'pre-wrap' }}>
                        {c.description}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      <p style={{ fontWeight: 650 }} className="tnum">
        Szacowany wynik: {String(Math.round(sum * 10) / 10).replace('.', ',')} z {set.max} pkt
      </p>
    </div>
  );
}

export function criteriaSum(set: CriteriaSet | null, values: Record<string, number>): number {
  if (!set) return values.razem ?? 0;
  return Math.round(set.groups.flatMap((g) => g.criteria).reduce((s, c) => s + (values[c.id] ?? 0), 0) * 10) / 10;
}

export function criteriaComplete(set: CriteriaSet | null, values: Record<string, number>): boolean {
  if (!set) return values.razem != null;
  return set.groups.flatMap((g) => g.criteria).every((c) => values[c.id] != null);
}
