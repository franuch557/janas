// Odczyt fiszek ze zdjęcia bez Claude'a: OCR w przeglądarce (tesseract.js, polski i angielski).
// Dwie kolumny (słówko | tłumaczenie) rozpoznaję po dużej przerwie między wyrazami w linii:
// zamieniam ją na tabulator, a pary wyciąga parseCardText.

export interface OcrWord {
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Linie OCR na tekst „przód\ttył”: największa przerwa w linii dzieli kolumny, gdy jest wyraźnie większa niż odstęp między wyrazami. */
export function linesToText(lines: OcrWord[][]): string {
  const out: string[] = [];
  for (const ws of lines) {
    const words = ws.filter((w) => w.text.trim());
    if (!words.length) continue;
    const text = words.map((w) => w.text.trim()).join(' ');
    // linia z własnym separatorem („word – słowo”, „a = b”) zostaje bez zmian
    if (/\s[–—-]\s|[:=]\s|\t/.test(text) || words.length < 2) {
      out.push(text);
      continue;
    }
    const h = Math.max(1, ...words.map((w) => w.y1 - w.y0));
    let best = -1;
    let gap = 0;
    for (let i = 1; i < words.length; i++) {
      const g = words[i].x0 - words[i - 1].x1;
      if (g > gap) {
        gap = g;
        best = i;
      }
    }
    if (best > 0 && gap > 1.6 * h) {
      out.push(`${words.slice(0, best).map((w) => w.text.trim()).join(' ')}\t${words.slice(best).map((w) => w.text.trim()).join(' ')}`);
    } else out.push(text);
  }
  return out.join('\n');
}

type Bbox = { x0: number; x1: number; y0: number; y1: number };
type TLine = { words: { text: string; bbox: Bbox }[] };
type TPage = { blocks: { paragraphs: { lines: TLine[] }[] }[] | null; text: string };

/** OCR zdjęć (data URL). Zwraca tekst z tabulatorami między kolumnami. */
export async function ocrImages(urls: string[], onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  let done = 0;
  const worker = await createWorker(['pol', 'eng'], 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.((done + m.progress) / urls.length);
    },
  });
  try {
    const parts: string[] = [];
    for (const u of urls) {
      const { data } = (await worker.recognize(u, {}, { blocks: true, text: true })) as unknown as { data: TPage };
      const lines: OcrWord[][] = [];
      for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) lines.push(l.words.map((w) => ({ text: w.text, ...w.bbox })));
      parts.push(lines.length ? linesToText(lines) : data.text);
      done++;
      onProgress?.(done / urls.length);
    }
    return parts.join('\n');
  } finally {
    await worker.terminate();
  }
}
