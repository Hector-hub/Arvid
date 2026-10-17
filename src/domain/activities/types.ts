import type { Difficulty } from '../config';
import type { LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';

/** Instante ISO 8601 en UTC. */
export type Instant = string;

export interface Activity {
  id: string;
  name: string;
  order: number;
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
