import { addDays, compareDates, type LocalDate } from '../time/localDate';
import type { MissionAnalysis, MissionRecord } from './missions';

export const TODAY_MISSION_LIMIT = 5;
export const UPCOMING_DAYS = 3;

export interface MissionItem {
  record: MissionRecord;
  analysis: MissionAnalysis;
}

export interface TodayMissions {
  /** Hasta 5 misiones abiertas relevantes, en orden (MHOY-01). */
  items: MissionItem[];
  /** Completadas hoy: se muestran como hechas hasta mañana (MHOY-03). */
  completedToday: MissionItem[];
  /** Total de misiones abiertas, para "Ver todas (N)". */
  openCount: number;
  /** Vencidas + con fecha límite hoy (MHOY-04). */
  dueCount: number;
}

function group(item: MissionItem, today: LocalDate): number | undefined {
  const { state, deadline } = item.analysis;
  if (state === 'expired') return 0;
  if (state !== 'pending') return undefined;
  if (!deadline) return 3;
  if (deadline === today) return 1;
  if (compareDates(deadline, addDays(today, UPCOMING_DAYS)) <= 0) return 2;
  return undefined; // más lejanas: solo en la lista completa
}

/** Orden de MHOY-01: vencidas, hoy, próximos 3 días, sin fecha (de la más antigua a la más nueva). */
export function compareOpenMissions(a: MissionItem, b: MissionItem, today: LocalDate): number {
  const ga = group(a, today) ?? 2.5;
  const gb = group(b, today) ?? 2.5;
  if (ga !== gb) return ga - gb;
  const da = a.analysis.expiredOn ?? a.analysis.deadline;
  const db = b.analysis.expiredOn ?? b.analysis.deadline;
  if (da && db && da !== db) return compareDates(da, db);
  return a.record.mission.createdAt.localeCompare(b.record.mission.createdAt);
}

export function selectTodayMissions(items: readonly MissionItem[], today: LocalDate): TodayMissions {
  const open = items.filter((i) => i.analysis.state === 'pending' || i.analysis.state === 'expired');
  const relevant = open.filter((i) => group(i, today) !== undefined).sort((a, b) => compareOpenMissions(a, b, today));
  return {
    items: relevant.slice(0, TODAY_MISSION_LIMIT),
    completedToday: items.filter(
      (i) => (i.analysis.state === 'completedOnTime' || i.analysis.state === 'completedLate') && i.analysis.completedOn === today,
    ),
    openCount: open.length,
    dueCount: open.filter((i) => i.analysis.state === 'expired' || i.analysis.deadline === today).length,
  };
}
