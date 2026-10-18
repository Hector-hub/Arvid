import { z } from 'zod';
import { TARGET_LIMITS } from '../domain/config';
import type { ActivityRecord, ActivityStatusEvent, ActivityVersion, Completion } from '../domain/activities/types';
import type { MissionRecord } from '../domain/missions/missions';
import { analyze } from '../domain/progress/progress';
import { isLocalDate, toLocalDate } from '../domain/time/localDate';
import { SCHEMA_VERSION, type ArvidDB } from './db';
import { ensureSeed, type DataContext } from './repository';

export const BACKUP_FORMAT = 'arvid-backup';
export const BACKUP_FORMAT_VERSION = 1;

/** Ajustes propios de cada dispositivo: un import no los sobrescribe (BAK-06). */
const DEVICE_SETTINGS = new Set(['persistGranted', 'installHintDismissedAt', 'backupReminderSnoozedUntil', 'arvidSeen', 'introSnoozedUntil']);

// ---------- Esquema (data-model §4) ----------

const localDate = z.string().refine(isLocalDate, 'fecha local inválida');
const instant = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'instante inválido');
const id = z.string().min(1).max(100);
const difficulty = z.enum(['easy', 'medium', 'hard']);
const periodKind = z.enum(['day', 'week', 'month']);

const category = z.object({
  id,
  name: z.string().min(1).max(24),
  color: z.enum(['orange', 'sky', 'cyan', 'gold', 'lime', 'fog', 'green', 'white']),
  icon: z.string().max(40),
  presetKey: z.string().max(40).optional(),
  active: z.boolean(),
  archivedAt: instant.optional(),
  order: z.number().int(),
});

const activity = z.object({ id, name: z.string().min(1).max(40), order: z.number().int() });

const activityVersion = z
  .object({
    id,
    activityId: id,
    effectiveFrom: localDate,
    period: periodKind,
    target: z.number().int().min(1),
    difficulty,
    categoryId: id,
  })
  .refine((v) => v.target <= TARGET_LIMITS[v.period], 'veces fuera de rango');

const statusEvent = z.object({
  id,
  activityId: id,
  date: localDate,
  type: z.enum(['created', 'paused', 'resumed', 'archived', 'unarchived']),
  at: instant,
});

const completion = z.object({ id, activityId: id, date: localDate, at: instant, tzOffsetMin: z.number().int().min(-900).max(900) });

const mission = z.object({ id, title: z.string().min(1).max(60), categoryId: id, difficulty, createdAt: instant, createdOn: localDate });
const missionEvent = z
  .object({
    id,
    missionId: id,
    type: z.enum(['deadlineSet', 'deadlineCleared', 'completed', 'uncompleted', 'abandoned']),
    date: localDate,
    deadline: localDate.optional(),
    at: instant,
  })
  .refine((e) => e.type !== 'deadlineSet' || !!e.deadline, 'deadlineSet sin fecha límite');
const achievement = z.object({ id, unlockedAt: instant });
const setting = z.object({ key: z.string().min(1).max(60), value: z.unknown() });

const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1),
  appVersion: z.string().max(40),
  schemaVersion: z.number().int().min(1),
  exportedAt: instant,
  data: z.object({
    categories: z.array(category),
    activities: z.array(activity),
    activityVersions: z.array(activityVersion),
    activityStatusEvents: z.array(statusEvent),
    completions: z.array(completion),
    missions: z.array(mission),
    missionEvents: z.array(missionEvent),
    achievements: z.array(achievement),
    settings: z.array(setting),
  }),
});

export type Backup = z.infer<typeof backupSchema>;

// ---------- Exportar (BAK-01) ----------

export async function buildBackup(db: ArvidDB, appVersion: string, now: Date): Promise<Backup> {
  return db.transaction('r', db.tables, async () => ({
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: {
      categories: await db.categories.toArray(),
      activities: await db.activities.toArray(),
      activityVersions: await db.activityVersions.toArray(),
      activityStatusEvents: await db.activityStatusEvents.toArray(),
      completions: await db.completions.toArray(),
      missions: await db.missions.toArray(),
      missionEvents: await db.missionEvents.toArray(),
      achievements: await db.achievements.toArray(),
      settings: (await db.settings.toArray()).filter((s) => !DEVICE_SETTINGS.has(s.key)),
    },
  }));
}

export function backupFileName(now: Date): string {
  return `arvid-backup-${toLocalDate(now)}.json`;
}

// ---------- Validar (BAK-04) ----------

export type BackupError =
  | { code: 'invalid-json' }
  | { code: 'not-arvid' }
  | { code: 'too-new' }
  | { code: 'invalid'; detail: string }
  | { code: 'broken-references'; detail: string };

export interface BackupSummary {
  exportedAt: string;
  appVersion: string;
  activities: number;
  completions: number;
}

export type ParseResult = { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: BackupError };

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'invalid-json' } };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    return { ok: false, error: { code: 'not-arvid' } };
  }
  const versions = raw as { formatVersion?: unknown; schemaVersion?: unknown };
  if (
    (typeof versions.formatVersion === 'number' && versions.formatVersion > BACKUP_FORMAT_VERSION) ||
    (typeof versions.schemaVersion === 'number' && versions.schemaVersion > SCHEMA_VERSION)
  ) {
    return { ok: false, error: { code: 'too-new' } };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: { code: 'invalid', detail: `${issue?.path.join('.') ?? ''}: ${issue?.message ?? ''}` } };
  }
  const broken = findBrokenReference(parsed.data);
  if (broken) return { ok: false, error: { code: 'broken-references', detail: broken } };
  const { data } = parsed.data;
  return {
    ok: true,
    backup: parsed.data,
    summary: {
      exportedAt: parsed.data.exportedAt,
      appVersion: parsed.data.appVersion,
      activities: data.activities.length,
      completions: data.completions.length,
    },
  };
}

function findBrokenReference({ data }: Backup): string | undefined {
  const tables: [string, { id: string }[]][] = [
    ['categories', data.categories],
    ['activities', data.activities],
    ['activityVersions', data.activityVersions],
    ['activityStatusEvents', data.activityStatusEvents],
    ['completions', data.completions],
    ['missions', data.missions],
    ['missionEvents', data.missionEvents],
    ['achievements', data.achievements],
  ];
  for (const [name, rows] of tables) {
    if (new Set(rows.map((r) => r.id)).size !== rows.length) return `${name}: IDs duplicados`;
  }
  const categories = new Set(data.categories.map((c) => c.id));
  const activities = new Set(data.activities.map((a) => a.id));
  const missions = new Set(data.missions.map((m) => m.id));
  const check = (ok: boolean, what: string) => (ok ? undefined : what);
  for (const v of data.activityVersions) {
    const e = check(activities.has(v.activityId), `versión ${v.id} sin actividad`) ?? check(categories.has(v.categoryId), `versión ${v.id} sin categoría`);
    if (e) return e;
  }
  for (const e of data.activityStatusEvents) if (!activities.has(e.activityId)) return `evento ${e.id} sin actividad`;
  for (const c of data.completions) if (!activities.has(c.activityId)) return `registro ${c.id} sin actividad`;
  for (const m of data.missions) if (!categories.has(m.categoryId)) return `misión ${m.id} sin categoría`;
  for (const e of data.missionEvents) if (!missions.has(e.missionId)) return `evento ${e.id} sin misión`;
  for (const a of data.activities) {
    if (!data.activityVersions.some((v) => v.activityId === a.id)) return `actividad ${a.id} sin configuración`;
    if (!data.activityStatusEvents.some((e) => e.activityId === a.id && e.type === 'created')) return `actividad ${a.id} sin creación`;
  }
  return undefined;
}

// ---------- Reemplazar (BAK-06) ----------

export function missionsFromBackup({ data }: Backup): MissionRecord[] {
  return data.missions.map((mission) => ({ mission, events: data.missionEvents.filter((e) => e.missionId === mission.id) }));
}

export function recordsFromBackup({ data }: Backup): ActivityRecord[] {
  return data.activities.map((activity) => ({
    activity,
    versions: data.activityVersions.filter((v) => v.activityId === activity.id),
    events: data.activityStatusEvents.filter((e) => e.activityId === activity.id),
    completions: data.completions.filter((c) => c.activityId === activity.id),
  })) as ActivityRecord[];
}

/** Sustituye todos los datos en una sola transacción; si algo falla, no cambia nada. */
export async function replaceAllData(ctx: DataContext, backup: Backup): Promise<void> {
  const { db } = ctx;
  const { data } = backup;
  const level = analyze(recordsFromBackup(backup), toLocalDate(ctx.now()), missionsFromBackup(backup)).progress.level;
  await db.transaction('rw', db.tables, async () => {
    const device = (await db.settings.toArray()).filter((s) => DEVICE_SETTINGS.has(s.key));
    await Promise.all(db.tables.map((t) => t.clear()));
    await db.categories.bulkAdd(data.categories);
    await db.activities.bulkAdd(data.activities);
    await db.activityVersions.bulkAdd(data.activityVersions as ActivityVersion[]);
    await db.activityStatusEvents.bulkAdd(data.activityStatusEvents as ActivityStatusEvent[]);
    await db.completions.bulkAdd(data.completions as Completion[]);
    await db.missions.bulkAdd(data.missions);
    await db.missionEvents.bulkAdd(data.missionEvents);
    await db.achievements.bulkAdd(data.achievements);
    await db.settings.bulkPut([
      ...data.settings.filter((s) => !DEVICE_SETTINGS.has(s.key)),
      ...device,
      { key: 'lastCelebratedLevel', value: level },
      { key: 'lastBackupAt', value: backup.exportedAt },
    ]);
  });
}

// ---------- Eliminar todo (DEL-01) ----------

export async function deleteAllData(ctx: DataContext): Promise<void> {
  const { db } = ctx;
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  await ensureSeed(ctx);
}
