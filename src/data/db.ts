import Dexie, { type EntityTable } from 'dexie';
import type {
  Activity,
  ActivityStatusEvent,
  ActivityVersion,
  Completion,
} from '../domain/activities/types';
import type { Category } from '../domain/categories';
import type { Mission, MissionEvent } from '../domain/missions/missions';

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Tabla reservada para el incremento 5 (logros). */
export interface AchievementRow {
  id: string;
  unlockedAt: string;
}

export const SCHEMA_VERSION = 1;

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

  constructor(name = 'arvid') {
    super(name);
    this.version(SCHEMA_VERSION).stores({
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
  }
}
