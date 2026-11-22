// Automatyczna ocena odpowiedzi otwartych z polskiego według sensu, nie słów:
// odpowiedź ucznia i przykładowe odpowiedzi CKE (ocenione na 0–N pkt) zamieniam na wektory
// znaczenia wielojęzycznym modelem (paraphrase-multilingual-MiniLM-L12-v2) i porównuję je.
// Odpowiedź bliska przykładowi za N pkt dostaje N pkt; daleka od wszystkich przykładów: 0 pkt.
// Progi są dobrane na przykładach CKE (scripts/trenuj-polski.mts, sprawdzenie „bez jednego”).

export const TEXT_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

// model i przedrostek tekstu wybiera trening (src/data/ocena-polski.json): e5 wymaga „query: ”
let current = { model: TEXT_MODEL, prefix: '' };
export function setTextModel(model: string, prefix = '') {
  if (model === current.model && prefix === current.prefix) return;
  current = { model, prefix };
  extractor = null;
}

export interface TextParams {
  /** Poniżej tego podobieństwa do najbliższego przykładu: 0 pkt. */
  tau: number;
  /** Między tau a full: punkty najbliższego przykładu minus 1 (odpowiedź tylko częściowo zbieżna). */
  full: number;
  /** Odpowiedź musi być bliżej przykładów niż samego polecenia o co najmniej qm (przepisane polecenie = 0). */
  qm?: number;
  /** Gdy przykład z innego zadania jest bliżej o więcej niż om: odpowiedź nie na temat = 0. */
  om?: number;
}
export const DEFAULT_TEXT_PARAMS: TextParams = { tau: 0.55, full: 0.7 };

/** Cechy odpowiedzi (liczone raz, progi dobiera trening). */
export interface TextFeatures {
  best: number;
  nearest: number;
  nearPoints: number;
  /** Podobieństwo do polecenia (null, gdy brak wektora polecenia). */
  qsim: number | null;
  /** Największe podobieństwo do przykładów z innych zadań (null, gdy brak). */
  osim: number | null;
}

export interface TextExample {
  points: number;
  vec: Float32Array;
}

export interface TextGrade {
  points: number;
  max: number;
  /** Podobieństwo do najbliższego przykładu CKE (0–1). */
  similarity: number;
  /** Indeks najbliższego przykładu. */
  nearest: number;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let d = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    d += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return d / (Math.sqrt(na * nb) || 1);
}

export function textFeatures(vec: Float32Array, examples: TextExample[], ctx: { q?: Float32Array | null; others?: Float32Array[] } = {}): TextFeatures | null {
  if (!examples.length) return null;
  let best = -1, idx = 0;
  examples.forEach((e, i) => {
    const s = cosine(vec, e.vec);
    if (s > best) {
      best = s;
      idx = i;
    }
  });
  let osim: number | null = null;
  for (const o of ctx.others ?? []) {
    const s = cosine(vec, o);
    if (osim == null || s > osim) osim = s;
  }
  return { best, nearest: idx, nearPoints: examples[idx].points, qsim: ctx.q ? cosine(vec, ctx.q) : null, osim };
}

export function decideText(f: TextFeatures, max: number, p: TextParams): number {
  if (p.qm != null && f.qsim != null && f.best - f.qsim < p.qm) return 0;
  if (p.om != null && f.osim != null && f.osim - f.best > p.om) return 0;
  let points = 0;
  if (f.best >= p.full) points = f.nearPoints;
  else if (f.best >= p.tau) points = Math.max(f.nearPoints > 0 ? 1 : 0, f.nearPoints - 1);
  return Math.min(max, points);
}

export function gradeText(vec: Float32Array, examples: TextExample[], max: number, p: TextParams = DEFAULT_TEXT_PARAMS, ctx: { q?: Float32Array | null; others?: Float32Array[] } = {}): TextGrade | null {
  const f = textFeatures(vec, examples, ctx);
  if (!f) return null;
  return { points: decideText(f, max, p), max, similarity: f.best, nearest: f.nearest };
}

// ---------- Zapis wektorów przykładów (int8, base64) ----------

export function packVec(v: Float32Array): string {
  const q = new Int8Array(v.length);
  for (let i = 0; i < v.length; i++) q[i] = Math.max(-127, Math.min(127, Math.round(v[i] * 127)));
  let s = '';
  const u = new Uint8Array(q.buffer);
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}

export function unpackVec(b64: string): Float32Array {
  const s = atob(b64);
  const out = new Float32Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const b = s.charCodeAt(i);
    out[i] = (b > 127 ? b - 256 : b) / 127;
  }
  return out;
}

// ---------- Model w przeglądarce i w Node ----------

type Extractor = (t: string[], o: { pooling: 'mean'; normalize: boolean }) => Promise<{ tolist(): number[][] }>;
let extractor: Promise<Extractor> | null = null;

/** Model pobierany raz (ok. 118 MB, potem z pamięci przeglądarki). */
export function loadTextModel(onProgress?: (p: number) => void): Promise<Extractor> {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const seen: Record<string, [number, number]> = {};
      const p = await pipeline('feature-extraction', current.model, {
        dtype: 'q8',
        progress_callback: (e: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (e.status === 'progress' && e.file && e.total) {
            seen[e.file] = [e.loaded ?? 0, e.total];
            const [l, t] = Object.values(seen).reduce((a, x) => [a[0] + x[0], a[1] + x[1]], [0, 0]);
            onProgress?.(t ? l / t : 0);
          }
        },
      });
      return p as unknown as Extractor;
    })();
    extractor.catch(() => (extractor = null));
  }
  return extractor;
}

export async function embedTexts(texts: string[], onProgress?: (p: number) => void): Promise<Float32Array[]> {
  const ex = await loadTextModel(onProgress);
  const out = await ex(texts.map((t) => current.prefix + t), { pooling: 'mean', normalize: true });
  return out.tolist().map((r) => Float32Array.from(r));
}
