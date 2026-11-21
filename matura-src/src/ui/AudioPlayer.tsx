import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

function mmss(s: number): string {
  const t = Math.max(0, Math.floor(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/**
 * Odtwarzacz nagrania CKE. Dźwięk rusza tylko po kliknięciu.
 * Fragment nagrania zadania zawiera już oba odczytania z egzaminu, więc
 * w arkuszu (tryb egzaminu) gra raz, bez pauzy i bez przewijania.
 * W trybie nauki: pauza, suwak, cofnięcie o 5 s i prędkość; licznik jest informacją.
 */
export function AudioPlayer({
  src,
  start,
  end,
  label,
  exam,
  plays,
  onPlayCounted,
  maxPlays = exam ? 1 : 2,
}: {
  src: string;
  start: number | null;
  end: number | null;
  label: string;
  exam: boolean;
  plays: number;
  onPlayCounted: () => void;
  maxPlays?: number;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(start ?? 0);
  const [dur, setDur] = useState<number | null>(null);
  const [rate, setRate] = useState(1);
  const [err, setErr] = useState(false);
  const pendingSeek = useRef<number | null>(null);
  // zwarta wersja jednego rzędu po przewinięciu (telefon)
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const on = () => setCompact(window.scrollY > 160);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const s0 = start ?? 0;
  const segEnd = end ?? dur ?? 0;
  const used = exam && plays >= maxPlays;

  // Dokładne zatrzymanie na końcu fragmentu (timeupdate bywa co 250 ms).
  useEffect(() => {
    if (!playing || end == null) return;
    let raf = 0;
    const tick = () => {
      const a = ref.current;
      if (a && a.currentTime >= end) {
        a.pause();
        a.currentTime = s0;
        setPos(s0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, end, s0]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    const onTime = () => setPos(a.currentTime);
    const onMeta = () => {
      setDur(a.duration || null);
      if (pendingSeek.current != null) {
        a.currentTime = pendingSeek.current;
        pendingSeek.current = null;
      }
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnd = () => {
      setPlaying(false);
      a.currentTime = s0;
    };
    const onErr = () => setErr(true);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnd);
    a.addEventListener('error', onErr);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('error', onErr);
    };
  }, [s0]);

  const seek = (a: HTMLAudioElement, t: number) => {
    if (a.readyState >= 1) a.currentTime = t;
    else pendingSeek.current = t;
  };

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (!a.paused) {
      if (!exam) a.pause();
      return;
    }
    const atStart = a.readyState < 1 || a.currentTime <= s0 + 0.5 || a.currentTime < s0;
    if (exam || atStart) {
      if (exam && plays >= maxPlays) return;
      seek(a, s0);
      onPlayCounted();
    }
    a.playbackRate = rate;
    void a.play().catch(() => setErr(true));
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(t.tagName)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const rel = Math.max(0, pos - s0);
  const len = Math.max(0, segEnd - s0);
  const playLabel = playing ? (exam ? 'Nagranie trwa' : 'Wstrzymaj nagranie') : 'Odtwórz nagranie';

  return (
    <div className={`player${exam ? ' exam' : ''}${compact ? ' compact' : ''}`} aria-label={label}>
      <audio ref={ref} src={src} preload="metadata" />
      <button type="button" className="play" onClick={toggle} disabled={err || (used && !playing) || (exam && playing)} aria-label={playLabel} title={playLabel}>
        <Icon name={playing ? 'pauza' : 'graj'} />
      </button>
      <div className="row-between">
        <span className="small" style={{ fontWeight: 600 }}>
          {label}
        </span>
        <span className="small tnum muted">
          {mmss(rel)} / {len ? mmss(len) : '–'}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={len || 1}
        step={0.5}
        value={Math.min(rel, len || 1)}
        disabled={exam || !len}
        aria-label="Pozycja nagrania"
        onChange={(e) => {
          const a = ref.current;
          if (a) seek(a, s0 + Number(e.target.value));
        }}
      />
      <div className="controls">
        {!exam ? (
          <>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const a = ref.current;
                if (a) seek(a, Math.max(s0, a.currentTime - 5));
              }}
            >
              Cofnij 5 s
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              aria-label={`Prędkość ${rate === 1 ? '1' : '0,75'}×, zmień`}
              onClick={() => {
                const r = rate === 1 ? 0.75 : 1;
                setRate(r);
                if (ref.current) ref.current.playbackRate = r;
              }}
            >
              {rate === 1 ? '1×' : '0,75×'}
            </button>
          </>
        ) : null}
        <span className="small muted">
          {err
            ? 'Nie udało się wczytać nagrania.'
            : exam
              ? `odtworzono ${plays} z ${maxPlays}. Nagranie zawiera oba odtworzenia, jak na egzaminie.`
              : `odtworzono ${plays}`}
        </span>
      </div>
    </div>
  );
}
