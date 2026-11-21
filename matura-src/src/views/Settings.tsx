import { useEffect, useRef, useState } from 'react';
import { SUBJECTS, type LocalData, type Stan } from '../model';
import { useStore } from '../store/AppStore';
import { parseLocal } from '../store/local';
import { capitalize, dayName, fmtDayMonth, fmtHM, hm } from '../logic/dates';
import { Banner, Confirm, Segmented, Switch, TimeSelect } from '../ui/common';
import { useSyncInfo } from '../App';
import { Icon } from '../ui/icons';
import { askNotifications, notificationsSupported } from './reminder';

export const MINUTES = [0, 15, 30, 45, 60, 90] as const;
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function weekHours(dm: number[]): string {
  const h = dm.reduce((a, b) => a + b, 0) / 60;
  const r = Math.round(h * 2) / 2;
  const word = !Number.isInteger(r) ? 'godziny' : r === 1 ? 'godzina' : r % 10 >= 2 && r % 10 <= 4 && (r % 100 < 12 || r % 100 > 14) ? 'godziny' : 'godzin';
  return `Około ${String(r).replace('.', ',')} ${word} tygodniowo.`;
}

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="li static" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
      <div className="row-between">
        <span style={{ fontWeight: 600 }}>{label}</span>
      </div>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function SettingsView() {
  const { data, updateStan, toast, resetAll, importData, retrySync, sync, today } = useStore();
  const s = data.stan;
  const info = useSyncInfo();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (fn: (s: Stan) => Stan) => updateStan(fn);
  const recalcToast = () =>
    toast('Zmieniono czas nauki.', {
      label: 'Przelicz plan od dziś',
      run: () => updateStan((st) => ({ ...st, overrides: Object.fromEntries(Object.entries(st.overrides).filter(([k]) => k < today)) })),
    });

  // Kopia do pliku przez capability `downloads` artefaktu (bez niej przycisku nie ma).
  const [downloads, setDownloads] = useState<{ save(r: { filename: string; data: string }): Promise<unknown> } | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
        const dl = c?.use ? await c.use('downloads') : null;
        if (alive) setDownloads((dl as typeof downloads) ?? null);
      } catch {
        if (alive) setDownloads(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const exportData = async () => {
    if (!downloads) return;
    try {
      await downloads.save({ filename: `matura2027-kopia-${today}.json`, data: JSON.stringify(data) });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code !== 'declined') toast('Nie udało się zapisać kopii.');
    }
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    setImportErr(null);
    try {
      const txt = await f.text();
      const parsed: LocalData = parseLocal(txt, today);
      if (!parsed.events.length && !parsed.stan.onboarded) throw new Error('pusty');
      importData(parsed);
      toast('Wczytano kopię. Wyniki połączono z obecnymi.');
    } catch {
      setImportErr('Ten plik nie jest kopią danych aplikacji.');
    }
  };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h1 className="ptitle">Ustawienia</h1>
      <section className="stack">
        <h2>Nauka</h2>
        <div className="card flush">
          {SUBJECTS.map((x) => (
            <label className="checkrow" key={x.id}>
              <input type="checkbox" checked={s.enabled[x.id]} onChange={(e) => set((st) => ({ ...st, enabled: { ...st.enabled, [x.id]: e.target.checked } }))} />
              <span className="grow">{x.name}</span>
              <span className="small muted">{fmtDayMonth(x.examDate)}</span>
            </label>
          ))}
        </div>
        <div className="card flush list">
          <Row label="Czas nauki w dni tygodnia" hint={weekHours(s.dayMinutes)}>
            <div className="stack">
              {ORDER.map((wd) => (
                <div key={wd} className="stack-2">
                  <span className="small">{capitalize(dayName(wd))}</span>
                  <Segmented
                    full
                    label={`Minuty nauki: ${dayName(wd)}`}
                    options={MINUTES}
                    value={s.dayMinutes[wd] as (typeof MINUTES)[number]}
                    onChange={(v) => {
                      set((st) => ({ ...st, dayMinutes: st.dayMinutes.map((m, i) => (i === wd ? v : m)) }));
                      recalcToast();
                    }}
                  />
                </div>
              ))}
            </div>
          </Row>
          <Row label="Daty egzaminów" hint="Harmonogram CKE na 2027 rok, termin główny, godz. 9:00.">
            <div className="stack-2">
              {SUBJECTS.map((x) => (
                <div className="row-between" key={x.id}>
                  <span>{x.name}</span>
                  <span className="tnum muted">{fmtDayMonth(x.examDate)} 2027</span>
                </div>
              ))}
            </div>
          </Row>
          <div className="li static" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="switch-row">
              <span style={{ fontWeight: 600 }}>Korepetycje z angielskiego</span>
              <Switch checked={s.tutoring.enabled} onChange={(v) => set((st) => ({ ...st, tutoring: { ...st.tutoring, enabled: v } }))} label="Korepetycje z angielskiego" />
            </div>
            {s.tutoring.enabled ? (
              <div className="row">
                <select className="select" style={{ width: 'auto' }} aria-label="Dzień korepetycji" value={s.tutoring.weekday} onChange={(e) => set((st) => ({ ...st, tutoring: { ...st.tutoring, weekday: Number(e.target.value) } }))}>
                  {ORDER.map((wd) => (
                    <option key={wd} value={wd}>
                      {capitalize(dayName(wd))}
                    </option>
                  ))}
                </select>
                <TimeSelect id="tut-time" label="Godzina korepetycji" value={s.tutoring.start} onChange={(v) => set((st) => ({ ...st, tutoring: { ...st.tutoring, start: v } }))} />
                <span className="muted tnum">do {fmtHM(hm(s.tutoring.start) + s.tutoring.minutes)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stack">
        <h2>Przypomnienie</h2>
        <div className="card flush list">
          <div className="li static" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="switch-row">
              <span style={{ fontWeight: 600 }}>Przypominaj o nauce</span>
              <Switch
                checked={s.reminder.enabled}
                onChange={(v) => {
                  set((st) => ({ ...st, reminder: { ...st.reminder, enabled: v } }));
                  if (v) void askNotifications();
                }}
                label="Przypominaj o nauce"
              />
            </div>
            <span className="hint">
              {notificationsSupported()
                ? 'Po tej godzinie, jeśli dziś nic nie zrobisz, na starcie pojawi się przypomnienie. Gdy przeglądarka pozwala, dostaniesz też powiadomienie.'
                : 'Po tej godzinie, jeśli dziś nic nie zrobisz, na starcie pojawi się przypomnienie.'}
            </span>
          </div>
          <div className="li static">
            <span className="grow" style={{ fontWeight: 600 }}>
              Godzina
            </span>
            <TimeSelect id="rem-time" label="Godzina przypomnienia" value={s.reminder.time} disabled={!s.reminder.enabled} onChange={(v) => set((st) => ({ ...st, reminder: { ...st.reminder, time: v } }))} />
          </div>
        </div>
      </section>

      <section className="stack">
        <h2>Wygląd</h2>
        <div className="card flush list">
          <Row label="Motyw">
            <Segmented label="Motyw" options={['jasny', 'ciemny', 'system'] as const} value={s.theme} onChange={(v) => set((st) => ({ ...st, theme: v }))} render={(v) => (v === 'system' ? 'systemowy' : v)} />
          </Row>
          <Row label="Rozmiar tekstu">
            <Segmented label="Rozmiar tekstu" options={['normalny', 'duży'] as const} value={s.textSize} onChange={(v) => set((st) => ({ ...st, textSize: v }))} />
          </Row>
        </div>
      </section>

      <section className="stack">
        <h2>Dane</h2>
        <div className="card flush list">
          <div className="li static">
            <span style={{ color: info.color }}>
              <Icon name={info.icon} />
            </span>
            <span className="grow">
              <span style={{ fontWeight: 600 }}>Synchronizacja</span>
              <br />
              <span className="small muted">
                {sync.state === 'lokalnie' ? 'Wyniki są zapisywane na tym urządzeniu.' : `${info.text}. Telefon i komputer mają te same dane.`}
              </span>
            </span>
            {sync.state === 'blad' || sync.state === 'offline' ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={retrySync}>
                Spróbuj ponownie
              </button>
            ) : null}
          </div>
          {downloads ? (
            <button type="button" className="li" onClick={() => void exportData()}>
              <span className="grow" style={{ fontWeight: 600 }}>
                Eksportuj kopię
              </span>
              <Icon name="dalej" />
            </button>
          ) : null}
          <button type="button" className="li" onClick={() => file.current?.click()}>
            <span className="grow" style={{ fontWeight: 600 }}>
              Importuj kopię
            </span>
            <Icon name="dalej" />
          </button>
          <input ref={file} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} onChange={(e) => void importFile(e.target.files?.[0])} />
        </div>
        {importErr ? <Banner tone="bad">{importErr}</Banner> : null}
        {sync.message && (sync.state === 'blad' || sync.state === 'offline') ? <Banner tone="bad" icon="chmuraBlad">{sync.message}</Banner> : null}
      </section>

      <div>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
          Usuń wszystkie dane
        </button>
      </div>
      {confirmReset ? (
        <Confirm
          title="Usunąć wszystkie dane?"
          text="Wyniki znikną ze wszystkich urządzeń."
          ok="Usuń dane"
          danger
          onCancel={() => setConfirmReset(false)}
          onOk={() => {
            setConfirmReset(false);
            void resetAll().then(() => toast('Usunięto wszystkie dane.'));
          }}
        />
      ) : null}
    </div>
  );
}
