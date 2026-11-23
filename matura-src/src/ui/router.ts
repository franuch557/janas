// Adresy jako location.hash w postaci #nazwa (litery ASCII, cyfry, myślniki).

import { useEffect, useState } from 'react';
import { SUBJECT_IDS, type SubjectId } from '../model';

export type Route =
  | { name: 'start' }
  | { name: 'plan' }
  | { name: 'zadania'; subject: SubjectId | null; topic: string | null }
  | { name: 'zadanie'; id: string }
  | { name: 'arkusze' }
  | { name: 'arkusz'; examId: string; partId: string | null }
  | { name: 'diagnoza'; subject: SubjectId }
  | { name: 'wypracowanie'; id: string }
  | { name: 'postep'; subject: SubjectId | null }
  | { name: 'ustawienia' }
  | { name: 'powitanie' }
  | { name: 'fiszki' }
  | { name: 'piec-minut' }
  | { name: 'lektury' }
  | { name: 'lektura'; id: string }
  | { name: 'ustny' }
  | { name: 'ustny-pytanie'; nr: string }
  | { name: 'cwiczenie'; subject: SubjectId; topic: string }
  | { name: 'sprawdzian' }
  | { name: 'bledy' }
  | { name: 'dziesiec-minut' }
  | { name: 'tramwaj' }
  | { name: 'powtorki'; subject: SubjectId | null; topic: string | null }
  | { name: 'mapa-pamieci' };

export const FOCUS_ROUTES = new Set(['zadanie', 'arkusz', 'diagnoza', 'wypracowanie', 'powitanie', 'piec-minut', 'cwiczenie', 'sprawdzian', 'dziesiec-minut', 'tramwaj', 'powtorki']);

function subjectPrefix(rest: string): { subject: SubjectId | null; tail: string } {
  for (const id of SUBJECT_IDS) {
    if (rest === id) return { subject: id, tail: '' };
    if (rest.startsWith(id + '-')) return { subject: id, tail: rest.slice(id.length + 1) };
  }
  return { subject: null, tail: rest };
}

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  if (!h || h === 'start') return { name: 'start' };
  if (h === 'plan') return { name: 'plan' };
  if (h === 'arkusze') return { name: 'arkusze' };
  if (h === 'ustawienia') return { name: 'ustawienia' };
  if (h === 'powitanie') return { name: 'powitanie' };
  if (h === 'fiszki') return { name: 'fiszki' };
  if (h === 'piec-minut') return { name: 'piec-minut' };
  if (h === 'lektury') return { name: 'lektury' };
  if (h === 'sprawdzian') return { name: 'sprawdzian' };
  if (h === 'bledy') return { name: 'bledy' };
  if (h === 'dziesiec-minut') return { name: 'dziesiec-minut' };
  if (h === 'tramwaj') return { name: 'tramwaj' };
  if (h === 'mapa-pamieci') return { name: 'mapa-pamieci' };
  if (h === 'powtorki') return { name: 'powtorki', subject: null, topic: null };
  if (h.startsWith('powtorki-')) {
    const { subject, tail } = subjectPrefix(h.slice(9));
    return { name: 'powtorki', subject, topic: subject && tail ? tail : null };
  }
  if (h.startsWith('cwiczenie-')) {
    const { subject, tail } = subjectPrefix(h.slice(10));
    if (subject && tail) return { name: 'cwiczenie', subject, topic: tail };
  }
  if (h.startsWith('lektura-')) return { name: 'lektura', id: h.slice(8) };
  if (h === 'ustny') return { name: 'ustny' };
  if (h.startsWith('ustny-')) return { name: 'ustny-pytanie', nr: h.slice(6) };
  if (h === 'zadania') return { name: 'zadania', subject: null, topic: null };
  if (h.startsWith('zadania-')) {
    const { subject, tail } = subjectPrefix(h.slice(8));
    return { name: 'zadania', subject, topic: subject && tail ? tail : null };
  }
  if (h.startsWith('zadanie-')) return { name: 'zadanie', id: h.slice(8) };
  if (h.startsWith('wypracowanie-')) return { name: 'wypracowanie', id: h.slice(13) };
  if (h.startsWith('diagnoza-')) {
    const { subject } = subjectPrefix(h.slice(9));
    if (subject) return { name: 'diagnoza', subject };
  }
  if (h.startsWith('arkusz-')) {
    const rest = h.slice(7);
    const i = rest.indexOf('-czesc-');
    return i >= 0 ? { name: 'arkusz', examId: rest.slice(0, i), partId: rest.slice(i + 7) } : { name: 'arkusz', examId: rest, partId: null };
  }
  if (h === 'postep') return { name: 'postep', subject: null };
  if (h.startsWith('postep-')) return { name: 'postep', subject: subjectPrefix(h.slice(7)).subject };
  return { name: 'start' };
}

export function hrefOf(r: Route): string {
  switch (r.name) {
    case 'zadania':
      return `#zadania${r.subject ? `-${r.subject}${r.topic ? `-${r.topic}` : ''}` : ''}`;
    case 'zadanie':
      return `#zadanie-${r.id}`;
    case 'wypracowanie':
      return `#wypracowanie-${r.id}`;
    case 'diagnoza':
      return `#diagnoza-${r.subject}`;
    case 'arkusz':
      return `#arkusz-${r.examId}${r.partId ? `-czesc-${r.partId}` : ''}`;
    case 'postep':
      return `#postep${r.subject ? `-${r.subject}` : ''}`;
    case 'lektura':
      return `#lektura-${r.id}`;
    case 'ustny-pytanie':
      return `#ustny-${r.nr}`;
    case 'cwiczenie':
      return `#cwiczenie-${r.subject}-${r.topic}`;
    case 'powtorki':
      return `#powtorki${r.subject ? `-${r.subject}${r.topic ? `-${r.topic}` : ''}` : ''}`;
    default:
      return `#${r.name}`;
  }
}

let lastMain = '#start';

export function go(r: Route | string, replace = false) {
  const h = typeof r === 'string' ? r : hrefOf(r);
  const cur = parseHash(window.location.hash);
  if (!FOCUS_ROUTES.has(cur.name)) lastMain = window.location.hash || '#start';
  if (replace) {
    try {
      history.replaceState(null, '', h);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    } catch {
      /* zwykła zmiana adresu */
    }
  }
  if (window.location.hash === h) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else window.location.hash = h;
}

/** Wyjście z trybu skupienia tam, skąd uczeń przyszedł. */
export function goBack() {
  go(lastMain || '#start');
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
