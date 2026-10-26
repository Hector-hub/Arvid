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

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Logros desbloqueados (spec 07, LO-03): permanentes. */
export interface AchievementRow {
  id: string;
  unlockedAt: string;
}

export const SCHEMA_VERSION = 2;

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
  }
}
