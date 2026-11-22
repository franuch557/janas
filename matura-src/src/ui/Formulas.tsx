// Karta wzorów CKE (matematyka): strony z pakietu cke/wzory.json, gdy jest w manifeście.

import { useEffect, useState } from 'react';
import { PACK_MANIFEST } from '../store/catalog';
import { Sheet } from './common';

let cache: Promise<string[]> | null = null;
function loadFormulas(): Promise<string[]> {
  if (!cache)
    cache = fetch('cke/wzory.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('brak'))))
      .then((j: { strony?: unknown }) => (Array.isArray(j.strony) ? j.strony.filter((x): x is string => typeof x === 'string') : []))
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
      {err ? <p>Nie udało się wczytać karty wzorów.</p> : !pages ? <p className="muted">Ładowanie…</p> : null}
      {pages?.map((src, i) => (
        <div key={i} className="kartka" style={{ cursor: 'default' }}>
          <img src={src} alt={`Karta wzorów, strona ${i + 1}`} />
        </div>
      ))}
    </Sheet>
  );
}
