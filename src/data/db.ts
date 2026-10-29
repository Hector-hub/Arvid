import Dexie, { type EntityTable } from 'dexie';
import type {
  Activity,
  ActivityStatusEvent,
  ActivityVersion,
  Completion,
  Rest,
} from '../domain/activities/types';
import type { Category } from '../domain/categories';
import type { Mission, MissionEvent } from '../domain/missions/missions';
import type { Goal } from '../domain/goals/goals';
import type { Memory } from '../domain/arvid/memory';
import type { LocalChallenge } from '../domain/challenges/challenges';

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Logros desbloqueados (spec 07, LO-03): permanentes. */
export interface AchievementRow {
  id: string;
  unlockedAt: string;
}

export const SCHEMA_VERSION = 5;

export class ArvidDB extends Dexie {
  categories!: EntityTable<Category, 'id'>;
  activities!: EntityTable<Activity, 'id'>;
  activityVersions!: EntityTable<ActivityVersion, 'id'>;
  activityStatusEvents!: EntityTable<ActivityStatusEvent, 'id'>;
  completions!: EntityTable<Completion, 'id'>;
  missions!: EntityTable<Mission, 'id'>;
  missionEvents!: EntityTable<MissionEvent, 'id'>;
  achievements!: EntityTable<AchievementRow, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;
  /** Descansos planificados (spec 12, DS). Desde la versión 2 del esquema. */
  rests!: EntityTable<Rest, 'id'>;
  /** Objetivos con hitos (spec 12, OB). Desde la versión 3 del esquema. */
  goals!: EntityTable<Goal, 'id'>;
  /** Memoria del compañero (spec 13). Desde la versión 4 del esquema. */
  memories!: EntityTable<Memory, 'id'>;
  /** Copia local de los retos entre amigos y su marcador (spec 15, §4.3). Desde la versión 5 del esquema. */
  challenges!: EntityTable<LocalChallenge, 'id'>;

  constructor(name = 'arvid') {
    super(name);
    this.version(1).stores({
      categories: 'id, order',
      activities: 'id, order',
      activityVersions: 'id, activityId, [activityId+effectiveFrom]',
      activityStatusEvents: 'id, activityId',
      completions: 'id, activityId, date, [activityId+date]',
      missions: 'id',
      missionEvents: 'id, missionId',
      achievements: 'id',
      settings: 'key',
    });
    // Versión 2 (spec 12): tabla nueva y vacía; los datos de la versión 1 no cambian
    this.version(2).stores({ rests: 'id, from, to' });
    // Versión 3 (spec 12): objetivos; las misiones ganan `time` y `goalId` (campos opcionales, sin índice)
    this.version(3).stores({ goals: 'id' });
    // Versión 4 (spec 13): memoria del compañero
    this.version(4).stores({ memories: 'id' });
    // Versión 5 (spec 15): retos; las actividades ganan `challengeId` (opcional, sin índice)
    this.version(5).stores({ challenges: 'id' });
  }
}
