// Objetivos con hitos (spec 12, OB): un objetivo agrupa hitos en orden; solo el siguiente está activo y es una misión
// normal (OB-03, OB-04). El estado del objetivo se deriva de sus misiones.
import type { Instant } from '../activities/types';
import type { Difficulty } from '../config';
import { analyzeMission, type MissionAnalysis, type MissionRecord } from '../missions/missions';
import { compareDates, type LocalDate } from '../time/localDate';

export const GOAL_TITLE_MAX = 60;
export const GOAL_DESCRIPTION_MAX = 200;
export const MILESTONES_MAX = 20;
export const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Milestone {
  id: string;
  title: string;
  difficulty: Difficulty;
  deadline?: LocalDate;
  /** Hora `HH:MM` del aviso (MH-01); solo con fecha límite. */
  time?: string;
  /** Misión que lo representa una vez activado. */
  missionId?: string;
  /** Se activó sin fecha porque la suya ya había pasado (OB-05). */
  deadlineDropped?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  categoryId: string;
  targetDate?: LocalDate;
  description?: string;
  createdAt: Instant;
  createdOn: LocalDate;
  milestones: Milestone[];
  /** Abandonado ese día (OB-09). */
  abandonedOn?: LocalDate;
  /** Ya se celebró que se cumplió (OB-08). */
  celebrated?: boolean;
}

export type GoalState = 'active' | 'completed' | 'abandoned';

export interface GoalStatus {
  state: GoalState;
  done: number;
  total: number;
  /** Índice del hito activo (con misión y sin completar), si hay. */
  activeIndex?: number;
  /** Día en que se completó el último hito. */
  completedOn?: LocalDate;
  /** La fecha meta pasó sin completarlo (OB-10). */
  overdue: boolean;
}

const COMPLETED = new Set(['completedOnTime', 'completedLate']);

export function milestoneAnalysis(m: Milestone, missions: ReadonlyMap<string, MissionRecord>, today: LocalDate): MissionAnalysis | undefined {
  const record = m.missionId ? missions.get(m.missionId) : undefined;
  return record ? analyzeMission(record, today) : undefined;
}

export const isCompletedState = (state: string | undefined) => !!state && COMPLETED.has(state);

export function goalStatus(goal: Goal, missions: ReadonlyMap<string, MissionRecord>, today: LocalDate): GoalStatus {
  const analyses = goal.milestones.map((m) => milestoneAnalysis(m, missions, today));
  const done = analyses.filter((a) => isCompletedState(a?.state)).length;
  const total = goal.milestones.length;
  const completed = total > 0 && done === total;
  const activeIndex = analyses.findIndex((a) => a && !isCompletedState(a.state));
  const completedOn = completed
    ? analyses.map((a) => a!.completedOn!).reduce((max, d) => (compareDates(d, max) > 0 ? d : max))
    : undefined;
  const state: GoalState = completed ? 'completed' : goal.abandonedOn ? 'abandoned' : 'active';
  return {
    state,
    done,
    total,
    activeIndex: activeIndex >= 0 ? activeIndex : undefined,
    completedOn,
    overdue: state === 'active' && !!goal.targetDate && compareDates(today, goal.targetDate) > 0,
  };
}

/**
 * Hito que toca activar ahora (OB-04, OB-06): el primero sin misión si todos los anteriores están completados, o
 * `undefined`. Al deshacer uno anterior, el ya activado sigue activo.
 */
export function nextToActivate(goal: Goal, missions: ReadonlyMap<string, MissionRecord>, today: LocalDate): number | undefined {
  if (goal.abandonedOn) return undefined;
  const index = goal.milestones.findIndex((m) => !m.missionId);
  if (index < 0) return undefined;
  const previous = goal.milestones.slice(0, index);
  return previous.every((m) => isCompletedState(milestoneAnalysis(m, missions, today)?.state)) ? index : undefined;
}

/** Fecha y hora con las que se activa un hito: si su fecha ya pasó, sin fecha ni hora (OB-05). */
export function activationDeadline(m: Milestone, today: LocalDate): { deadline?: LocalDate; time?: string; dropped: boolean } {
  if (!m.deadline) return { dropped: false };
  if (compareDates(m.deadline, today) < 0) return { dropped: true };
  return { deadline: m.deadline, time: m.time, dropped: false };
}

export interface GoalInputErrors {
  title?: string;
  categoryId?: string;
  description?: string;
  milestones?: string;
  /** Por índice de hito. */
  milestone?: Record<number, string>;
}

export interface MilestoneInput {
  /** Al editar, el hito que ya existía. */
  id?: string;
  title: string;
  difficulty: Difficulty;
  deadline?: LocalDate;
  time?: string;
}

export interface GoalInput {
  title: string;
  categoryId?: string;
  targetDate?: LocalDate;
  description?: string;
  milestones: MilestoneInput[];
}

/** OB-02, MH-01. `fixed`: hitos ya activados, que no se validan aquí (se editan como misiones). */
export function validateGoalInput(input: GoalInput, today: LocalDate, fixed = 0): GoalInputErrors {
  const errors: GoalInputErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'titleRequired';
  else if (title.length > GOAL_TITLE_MAX) errors.title = 'titleTooLong';
  if (!input.categoryId) errors.categoryId = 'categoryRequired';
  if ((input.description ?? '').trim().length > GOAL_DESCRIPTION_MAX) errors.description = 'descriptionTooLong';
  if (input.milestones.length === 0) errors.milestones = 'milestonesRequired';
  else if (input.milestones.length > MILESTONES_MAX) errors.milestones = 'milestonesTooMany';
  const per: Record<number, string> = {};
  input.milestones.forEach((m, i) => {
    if (i < fixed) return;
    const t = m.title.trim();
    if (!t) per[i] = 'titleRequired';
    else if (t.length > GOAL_TITLE_MAX) per[i] = 'titleTooLong';
    else if (m.deadline && compareDates(m.deadline, today) < 0) per[i] = 'deadlinePast';
    else if (m.time && (!m.deadline || !TIME.test(m.time))) per[i] = 'timeNeedsDeadline';
  });
  if (Object.keys(per).length) errors.milestone = per;
  return errors;
}
