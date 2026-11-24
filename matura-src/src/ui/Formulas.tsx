// Karta wzorów CKE (matematyka): strony z pakietu cke/wzory.json, gdy jest w manifeście.

import { useEffect, useState } from 'react';
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
  useEffect(() => {
    loadFormulas().then(setPages, () => setErr(true));
  }, []);
  return (
    <Sheet title="Wybrane wzory matematyczne" onClose={onClose}>
      {err || pages?.length === 0 ? <p>Nie udało się wczytać karty wzorów.</p> : !pages ? <p className="muted">Ładowanie…</p> : null}
      {pages?.map((src, i) => (
        <div key={i} className="kartka" style={{ cursor: 'default' }}>
          <img src={src} alt={`Karta wzorów, strona ${i + 1}`} />
        </div>
      ))}
    </Sheet>
  );
}
