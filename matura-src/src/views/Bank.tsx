import { useMemo, useState, type ClipboardEvent } from 'react';
import { useApp } from '../store/context';
import { ConfirmButton, Field, Header, MathText, TaskImage } from '../components/common';
import { topicName, topicsFor } from '../data/taxonomy';
import { BOOK_TITLE, topicsForPage } from '../data/book';
import { blankTask, extractZadaniaInfoLinks, newId, parseZadaniaInfoUrl, ZADANIA_INFO_ATTRIBUTION } from '../store/bank';
import { putImage, deleteImage } from '../store/images';
import { removeTask, upsertTask } from '../store/actions';
import { AnswerToggle } from './Today';
import type { BankTask, TaskSource, TaskStatus, TaskType } from '../types';

const STATUSES: TaskStatus[] = ['nowe', 'w trakcie', 'zrobione', 'do powtórki'];
const SOURCES: TaskSource[] = ['zadania.info', 'CKE', 'książka', 'własne'];

export default function Bank({ params }: { params: Record<string, string> }) {
  const { state, update } = useApp();
  const subjects = state.settings.subjects.filter((s) => s.enabled);
  const [subjectId, setSubjectId] = useState(params.przedmiot && subjects.some((s) => s.id === params.przedmiot) ? params.przedmiot : subjects[0]?.id ?? '');
  const subject = subjects.find((s) => s.id === subjectId);
  const topics = subject ? topicsFor(subject.family, subject.level) : [];
  const [topicId, setTopicId] = useState(params.temat && topics.some((t) => t.id === params.temat) ? params.temat : topics[0]?.id ?? '');
  const [source, setSource] = useState<TaskSource | ''>('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [mode, setMode] = useState<'lista' | 'dodaj' | 'import'>('lista');

  const list = useMemo(
    () =>
      state.bank.filter(
        (t) =>
          t.subjectId === subjectId &&
          t.topicId === topicId &&
          (!source || t.source === source) &&
          (!status || t.status === status) &&
          (!difficulty || String(t.difficulty ?? '') === difficulty),
      ),
    [state.bank, subjectId, topicId, source, status, difficulty],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of state.bank) if (t.subjectId === subjectId) c[t.topicId] = (c[t.topicId] ?? 0) + 1;
    return c;
  }, [state.bank, subjectId]);

  return (
    <section>
      <Header title="Zadania z tematu">Wybierz przedmiot i temat. Zadania pochodzą z CKE, zadania.info, książki albo od Ciebie.</Header>
      <div className="rzad">
        <Field label="Przedmiot">
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              const s = subjects.find((x) => x.id === e.target.value);
              setTopicId(s ? topicsFor(s.family, s.level)[0]?.id ?? '' : '');
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Temat">
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({counts[t.id] ?? 0})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Źródło">
          <select value={source} onChange={(e) => setSource(e.target.value as TaskSource | '')}>
            <option value="">wszystkie</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | '')}>
            <option value="">wszystkie</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Trudność">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">wszystkie</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </Field>
      </div>
      <div className="rzad" style={{ margin: '0.25rem 0 1rem' }}>
        <button type="button" aria-pressed={mode === 'lista'} onClick={() => setMode('lista')}>Lista</button>
        <button type="button" aria-pressed={mode === 'dodaj'} onClick={() => setMode('dodaj')}>Dodaj zadanie</button>
        <button type="button" aria-pressed={mode === 'import'} onClick={() => setMode('import')}>Import linków zadania.info</button>
      </div>

      {mode === 'dodaj' && subject && <AddTask subjectId={subjectId} topicId={topicId} family={subject.family} onDone={() => setMode('lista')} />}
      {mode === 'import' && subject && <ImportLinks subjectId={subjectId} topicId={topicId} onDone={() => setMode('lista')} />}

      {mode === 'lista' && (
        <>
          {list.length === 0 ? (
            <div className="pusty">
              <p>
                Brak zadań z tematu „{topicName(topicId)}” w banku{source || status || difficulty ? ' przy wybranych filtrach' : ''}.
                Aplikacja nie tworzy treści zadań. Dodaj zadanie z zadania.info (link i zrzut ekranu), z książki (numer strony) albo własne.
              </p>
              <button type="button" className="glowny" onClick={() => setMode('dodaj')}>Dodaj zadanie</button>
            </div>
          ) : (
            <ul className="lista" aria-label="Zadania">
              {list.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} onChange={(nt) => update((s) => upsertTask(s, nt))} onDelete={() => {
                    update((s) => removeTask(s, t.id));
                    if (t.imageKey && !t.imageKey.startsWith('cke/')) deleteImage(t.imageKey).catch(() => undefined);
                  }} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function TaskRow({ task, onChange, onDelete }: { task: BankTask; onChange: (t: BankTask) => void; onDelete: () => void }) {
  const { state } = useApp();
  const [show, setShow] = useState(false);
  const sub = state.settings.subjects.find((s) => s.id === task.subjectId);
  const topics = sub ? topicsFor(sub.family, sub.level) : [];
  return (
    <div>
      <div className="rzad" style={{ justifyContent: 'space-between' }}>
        <div>
          <strong>
            {task.source === 'CKE' ? `CKE ${task.ref}` : task.source === 'książka' ? `Książka s. ${task.page ?? '?'}${task.ref ? `, zad. ${task.ref}` : ''}` : task.source === 'zadania.info' ? `zadania.info ${task.ref}` : task.ref || 'Zadanie własne'}
          </strong>{' '}
          <small>
            {task.type ?? 'typ nieznany'} · {task.maxPoints != null ? `${task.maxPoints} pkt · ` : ''}
            {task.minutes} min{task.difficulty ? ` · trudność ${task.difficulty}` : ''}
            {task.lastSolved ? ` · ostatnio ${task.lastSolved}, ${task.result}%` : ''}
            {task.nextReview ? ` · powtórka ${task.nextReview}` : ''}
          </small>
        </div>
        <div className="rzad">
          {task.status === 'do powtórki' || task.status === 'nowe' ? (
            <span className="zakreslacz">{task.status === 'nowe' ? 'do zrobienia' : 'do powtórki'}</span>
          ) : (
            <span>{task.status}</span>
          )}
          <button type="button" className="maly" onClick={() => setShow(!show)} aria-expanded={show}>
            {show ? 'Zwiń' : 'Szczegóły'}
          </button>
        </div>
      </div>
      {show && (
        <div className="ramka" style={{ marginTop: '0.5rem' }}>
          {task.url && (
            <p>
              <a href={task.url} target="_blank" rel="noreferrer noopener">{task.url}</a>
              {task.page ? ` · strona ${task.page}` : ''}
            </p>
          )}
          <TaskImage imageKey={task.imageKey} alt={`Treść zadania ${task.ref}`} />
          {task.text && <p><MathText text={task.text} /></p>}
          {task.attribution && <small>{task.attribution}</small>}
          <AnswerToggle imageKey={task.answerImageKey} text={task.answerText} />
          <div className="rzad">
            <Field label="Status">
              <select value={task.status} onChange={(e) => onChange({ ...task, status: e.target.value as TaskStatus })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Temat">
              <select value={task.topicId} onChange={(e) => onChange({ ...task, topicId: e.target.value })}>
                {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Czas wzorcowy (min)">
              <input type="number" min={1} value={task.minutes} onChange={(e) => onChange({ ...task, minutes: Math.max(1, Number(e.target.value) || 1) })} />
            </Field>
            <Field label="Maks. punktów">
              <input type="number" min={0} value={task.maxPoints ?? ''} onChange={(e) => onChange({ ...task, maxPoints: e.target.value === '' ? null : Number(e.target.value) })} />
            </Field>
            <Field label="Trudność">
              <select value={task.difficulty ?? ''} onChange={(e) => onChange({ ...task, difficulty: e.target.value ? (Number(e.target.value) as 1 | 2 | 3) : null })}>
                <option value="">brak</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </Field>
          </div>
          <Field label="Notatka">
            <textarea value={task.note} onChange={(e) => onChange({ ...task, note: e.target.value })} />
          </Field>
          {task.history.length > 0 && (
            <p className="olowek">Historia: {task.history.map((h) => `${h.date} ${h.result}%`).join(', ')}</p>
          )}
          {task.source !== 'CKE' && (
            <ConfirmButton label="Usuń zadanie" question="Usunąć zadanie? Historia wyników zniknie." yes="Usuń" onConfirm={onDelete} />
          )}
        </div>
      )}
    </div>
  );
}

function AddTask({ subjectId, topicId, family, onDone }: { subjectId: string; topicId: string; family: string; onDone: () => void }) {
  const { state, update } = useApp();
  const [source, setSource] = useState<TaskSource>(family === 'matematyka' ? 'zadania.info' : 'własne');
  const [url, setUrl] = useState('');
  const [page, setPage] = useState('');
  const [ref, setRef] = useState('');
  const [topic, setTopic] = useState(topicId);
  const [type, setType] = useState<TaskType | ''>('');
  const [difficulty, setDifficulty] = useState('');
  const [minutes, setMinutes] = useState(state.settings.defaultTaskMinutes);
  const [maxPoints, setMaxPoints] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Blob | null>(null);
  const [answerPreview, setAnswerPreview] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [pasteTarget, setPasteTarget] = useState<'zadanie' | 'odpowiedź'>('zadanie');
  const [err, setErr] = useState<string | null>(null);
  const sub = state.settings.subjects.find((s) => s.id === subjectId)!;
  const topics = topicsFor(sub.family, sub.level);
  const bookHint = source === 'książka' && page ? topicsForPage(Number(page)) : null;

  const takeImage = (b: Blob) => {
    setImage(b);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(b));
  };
  const takeAnswer = (b: Blob) => {
    setAnswer(b);
    if (answerPreview) URL.revokeObjectURL(answerPreview);
    setAnswerPreview(URL.createObjectURL(b));
  };
  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'))?.getAsFile();
    if (file) {
      e.preventDefault();
      if (pasteTarget === 'odpowiedź') takeAnswer(file);
      else takeImage(file);
    }
  };

  const save = async () => {
    const t = blankTask(subjectId, source, topic, Math.max(1, minutes));
    if (source === 'zadania.info') {
      const p = parseZadaniaInfoUrl(url);
      if (!p) {
        setErr('Adres musi prowadzić do zadania.info, np. skopiowany z paska przeglądarki. Wklej pełny adres.');
        return;
      }
      t.url = p.url;
      t.ref = ref || p.ref;
      if (text.trim()) t.attribution = ZADANIA_INFO_ATTRIBUTION;
    } else if (source === 'książka') {
      const n = Number(page);
      if (!Number.isInteger(n) || n < 1) {
        setErr('Podaj numer strony w książce (liczba całkowita).');
        return;
      }
      t.page = n;
      t.ref = ref;
      t.url = null;
      t.note = `${BOOK_TITLE}${bookHint?.section ? `, ${bookHint.section.title}` : ''}`;
    } else {
      t.url = url.trim() || null;
      t.ref = ref;
    }
    t.type = type || null;
    t.difficulty = difficulty ? (Number(difficulty) as 1 | 2 | 3) : null;
    t.maxPoints = maxPoints ? Number(maxPoints) : null;
    t.text = text.trim() || null;
    if (note) t.note = t.note ? `${t.note}\n${note}` : note;
    t.answerText = answerText.trim() || null;
    if (answer) {
      const key = `img/${newId('o')}`;
      try {
        await putImage(key, answer);
        t.answerImageKey = key;
      } catch {
        setErr('Nie udało się zapisać obrazu odpowiedzi w przeglądarce.');
      }
    }
    if (image) {
      const key = `img/${newId('i')}`;
      try {
        await putImage(key, image);
        t.imageKey = key;
      } catch {
        setErr('Nie udało się zapisać obrazu w przeglądarce (brak miejsca?). Zadanie zapisano bez obrazu.');
      }
    }
    update((s) => ({ ...s, bank: [...s.bank, t] }));
    onDone();
  };

  return (
    <form className="ramka" onSubmit={(e) => { e.preventDefault(); void save(); }} onPaste={onPaste}>
      <h2 style={{ marginTop: 0 }}>Nowe zadanie</h2>
      {err && <p className="ramka-bledu" role="alert">Błąd: {err}</p>}
      <div className="rzad">
        <Field label="Źródło">
          <select value={source} onChange={(e) => setSource(e.target.value as TaskSource)}>
            {SOURCES.filter((s) => s !== 'CKE').map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Temat">
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
      {source === 'zadania.info' && (
        <Field label="Adres zadania na zadania.info">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://zadania.info/…" style={{ width: '100%' }} />
        </Field>
      )}
      {source === 'książka' && (
        <div className="rzad">
          <Field label="Strona w książce">
            <input type="number" min={1} value={page} onChange={(e) => setPage(e.target.value)} />
          </Field>
          {bookHint?.section && (
            <p style={{ margin: 0 }}>
              Dział {bookHint.section.chapter}: {bookHint.section.title}.{' '}
              {bookHint.topics.length > 0 && (
                <button type="button" className="maly" onClick={() => setTopic(bookHint.topics[0])}>
                  Ustaw temat: {topicName(bookHint.topics[0])}
                </button>
              )}
            </p>
          )}
        </div>
      )}
      {source === 'własne' && (
        <Field label="Adres (opcjonalnie)">
          <input value={url} onChange={(e) => setUrl(e.target.value)} style={{ width: '100%' }} />
        </Field>
      )}
      <div className="rzad">
        <Field label="Numer lub opis zadania">
          <input value={ref} onChange={(e) => setRef(e.target.value)} />
        </Field>
        <Field label="Typ">
          <select value={type} onChange={(e) => setType(e.target.value as TaskType | '')}>
            <option value="">nieznany</option>
            <option value="zamknięte">zamknięte</option>
            <option value="otwarte">otwarte</option>
          </select>
        </Field>
        <Field label="Trudność 1–3">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">brak</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </Field>
        <Field label="Czas wzorcowy (min)">
          <input type="number" min={1} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} />
        </Field>
        <Field label="Maks. punktów">
          <input type="number" min={0} value={maxPoints} onChange={(e) => setMaxPoints(e.target.value)} />
        </Field>
      </div>
      <div className="rzad">
        <span>Ctrl+V wkleja zrzut jako:</span>
        <label><input type="radio" name="wklej" checked={pasteTarget === 'zadanie'} onChange={() => setPasteTarget('zadanie')} /> treść zadania</label>
        <label><input type="radio" name="wklej" checked={pasteTarget === 'odpowiedź'} onChange={() => setPasteTarget('odpowiedź')} /> odpowiedź</label>
      </div>
      <Field label="Zrzut zadania (albo wybierz plik)">
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) takeImage(f); }} />
      </Field>
      {preview && <img src={preview} alt="Podgląd zadania" className="obraz-zadania" />}
      <Field label="Zrzut odpowiedzi (albo wybierz plik)">
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) takeAnswer(f); }} />
      </Field>
      {answerPreview && <img src={answerPreview} alt="Podgląd odpowiedzi" className="obraz-zadania" />}
      <Field label="Odpowiedź tekstem (opcjonalnie)">
        <input value={answerText} onChange={(e) => setAnswerText(e.target.value)} style={{ width: '100%' }} />
      </Field>
      <Field label="Treść zadania (opcjonalnie; wzory w $…$)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      {source === 'zadania.info' && text.trim() && <small>Do treści zostanie dopisane: {ZADANIA_INFO_ATTRIBUTION}</small>}
      <Field label="Notatka">
        <input value={note} onChange={(e) => setNote(e.target.value)} style={{ width: '100%' }} />
      </Field>
      <div className="rzad">
        <button type="submit" className="glowny">Zapisz zadanie</button>
        <button type="button" onClick={onDone}>Anuluj</button>
      </div>
    </form>
  );
}

function ImportLinks({ subjectId, topicId, onDone }: { subjectId: string; topicId: string; onDone: () => void }) {
  const { state, update } = useApp();
  const [raw, setRaw] = useState('');
  const [topic, setTopic] = useState(topicId);
  const sub = state.settings.subjects.find((s) => s.id === subjectId)!;
  const topics = topicsFor(sub.family, sub.level);
  const found = useMemo(() => extractZadaniaInfoLinks(raw), [raw]);
  const existing = new Set(state.bank.map((t) => t.url));
  const fresh = found.filter((f) => !existing.has(f.url));
  const save = () => {
    update((s) => ({
      ...s,
      bank: [
        ...s.bank,
        ...fresh.map((f) => {
          const t = blankTask(subjectId, 'zadania.info', topic, s.settings.defaultTaskMinutes);
          t.url = f.url;
          t.ref = f.ref;
          if (f.title) t.note = f.title;
          return t;
        }),
      ],
    }));
    onDone();
  };
  return (
    <div className="ramka">
      <h2 style={{ marginTop: 0 }}>Import linków zadania.info</h2>
      <p>
        Wklej adresy zadań (jeden pod drugim) albo wybierz zapisaną stronę działu (plik HTML zapisany w przeglądarce).
        Aplikacja odczyta tylko adresy, które są w tekście. Nic nie pobiera z serwisu.
      </p>
      <Field label="Temat dla wszystkich zadań">
        <select value={topic} onChange={(e) => setTopic(e.target.value)}>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Plik HTML strony działu">
        <input type="file" accept=".html,.htm,text/html" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setRaw(await f.text()); }} />
      </Field>
      <Field label="Albo wklej adresy">
        <textarea value={raw.length > 5000 ? '(wczytano plik)' : raw} onChange={(e) => setRaw(e.target.value)} />
      </Field>
      <p className="liczby">Znalezione adresy: {found.length}, nowe: {fresh.length}.</p>
      {fresh.length > 0 && (
        <ul>
          {fresh.slice(0, 8).map((f) => <li key={f.url}>{f.ref} {f.title ? `· ${f.title}` : ''}</li>)}
          {fresh.length > 8 && <li>… i {fresh.length - 8} kolejnych</li>}
        </ul>
      )}
      <div className="rzad">
        <button type="button" className="glowny" disabled={!fresh.length} onClick={save}>Dodaj {fresh.length} zadań</button>
        <button type="button" onClick={onDone}>Anuluj</button>
      </div>
    </div>
  );
}
