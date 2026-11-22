// Dostęp do Claude'a przez capability `sample` artefaktu. Funkcje z Claude'em
// pokazuję tylko, gdy `use('sample')` zwraca funkcję i wywołania nie są odrzucane
// jako „not_granted”; w przeciwnym razie zostaje samoocena (nic nie znika).

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText, hidesFeature } from '../logic/ai';

export interface SampleOptions {
  onText?: (u: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  images?: Blob[];
  modelTier?: 'default' | 'complex' | 'quick';
  cache?: boolean | { gcTime?: number; refresh?: boolean };
}
export type SampleInput = string | { role: 'user' | 'assistant'; content: string }[];
export interface SampleFn {
  (input: SampleInput, options?: SampleOptions): Promise<{ text: string; truncated: boolean }>;
  json: (input: SampleInput, options?: SampleOptions) => Promise<unknown>;
  limits: () => Promise<{ images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
}

let samplePromise: Promise<SampleFn | null> | null = null;
let hidden = false;
let maxImages = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function getSample(): Promise<SampleFn | null> {
  if (!samplePromise) {
    samplePromise = (async () => {
      try {
        const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
        const s = c?.use ? ((await c.use('sample')) as SampleFn | null) : null;
        if (s && typeof s.limits === 'function') {
          try {
            maxImages = (await s.limits())?.images?.maxCount ?? 0;
          } catch {
            maxImages = 0;
          }
        }
        return s ?? null;
      } catch {
        return null;
      }
    })().then((s) => {
      notify();
      return s;
    });
  }
  return samplePromise;
}

/** Ukrywa funkcje z Claude'em do końca wizyty (brak zgody, wyłączone konto). */
export function hideAi() {
  hidden = true;
  notify();
}

export function useAi(): { available: boolean; maxImages: number } {
  const [, force] = useState(0);
  const [fn, setFn] = useState<SampleFn | null>(null);
  useEffect(() => {
    let alive = true;
    const on = () => alive && force((x) => x + 1);
    listeners.add(on);
    void getSample().then((s) => alive && setFn(() => s));
    return () => {
      alive = false;
      listeners.delete(on);
    };
  }, []);
  return { available: !!fn && !hidden, maxImages };
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  // obraz jako plik (strona GitHub Pages: obrazy w cke/img/…)
  if (!url.startsWith('data:')) return (await fetch(url)).blob();
  const [head, body] = url.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'image/jpeg';
  const bin = atob(body);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Obrazy do wywołania, najwyżej tyle, ile przyjmuje ten widok. */
export async function imagesFor(urls: (string | Blob | null | undefined)[]): Promise<Blob[]> {
  const list: Blob[] = [];
  for (const u of urls) {
    if (!u) continue;
    list.push(typeof u === 'string' ? await dataUrlToBlob(u) : u);
  }
  return maxImages ? list.slice(0, maxImages) : [];
}

export interface AiCall {
  busy: boolean;
  text: string;
  error: string | null;
  run: <T>(fn: (s: SampleFn, o: { signal: AbortSignal; onText: (u: { text: string }) => void }) => Promise<T>) => Promise<T | null>;
  stop: () => void;
}

/** Jedno wywołanie naraz: „Myślę…” do pierwszego tekstu, Stop, błędy po polsku, bez ponawiania. */
export function useAiCall(): AiCall {
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ctl = useRef<AbortController | null>(null);
  useEffect(() => () => ctl.current?.abort(), []);
  const run = useCallback(async <T,>(fn: (s: SampleFn, o: { signal: AbortSignal; onText: (u: { text: string }) => void }) => Promise<T>) => {
    const s = await getSample();
    if (!s || hidden) return null;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(true);
    setText('');
    setError(null);
    try {
      return await fn(s, { signal: c.signal, onText: ({ text: t }) => setText(t) });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (hidesFeature(code)) hideAi();
      setError(errorText(code));
      return null;
    } finally {
      if (ctl.current === c) {
        ctl.current = null;
        setBusy(false);
      }
    }
  }, []);
  const stop = useCallback(() => ctl.current?.abort(), []);
  return { busy, text, error, run, stop };
}

export function AiStatus({ call, streaming = false }: { call: AiCall; streaming?: boolean }) {
  if (!call.busy && !call.error) return null;
  return (
    <div className="ai-status" aria-live="polite">
      {call.busy ? (
        <div className="row-between">
          <span className="muted">{streaming && call.text ? 'Claude pisze…' : 'Myślę…'}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={call.stop}>
            Stop
          </button>
        </div>
      ) : null}
      {call.error ? <p className="error">{call.error}</p> : null}
    </div>
  );
}
