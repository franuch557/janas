import { useCallback, useEffect, useState } from 'react';
import { loadPack } from '../store/catalog';
import { displayNr, type CkePack } from '../logic/cke';
import type { AppTask } from '../store/derived';
import { useStore } from '../store/AppStore';
import { Icon } from './icons';

export const ZADANIA_INFO_NOTE = 'Materiał pobrany z portalu zadania.info';

export function usePack(examId: string | null | undefined) {
  const [pack, setPack] = useState<CkePack | null>(null);
  const [error, setError] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!examId) return;
    let alive = true;
    setError(false);
    loadPack(examId)
      .then((p) => alive && setPack(p))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [examId, n]);
  const retry = useCallback(() => setN((x) => x + 1), []);
  return { pack: examId ? pack : null, error, retry };
}

const LEVEL = { podstawowy: 'poziom podstawowy', rozszerzony: 'poziom rozszerzony' };

export function captionFor(t: AppTask, kind: 'zad' | 'odp', level?: 'podstawowy' | 'rozszerzony'): string {
  if (t.user) return t.user.source === 'zadania.info' ? `${ZADANIA_INFO_NOTE}${t.user.ref ? `, zadanie ${t.user.ref}` : ''}` : 'Zadanie dodane przez ciebie';
  const n = displayNr(t.nr);
  const what = n.startsWith('temat') ? `wypracowanie, ${n}` : `zadanie ${n}`;
  if (kind === 'odp') return `Zasady oceniania CKE, ${t.session} ${t.year}, ${what}`;
  return `Arkusz CKE, ${t.session} ${t.year}${level ? `, ${LEVEL[level]}` : ''}, ${what}`;
}

function Viewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === '-') setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener('keydown', k, true);
    return () => window.removeEventListener('keydown', k, true);
  }, [onClose]);
  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Podgląd zadania">
      <div className="vbar">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1}>
          <Icon name="pomniejsz" /> Pomniejsz
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(4, z + 0.5))} disabled={zoom >= 4}>
          <Icon name="powieksz" /> Powiększ
        </button>
        <button type="button" className="btn btn-icon" aria-label="Zamknij podgląd" title="Zamknij podgląd" onClick={onClose} autoFocus>
          <Icon name="zamknij" />
        </button>
      </div>
      <div className="vbody" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="sheet-img" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? 960 : undefined }}>
          <img src={src} alt={alt} />
        </div>
      </div>
    </div>
  );
}

function Sheetimg({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="kartka" onClick={() => setOpen(true)} aria-label={`${alt}. Dotknij, żeby powiększyć.`}>
        <img src={src} alt={alt} />
      </button>
      {open ? <Viewer src={src} alt={alt} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Kartka z treścią zadania (obraz z arkusza CKE albo zrzut ekranu ucznia). */
export function TaskSheet({ task, kind = 'zad', level, showContext = true }: { task: AppTask; kind?: 'zad' | 'odp'; level?: 'podstawowy' | 'rozszerzony'; showContext?: boolean }) {
  const { loadImage } = useStore();
  const { pack, error, retry } = usePack(task.user ? null : task.examId);
  const [userImg, setUserImg] = useState<string | null>(null);
  const [userErr, setUserErr] = useState(false);
  useEffect(() => {
    if (!task.user?.imageId) return;
    let alive = true;
    loadImage(task.user.imageId).then((x) => {
      if (!alive) return;
      if (x) setUserImg(x);
      else setUserErr(true);
    });
    return () => {
      alive = false;
    };
  }, [task.user?.imageId, loadImage]);

  const caption = captionFor(task, kind, level);
  if (task.user) {
    if (kind === 'odp') return null;
    return (
      <figure style={{ margin: 0 }} className="stack-2">
        {task.user.imageId ? userImg ? <Sheetimg src={userImg} alt="Treść zadania" /> : <div className="kartka-ph">{userErr ? 'Nie udało się wczytać zrzutu ekranu.' : 'Ładowanie zadania…'}</div> : null}
        {task.user.text ? <div className="kartka text">{task.user.text}</div> : null}
        <figcaption className="caption">{caption}</figcaption>
      </figure>
    );
  }
  if (error) {
    return (
      <div className="kartka-ph">
        <div className="stack" style={{ alignItems: 'center' }}>
          <p>Nie udało się wczytać zadania.</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }
  if (!pack) return <div className="kartka-ph" aria-busy="true">Ładowanie zadania…</div>;
  const src = kind === 'odp' ? pack.odp[task.nr] : pack.zad[task.nr];
  const ctx = kind === 'zad' && showContext && task.context ? pack.ctx[task.context] : null;
  if (!src) return kind === 'odp' ? <p className="muted">Zasady oceniania nie mają osobnego wycinka dla tego zadania.</p> : <div className="kartka-ph">Brak obrazu zadania.</div>;
  return (
    <figure style={{ margin: 0 }} className="stack-2">
      {ctx ? <Sheetimg src={ctx} alt="Materiał do zadania" /> : null}
      <Sheetimg src={src} alt={kind === 'odp' ? `Zasady oceniania, zadanie ${displayNr(task.nr)}` : `Treść zadania ${displayNr(task.nr)}`} />
      <figcaption className="caption">{caption}</figcaption>
    </figure>
  );
}

/**
 * Materiał do zadania (tekst, rysunek wspólny dla kilku zadań). Na telefonie
 * zwijany („Tekst do zadania”), w naturalnej szerokości z przewijaniem w kartce;
 * na komputerze zawsze widoczny w lewej kolumnie.
 */
export function ContextSheet({ task, collapsible }: { task: AppTask; collapsible: boolean }) {
  const { pack, error, retry } = usePack(task.user ? null : task.examId);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  if (!task.context || task.user) return null;
  const src = pack?.ctx[task.context];
  const body = error ? (
    <div className="kartka-ph">
      <div className="stack" style={{ alignItems: 'center' }}>
        <p>Nie udało się wczytać tekstu do zadania.</p>
        <button type="button" className="btn btn-secondary" onClick={retry}>
          Spróbuj ponownie
        </button>
      </div>
    </div>
  ) : !pack ? (
    <div className="kartka-ph">Ładowanie tekstu…</div>
  ) : src ? (
    collapsible ? (
      <div className="kartka ctx-scroll">
        <img src={src} alt="Tekst do zadania" />
      </div>
    ) : (
      <Sheetimg src={src} alt="Tekst do zadania" />
    )
  ) : null;
  if (!collapsible) return <figure style={{ margin: 0 }} className="stack-2">{body}<figcaption className="caption">Tekst do zadania</figcaption></figure>;
  return (
    <div className="card ctx-card">
      <div className="row-between">
        <button type="button" className="btn btn-secondary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Zwiń tekst do zadania' : 'Tekst do zadania'}
        </button>
        {open && src ? (
          <button type="button" className="btn btn-quiet" onClick={() => setZoom(true)}>
            Powiększ
          </button>
        ) : null}
      </div>
      {open ? <div className="reveal">{body}</div> : null}
      {zoom && src ? <Viewer src={src} alt="Tekst do zadania" onClose={() => setZoom(false)} /> : null}
    </div>
  );
}
