import Dexie, { type EntityTable } from 'dexie';
import type {
  Activity,
  ActivityStatusEvent,
  ActivityVersion,
  Completion,
} from '../domain/activities/types';
import type { Category } from '../domain/categories';

export interface SettingRow {
  key: string;
  value: unknown;
}

/** Tablas reservadas para incrementos posteriores (data-model.md); se crean ya para evitar migraciones tempranas. */
export interface MissionRow {
  id: string;
  title: string;
  categoryId: string;
  difficulty: string;
  createdAt: string;
}
export interface MissionEventRow {
  id: string;
  missionId: string;
  type: string;
  date: string;
  deadline?: string;
  at: string;
}
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
  missions!: EntityTable<MissionRow, 'id'>;
  missionEvents!: EntityTable<MissionEventRow, 'id'>;
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
