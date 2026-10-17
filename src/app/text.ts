// Textos y formatos en español.
import type { Difficulty } from '../domain/config';
import { DIFFICULTY_POINTS } from '../domain/config';
import type { LogDenial } from '../domain/activities/rules';
import { asLocalDate, type LocalDate } from '../domain/time/localDate';
import type { PeriodKind } from '../domain/time/period';

const PERIOD_UNIT: Record<PeriodKind, string> = { day: 'día', week: 'semana', month: 'mes' };

export const PERIOD_LABEL: Record<PeriodKind, string> = { day: 'Diaria', week: 'Semanal', month: 'Mensual' };

export const SECTION_TITLE: Record<PeriodKind, string> = { day: 'Hoy', week: 'Esta semana', month: 'Este mes' };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };

export function difficultyText(d: Difficulty): string {
  return `${DIFFICULTY_LABEL[d]} · ${DIFFICULTY_POINTS[d]} puntos`;
}

/** "4 veces/semana", "1 vez/día". */
export function frequencyText(target: number, period: PeriodKind): string {
  return `${target} ${target === 1 ? 'vez' : 'veces'}/${PERIOD_UNIT[period]}`;
}

export function progressText(count: number, target: number): string {
  return `${count} de ${target}`;
}

export function daysLeftText(days: number): string {
  return days === 1 ? 'último día' : `quedan ${days} días`;
}

function toDate(date: LocalDate): Date {
  return new Date(`${date}T12:00:00`);
}

/** "Sábado, 17 oct". */
export function longDate(date: LocalDate): string {
  const d = toDate(date);
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'long' }).format(d);
  const day = d.getDate();
  const month = new Intl.DateTimeFormat('es', { month: 'short' }).format(d).replace('.', '');
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${day} ${month}`;
}

/** "lun 19". */
export function shortDay(date: LocalDate): string {
  const d = toDate(date);
  const weekday = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(d).replace('.', '');
  return `${weekday} ${d.getDate()}`;
}

export function pendingTodayText(pending: number): string {
  if (pending === 0) return 'Día completo';
  return pending === 1 ? 'Te queda 1 para hoy' : `Te quedan ${pending} para hoy`;
}

export const LOG_DENIAL_TEXT: Record<LogDenial, string> = {
  inactive: 'La actividad no está activa',
  'not-editable': 'Ese día ya no se puede editar',
  'before-creation': 'La actividad aún no existía ese día',
  full: 'Ya está completada',
  'no-version': 'Actividad sin configuración',
};

export function parseLocalDate(value: string | undefined): LocalDate | undefined {
  try {
    return value ? asLocalDate(value) : undefined;
  } catch {
    return undefined;
  }
}

const STREAK_UNIT: Record<PeriodKind, [string, string]> = {
  day: ['día', 'días'],
  week: ['semana', 'semanas'],
  month: ['mes', 'meses'],
};

export function periodUnit(kind: PeriodKind, n: number): string {
  return STREAK_UNIT[kind][n === 1 ? 0 : 1];
}

/** "racha 6 días" (STR-02). */
export function streakText(n: number, kind: PeriodKind): string {
  return `racha ${n} ${periodUnit(kind, n)}`;
}

const XP_FORMAT = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });
const INT_FORMAT = new Intl.NumberFormat('es');

/** "+2,5 XP" / "−2,5 XP" a partir de centésimas. */
export function xpDeltaText(cents: number): string {
  const sign = cents < 0 ? '−' : '+';
  return `${sign}${XP_FORMAT.format(Math.abs(cents) / 100)} XP`;
}

export function intText(n: number): string {
  return INT_FORMAT.format(n);
}

/** "hoy", "ayer", "hace 3 días". */
export function daysAgoText(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

const DAY_MONTH = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });

/** "12 oct". */
export function dayMonth(date: LocalDate): string {
  return DAY_MONTH.format(new Date(`${date}T12:00:00`)).replace('.', '');
}

/** Plazo de una misión (MHOY-02): "vence hoy", "vence mañana", "vence el vie 23", "vence el 30 nov", "sin fecha". */
export function missionDueText(deadline: LocalDate | undefined, today: LocalDate): string {
  if (!deadline) return 'sin fecha';
  const days = Math.round((Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  if (days === 0) return 'vence hoy';
  if (days === 1) return 'vence mañana';
  if (days > 1 && days <= 6) return `vence el ${shortDay(deadline)}`;
  return `vence el ${dayMonth(deadline)}`;
}

export function missionsDueText(n: number): string {
  return n === 1 ? '1 misión para hoy' : `${n} misiones para hoy`;
}
