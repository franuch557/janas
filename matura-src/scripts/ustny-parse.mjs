// Analiza tekstu wykazu pytań jawnych CKE (matura ustna z polskiego). Czyste funkcje.
// Wejście: linie tekstu w kolejności czytania (bez stopek). Wyjście: pytania z numerem,
// lekturą (nagłówek grupy, jeśli wykaz je ma) i treścią. Niczego nie dopisuję od siebie.

const NUM = /^(\d{1,3})\s*[.)]\s*(.+)$/;
const FOOT = /^(Strona\s*\d+\s*z\s*\d+|\d+\s*$|©\s*CKE|Układ graficzny)/i;

/** Nagłówek grupy (lektura): krótka linia bez numeru, po której zaczyna się numerowane pytanie. */
function isHeading(line, next) {
  if (NUM.test(line) || !next || !NUM.test(next)) return false;
  if (line.length > 90 || /[.?!:;,]$/.test(line)) return false;
  return true;
}

export function parsePytania(lines) {
  const clean = lines.map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !FOOT.test(l));
  const out = [];
  let lektura = null;
  let cur = null;
  let lastNr = 0;
  clean.forEach((l, i) => {
    const m = NUM.exec(l);
    if (m && Number(m[1]) === lastNr + 1) {
      cur = { nr: Number(m[1]), lektura, lekturaId: null, tresc: m[2] };
      out.push(cur);
      lastNr = cur.nr;
      return;
    }
    const openSentence = cur && !/[.?!…”"]$/.test(cur.tresc);
    if (!openSentence && isHeading(l, clean[i + 1]) && NUM.exec(clean[i + 1]) && Number(NUM.exec(clean[i + 1])[1]) === lastNr + 1) {
      lektura = l;
      cur = null;
      return;
    }
    if (cur) cur.tresc += ` ${l}`; // kontynuacja treści pytania
  });
  for (const p of out) p.tresc = p.tresc.replace(/\s+([,.?!;:])/g, '$1').replace(/-\s+(\p{Ll})/gu, '$1').trim();
  return out;
}

/** Rok z nazwy pliku albo tekstu („2026”), null gdy brak. */
export function yearOf(name, text = '') {
  const m = /20\d\d/.exec(name) ?? /20\d\d/.exec(text);
  return m ? Number(m[0]) : null;
}
