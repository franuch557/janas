// Lektury (data/lektury/) i pytania jawne do matury ustnej (data/ustny/).
// Pliki dochodzą osobno; gdy ich nie ma, sekcje pokazują jedno zdanie.

const lekturyMods = import.meta.glob('../../data/lektury/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const ustnyMods = import.meta.glob('../../data/ustny/pytania-jawne.json', { eager: true, import: 'default' }) as Record<string, unknown>;

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

export interface Book {
  id: string;
  metryczka: Record<string, string>;
  streszczenie: { tytul: string; tekst: string }[];
  bohaterowie: { imie: string; opis: string }[];
  problematyka: string[];
  motywy: { motyw: string; opis: string }[];
  konteksty: string[];
  cytaty: { tekst: string; kontekst: string }[];
  doWypracowania: string[];
  zrodlo: string;
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

export function bookById(id: string): Book | null {
  const raw = file(id);
  if (!isObj(raw)) return null;
  const meta: Record<string, string> = {};
  if (isObj(raw.metryczka)) for (const [k, v] of Object.entries(raw.metryczka)) if (v != null && v !== '') meta[k] = s(v);
  return {
    id,
    metryczka: meta,
    streszczenie: arr(raw.streszczenie).filter(isObj).map((x) => ({ tytul: s(x.tytul), tekst: s(x.tekst) })),
    bohaterowie: arr(raw.bohaterowie).filter(isObj).map((x) => ({ imie: s(x.imie), opis: s(x.opis) })),
    problematyka: arr(raw.problematyka).map(s).filter(Boolean),
    motywy: arr(raw.motywy).filter(isObj).map((x) => ({ motyw: s(x.motyw), opis: s(x.opis) })),
    konteksty: arr(raw.konteksty).map(s).filter(Boolean),
    cytaty: arr(raw.cytaty).filter(isObj).map((x) => ({ tekst: s(x.tekst), kontekst: s(x.kontekst) })),
    doWypracowania: arr(raw.doWypracowania).map(s).filter(Boolean),
    zrodlo: s(raw.zrodlo),
  };
}

/** Opracowanie jako zwykły tekst (do promptów: fiszki, plan odpowiedzi). */
export function bookText(b: Book, e?: BookEntry): string {
  return [
    e ? `${e.tytul}, ${e.autor} (${e.epoka})` : '',
    b.streszczenie.map((x) => `${x.tytul}: ${x.tekst}`).join('\n'),
    b.bohaterowie.length ? `Bohaterowie: ${b.bohaterowie.map((x) => `${x.imie} – ${x.opis}`).join('; ')}` : '',
    b.problematyka.length ? `Problematyka: ${b.problematyka.join('; ')}` : '',
    b.motywy.length ? `Motywy: ${b.motywy.map((x) => `${x.motyw} – ${x.opis}`).join('; ')}` : '',
    b.konteksty.length ? `Konteksty: ${b.konteksty.join('; ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');
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
