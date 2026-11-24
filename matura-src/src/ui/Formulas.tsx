// Karta wzorów CKE (matematyka): strony z pakietu cke/wzory.json, gdy jest w manifeście.

import { useEffect, useRef, useState } from 'react';
import { PACK_MANIFEST } from '../store/catalog';
import { Sheet } from './common';

/**
 * Strony karty wzorów: w jednym pliku to tablica obrazów (data:), w wersji na GitHub Pages
 * obiekt {"0": "cke/img/wzory/strony/0.webp", …} – oba warianty dają listę w kolejności stron.
 */
export function formulaPages(strony: unknown): string[] {
  if (Array.isArray(strony)) return strony.filter((x): x is string => typeof x === 'string');
  if (strony && typeof strony === 'object')
    return Object.entries(strony as Record<string, unknown>)
      .filter((e): e is [string, string] => typeof e[1] === 'string')
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map((e) => e[1]);
  return [];
}

let cache: Promise<string[]> | null = null;
function loadFormulas(): Promise<string[]> {
  if (!cache)
    cache = fetch('cke/wzory.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('brak'))))
      .then((j: { strony?: unknown }) => formulaPages(j.strony))
      .catch((e) => {
        cache = null;
        throw e;
      });
  return cache;
}

export const HAS_FORMULAS = !!PACK_MANIFEST?.includes('wzory');

export function FormulasButton({ subject }: { subject: string }) {
  const [open, setOpen] = useState(false);
  if (!HAS_FORMULAS || (subject !== 'mat-p' && subject !== 'mat-r')) return null;
  return (
    <>
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(true)}>
        Wzory
      </button>
      {open ? <FormulasSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function FormulasSheet({ onClose }: { onClose: () => void }) {
  const [pages, setPages] = useState<string[] | null>(null);
  const [err, setErr] = useState(false);
  // strona 1 to okładka – zaczynamy od pierwszej strony ze wzorami
  const [i, setI] = useState(1);
  useEffect(() => {
    loadFormulas().then(setPages, () => setErr(true));
  }, []);
  const n = pages?.length ?? 0;
  const cur = Math.min(Math.max(0, i), Math.max(0, n - 1));
  const go = (d: number) => setI((x) => Math.min(Math.max(0, x + d), Math.max(0, n - 1)));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      // strzałki zmieniają stronę karty, a nie zadanie w arkuszu pod spodem
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        e.stopPropagation();
        go(-1);
      }
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  });
  // po zmianie strony widok wraca na górę strony
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    top.current?.closest('.sheet')?.scrollTo({ top: 0 });
  }, [cur]);
  return (
    <Sheet title="Wybrane wzory matematyczne" onClose={onClose}>
      {err || pages?.length === 0 ? <p>Nie udało się wczytać karty wzorów.</p> : !pages ? <p className="muted">Ładowanie…</p> : null}
      {pages && n ? (
        <>
          <div ref={top} className="wzory-nav" role="group" aria-label="Strony karty wzorów">
            <button type="button" className="btn btn-secondary btn-sm" disabled={cur === 0} onClick={() => go(-1)}>
              ‹ Poprzednia
            </button>
            <label className="wzory-page">
              <span className="sr-only">Strona</span>
              <select value={cur} onChange={(e) => setI(Number(e.target.value))}>
                {pages.map((_, k) => (
                  <option key={k} value={k}>
                    Strona {k + 1} z {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-primary btn-sm" disabled={cur >= n - 1} onClick={() => go(1)}>
              Następna ›
            </button>
          </div>
          <div className="kartka" style={{ cursor: 'default' }}>
            <img src={pages[cur]} alt={`Karta wzorów, strona ${cur + 1} z ${n}`} />
          </div>
        </>
      ) : null}
    </Sheet>
  );
}
