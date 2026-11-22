// Automatyczna ocena odpowiedzi otwartych z polskiego według sensu, nie słów:
// odpowiedź ucznia i przykładowe odpowiedzi CKE (ocenione na 0–N pkt) zamieniam na wektory
// znaczenia wielojęzycznym modelem (paraphrase-multilingual-MiniLM-L12-v2) i porównuję je.
// Odpowiedź bliska przykładowi za N pkt dostaje N pkt; daleka od wszystkich przykładów: 0 pkt.
// Progi są dobrane na przykładach CKE (scripts/trenuj-polski.mts, sprawdzenie „bez jednego”).

export const TEXT_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';

export interface TextParams {
  /** Poniżej tego podobieństwa do najbliższego przykładu: 0 pkt. */
  tau: number;
  /** Między tau a full: punkty najbliższego przykładu minus 1 (odpowiedź tylko częściowo zbieżna). */
  full: number;
}
export const DEFAULT_TEXT_PARAMS: TextParams = { tau: 0.55, full: 0.7 };

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

export function gradeText(vec: Float32Array, examples: TextExample[], max: number, p: TextParams = DEFAULT_TEXT_PARAMS): TextGrade | null {
  if (!examples.length) return null;
  let best = -1, idx = 0;
  examples.forEach((e, i) => {
    const s = cosine(vec, e.vec);
    if (s > best) {
      best = s;
      idx = i;
    }
  });
  const near = examples[idx].points;
  let points = 0;
  if (best >= p.full) points = near;
  else if (best >= p.tau) points = Math.max(near > 0 ? 1 : 0, near - 1);
  return { points: Math.min(max, points), max, similarity: best, nearest: idx };
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
      const p = await pipeline('feature-extraction', TEXT_MODEL, {
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
  const out = await ex(texts, { pooling: 'mean', normalize: true });
  return out.tolist().map((r) => Float32Array.from(r));
}
