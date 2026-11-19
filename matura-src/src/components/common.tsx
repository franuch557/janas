import { useEffect, useRef, useState, type ReactNode } from 'react';
import katex from 'katex';
import { getImage } from '../store/images';
import { EMBEDDED_IMAGES } from '@obrazy';

/** Tekst z wzorami w $…$ (KaTeX, lokalnie). */
export function MathText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p.startsWith('$') && p.endsWith('$') && p.length > 2) {
          const html = katex.renderToString(p.slice(1, -1), { throwOnError: false });
          return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}

/** Obraz zadania z IndexedDB. Nic nie pokazuje, gdy obrazu brak. */
export function TaskImage({ imageKey, alt }: { imageKey: string | null; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoke: string | null = null;
    let alive = true;
    if (!imageKey) return;
    if (EMBEDDED_IMAGES[imageKey]) {
      setUrl(EMBEDDED_IMAGES[imageKey]);
      return;
    }
    getImage(imageKey)
      .then((b) => {
        if (b && alive) {
          revoke = URL.createObjectURL(b);
          setUrl(revoke);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [imageKey]);
  if (!url) return null;
  return <img className="obraz-zadania" src={url} alt={alt} />;
}

export function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="naglowek-widoku">
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
    </header>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="pole">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Tabs<T extends string>({ items, value, onChange, label }: { items: { id: T; name: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="zakladki" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.id} type="button" aria-pressed={it.id === value} onClick={() => onChange(it.id)}>
          {it.name}
        </button>
      ))}
    </div>
  );
}

/** Stoper: start, pauza, stop. Zwraca minuty przez onStop. */
export function Stopwatch({ onStop, label }: { onStop: (minutes: number) => void; label: string }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const baseRef = useRef(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startRef.current != null) setElapsed(baseRef.current + (Date.now() - startRef.current) / 1000);
    }, 500);
    return () => window.clearInterval(id);
  }, [running]);
  const start = () => {
    startRef.current = Date.now();
    setRunning(true);
  };
  const pause = () => {
    if (startRef.current != null) baseRef.current += (Date.now() - startRef.current) / 1000;
    startRef.current = null;
    setRunning(false);
    setElapsed(baseRef.current);
  };
  const stop = () => {
    pause();
    const min = Math.max(1, Math.round(baseRef.current / 60));
    onStop(min);
    baseRef.current = 0;
    setElapsed(0);
  };
  const s = Math.floor(elapsed);
  const txt = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return (
    <span className="timer" aria-label={`Stoper: ${label}`}>
      <span className="czas" aria-live="off">{txt}</span>
      {!running ? (
        <button type="button" className="maly" onClick={start}>{elapsed > 0 ? 'Wznów' : 'Start'}</button>
      ) : (
        <button type="button" className="maly" onClick={pause}>Pauza</button>
      )}
      <button type="button" className="maly" onClick={stop} disabled={elapsed === 0 && !running}>Stop</button>
    </span>
  );
}

/** Przycisk z potwierdzeniem w miejscu (bez okna przeglądarki). */
export function ConfirmButton({ label, question, yes, onConfirm, className }: { label: string; question: string; yes: string; onConfirm: () => void; className?: string }) {
  const [ask, setAsk] = useState(false);
  if (!ask)
    return (
      <button type="button" className={className} onClick={() => setAsk(true)}>
        {label}
      </button>
    );
  return (
    <span className="rzad" role="group" aria-label={question}>
      <span>{question}</span>
      <button type="button" className="glowny" onClick={() => { setAsk(false); onConfirm(); }}>{yes}</button>
      <button type="button" onClick={() => setAsk(false)}>Anuluj</button>
    </span>
  );
}

/** Odliczanie (arkusz próbny, diagnoza). */
export function Countdown({ minutes, startedAt, onEnd }: { minutes: number; startedAt: number; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now());
  const ended = useRef(false);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, minutes * 60 - Math.floor((now - startedAt) / 1000));
  useEffect(() => {
    if (left === 0 && !ended.current) {
      ended.current = true;
      onEnd();
    }
  }, [left, onEnd]);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return (
    <div>
      <span className="licznik-egzaminu" role="timer" aria-label="Pozostały czas">
        {h}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      </span>{' '}
      <span className="olowek">pozostało</span>
    </div>
  );
}

/** Odmiana: 1 uwaga, 2–4 uwagi, 5 uwag. */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const h = n % 100;
  if (n === 1) return `${n} ${one}`;
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function pct(n: number | null | undefined): string {
  return n == null ? '–' : `${Math.round(n)}%`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
