import { useEffect, useState } from 'react';
import { toLocalDate, type LocalDate } from '../domain/time/localDate';

/**
 * Fecha local de "hoy" que se actualiza al pasar la medianoche y al volver la app al primer plano (HOY-07).
 */
export function useToday(): LocalDate {
  const [today, setToday] = useState(() => toLocalDate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toLocalDate(new Date()));
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = window.setTimeout(refresh, nextMidnight.getTime() - now.getTime());
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, [today]);

  return today;
}
