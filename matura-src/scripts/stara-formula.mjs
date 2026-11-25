// Klucz zadań zamkniętych z zasad oceniania matury z matematyki w formule 2015 (2015–2022).
// Zasady podają odpowiedź przy każdym „Zadanie N. (0–1)”: dwie litery dla wersji arkusza
// (I/II, X/Y albo A/B; pierwsza to wersja z pliku arkusza) albo jedną (poziom rozszerzony).

export function oldClosedKeys(pages) {
  const text = pages.map((p) => p.lines.map((l) => l.text).join('\n')).join('\n');
  const out = {};
  const issues = [];
  const parts = text.split(/(?=Zadanie\s+\d+\.\s*\(0\s*[–−-]\s*1\))/);
  for (const seg of parts) {
    const m = /^Zadanie\s+(\d+)\./.exec(seg);
    if (!m) continue;
    const nr = m[1];
    const body = seg.split(/\n(?=Zadanie\s+\d+\.)/)[0].replace(/\b(ZADANIA|Zadania) (OTWARTE|otwarte)[\s\S]*$/, '');
    const labeled = /Wersja A:\s*([A-D])\b/.exec(body); // 2021: „Wersja A: B”
    if (labeled) {
      out[nr] = labeled[1];
      continue;
    }
    if (/wersja/i.test(body)) {
      const tail = body.replace(/^[\s\S]*wersja [A-Z]\b/i, ''); // 2022: litery po „Rozwiązanie – wersja B”
      const pair = [...(/Wersja (I|X)\b/.test(body) ? body : tail).matchAll(/(?:^|\s)([A-D])\s+([A-D])(?=\s|$)/gm)];
      if (pair.length) out[nr] = pair[0][1];
      else issues.push(`zadanie ${nr}: nie znalazłem liter wersji`);
      continue;
    }
    const after = /(Rozwiązanie|odpowiedź|odp\.)[\s\S]*/.exec(body)?.[0] ?? body;
    const cand = [...new Set([...after.matchAll(/(?:^|\s)([A-D])(?=\s|$)/gm)].map((x) => x[1]))];
    const all = [...new Set([...body.matchAll(/(?:^|\s)([A-D])(?=\s|$)/gm)].map((x) => x[1]))];
    const pick = cand.length === 1 ? cand[0] : all.length === 1 ? all[0] : null;
    if (pick) out[nr] = pick;
    else if (all.length) issues.push(`zadanie ${nr}: kilka możliwych liter (${all.join(', ')})`);
  }
  return { keys: out, issues };
}
