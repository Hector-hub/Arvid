import type { ActivityRecord } from './activities/types';
import { compareDates, type LocalDate } from './time/localDate';

const MS_PER_DAY = 86_400_000;
export const BACKUP_REMINDER_DAYS = 7;

/**
 * ¿Mostrar el aviso de backup en Hoy? (BAK-07, D-024)
 * Hay actividades, han pasado 7 días desde el último backup (o desde el primer dato si nunca hubo) y, si hubo backup,
 * hay cambios posteriores. "Más tarde" lo pospone hasta `snoozedUntil` (fecha local).
 */
export function shouldRemindBackup(params: {
  records: readonly ActivityRecord[];
  now: Date;
  today: LocalDate;
  lastBackupAt?: string;
  snoozedUntil?: string;
}): boolean {
  const { records, now, today, lastBackupAt, snoozedUntil } = params;
  if (records.length === 0) return false;
  if (snoozedUntil && compareDates(today, snoozedUntil as LocalDate) < 0) return false;
  const instants = records.flatMap((r) => [...r.events.map((e) => e.at), ...r.completions.map((c) => c.at)]).sort();
  const first = instants[0];
  const latest = instants.at(-1);
  const daysSince = (iso: string) => (now.getTime() - Date.parse(iso)) / MS_PER_DAY;
  if (!lastBackupAt) return !!first && daysSince(first) >= BACKUP_REMINDER_DAYS;
  return daysSince(lastBackupAt) >= BACKUP_REMINDER_DAYS && !!latest && latest > lastBackupAt;
}
