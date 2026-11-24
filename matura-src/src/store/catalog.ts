// Katalog arkuszy CKE (wbudowany w aplikację) i pakiety obrazów pobierane
// względnym adresem cke/<examId>.json (pliki publikowane obok strony).

import { normalizeExams, readPack, type CkeExam, type CkePack } from '../logic/cke';

/** Arkusze CKE; wypełniane przy starcie przez loadData() (store/data.ts), osobny plik zamiast głównego skryptu. */
export const EXAMS: CkeExam[] = [];
export function setExams(raw: unknown) {
  EXAMS.splice(0, EXAMS.length, ...normalizeExams(raw));
}

// Kryteria samooceny wypracowań; plik może jeszcze nie istnieć.
const kryteriaMods = import.meta.glob('../../data/kryteria.json', { eager: true, import: 'default' }) as Record<string, unknown>;

export interface Criterion {
  id: string;
  name: string;
  max: number;
  values: number[];
  description: string;
}
export interface CriteriaSet {
  name: string;
  max: number;
  groups: { name: string; criteria: Criterion[] }[];
}

function readCriteria(raw: unknown): Record<string, CriteriaSet> {
  const out: Record<string, CriteriaSet> = {};
  if (typeof raw !== 'object' || raw === null) return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const o = v as Record<string, unknown>;
    if (!Array.isArray(o.groups)) continue;
    const groups = (o.groups as Record<string, unknown>[]).map((g) => ({
      name: String(g.name ?? ''),
      criteria: (Array.isArray(g.criteria) ? (g.criteria as Record<string, unknown>[]) : []).map((c) => {
        const max = Number(c.max) || 0;
        const values = Array.isArray(c.values) && c.values.length ? (c.values as unknown[]).map(Number).filter((x) => Number.isFinite(x)) : Array.from({ length: max + 1 }, (_, i) => i);
        return { id: String(c.id ?? c.name), name: String(c.name ?? ''), max, values, description: String(c.description ?? '') };
      }),
    }));
    const max = Number(o.max) || groups.flatMap((g) => g.criteria).reduce((s, c) => s + c.max, 0);
    out[k] = { name: String(o.name ?? k), max, groups };
  }
  return out;
}

export const CRITERIA: Record<string, CriteriaSet> = readCriteria(Object.values(kryteriaMods)[0]);

export function criteriaFor(key: string | undefined, family: string): CriteriaSet | null {
  if (key && CRITERIA[key]) return CRITERIA[key];
  const keys = Object.keys(CRITERIA).filter((k) => k.startsWith(family === 'polski' ? 'pol' : 'ang'));
  return keys.length ? CRITERIA[keys.sort().slice(-1)[0]] : null;
}

// ---------- Dostępność pakietów ----------

export type PackState = 'ladowanie' | 'jest' | 'brak' | 'blad';

function isJson(r: Response): boolean {
  const ct = r.headers.get('content-type') ?? '';
  return ct.includes('json');
}

/** Sprawdza, czy pakiet arkusza jest dostępny (bez pobierania obrazów). */
export async function probePack(examId: string): Promise<PackState> {
  try {
    let r = await fetch(`cke/${examId}.json`, { method: 'HEAD', cache: 'no-cache' });
    if (r.status === 405 || r.status === 501) r = await fetch(`cke/${examId}.json`, { cache: 'force-cache' });
    if (r.status === 404 || r.status === 403) return 'brak';
    if (!r.ok) return 'blad';
    return isJson(r) ? 'jest' : 'brak';
  } catch {
    return 'blad';
  }
}

export { default as PACK_MANIFEST } from 'virtual:cke-manifest';

// W pamięci trzymam najwyżej 3 pakiety (każdy ma kilka MB obrazów).
const PACK_LRU = 3;
const packCache = new Map<string, Promise<CkePack>>();

export function loadPack(examId: string): Promise<CkePack> {
  const hit = packCache.get(examId);
  if (hit) {
    packCache.delete(examId);
    packCache.set(examId, hit);
    return hit;
  }
  while (packCache.size >= PACK_LRU) packCache.delete(packCache.keys().next().value as string);
  const p = fetch(`cke/${examId}.json`)
    .then(async (r) => {
      if (!r.ok || !isJson(r)) throw new Error('brak pakietu');
      const pack = readPack(await r.json());
      if (!pack) throw new Error('zły pakiet');
      return pack;
    })
    .catch((e) => {
      packCache.delete(examId);
      throw e;
    });
  packCache.set(examId, p);
  return p;
}
