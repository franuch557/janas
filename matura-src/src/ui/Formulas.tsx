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
  const [cur, setCur] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    loadFormulas().then(setPages, () => setErr(true));
  }, []);
  // strony 1–2 to okładka i skład zespołu: pokazuję od pierwszej strony ze wzorami
  const first = pages && pages.length > 4 ? 2 : 0;
  const list = pages ? pages.slice(first) : [];
  useEffect(() => {
    // strzałki i PageUp/PageDown przewijają kartę, a nie zmieniają zadania w arkuszu pod spodem
    const k = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) e.stopPropagation();
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, []);
  // numer strony widocznej w oknie (do listy „Strona k z n”)
  useEffect(() => {
    const sheet = box.current?.closest('.sheet');
    if (!sheet || !list.length) return;
    const onScroll = () => {
      const imgs = [...sheet.querySelectorAll<HTMLElement>('.wzory-strona')];
      const top = sheet.getBoundingClientRect().top + 80;
      let k = 0;
      imgs.forEach((el, j) => {
        if (el.getBoundingClientRect().top <= top) k = j;
      });
      setCur(k);
    };
    sheet.addEventListener('scroll', onScroll, { passive: true });
    return () => sheet.removeEventListener('scroll', onScroll);
  }, [list.length]);
  const jump = (k: number) => {
    const sheet = box.current?.closest('.sheet');
    const el = sheet?.querySelectorAll<HTMLElement>('.wzory-strona')[k];
    if (sheet && el) sheet.scrollTo({ top: sheet.scrollTop + el.getBoundingClientRect().top - sheet.getBoundingClientRect().top - 64 });
    setCur(k);
  };
  return (
    <Sheet title="Wybrane wzory matematyczne" onClose={onClose} wide>
      {err || pages?.length === 0 ? (
        <p>
          Nie udało się wczytać karty wzorów.{' '}
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setErr(false); loadFormulas().then(setPages, () => setErr(true)); }}>
            Spróbuj ponownie
          </button>
        </p>
      ) : !pages ? (
        <p className="muted">Ładowanie…</p>
      ) : null}
      {list.length ? (
        <div ref={box} className="stack-2">
          <div className="wzory-nav">
            <span className="small muted">Przewijaj kółkiem myszy albo palcem.</span>
            <label className="wzory-page">
              <span className="sr-only">Przejdź do strony</span>
              <select value={cur} onChange={(e) => jump(Number(e.target.value))}>
                {list.map((_, k) => (
                  <option key={k} value={k}>
                    Strona {k + 1} z {list.length}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {list.map((src, k) => (
            <div key={k} className="kartka wzory-strona" style={{ cursor: 'default' }}>
              <img src={src} alt={`Karta wzorów, strona ${k + 1} z ${list.length}`} decoding="async" />
            </div>
          ))}
        </div>
      ) : null}
    </Sheet>
  );
}
