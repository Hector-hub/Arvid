import type { Difficulty } from '../config';
import type { LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';

/** Instante ISO 8601 en UTC. */
export type Instant = string;

export interface Activity {
  id: string;
  name: string;
  order: number;
  /** Recordatorios (spec 10, RA-01): como mucho uno por cada vez del periodo. */
  reminders?: Reminder[];
}

/**
 * Recordatorio de una actividad (RA-01): hora local `HH:MM` y, en las semanales, el día de la semana (1 = lunes … 7)
 * o, en las mensuales, el día del mes (1–31; en meses más cortos, el último día).
 */
export interface Reminder {
  day?: number;
  time: string;
}

export interface ActivityConfig {
  period: PeriodKind;
  target: number;
  difficulty: Difficulty;
  categoryId: string;
}

/** Configuración versionada (R-A1). */
export interface ActivityVersion extends ActivityConfig {
  id: string;
  activityId: string;
  effectiveFrom: LocalDate;
}

export type ActivityStatusType = 'created' | 'paused' | 'resumed' | 'archived' | 'unarchived';
export type ActivityStatus = 'active' | 'paused' | 'archived';

export interface ActivityStatusEvent {
  id: string;
  activityId: string;
  date: LocalDate;
  type: ActivityStatusType;
  at: Instant;
}

export interface Completion {
  id: string;
  activityId: string;
  date: LocalDate;
  at: Instant;
  tzOffsetMin: number;
}

/** Todo lo necesario para razonar sobre una actividad. */
export interface ActivityRecord {
  activity: Activity;
  versions: ActivityVersion[];
  events: ActivityStatusEvent[];
  completions: Completion[];
}
