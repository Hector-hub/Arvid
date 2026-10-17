import { addDays, compareDates, diffDays, endOfMonth, isoWeekday, startOfMonth, type LocalDate } from './localDate';

export type PeriodKind = 'day' | 'week' | 'month';

/** Intervalo de evaluación de una actividad, con ambos extremos incluidos (R-T3). */
export interface Period {
  kind: PeriodKind;
  start: LocalDate;
  end: LocalDate;
}

export function periodOf(kind: PeriodKind, date: LocalDate): Period {
  switch (kind) {
    case 'day':
      return { kind, start: date, end: date };
    case 'week': {
      const start = addDays(date, 1 - isoWeekday(date));
      return { kind, start, end: addDays(start, 6) };
    }
    case 'month':
      return { kind, start: startOfMonth(date), end: endOfMonth(date) };
  }
}

export function samePeriod(a: Period, b: Period): boolean {
  return a.kind === b.kind && a.start === b.start;
}

export function contains(period: Period, date: LocalDate): boolean {
  return compareDates(period.start, date) <= 0 && compareDates(date, period.end) <= 0;
}

/** Un periodo está cerrado cuando hoy es posterior a su último día (R-T4). */
export function isClosed(period: Period, today: LocalDate): boolean {
  return compareDates(today, period.end) > 0;
}

/** Días que quedan del periodo, contando hoy. */
export function daysRemaining(period: Period, today: LocalDate): number {
  return Math.max(0, diffDays(today, period.end) + 1);
}

/** Todas las fechas de un periodo, en orden. */
export function datesOf(period: Period): LocalDate[] {
  const dates: LocalDate[] = [];
  for (let d = period.start; compareDates(d, period.end) <= 0; d = addDays(d, 1)) dates.push(d);
  return dates;
}

/**
 * Una fecha es editable si no es futura y pertenece al periodo abierto de la actividad o es ayer (R-T5, D-021).
 * `kindAtToday` es el tipo de periodo vigente hoy para la actividad.
 */
export function isEditableDate(kindAtToday: PeriodKind, date: LocalDate, today: LocalDate): boolean {
  if (compareDates(date, today) > 0) return false;
  if (date === addDays(today, -1)) return true;
  return contains(periodOf(kindAtToday, today), date);
}
