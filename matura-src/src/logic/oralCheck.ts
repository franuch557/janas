// Sprawdzenie planu wypowiedzi ustnej bez Claude'a: lista kontrolna według kryteriów CKE
// (teza, argumenty z tekstu, drugi tekst kultury, kontekst, wniosek). Reguły są proste
// i szukają typowych sformułowań, więc pokazuję je jako podpowiedzi, nie jako ocenę.

import { countWords } from './scoring';

export interface CheckItem {
  ok: boolean;
  label: string;
  tip: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
const has = (t: string, ...re: RegExp[]) => re.some((r) => r.test(t));

/** Lista kontrolna planu. `kind` = 'jawne' (pytanie z lekturą) albo 'z2' (zadanie z materiałem). */
export function checkOralPlan(text: string, kind: 'jawne' | 'z2', titles: string[], lektura?: string | null): CheckItem[] {
  const t = norm(text);
  const words = countWords(text);
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  // tytuły lektur (bez krótkich słów), także nazwiska autorów w tytułach typu „Pan Tadeusz”
  const mentioned = titles.filter((x) => {
    const n = norm(x).replace(/[„”"«»]/g, '');
    return n.length >= 4 && t.includes(n);
  });
  const own = lektura ? norm(lektura) : null;
  const others = own ? mentioned.filter((m) => !own.includes(norm(m)) && !norm(m).includes(own)) : mentioned;
  const items: CheckItem[] = [
    {
      ok: has(t, /\bteza\b/, /\bt:/, /uwazam,? ze/, /moim zdaniem/, /twierdze/, /odpowiedz(?:ia)? na pytanie/, /\bhipoteza\b/),
      label: 'Teza odpowiadająca na pytanie',
      tip: 'Zacznij od jednego zdania, które odpowiada na pytanie, np. „Teza: …”.',
    },
    {
      ok: lines.length >= 3 || /(^|\n)\s*(\d+[.)]|[-–•*])\s/.test(text) || has(t, /argument/),
      label: 'Co najmniej dwa argumenty',
      tip: 'Wypisz 2–3 argumenty, każdy w osobnej linii.',
    },
    kind === 'z2'
      ? {
          ok: has(t, /materia/, /obraz/, /tekst(?:cie|u)? (?:z|w) zadani/, /fragment/, /na rysunku/, /na plakacie/, /cytat/, /widac/, /autor (?:tekstu|obrazu)/),
          label: 'Odwołanie do materiału z zadania',
          tip: 'Napisz, co konkretnie widać w materiale albo który fragment potwierdza tezę.',
        }
      : {
          // tytuł lektury, typowe słowa albo nazwa własna w środku zdania (postać, miejsce, scena)
          ok: (!!own && t.includes(own.slice(0, Math.min(own.length, 10)))) || has(t, /bohater/, /scen[aey]/, /fragment/, /cytat/, /postac/, /w (?:utworze|powiesci|dramacie|wierszu|lekturze)/) || /[a-ząćęłńóśźż,:]\s+[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]{2,}/.test(text),
          label: 'Odwołanie do lektury z pytania',
          tip: 'Przywołaj konkretne sceny, postacie albo cytaty z lektury.',
        },
    {
      ok: others.length > 0 || has(t, /inny tekst kultury/, /drugi tekst/, /film/, /obraz .* (?:malarz|autorstwa)/, /\bpiosenk/, /\bserial/),
      label: kind === 'z2' ? 'Drugi tekst kultury (lektura, film, obraz)' : 'Inny tekst kultury',
      tip: 'Dodaj drugi tekst kultury, najlepiej lekturę obowiązkową, i powiąż go z tezą.',
    },
    {
      ok: has(t, /kontekst/, /histori/, /biograf/, /epok/, /filozof/, /religi/, /spoleczn/),
      label: 'Kontekst (historyczny, biograficzny, filozoficzny…)',
      tip: 'Dopisz jeden kontekst, np. historyczny albo filozoficzny, i pokaż, co wnosi.',
    },
    {
      ok: has(t, /wniosek/, /wnioski/, /podsumow/, /zakonczeni/, /podsumowuj/, /reasumuj/, /zatem\b/),
      label: 'Wniosek na końcu',
      tip: 'Zakończ wnioskiem, który wraca do tezy.',
    },
    {
      ok: words >= 40,
      label: `Plan ma treść na 5 minut (${words} słów)`,
      tip: 'Plan na 5 minut mówienia to zwykle 40–150 słów w punktach.',
    },
  ];
  return items;
}
