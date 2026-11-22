import { useState } from 'react';
import { SUBJECTS, type SubjectId, type UserTask } from '../model';
import { newId, useStore } from '../store/AppStore';
import { topicsFor } from '../data/taxonomy';
import { parseZadaniaInfoUrl, TEXT_LIMIT, validateDraft, ZADANIA_INFO_ATTRIBUTION } from '../logic/userTasks';
import { Segmented, Sheet } from '../ui/common';
import { Icon } from '../ui/icons';

/** Zmniejsza obraz do JPEG ≤ 150 KB (dłuższy bok najwyżej 1400 px). */
export async function compressImage(file: Blob, maxBytes = 150_000, maxSide = 1400): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    let scale = Math.min(1, maxSide / Math.max(w, h));
    for (let attempt = 0; attempt < 8; attempt++) {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * scale));
      c.height = Math.max(1, Math.round(h * scale));
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.8, 0.65, 0.5]) {
        const data = c.toDataURL('image/jpeg', q);
        if (data.length * 0.75 <= maxBytes) return data;
      }
      scale *= 0.75;
    }
    throw new Error('obraz za duży');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AddTaskSheet({ subject, topic, onClose }: { subject: SubjectId | null; topic: string | null; onClose: () => void }) {
  const { updateStan, saveImage, toast, today } = useStore();
  const [sub, setSub] = useState<SubjectId>(subject ?? 'mat-r');
  const s = SUBJECTS.find((x) => x.id === sub)!;
  const topics = topicsFor(s.family, s.level);
  const [topicId, setTopicId] = useState<string | null>(topic ?? topics[0]?.id ?? null);
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [imgErr, setImgErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const parsed = url.trim() ? parseZadaniaInfoUrl(url) : null;
  const fromZi = !!parsed;

  const takeFile = async (f: Blob | null | undefined) => {
    if (!f || !f.type.startsWith('image/')) return;
    setImgErr(null);
    try {
      setImage(await compressImage(f));
    } catch {
      setImgErr('Nie udało się zmniejszyć obrazu. Wybierz mniejszy zrzut ekranu.');
    }
  };

  const save = async () => {
    const errs = validateDraft({ url, text, image, topicId, maxPoints: points });
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    const id = newId('u');
    const imageId = image ? id : null;
    if (image) await saveImage(id, image);
    const task: UserTask = {
      id,
      subjectId: sub,
      topicId: topicId!,
      url: parsed?.url ?? (url.trim() || null),
      ref: parsed?.ref ?? '',
      text: text.trim() ? (fromZi ? `${text.trim()}\n\n${ZADANIA_INFO_ATTRIBUTION}` : text.trim()) : null,
      imageId,
      maxPoints: points!,
      type: 'otwarte',
      source: fromZi ? 'zadania.info' : 'własne',
      createdAt: today,
    };
    updateStan((st) => ({ ...st, userTasks: [...st.userTasks, task] }));
    setBusy(false);
    toast('Dodano zadanie.');
    onClose();
  };

  return (
    <Sheet title="Dodaj zadanie" onClose={onClose}>
      <div className="field">
        <label htmlFor="at-sub">Przedmiot</label>
        <select
          id="at-sub"
          className="select"
          value={sub}
          onChange={(e) => {
            const v = e.target.value as SubjectId;
            setSub(v);
            const sd = SUBJECTS.find((x) => x.id === v)!;
            setTopicId(topicsFor(sd.family, sd.level)[0]?.id ?? null);
          }}
        >
          {SUBJECTS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="at-topic">Temat</label>
        <select id="at-topic" className="select" value={topicId ?? ''} onChange={(e) => setTopicId(e.target.value)}>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="at-url">Link do zadania</label>
        <input id="at-url" className="input" inputMode="url" placeholder="https://www.zadania.info/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        {parsed?.ref ? <span className="hint">Zadanie zadania.info, {parsed.ref}.</span> : null}
      </div>
      <div className="field">
        <span className="label">Zrzut ekranu</span>
        <div
          className="kartka-ph"
          style={{ minHeight: 120, cursor: 'text' }}
          tabIndex={0}
          role="button"
          aria-label="Wklej zrzut ekranu skrótem Ctrl+V"
          onPaste={(e) => {
            const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
            if (item) {
              e.preventDefault();
              void takeFile(item.getAsFile());
            }
          }}
        >
          {image ? <img src={image} alt="Wklejony zrzut ekranu" style={{ maxWidth: '100%', maxHeight: 240 }} /> : <span>Kliknij tutaj i wklej zrzut ekranu (Ctrl+V)</span>}
        </div>
        <div className="row">
          <label className="btn btn-secondary btn-sm">
            <Icon name="plus" size={20} /> Wybierz plik
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => void takeFile(e.target.files?.[0])} />
          </label>
          {image ? (
            <button type="button" className="btn btn-quiet" onClick={() => setImage(null)}>
              Usuń zrzut
            </button>
          ) : null}
        </div>
        {imgErr ? <span className="error">{imgErr}</span> : null}
      </div>
      <div className="field">
        <label htmlFor="at-text">Treść zadania (opcjonalnie)</label>
        <textarea id="at-text" className="textarea" value={text} maxLength={TEXT_LIMIT} onChange={(e) => setText(e.target.value.slice(0, TEXT_LIMIT))} />
        <span className="hint tnum">
          {text.length} z {TEXT_LIMIT} znaków
        </span>
        {fromZi && text.trim() ? <span className="hint">{ZADANIA_INFO_ATTRIBUTION}</span> : null}
      </div>
      <div className="field">
        <span className="label">Punkty za zadanie</span>
        <Segmented label="Punkty za zadanie" options={[1, 2, 3, 4, 5, 6]} value={points} onChange={setPoints} />
      </div>
      {errors.length ? (
        <div className="stack-2" role="alert">
          {errors.map((e) => (
            <span className="error" key={e}>
              <Icon name="uwaga" size={18} /> {e}
            </span>
          ))}
        </div>
      ) : null}
      <div className="sheet-actions">
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={busy}>
          {busy ? <span className="spinner" /> : 'Zapisz zadanie'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </Sheet>
  );
}
