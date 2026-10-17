import { ACTIVITY_NAME_MAX, TARGET_LIMITS } from '../config';
import { addDays, compareDates, type LocalDate } from '../time/localDate';
import { contains, datesOf, isEditableDate, periodOf, samePeriod, type Period } from '../time/period';
import type {
  ActivityConfig,
  ActivityRecord,
  ActivityStatus,
  ActivityStatusEvent,
  ActivityVersion,
  Completion,
} from './types';

/** Versión vigente en una fecha: la de mayor `effectiveFrom` que no sea posterior (R-A1). */
export function versionAt(versions: readonly ActivityVersion[], date: LocalDate): ActivityVersion | undefined {
  let best: ActivityVersion | undefined;
  for (const v of versions) {
    if (compareDates(v.effectiveFrom, date) <= 0 && (!best || compareDates(v.effectiveFrom, best.effectiveFrom) > 0)) {
      best = v;
    }
  }
  return best;
}

/** Orden total: fecha, instante y, ante empate, `created` primero. Los repositorios garantizan instantes crecientes. */
function sortEvents(events: readonly ActivityStatusEvent[]): ActivityStatusEvent[] {
  const rank = (e: ActivityStatusEvent) => (e.type === 'created' ? 0 : 1);
  return [...events].sort((a, b) => compareDates(a.date, b.date) || a.at.localeCompare(b.at) || rank(a) - rank(b));
}

/** Estado de la actividad al final de una fecha; `undefined` si aún no existía. */
export function statusAt(events: readonly ActivityStatusEvent[], date: LocalDate): ActivityStatus | undefined {
  let status: ActivityStatus | undefined;
  for (const e of sortEvents(events)) {
    if (compareDates(e.date, date) > 0) break;
    switch (e.type) {
      case 'created':
      case 'resumed':
      case 'unarchived':
        status = 'active';
        break;
      case 'paused':
        status = 'paused';
        break;
      case 'archived':
        status = 'archived';
        break;
    }
  }
  return status;
}

export function createdOn(events: readonly ActivityStatusEvent[]): LocalDate | undefined {
  return sortEvents(events).find((e) => e.type === 'created')?.date;
}

export interface PeriodProgress {
  period: Period;
  target: number;
  count: number;
  done: boolean;
}

export function countIn(completions: readonly Completion[], period: Period): number {
  return completions.filter((c) => contains(period, c.date)).length;
}

/** Progreso del periodo que contiene `date`, según la versión vigente en esa fecha. */
export function progressAt(record: ActivityRecord, date: LocalDate): PeriodProgress | undefined {
  const version = versionAt(record.versions, date);
  if (!version) return undefined;
  const period = periodOf(version.period, date);
  const count = countIn(record.completions, period);
  return { period, target: version.target, count, done: count >= version.target };
}

export type LogDenial = 'inactive' | 'not-editable' | 'before-creation' | 'full' | 'no-version';
export type LogCheck = { ok: true } | { ok: false; reason: LogDenial };

/** ¿Se puede registrar un cumplimiento con fecha `date`? (ACT-06, LOG-02, LOG-03) */
export function canLog(record: ActivityRecord, date: LocalDate, today: LocalDate): LogCheck {
  if (statusAt(record.events, today) !== 'active') return { ok: false, reason: 'inactive' };
  const created = createdOn(record.events);
  if (!created || compareDates(date, created) < 0) return { ok: false, reason: 'before-creation' };
  const current = versionAt(record.versions, today);
  if (!current) return { ok: false, reason: 'no-version' };
  if (!isEditableDate(current.period, date, today)) return { ok: false, reason: 'not-editable' };
  const progress = progressAt(record, date);
  if (!progress) return { ok: false, reason: 'no-version' };
  if (progress.count >= progress.target) return { ok: false, reason: 'full' };
  return { ok: true };
}

/** Registro que se elimina al deshacer en `date`: el más reciente de ese día, si la fecha es editable (LOG-04). */
export function completionToUndo(record: ActivityRecord, date: LocalDate, today: LocalDate): Completion | undefined {
  const current = versionAt(record.versions, today);
  if (!current || !isEditableDate(current.period, date, today)) return undefined;
  return record.completions
    .filter((c) => c.date === date)
    .reduce<Completion | undefined>((latest, c) => (!latest || c.at > latest.at ? c : latest), undefined);
}

/**
 * Inicio de vigencia de una configuración nueva: el inicio del periodo actual según la configuración nueva (ACT-04).
 * Las versiones con `effectiveFrom` igual o posterior quedan sustituidas.
 */
export function planNewVersion(
  versions: readonly ActivityVersion[],
  config: ActivityConfig,
  today: LocalDate,
): { effectiveFrom: LocalDate; supersededIds: string[] } {
  const effectiveFrom = periodOf(config.period, today).start;
  const supersededIds = versions.filter((v) => compareDates(v.effectiveFrom, effectiveFrom) >= 0).map((v) => v.id);
  return { effectiveFrom, supersededIds };
}

export interface ConfigErrors {
  name?: string;
  categoryId?: string;
  target?: string;
}

/** Validación del formulario de actividad (ACT-01). */
export function validateActivityInput(name: string, config: Partial<ActivityConfig>): ConfigErrors {
  const errors: ConfigErrors = {};
  const trimmed = name.trim();
  if (trimmed.length === 0) errors.name = 'Escribe un nombre';
  else if (trimmed.length > ACTIVITY_NAME_MAX) errors.name = `Máximo ${ACTIVITY_NAME_MAX} caracteres`;
  if (!config.categoryId) errors.categoryId = 'Elige una categoría';
  if (config.period && config.target !== undefined) {
    const max = TARGET_LIMITS[config.period];
    if (!Number.isInteger(config.target) || config.target < 1 || config.target > max) {
      errors.target = `Entre 1 y ${max}`;
    }
  }
  return errors;
}

export interface DayCell {
  date: LocalDate;
  count: number;
  editable: boolean;
  future: boolean;
}

/** Días que muestra la tira del detalle: ayer (si es de otro periodo) y los días del periodo actual (DET-01). */
export function detailDays(record: ActivityRecord, today: LocalDate): DayCell[] {
  const current = versionAt(record.versions, today);
  if (!current) return [];
  const period = periodOf(current.period, today);
  const yesterday = addDays(today, -1);
  const dates = contains(period, yesterday) ? datesOf(period) : [yesterday, ...datesOf(period)];
  const created = createdOn(record.events);
  return dates.map((date) => ({
    date,
    count: record.completions.filter((c) => c.date === date).length,
    editable: isEditableDate(current.period, date, today) && !!created && compareDates(date, created) >= 0,
    future: compareDates(date, today) > 0,
  }));
}

/** ¿El periodo de ayer está cerrado (es distinto del de hoy)? Base de "¿Olvidaste algo ayer?" (HOY-05). */
export function yesterdayPeriodClosed(record: ActivityRecord, today: LocalDate): boolean {
  const yesterday = addDays(today, -1);
  const vy = versionAt(record.versions, yesterday);
  const vt = versionAt(record.versions, today);
  if (!vy || !vt) return false;
  return !samePeriod(periodOf(vy.period, yesterday), periodOf(vt.period, today));
}


/** Fecha del registro más reciente que aún se puede deshacer, para el botón "−" de Hoy (HOY-03, LOG-04). */
export function latestUndoableDate(record: ActivityRecord, today: LocalDate): LocalDate | undefined {
  const current = versionAt(record.versions, today);
  if (!current) return undefined;
  const latest = record.completions
    .filter((c) => isEditableDate(current.period, c.date, today) && contains(periodOf(current.period, today), c.date))
    .reduce<Completion | undefined>((best, c) => (!best || c.at > best.at ? c : best), undefined);
  return latest?.date;
}
