// Wykresy rysowane w SVG bez bibliotek.

export interface Bar {
  label: string;
  value: number;
  note?: string;
}

/** Poziomy wykres słupkowy. Etykiety po lewej, wartość na końcu słupka. */
export function BarChart({ bars, unit, title }: { bars: Bar[]; unit: string; title: string }) {
  const rowH = 26;
  const labelW = 230;
  const width = 640;
  const max = Math.max(1, ...bars.map((b) => b.value));
  const plotW = width - labelW - 70;
  const h = bars.length * rowH + 24;
  return (
    <svg className="wykres" viewBox={`0 0 ${width} ${h}`} role="img" aria-label={title}>
      <title>{title}</title>
      <line className="os" x1={labelW} x2={labelW} y1={4} y2={h - 18} />
      {bars.map((b, i) => {
        const y = 8 + i * rowH;
        const w = (b.value / max) * plotW;
        return (
          <g key={b.label}>
            <text x={labelW - 8} y={y + 13} textAnchor="end" fontSize="12">
              {b.label.length > 34 ? `${b.label.slice(0, 33)}…` : b.label}
            </text>
            <rect x={labelW} y={y + 2} width={Math.max(0, w)} height={rowH - 10} fill="var(--atrament)" />
            <text x={labelW + w + 6} y={y + 13} fontSize="12" className="liczby">
              {fmt(b.value)} {unit}
              {b.note ? ` ${b.note}` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

export interface Series {
  name: string;
  points: { date: string; value: number }[];
  dash?: string;
}

/** Wykres liniowy wyników (0–100%) w czasie. Linia celu przerywana. */
export function LineChart({ series, from, to, target, title }: { series: Series[]; from: string; to: string; target?: number | null; title: string }) {
  const width = 640;
  const height = 240;
  const pad = { l: 40, r: 16, t: 12, b: 28 };
  const t0 = Date.parse(from);
  const t1 = Math.max(t0 + 86400000, Date.parse(to));
  const x = (d: string) => pad.l + ((Date.parse(d) - t0) / (t1 - t0)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (height - pad.t - pad.b);
  const dashes = ['', '6 4', '2 3', '10 3 2 3'];
  return (
    <svg className="wykres" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
      <title>{title}</title>
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line className="os" x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} strokeOpacity={v === 0 ? 1 : 0.4} />
          <text x={pad.l - 6} y={y(v) + 4} fontSize="11" textAnchor="end" className="olowek-txt">{v}%</text>
        </g>
      ))}
      <text x={pad.l} y={height - 8} fontSize="11" className="olowek-txt">{from}</text>
      <text x={width - pad.r} y={height - 8} fontSize="11" textAnchor="end" className="olowek-txt">{to}</text>
      {target != null ? (
        <g>
          <line x1={pad.l} x2={width - pad.r} y1={y(target)} y2={y(target)} stroke="var(--olowek)" strokeDasharray="4 4" strokeWidth={1.5} />
          <text x={width - pad.r} y={y(target) - 4} fontSize="11" textAnchor="end">cel {target}%</text>
        </g>
      ) : null}
      {series.map((s, i) => {
        const pts = [...s.points].sort((a, b) => a.date.localeCompare(b.date));
        if (!pts.length) return null;
        const d = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke="var(--atrament)" strokeWidth={1.8} strokeDasharray={s.dash ?? dashes[i % dashes.length]} />
            {pts.map((p) => (
              <circle key={p.date + p.value} cx={x(p.date)} cy={y(p.value)} r={2.6} fill="var(--atrament)">
                <title>{`${s.name}: ${p.date}, ${Math.round(p.value)}%`}</title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function Legend({ series }: { series: Series[] }) {
  const dashes = ['', '6 4', '2 3', '10 3 2 3'];
  return (
    <ul className="rzad" style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }} aria-label="Legenda">
      {series.map((s, i) => (
        <li key={s.name}>
          <svg width="28" height="10" aria-hidden="true">
            <line x1="0" x2="28" y1="5" y2="5" stroke="var(--atrament)" strokeWidth="2" strokeDasharray={s.dash ?? dashes[i % dashes.length]} />
          </svg>{' '}
          {s.name}
        </li>
      ))}
    </ul>
  );
}
