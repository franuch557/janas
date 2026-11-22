// Atrapa capability `sample` (wg sample.d.ts 0.2.96): przewidywalne odpowiedzi
// zależne od znacznika „[typ: …]” w pierwszej linii promptu. Wywołania są
// zapisywane w window.__sampleCalls (typ, liczba obrazów, model).

export function sampleScript() {
  const calls = [];
  window.__sampleCalls = calls;
  const typeOf = (input) => {
    const text = typeof input === 'string' ? input : input.map((t) => t.content).join('\n');
    return { text, typ: (/\[typ: ([a-z-]+)\]/.exec(text) || [])[1] || 'inne' };
  };
  const answerFor = (typ, text) => {
    switch (typ) {
      case 'ocena': {
        const max = Number((/za 0–(\d+) pkt/.exec(text) || [])[1] || 2);
        return { json: { points: Math.min(1, max), max, verdict: 'częściowo', feedback: 'Dobra metoda, ale błąd w obliczeniach.', mistakes: [{ type: 'rachunkowy', note: 'błąd w obliczeniu procentu' }] } };
      }
      case 'podpowiedz':
        return { text: 'Zacznij od warunku $N(0)=10\\,000$ i wyznacz $N_0$.' };
      case 'rozwiazanie':
        return { text: '1. Z warunku $N(0)$ mamy $N_0 = 10\\,000$.\n2. Z warunku $N(2)$: $k^2 = 1{,}5625$, więc $k = 1{,}25$.\n\nWynik: liczebność rośnie o $25\\%$ na godzinę.' };
      case 'dopytaj':
        return { text: 'Bo $1{,}25 = 1 + 0{,}25$, czyli wzrost o $25\\%$.' };
      case 'wypracowanie': {
        const crit = {};
        for (const m of text.matchAll(/^- ([a-z0-9_-]+): .*?\(dozwolone wartości: ([^)]+)\)/gim)) {
          const vals = m[2].split(',').map((x) => Number(x.trim()));
          crit[m[1]] = { value: vals[Math.min(1, vals.length - 1)], reason: `Uzasadnienie dla ${m[1]}.` };
        }
        return { json: { criteria: crit, tips: ['Dodaj drugi argument.', 'Popraw interpunkcję.', 'Rozwiń zakończenie.'] } };
      }
      case 'fiszki-zadanie':
      case 'fiszki-slabe':
      case 'fiszki-lektura':
        return { json: Array.from({ length: 12 }, (_, i) => ({ front: `słowo ${i + 1}`, back: `znaczenie ${i + 1}`, example: `Example ${i + 1}.` })) };
      case 'fiszki-zdjecie':
        return { json: Array.from({ length: 5 }, (_, i) => ({ front: `pojęcie ${i + 1}`, back: `definicja ${i + 1}`, example: null })) };
      case 'tydzien':
        return { text: 'Dobry tydzień. Popracuj nad ciągami.' };
      case 'ustny':
        return { json: { teza: 'Teza testowa.', argumenty: ['Argument 1.', 'Argument 2.'], kontekst: 'Kontekst.', zakonczenie: 'Zakończenie.' } };
      default:
        return { text: 'Odpowiedź testowa.' };
    }
  };
  const run = (input, options = {}, asJson) =>
    new Promise((resolve, reject) => {
      const { text, typ } = typeOf(input);
      const images = options.images ? (Array.isArray(options.images) ? options.images : [options.images]) : [];
      calls.push({ typ, images: images.length, tier: options.modelTier ?? 'default', cache: options.cache });
      if (options.signal?.aborted) return reject({ code: 'cancelled', message: 'aborted' });
      const a = answerFor(typ, text);
      const out = a.json !== undefined ? JSON.stringify(a.json) : a.text;
      setTimeout(() => {
        if (options.signal?.aborted) return reject({ code: 'cancelled', message: 'aborted' });
        options.onText?.({ text: out, delta: out });
        resolve(asJson ? (a.json !== undefined ? a.json : JSON.parse(out)) : { text: out, truncated: false, modelTierApplied: 'default' });
      }, 150);
    });
  const sample = (input, options) => run(input, options, false);
  sample.json = (input, options) => run(input, options, true);
  sample.limits = async () => ({ maxPromptBytes: 262144, images: { maxCount: 5, maxInputBytes: 20_000_000, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] } });
  const prev = window.claude;
  window.claude = {
    use: async (name) => (name === 'sample' ? sample : prev && prev.use ? prev.use(name) : null),
  };
}
