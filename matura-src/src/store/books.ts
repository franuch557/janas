// Lektury (data/lektury/) i pytania jawne do matury ustnej (data/ustny/).
// Pliki dochodzą osobno; gdy ich nie ma, sekcje pokazują jedno zdanie.

const lekturyMods = import.meta.glob('../../data/lektury/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const ustnyMods = import.meta.glob('../../data/ustny/pytania-jawne.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const zad2Mods = import.meta.glob('../../data/ustny/zadanie2.json', { eager: true, import: 'default' }) as Record<string, unknown>;

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x);
const s = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

export interface BookEntry {
  id: string;
  tytul: string;
  autor: string;
  epoka: string;
  epokaId: string;
  rok: string;
  gatunek: string;
  obowiazkowa: boolean;
  czesciowo: string | null;
  pelnyTekst: string | null;
}

/** Blok sekcji opracowania: akapit, punkt listy (z etykietą i numerem) albo tabela. Tekst w prostym markdownie (**, *). */
export type BookBlock =
  | { typ: 'akapit'; tekst: string }
  | { typ: 'punkt'; etykieta: string; tekst: string; nr?: number }
  | { typ: 'tabela'; wiersze: string[][] };

export interface BookSection {
  tytul: string;
  bloki: BookBlock[];
}

/** Opracowanie lektury (data/opracowania/*.md → scripts/opracowania-import.mjs). */
export interface Book {
  id: string;
  /** 'czat' – opracowanie z plików czatu, 'zastepcze' – uzupełnienie brakującej lektury */
  zrodlo: string;
  sekcje: BookSection[];
}

export interface OralQuestion {
  nr: string;
  lektura: string;
  lekturaId: string | null;
  tresc: string;
}

function file(name: string): unknown {
  const k = Object.keys(lekturyMods).find((x) => x.endsWith(`/${name}.json`));
  return k ? lekturyMods[k] : undefined;
}

const indexRaw = file('index');
export const BOOKS: BookEntry[] = isObj(indexRaw)
  ? arr(indexRaw.lektury)
      .filter(isObj)
      .map((b) => ({
        id: s(b.id).replace(/[^A-Za-z0-9-]/g, '-'),
        tytul: s(b.tytul),
        autor: s(b.autor),
        epoka: s(b.epoka),
        epokaId: s(b.epokaId),
        rok: s(b.rok),
        gatunek: s(b.gatunek),
        obowiazkowa: b.obowiazkowa !== false,
        czesciowo: typeof b.czesciowo === 'string' && b.czesciowo ? b.czesciowo : null,
        pelnyTekst: typeof b.pelnyTekst === 'string' && /^https:\/\//.test(b.pelnyTekst) ? b.pelnyTekst : null,
      }))
      .filter((b) => b.id && b.tytul)
  : [];

export const EPOCHS: { id: string; nazwa: string; lata: string }[] = isObj(indexRaw)
  ? arr(indexRaw.epoki)
      .filter(isObj)
      .map((e) => ({ id: s(e.id), nazwa: s(e.nazwa), lata: s(e.lata) }))
  : [];

function sections(x: unknown): BookSection[] {
  return arr(x)
    .filter(isObj)
    .map((sec) => ({
      tytul: s(sec.tytul),
      bloki: arr(sec.bloki)
        .filter(isObj)
        .map((b): BookBlock | null =>
          b.typ === 'tabela'
            ? { typ: 'tabela', wiersze: arr(b.wiersze).map((r) => arr(r).map(s)) }
            : b.typ === 'punkt'
              ? { typ: 'punkt', etykieta: s(b.etykieta), tekst: s(b.tekst), ...(typeof b.nr === 'number' ? { nr: b.nr } : {}) }
              : b.typ === 'akapit'
                ? { typ: 'akapit', tekst: s(b.tekst) }
                : null,
        )
        .filter((b): b is BookBlock => b != null),
    }))
    .filter((sec) => sec.tytul && sec.bloki.length);
}

export function bookById(id: string): Book | null {
  const raw = file(id);
  if (!isObj(raw)) return null;
  const sekcje = sections(raw.sekcje);
  return sekcje.length ? { id, zrodlo: s(raw.zrodlo), sekcje } : null;
}

/** Charakterystyka epoki (z plików czatu), jeśli jest. */
export function epochOverview(epokaId: string): BookSection[] {
  const raw = file('epoki-opisy');
  return isObj(raw) && isObj(raw[epokaId]) ? sections((raw[epokaId] as Obj).sekcje) : [];
}

const plain = (t: string) => t.replace(/\*\*|\*/g, '');

const blockText = (b: BookBlock) =>
  b.typ === 'tabela' ? b.wiersze.map((r) => r.join(' | ')).join('\n') : plain(b.typ === 'punkt' && b.etykieta ? `${b.etykieta}: ${b.tekst}` : b.tekst);

/** Opracowanie jako zwykły tekst (do promptów: fiszki, plan odpowiedzi). Bez pytań sprawdzających. */
export function bookText(b: Book, e?: BookEntry): string {
  return [
    e ? `${e.tytul}, ${e.autor} (${e.epoka})` : '',
    ...b.sekcje.filter((x) => !/sprawdź swoją wiedzę/i.test(x.tytul)).map((x) => [`${x.tytul}:`, ...x.bloki.map(blockText)].join('\n')),
  ]
    .filter(Boolean)
    .join('\n\n');
}

const ustnyRaw = Object.values(ustnyMods)[0];
export const ORAL: { zrodlo: string; rok: string; pytania: OralQuestion[] } | null = isObj(ustnyRaw)
  ? {
      zrodlo: s(ustnyRaw.zrodlo),
      rok: s(ustnyRaw.rok),
      pytania: arr(ustnyRaw.pytania)
        .filter(isObj)
        .map((q) => ({ nr: s(q.nr).replace(/[^A-Za-z0-9-]/g, '-'), lektura: s(q.lektura), lekturaId: typeof q.lekturaId === 'string' ? q.lekturaId : null, tresc: s(q.tresc) }))
        .filter((q) => q.nr && q.tresc),
    }
  : null;

// ---------- Zadanie 2 (niejawne) z matury ustnej: zbiór przykładowych zadań CKE ----------

export interface OralTask2 {
  id: string;
  czesc: number;
  typ: string;
  pytanie: string;
  polecenie: string;
}

const zad2Raw = Object.values(zad2Mods)[0];
export const ORAL2: { zrodlo: string; zadania: OralTask2[] } | null = isObj(zad2Raw)
  ? {
      zrodlo: s(zad2Raw.zrodlo),
      zadania: arr(zad2Raw.zadania)
        .filter(isObj)
        .map((z) => ({ id: s(z.id).replace(/[^0-9.]/g, ''), czesc: Number(z.czesc) || 1, typ: s(z.typ), pytanie: s(z.pytanie), polecenie: s(z.polecenie) }))
        .filter((z) => z.id && z.polecenie),
    }
  : null;

let pack2: Promise<{ zad: Record<string, string>; odp: Record<string, string> } | null> | null = null;
/** Obrazy zadań 2 (cke/ustny-zadanie2.json); null, gdy pakietu nie ma. */
export function loadOral2Pack() {
  if (!pack2)
    pack2 = fetch('cke/ustny-zadanie2.json')
      .then(async (r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
        const j = (await r.json()) as unknown;
        if (!isObj(j) || !isObj(j.zad)) return null;
        return { zad: j.zad as Record<string, string>, odp: (isObj(j.odp) ? j.odp : {}) as Record<string, string> };
      })
      .catch(() => {
        pack2 = null;
        return null;
      });
  return pack2;
}

/** Pytania z kluczem z sekcji „Sprawdź swoją wiedzę” (pytanie i odpowiedź w tej samej kolejności). */
export function bookQuiz(id: string): { q: string; a: string }[] {
  const b = bookById(id);
  const s = b?.sekcje.find((x) => /sprawdź swoją wiedzę/i.test(x.tytul));
  if (!s) return [];
  const k = s.bloki.findIndex((x) => x.typ === 'akapit' && /klucz odpowiedzi/i.test(x.tekst));
  if (k < 0) return [];
  const pts = (xs: BookBlock[]) => xs.filter((x): x is Extract<BookBlock, { typ: 'punkt' }> => x.typ === 'punkt');
  const qs = pts(s.bloki.slice(0, k));
  const as = pts(s.bloki.slice(k + 1));
  return qs.map((x, i) => ({ q: x.tekst, a: as[i]?.tekst ?? '' })).filter((x) => x.a);
}
