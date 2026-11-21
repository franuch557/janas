// Ikony 24 px, obrys 2 px, kolor z currentColor.

const P: Record<string, string> = {
  start: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h5v-6h3v6h5V9.5',
  plan: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3M8 17h3M13 14h3',
  zadania: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  arkusze: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
  postep: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  ustawienia: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2 1.2L14.8 21h-4l-.3-2.4a7.6 7.6 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.7 7.7 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 2-1.2L10.8 3h4l.3 2.4a7.6 7.6 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.7 7.7 0 0 1 0 3z',
  chmura: 'M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.5 4.5 0 0 0 7 18z',
  chmuraBlad: 'M7 18h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.1 4.5 4.5 0 0 0 7 18zM12 10v3M12 15.5h.01',
  urzadzenie: 'M7 3h10v18H7zM11 18h2',
  zamknij: 'M6 6l12 12M18 6 6 18',
  wiecej: 'M5 12h.01M12 12h.01M19 12h.01',
  wstecz: 'M15 5l-7 7 7 7',
  dalej: 'M9 5l7 7-7 7',
  graj: 'M8 5v14l11-7z',
  pauza: 'M8 5v14M16 5v14',
  zegar: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  ok: 'M5 12.5l4.5 4.5L19 7',
  zle: 'M6 6l12 12M18 6 6 18',
  flaga: 'M5 21V4M5 4h11l-2 4 2 4H5',
  zamien: 'M7 7h13l-3-3M17 17H4l3 3',
  kosz: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  gora: 'M12 19V5M6 11l6-6 6 6',
  dol: 'M12 5v14M6 13l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  szukaj: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5',
  powieksz: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5M8 11h6M11 8v6',
  pomniejsz: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM16 16l5 5M8 11h6',
  cofnij5: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  uwaga: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  ogien: 'M12 21c4 0 7-2.7 7-6.6 0-3.4-2.3-5.4-4-7.4-.5 2-1.6 3-3 3.5C12 7 11 4.5 9 3c.3 3-1.7 5-3 7-1 1.5-1 2.7-1 4.4C5 18.3 8 21 12 21z',
  uchwyt: 'M8 7h8M8 12h8M8 17h8',
  dzwonek: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4',
};

export function Icon({ name, size = 24, title }: { name: keyof typeof P | string; size?: number; title?: string }) {
  const d = P[name] ?? P.info;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={name === 'graj' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} focusable="false">
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}
