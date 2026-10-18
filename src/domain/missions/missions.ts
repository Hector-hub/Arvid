import type { Instant } from '../activities/types';
import { DIFFICULTY_POINTS, type Difficulty } from '../config';
import { addDays, compareDates, type LocalDate } from '../time/localDate';

export const MISSION_TITLE_MAX = 60;

export interface Mission {
  id: string;
  title: string;
  categoryId: string;
  difficulty: Difficulty;
  createdAt: Instant;
  /** Fecha local de creación (R-M10). */
  createdOn: LocalDate;
}

export type MissionEventType = 'deadlineSet' | 'deadlineCleared' | 'completed' | 'uncompleted' | 'abandoned';

export interface MissionEvent {
  id: string;
  missionId: string;
  type: MissionEventType;
  /** Fecha local del evento; en `completed`, la fecha imputada (hoy o ayer). */
  date: LocalDate;
  deadline?: LocalDate;
  at: Instant;
}

export interface MissionRecord {
  mission: Mission;
  events: MissionEvent[];
}

export type MissionState = 'pending' | 'expired' | 'completedOnTime' | 'completedLate' | 'abandoned' | 'abandonedExpired';

/** Aportación a un atributo o a Disciplina, en centésimas (game-design §5–§6). */
export interface Contribution {
  date: LocalDate;
  earnedCents: number;
  possibleCents: number;
}

export interface MissionAnalysis {
  missionId: string;
  categoryId: string;
  state: MissionState;
  /** Fecha límite vigente. */
  deadline?: LocalDate;
  /** Primera fecha límite que venció: fecha de la penalización (R-M4). */
  expiredOn?: LocalDate;
  completedOn?: LocalDate;
  abandonedOn?: LocalDate;
  xpCents: number;
  category?: Contribution;
  discipline?: Contribution;
}

/** Estado y efectos de una misión a partir de su historial (MIS-01 a MIS-04, R-M1 a R-M11). */
export function analyzeMission({ mission, events }: MissionRecord, today: LocalDate): MissionAnalysis {
  const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
  let status: 'open' | 'completed' | 'abandoned' = 'open';
  let deadline: LocalDate | undefined;
  let expiredOn: LocalDate | undefined;
  let completedOn: LocalDate | undefined;
  let abandonedOn: LocalDate | undefined;
  let deadlineAtClose: LocalDate | undefined;

  for (const e of sorted) {
    // R-M11: antes de aplicar el evento, ¿había vencido la fecha límite vigente?
    if (status === 'open' && deadline && !expiredOn && compareDates(e.date, deadline) > 0) expiredOn = deadline;
    switch (e.type) {
      case 'deadlineSet':
        deadline = e.deadline;
        break;
      case 'deadlineCleared':
        deadline = undefined;
        break;
      case 'completed':
        status = 'completed';
        completedOn = e.date;
        deadlineAtClose = deadline;
        break;
      case 'uncompleted':
        status = 'open';
        completedOn = undefined;
        break;
      case 'abandoned':
        status = 'abandoned';
        abandonedOn = e.date;
        deadlineAtClose = deadline;
        break;
    }
  }
  if (status === 'open' && deadline && !expiredOn && compareDates(today, deadline) > 0) expiredOn = deadline;

  const value = DIFFICULTY_POINTS[mission.difficulty] * 100;
  const base = { missionId: mission.id, categoryId: mission.categoryId, deadline, expiredOn, completedOn, abandonedOn };

  if (status === 'completed') {
    if (expiredOn) return { ...base, state: 'completedLate', xpCents: value };
    const contribution = { date: completedOn!, earnedCents: value, possibleCents: value };
    return {
      ...base,
      state: 'completedOnTime',
      xpCents: value,
      category: contribution,
      discipline: deadlineAtClose ? contribution : undefined,
    };
  }
  if (status === 'abandoned') {
    if (expiredOn) {
      return { ...base, state: 'abandonedExpired', xpCents: 0, discipline: { date: expiredOn, earnedCents: 0, possibleCents: value } };
    }
    return {
      ...base,
      state: 'abandoned',
      xpCents: 0,
      discipline: deadlineAtClose ? { date: abandonedOn!, earnedCents: 0, possibleCents: value / 2 } : undefined,
    };
  }
  if (expiredOn) {
    return { ...base, state: 'expired', xpCents: 0, discipline: { date: expiredOn, earnedCents: 0, possibleCents: value } };
  }
  return { ...base, state: 'pending', xpCents: 0 };
}

export interface MissionActions {
  complete: boolean;
  completeYesterday: boolean;
  uncomplete: boolean;
  reschedule: boolean;
  clearDeadline: boolean;
  abandon: boolean;
  delete: boolean;
  editCategoryAndDifficulty: boolean;
}

const OPEN_STATES: MissionState[] = ['pending', 'expired'];

/** Acciones disponibles según el estado (MIS-05, MIS-06, S3-02, S3-03). */
export function missionActions(record: MissionRecord, analysis: MissionAnalysis, today: LocalDate): MissionActions {
  const open = OPEN_STATES.includes(analysis.state);
  const yesterday = addDays(today, -1);
  const completed = analysis.state === 'completedOnTime' || analysis.state === 'completedLate';
  return {
    complete: open,
    completeYesterday: open && compareDates(yesterday, record.mission.createdOn) >= 0,
    uncomplete: completed && !!analysis.completedOn && compareDates(analysis.completedOn, yesterday) >= 0,
    reschedule: open,
    clearDeadline: open && !!analysis.deadline,
    abandon: open,
    delete: analysis.state === 'pending' && record.mission.createdOn === today,
    editCategoryAndDifficulty: analysis.state === 'pending',
  };
}

/** ¿Se puede completar con fecha `date`? Hoy o ayer, nunca antes de su creación (R-M2, R-M10). */
export function canCompleteOn(record: MissionRecord, analysis: MissionAnalysis, date: LocalDate, today: LocalDate): boolean {
  if (!OPEN_STATES.includes(analysis.state)) return false;
  if (date !== today && date !== addDays(today, -1)) return false;
  return compareDates(date, record.mission.createdOn) >= 0;
}

/** Códigos de error (la interfaz los traduce con `errors.<código>`, spec 06 I18N-01). */
export interface MissionInputErrors {
  title?: string;
  categoryId?: string;
  deadline?: string;
}

/** Validación del formulario (MIS-07, S3-01). */
export function validateMissionInput(input: { title: string; categoryId?: string; deadline?: LocalDate }, today: LocalDate): MissionInputErrors {
  const errors: MissionInputErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'titleRequired';
  else if (title.length > MISSION_TITLE_MAX) errors.title = 'titleTooLong';
  if (!input.categoryId) errors.categoryId = 'categoryRequired';
  if (input.deadline && compareDates(input.deadline, today) < 0) errors.deadline = 'deadlinePast';
  return errors;
}
