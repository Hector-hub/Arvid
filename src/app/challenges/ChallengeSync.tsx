// Sincronización de los retos (spec 15, SY-02 y SY-05): al abrir la app y cada 5 minutos se descarga el progreso de
// los demás; al registrar la actividad de un reto la marca sale enseguida, y sin conexión queda para cuando vuelva.
import Dexie from 'dexie';
import { useEffect, useRef } from 'react';
import { accountsEnabled } from '../account/account';
import { useData, useSettings } from '../data';
import { refreshChallenges, syncMarks } from './challenges';

export const REFRESH_MS = 5 * 60_000;
const MARK_DELAY_MS = 2_000;

export function ChallengeSync() {
  const ctx = useData();
  const account = useSettings()?.account;
  const busy = useRef(false);

  useEffect(() => {
    if (!account || !accountsEnabled()) return;
    let timer: number | undefined;
    const run = async (full: boolean) => {
      if (busy.current || !navigator.onLine) return;
      busy.current = true;
      try {
        await syncMarks(ctx, account);
        if (full) await refreshChallenges(ctx, account);
      } catch {
        // Sin conexión o error del servidor: se reintenta en la siguiente ocasión
      } finally {
        busy.current = false;
      }
    };
    const onChange = (parts: unknown) => {
      // Solo cambios en los registros: los de la tabla de retos los provoca la propia sincronización
      const changed = parts && typeof parts === 'object' && Object.keys(parts).some((k) => k.includes('/completions/'));
      if (!changed) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(false), MARK_DELAY_MS);
    };
    void run(true);
    const interval = window.setInterval(() => !document.hidden && void run(true), REFRESH_MS);
    const onOnline = () => void run(true);
    const onVisible = () => !document.hidden && void run(true);
    Dexie.on('storagemutated', onChange);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
      Dexie.on('storagemutated').unsubscribe(onChange);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [ctx, account]);

  return null;
}
