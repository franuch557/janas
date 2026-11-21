// Przypomnienie o nauce: baner na starcie po ustawionej godzinie, gdy dziś
// nic nie zrobiono, i powiadomienie systemowe, jeśli przeglądarka pozwala.

import { useEffect, useState } from 'react';
import { useStore } from '../store/AppStore';
import { hm } from '../logic/dates';

export function notificationsSupported(): boolean {
  try {
    return typeof window !== 'undefined' && 'Notification' in window;
  } catch {
    return false;
  }
}

/** Prośba o zgodę na powiadomienia (tylko po kliknięciu ucznia). */
export async function askNotifications(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function useReminderDue(): boolean {
  const { data, d, today } = useStore();
  const [now, setNow] = useState(minutesNow);
  useEffect(() => {
    const t = setInterval(() => setNow(minutesNow()), 60_000);
    return () => clearInterval(t);
  }, []);
  const r = data.stan.reminder;
  return data.stan.onboarded && r.enabled && now >= hm(r.time) && !d.days.has(today);
}

export function useReminder() {
  const due = useReminderDue();
  const { data, today, updateStan } = useStore();
  useEffect(() => {
    if (!due || data.stan.notifiedOn === today || !notificationsSupported()) return;
    try {
      if (Notification.permission !== 'granted') return;
      new Notification('Matura 2027', { body: 'Dziś jeszcze nic. 15 minut wystarczy, żeby utrzymać serię.' });
      updateStan((s) => ({ ...s, notifiedOn: today }));
    } catch {
      /* powiadomienia niedostępne: zostaje baner */
    }
  }, [due, data.stan.notifiedOn, today, updateStan]);
}
