import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { subjectDef, type SubjectId } from '../model';
import { Icon } from './icons';

export function SubjectTag({ id, long = false }: { id: SubjectId | null | undefined; long?: boolean }) {
  const s = subjectDef(id);
  if (!s) return null;
  return (
    <span className="tag" style={{ ['--sc' as string]: `var(--s-${s.id})` }}>
      <span className="dot" aria-hidden />
      {long ? s.name : s.short}
    </span>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'ok' | 'warn' | 'bad' | 'ink' }) {
  return <span className={`tag${tone ? ` ${tone}` : ''}`}>{children}</span>;
}

export function Progress({ value, max = 100, color, label }: { value: number; max?: number; color?: string; label?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} style={color ? { ['--pc' as string]: color } : undefined}>
      <span style={{ width: `${p}%` }} />
    </div>
  );
}

export function IconButton({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="btn btn-icon" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <Icon name={icon} />
    </button>
  );
}

/** Dolny arkusz na telefonie, okno na środku na komputerze. Esc zamyka. */
export function Sheet({ title, onClose, children, label, wide }: { title: string; onClose: () => void; children: ReactNode; label?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, [href], input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      // fokus zostaje w oknie
      if (e.key === 'Tab' && ref.current) {
        const els = [...ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);
  // okno trafia bezpośrednio do <body>: rodzic z backdrop-filter (np. górny pasek)
  // ograniczałby „position: fixed” do swojego prostokąta i okna nie dałoby się przewijać
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'sheet sheet-wide' : 'sheet'} role="dialog" aria-modal="true" aria-label={label ?? title} ref={ref}>
        <div className="row-between">
          <h2>{title}</h2>
          <IconButton icon="zamknij" label="Zamknij" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Potwierdzenie w stronie (w artefakcie nie ma window.confirm). */
export function Confirm({
  title,
  text,
  ok,
  cancel = 'Anuluj',
  danger,
  onOk,
  onCancel,
}: {
  title: string;
  text?: string;
  ok: string;
  cancel?: string;
  danger?: boolean;
  onOk: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      {text ? <p>{text}</p> : null}
      <div className="sheet-actions">
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onOk}>
          {ok}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          {cancel}
        </button>
      </div>
    </Sheet>
  );
}

export interface MenuEntry {
  label: string;
  run: () => void;
  danger?: boolean;
}

/** Menu „⋯” przy karcie. */
export function MoreMenu({ items, label = 'Więcej działań' }: { items: MenuEntry[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    // Esc zamyka tylko menu (nie wychodzi z ekranu zadania)
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      ref.current?.querySelector<HTMLElement>('button')?.focus();
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', key, true);
    };
  }, [open]);
  return (
    <div className="menu-anchor" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="btn btn-icon" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Icon name="wiecej" />
      </button>
      {open ? (
        <div className="menu" role="menu">
          {items.map((it) => (
            <button
              type="button"
              role="menuitem"
              key={it.label}
              className={it.danger ? 'danger' : undefined}
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Banner({ tone, icon, children, action }: { tone: 'warn' | 'bad' | 'info'; icon?: string; children: ReactNode; action?: { label: string; run: () => void } }) {
  return (
    <div className={`banner ${tone}`} role={tone === 'bad' ? 'alert' : 'status'}>
      <div className="bt">
        <Icon name={icon ?? (tone === 'bad' ? 'uwaga' : 'info')} />
        <div>{children}</div>
      </div>
      {action ? (
        <button type="button" className="btn btn-secondary btn-sm" onClick={action.run}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function Empty({ text, action, secondary }: { text: string; action?: { label: string; run: () => void }; secondary?: boolean }) {
  return (
    <div className="card empty">
      <p>{text}</p>
      {action ? (
        <button type="button" className={`btn ${secondary ? 'btn-secondary' : 'btn-primary'}`} onClick={action.run}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  full,
  render,
}: {
  options: readonly T[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  full?: boolean;
  render?: (v: T) => ReactNode;
}) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
    onChange(n);
    const parent = (e.currentTarget as HTMLElement).parentElement;
    (parent?.children[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length] as HTMLElement | undefined)?.focus();
  };
  return (
    <div className={`seg${full ? ' full' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          type="button"
          role="radio"
          key={String(o)}
          aria-checked={value === o}
          tabIndex={value === o || (value == null && i === 0) ? 0 : -1}
          onClick={() => onChange(o)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {render ? render(o) : String(o)}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <input type="checkbox" role="switch" className="switch" checked={checked} aria-label={label} onChange={(e) => onChange(e.target.checked)} />;
}

export function useNow(intervalMs = 1000, active = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, active]);
  return now;
}

export function useMedia(q: string): boolean {
  const get = () => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };
  const [m, setM] = useState(get);
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia(q);
    } catch {
      return;
    }
    const on = () => setM(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [q]);
  return m;
}

/** Godzina jako dwie listy (godzina 00–23 i minuty co 5), bez formatu AM/PM. */
export function TimeSelect({ id, value, onChange, label, disabled }: { id: string; value: string; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  const [h, m] = value.split(':');
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  if (!mins.includes(m)) mins.push(m);
  return (
    <div className="row" role="group" aria-label={label} style={{ flexWrap: 'nowrap' }}>
      <select id={`${id}-h`} className="select" style={{ width: 88 }} aria-label={`${label}: godzina`} value={h} disabled={disabled} onChange={(e) => onChange(`${e.target.value}:${m}`)}>
        {hours.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select id={`${id}-m`} className="select" style={{ width: 88 }} aria-label={`${label}: minuty`} value={m} disabled={disabled} onChange={(e) => onChange(`${h}:${e.target.value}`)}>
        {mins.sort().map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </select>
    </div>
  );
}
