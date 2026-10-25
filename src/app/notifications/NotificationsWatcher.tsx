// Mantiene al día la lista de avisos del servidor y el número del icono cuando cambian los datos (spec 10, PV-04,
// BG-02): actividades, registros, misiones o ajustes. Espera 2 s para agrupar cambios seguidos.
import { liveQuery } from 'dexie';
import { useEffect } from 'react';
import { useData } from '../data';
import { syncPush, updateBadge } from './push';

const DEBOUNCE_MS = 2000;

export function NotificationsWatcher() {
  const { db } = useData();
  useEffect(() => {
    let timer: number | undefined;
    const observable = liveQuery(() =>
      Promise.all([
        db.activities.toArray(),
        db.activityVersions.count(),
        db.activityStatusEvents.count(),
        db.completions.count(),
        db.missionEvents.count(),
        db.settings.get('notifications'),
      ]),
    );
    const subscription = observable.subscribe(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        void syncPush(db);
        void updateBadge(db);
      }, DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [db]);
  return null;
}
