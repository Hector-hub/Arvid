// Recordatorios por actividad de los próximos días (spec 10, RA y PV-04): instantes y una referencia opaca (sin
// nombres) que la app sube al servidor. Se saltan las actividades inactivas y los periodos ya cumplidos (RA-03).
import { progressAt, statusAt, versionAt } from '../activities/rules';
import type { ActivityRecord, Reminder } from '../activities/types';
import { restingOn } from '../activities/rests';
import { addDays, daysInMonth, isoWeekday, toLocalDate, type LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';
import { analyzeMission, type MissionRecord } from '../missions/missions';

/** Días que cubre la lista que se sube (PV-04). */
export const SCHEDULE_DAYS = 7;

export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface ReminderSlot {
  /** Instante ISO (UTC). */
  at: string;
  /** `<idActividad>:<índice del recordatorio>`. */
  ref: string;
}

/** ¿Cae el recordatorio en esta fecha según la frecuencia? */
function matches(kind: PeriodKind, reminder: Reminder, date: LocalDate): boolean {
  if (kind === 'day') return true;
  if (kind === 'week') return reminder.day === isoWeekday(date);
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return Math.min(reminder.day ?? 1, daysInMonth(y, m)) === d;
}

/** Recordatorios válidos para la frecuencia y el número de veces (RA-01, RA-02). */
export function validReminders(reminders: readonly Reminder[] | undefined, kind: PeriodKind, target: number): Reminder[] {
  return (reminders ?? [])
    .slice(0, target)
    .filter((r) => TIME.test(r.time) && (kind === 'day' || (Number.isInteger(r.day) && r.day! >= 1 && r.day! <= (kind === 'week' ? 7 : 31))));
}

export function upcomingReminders(records: readonly ActivityRecord[], now: Date, days = SCHEDULE_DAYS): ReminderSlot[] {
  const slots: ReminderSlot[] = [];
  const today = toLocalDate(now);
  for (const record of records) {
    const reminders = record.activity.reminders ?? [];
    if (!reminders.length) continue;
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      if (statusAt(record.events, date) !== 'active' || restingOn(record.rests, date)) continue;
      const version = versionAt(record.versions, date);
      if (!version) continue;
      // Periodo ya cumplido con lo registrado hasta ahora (RA-03)
      if (progressAt(record, date)?.done) continue;
      reminders.forEach((reminder, index) => {
        if (index >= version.target || !validReminders([reminder], version.period, 1).length) return;
        if (!matches(version.period, reminder, date)) return;
        const [y, m, d] = date.split('-').map(Number) as [number, number, number];
        const [hh, mm] = reminder.time.split(':').map(Number) as [number, number];
        const at = new Date(y, m - 1, d, hh, mm);
        if (at > now) slots.push({ at: at.toISOString(), ref: `${record.activity.id}:${index}` });
      });
    }
  }
  return slots.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Avisos de misiones con hora (spec 12, MH-02): el día de su fecha límite a esa hora, si siguen pendientes y es en
 * los próximos días. Referencia `mission:<id>` (sin títulos, PV-01).
 */
export function missionReminders(missions: readonly MissionRecord[], now: Date, days = SCHEDULE_DAYS): ReminderSlot[] {
  const today = toLocalDate(now);
  const last = addDays(today, days - 1);
  const slots: ReminderSlot[] = [];
  for (const record of missions) {
    const time = record.mission.time;
    if (!time || !TIME.test(time)) continue;
    const analysis = analyzeMission(record, today);
    if (analysis.state !== 'pending' || !analysis.deadline || analysis.deadline < today || analysis.deadline > last) continue;
    const [y, m, d] = analysis.deadline.split('-').map(Number) as [number, number, number];
    const [hh, mm] = time.split(':').map(Number) as [number, number];
    const at = new Date(y, m - 1, d, hh, mm);
    if (at > now) slots.push({ at: at.toISOString(), ref: `mission:${record.mission.id}` });
  }
  return slots.sort((a, b) => a.at.localeCompare(b.at));
}
