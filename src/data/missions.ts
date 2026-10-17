import type { Difficulty } from '../domain/config';
import {
  analyzeMission,
  canCompleteOn,
  missionActions,
  validateMissionInput,
  type MissionEvent,
  type MissionEventType,
  type MissionInputErrors,
  type MissionRecord,
} from '../domain/missions/missions';
import { toLocalDate, type LocalDate } from '../domain/time/localDate';
import type { ArvidDB } from './db';
import type { DataContext } from './repository';

export async function loadMissions(db: ArvidDB): Promise<MissionRecord[]> {
  const [missions, events] = await Promise.all([db.missions.toArray(), db.missionEvents.toArray()]);
  return missions.map((mission) => ({ mission, events: events.filter((e) => e.missionId === mission.id) }));
}

async function loadMission(db: ArvidDB, id: string): Promise<MissionRecord | undefined> {
  const mission = await db.missions.get(id);
  if (!mission) return undefined;
  return { mission, events: await db.missionEvents.where('missionId').equals(id).toArray() };
}

export interface MissionInput {
  title: string;
  categoryId: string;
  difficulty: Difficulty;
  deadline?: LocalDate;
}

export type MissionResult = { ok: true; id: string } | { ok: false; errors: MissionInputErrors };

/** MIS-07: crea la misión y, si tiene fecha límite, su evento `deadlineSet`. */
export async function createMission(ctx: DataContext, input: MissionInput): Promise<MissionResult> {
  const now = ctx.now();
  const today = toLocalDate(now);
  const errors = validateMissionInput(input, today);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const id = ctx.newId();
  await ctx.db.transaction('rw', ctx.db.missions, ctx.db.missionEvents, async () => {
    await ctx.db.missions.add({
      id,
      title: input.title.trim(),
      categoryId: input.categoryId,
      difficulty: input.difficulty,
      createdAt: now.toISOString(),
      createdOn: today,
    });
    if (input.deadline) {
      await ctx.db.missionEvents.add({ id: ctx.newId(), missionId: id, type: 'deadlineSet', date: today, deadline: input.deadline, at: now.toISOString() });
    }
  });
  return { ok: true, id };
}

/** MIS-06: el título siempre; categoría y dificultad solo si está pendiente. */
export async function updateMission(ctx: DataContext, id: string, input: Omit<MissionInput, 'deadline'>): Promise<MissionResult> {
  const today = toLocalDate(ctx.now());
  return ctx.db.transaction('rw', ctx.db.missions, ctx.db.missionEvents, async () => {
    const record = await loadMission(ctx.db, id);
    if (!record) return { ok: false, errors: { title: 'Misión no encontrada' } };
    const errors = validateMissionInput(input, today);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const actions = missionActions(record, analyzeMission(record, today), today);
    const locked = !actions.editCategoryAndDifficulty;
    await ctx.db.missions.update(id, {
      title: input.title.trim(),
      ...(locked ? {} : { categoryId: input.categoryId, difficulty: input.difficulty }),
    });
    return { ok: true, id };
  });
}

type Action = 'complete' | 'uncomplete' | 'reschedule' | 'clearDeadline' | 'abandon';

/** Añade un evento si la acción está permitida en el estado actual; comprobación y escritura en una transacción. */
async function applyEvent(
  ctx: DataContext,
  id: string,
  action: Action,
  build: (record: MissionRecord, today: LocalDate) => Omit<MissionEvent, 'id' | 'missionId' | 'at'> | undefined,
): Promise<boolean> {
  const now = ctx.now();
  const today = toLocalDate(now);
  return ctx.db.transaction('rw', ctx.db.missions, ctx.db.missionEvents, async () => {
    const record = await loadMission(ctx.db, id);
    if (!record) return false;
    const analysis = analyzeMission(record, today);
    if (!missionActions(record, analysis, today)[action]) return false;
    const event = build(record, today);
    if (!event) return false;
    // Instante estrictamente creciente por misión (orden total de eventos, R-M11).
    const last = record.events.reduce((max, e) => (e.at > max ? e.at : max), '');
    let at = now.toISOString();
    if (at <= last) at = new Date(Date.parse(last) + 1).toISOString();
    await ctx.db.missionEvents.add({ id: ctx.newId(), missionId: id, at, ...event });
    return true;
  });
}

const simple = (type: MissionEventType) => (_: MissionRecord, today: LocalDate) => ({ type, date: today });

/** Completar con fecha de hoy o de ayer (R-M2, R-M10). */
export function completeMission(ctx: DataContext, id: string, date: LocalDate): Promise<boolean> {
  return applyEvent(ctx, id, 'complete', (record, today) =>
    canCompleteOn(record, analyzeMission(record, today), date, today) ? { type: 'completed', date } : undefined,
  );
}

export const uncompleteMission = (ctx: DataContext, id: string) => applyEvent(ctx, id, 'uncomplete', simple('uncompleted'));
export const abandonMission = (ctx: DataContext, id: string) => applyEvent(ctx, id, 'abandon', simple('abandoned'));
export const clearMissionDeadline = (ctx: DataContext, id: string) => applyEvent(ctx, id, 'clearDeadline', simple('deadlineCleared'));

/** Reprogramar (R-M3, R-M4); la fecha no puede ser pasada (S3-01). */
export function rescheduleMission(ctx: DataContext, id: string, deadline: LocalDate): Promise<boolean> {
  return applyEvent(ctx, id, 'reschedule', (_, today) => (deadline >= today ? { type: 'deadlineSet', date: today, deadline } : undefined));
}

/** Eliminar solo el día de su creación y si está pendiente (S3-03). */
export async function deleteMission(ctx: DataContext, id: string): Promise<boolean> {
  const today = toLocalDate(ctx.now());
  return ctx.db.transaction('rw', ctx.db.missions, ctx.db.missionEvents, async () => {
    const record = await loadMission(ctx.db, id);
    if (!record || !missionActions(record, analyzeMission(record, today), today).delete) return false;
    await ctx.db.missionEvents.where('missionId').equals(id).delete();
    await ctx.db.missions.delete(id);
    return true;
  });
}
