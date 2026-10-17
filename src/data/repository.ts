import { canLog, completionToUndo, planNewVersion, statusAt, type LogCheck } from '../domain/activities/rules';
import type {
  ActivityConfig,
  ActivityRecord,
  ActivityStatusType,
  ActivityStatusEvent,
} from '../domain/activities/types';
import { CATEGORY_PRESETS, checkCategoryToggle, type Category, type CategoryToggleCheck } from '../domain/categories';
import { toLocalDate, tzOffsetMinutes, type LocalDate } from '../domain/time/localDate';
import type { ArvidDB } from './db';

/** Dependencias inyectables: base de datos, reloj y generador de IDs (tests deterministas). */
export interface DataContext {
  db: ArvidDB;
  now: () => Date;
  newId: () => string;
}

export function createContext(db: ArvidDB): DataContext {
  return { db, now: () => new Date(), newId: () => crypto.randomUUID() };
}

function today(ctx: DataContext): LocalDate {
  return toLocalDate(ctx.now());
}

// ---------- Lecturas ----------

export async function loadRecords(db: ArvidDB): Promise<ActivityRecord[]> {
  const [activities, versions, events, completions] = await Promise.all([
    db.activities.orderBy('order').toArray(),
    db.activityVersions.toArray(),
    db.activityStatusEvents.toArray(),
    db.completions.toArray(),
  ]);
  return activities.map((activity) => ({
    activity,
    versions: versions.filter((v) => v.activityId === activity.id),
    events: events.filter((e) => e.activityId === activity.id),
    completions: completions.filter((c) => c.activityId === activity.id),
  }));
}

export async function loadRecord(db: ArvidDB, activityId: string): Promise<ActivityRecord | undefined> {
  const activity = await db.activities.get(activityId);
  if (!activity) return undefined;
  const [versions, events, completions] = await Promise.all([
    db.activityVersions.where('activityId').equals(activityId).toArray(),
    db.activityStatusEvents.where('activityId').equals(activityId).toArray(),
    db.completions.where('activityId').equals(activityId).toArray(),
  ]);
  return { activity, versions, events, completions };
}

export async function loadCategories(db: ArvidDB): Promise<Category[]> {
  return db.categories.orderBy('order').toArray();
}

// ---------- Categorías ----------

/** Crea las categorías predefinidas si faltan. Idempotente (CAT-01). */
export async function ensureSeed(ctx: DataContext): Promise<void> {
  await ctx.db.transaction('rw', ctx.db.categories, async () => {
    const existing = await ctx.db.categories.toArray();
    const keys = new Set(existing.map((c) => c.presetKey));
    const missing = CATEGORY_PRESETS.filter((p) => !keys.has(p.key));
    await ctx.db.categories.bulkAdd(
      missing.map((p) => ({
        id: ctx.newId(),
        name: p.name,
        color: p.color,
        icon: p.icon,
        presetKey: p.key,
        active: true,
        order: CATEGORY_PRESETS.indexOf(p),
      })),
    );
  });
}

async function activitiesUsingCategory(ctx: DataContext, categoryId: string): Promise<number> {
  const records = await loadRecords(ctx.db);
  const t = today(ctx);
  return records.filter((r) => {
    const status = statusAt(r.events, t);
    if (status !== 'active' && status !== 'paused') return false;
    const latest = [...r.versions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
    return latest?.categoryId === categoryId;
  }).length;
}

export async function setCategoryActive(ctx: DataContext, id: string, active: boolean): Promise<CategoryToggleCheck> {
  return ctx.db.transaction('rw', [ctx.db.categories, ctx.db.activities, ctx.db.activityVersions, ctx.db.activityStatusEvents, ctx.db.completions], async () => {
    const categories = await ctx.db.categories.toArray();
    const inUse = active ? 0 : await activitiesUsingCategory(ctx, id);
    const check = checkCategoryToggle(categories, id, active, inUse);
    if (check.ok) await ctx.db.categories.update(id, { active });
    return check;
  });
}

// ---------- Actividades ----------

export interface ActivityInput {
  name: string;
  config: ActivityConfig;
}

/** ACT-02: actividad + versión desde el inicio del periodo actual + evento `created`. */
export async function createActivity(ctx: DataContext, input: ActivityInput): Promise<string> {
  const { db } = ctx;
  const id = ctx.newId();
  const t = today(ctx);
  const at = ctx.now().toISOString();
  await db.transaction('rw', [db.activities, db.activityVersions, db.activityStatusEvents], async () => {
    const last = await db.activities.orderBy('order').last();
    await db.activities.add({ id, name: input.name.trim(), order: (last?.order ?? -1) + 1 });
    const { effectiveFrom } = planNewVersion([], input.config, t);
    await db.activityVersions.add({ id: ctx.newId(), activityId: id, effectiveFrom, ...input.config });
    await db.activityStatusEvents.add({ id: ctx.newId(), activityId: id, date: t, type: 'created', at });
  });
  return id;
}

/** ACT-03: el nombre no se versiona. */
export async function renameActivity(ctx: DataContext, id: string, name: string): Promise<void> {
  await ctx.db.activities.update(id, { name: name.trim() });
}

/** ACT-04: nueva versión desde el inicio del periodo actual; sustituye las de igual o posterior vigencia. */
export async function updateActivityConfig(ctx: DataContext, id: string, config: ActivityConfig): Promise<void> {
  const { db } = ctx;
  await db.transaction('rw', db.activityVersions, async () => {
    const versions = await db.activityVersions.where('activityId').equals(id).toArray();
    const { effectiveFrom, supersededIds } = planNewVersion(versions, config, today(ctx));
    await db.activityVersions.bulkDelete(supersededIds);
    await db.activityVersions.add({ id: ctx.newId(), activityId: id, effectiveFrom, ...config });
  });
}

const ALLOWED_TRANSITIONS: Record<ActivityStatusType, ReadonlyArray<string | undefined>> = {
  created: [undefined],
  paused: ['active'],
  resumed: ['paused'],
  archived: ['active', 'paused'],
  unarchived: ['archived'],
};

/** ACT-05: pausar, reanudar, archivar y restaurar. Devuelve `false` si la transición no es válida. */
export async function changeStatus(ctx: DataContext, id: string, type: Exclude<ActivityStatusType, 'created'>): Promise<boolean> {
  const { db } = ctx;
  return db.transaction('rw', db.activityStatusEvents, async () => {
    const events = await db.activityStatusEvents.where('activityId').equals(id).toArray();
    const t = today(ctx);
    if (!ALLOWED_TRANSITIONS[type].includes(statusAt(events, t))) return false;
    // Instante estrictamente creciente por actividad, para que el orden de eventos del mismo día sea total.
    const last = events.reduce((max, e) => (e.at > max ? e.at : max), '');
    let at = ctx.now().toISOString();
    if (at <= last) at = new Date(Date.parse(last) + 1).toISOString();
    const event: ActivityStatusEvent = { id: ctx.newId(), activityId: id, date: t, type, at };
    await db.activityStatusEvents.add(event);
    return true;
  });
}

/** ACT-08: intercambia el orden con la actividad vecina del mismo grupo de estado. */
export async function moveActivity(ctx: DataContext, id: string, direction: -1 | 1): Promise<void> {
  const { db } = ctx;
  await db.transaction('rw', [db.activities, db.activityStatusEvents], async () => {
    const t = today(ctx);
    const activities = await db.activities.orderBy('order').toArray();
    const events = await db.activityStatusEvents.toArray();
    const statusOf = (aid: string) => statusAt(events.filter((e) => e.activityId === aid), t);
    const group = activities.filter((a) => statusOf(a.id) === statusOf(id));
    const index = group.findIndex((a) => a.id === id);
    const neighbor = group[index + direction];
    const current = group[index];
    if (!current || !neighbor) return;
    await db.activities.update(current.id, { order: neighbor.order });
    await db.activities.update(neighbor.id, { order: current.order });
  });
}

// ---------- Registro ----------

/** LOG-01 a LOG-03. La comprobación y la escritura van en la misma transacción (LOG-06: sin duplicados). */
export async function logCompletion(ctx: DataContext, activityId: string, date: LocalDate): Promise<LogCheck> {
  const { db } = ctx;
  return db.transaction('rw', [db.activities, db.activityVersions, db.activityStatusEvents, db.completions], async () => {
    const record = await loadRecord(db, activityId);
    if (!record) return { ok: false, reason: 'no-version' } as const;
    const check = canLog(record, date, today(ctx));
    if (!check.ok) return check;
    const now = ctx.now();
    // Instante estrictamente creciente: "deshacer" siempre identifica el registro más reciente.
    const last = record.completions.reduce((max, c) => (c.at > max ? c.at : max), '');
    let at = now.toISOString();
    if (at <= last) at = new Date(Date.parse(last) + 1).toISOString();
    await db.completions.add({ id: ctx.newId(), activityId, date, at, tzOffsetMin: tzOffsetMinutes(now) });
    return check;
  });
}

/** LOG-04: elimina el registro más reciente de esa fecha si es editable. */
export async function undoCompletion(ctx: DataContext, activityId: string, date: LocalDate): Promise<boolean> {
  const { db } = ctx;
  return db.transaction('rw', [db.activities, db.activityVersions, db.activityStatusEvents, db.completions], async () => {
    const record = await loadRecord(db, activityId);
    if (!record) return false;
    const target = completionToUndo(record, date, today(ctx));
    if (!target) return false;
    await db.completions.delete(target.id);
    return true;
  });
}

// ---------- Ajustes ----------

export interface Settings {
  onboardingCompletedAt?: string;
  lastBackupAt?: string;
  reducedMotion: 'system' | 'on' | 'off';
  vibration: boolean;
  radarWindow: 7 | 30 | 90;
  persistGranted?: boolean;
  installHintDismissedAt?: string;
}

export const DEFAULT_SETTINGS: Settings = { reducedMotion: 'system', vibration: true, radarWindow: 30 };

export async function loadSettings(db: ArvidDB): Promise<Settings> {
  const rows = await db.settings.toArray();
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) } as Settings;
}

export async function saveSetting<K extends keyof Settings>(db: ArvidDB, key: K, value: Settings[K]): Promise<void> {
  await db.settings.put({ key, value });
}
