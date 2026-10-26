// Objetivos con hitos (spec 12, OB): crear, editar, abandonar y activar el siguiente hito al completar el anterior.
import {
  activationDeadline,
  goalStatus,
  nextToActivate,
  validateGoalInput,
  type Goal,
  type GoalInput,
  type GoalInputErrors,
  type Milestone,
} from '../domain/goals/goals';
import type { MissionRecord } from '../domain/missions/missions';
import { toLocalDate, type LocalDate } from '../domain/time/localDate';
import type { ArvidDB } from './db';
import { abandonMission, loadMissions } from './missions';
import type { DataContext } from './repository';

export async function loadGoals(db: ArvidDB): Promise<Goal[]> {
  return db.goals.toArray();
}

export type GoalResult = { ok: true; id: string } | { ok: false; errors: GoalInputErrors };

const missionMap = (records: MissionRecord[]) => new Map(records.map((r) => [r.mission.id, r]));

/** Convierte el hito en misión (OB-04), con su fecha si aún no ha pasado (OB-05). Dentro de una transacción. */
async function activate(ctx: DataContext, goal: Goal, index: number, today: LocalDate): Promise<Milestone[]> {
  const m = goal.milestones[index]!;
  const { deadline, time, dropped } = activationDeadline(m, today);
  const now = ctx.now().toISOString();
  const missionId = ctx.newId();
  await ctx.db.missions.add({
    id: missionId,
    title: m.title,
    categoryId: goal.categoryId,
    difficulty: m.difficulty,
    createdAt: now,
    createdOn: today,
    goalId: goal.id,
    ...(time ? { time } : {}),
  });
  if (deadline) await ctx.db.missionEvents.add({ id: ctx.newId(), missionId, type: 'deadlineSet', date: today, deadline, at: now });
  return goal.milestones.map((x, i) => (i === index ? { ...x, missionId, ...(dropped ? { deadlineDropped: true } : {}) } : x));
}

/** OB-02: crea el objetivo y activa su primer hito. */
export async function createGoal(ctx: DataContext, input: GoalInput): Promise<GoalResult> {
  const today = toLocalDate(ctx.now());
  const errors = validateGoalInput(input, today);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const id = ctx.newId();
  const description = input.description?.trim();
  const goal: Goal = {
    id,
    title: input.title.trim(),
    categoryId: input.categoryId!,
    ...(input.targetDate ? { targetDate: input.targetDate } : {}),
    ...(description ? { description } : {}),
    createdAt: ctx.now().toISOString(),
    createdOn: today,
    milestones: input.milestones.map((m) => ({
      id: ctx.newId(),
      title: m.title.trim(),
      difficulty: m.difficulty,
      ...(m.deadline ? { deadline: m.deadline } : {}),
      ...(m.deadline && m.time ? { time: m.time } : {}),
    })),
  };
  await ctx.db.transaction('rw', ctx.db.goals, ctx.db.missions, ctx.db.missionEvents, async () => {
    await ctx.db.goals.add({ ...goal, milestones: await activate(ctx, goal, 0, today) });
  });
  return { ok: true, id };
}

/**
 * OB-07: título, descripción, fecha meta y categoría (para los hitos que vengan); los hitos ya activados se mantienen
 * (se editan como misiones) y los pendientes se sustituyen por los del formulario, en su orden.
 */
export async function updateGoal(ctx: DataContext, id: string, input: GoalInput): Promise<GoalResult> {
  const today = toLocalDate(ctx.now());
  return ctx.db.transaction('rw', ctx.db.goals, ctx.db.missions, ctx.db.missionEvents, async () => {
    const goal = await ctx.db.goals.get(id);
    if (!goal) return { ok: false, errors: { title: 'notFound' } };
    const activated = goal.milestones.filter((m) => m.missionId);
    const errors = validateGoalInput(input, today, activated.length);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const previous = new Map(goal.milestones.map((m) => [m.id, m]));
    const pending: Milestone[] = input.milestones.slice(activated.length).map((m) => ({
      id: m.id && previous.has(m.id) && !previous.get(m.id)!.missionId ? m.id : ctx.newId(),
      title: m.title.trim(),
      difficulty: m.difficulty,
      ...(m.deadline ? { deadline: m.deadline } : {}),
      ...(m.deadline && m.time ? { time: m.time } : {}),
    }));
    const description = input.description?.trim();
    const updated: Goal = {
      ...goal,
      title: input.title.trim(),
      categoryId: input.categoryId!,
      targetDate: input.targetDate || undefined,
      description: description || undefined,
      milestones: [...activated, ...pending],
    };
    // Si se añadieron hitos a uno cuyo último hito ya estaba completado, el siguiente se activa ya
    const next = nextToActivate(updated, missionMap(await loadMissions(ctx.db)), today);
    await ctx.db.goals.put(next === undefined ? updated : { ...updated, milestones: await activate(ctx, updated, next, today) });
    return { ok: true, id };
  });
}

/** OB-04: tras completar un hito, activa el siguiente (si toca). Devuelve si activó alguno. */
export async function advanceGoal(ctx: DataContext, goalId: string): Promise<boolean> {
  const today = toLocalDate(ctx.now());
  return ctx.db.transaction('rw', ctx.db.goals, ctx.db.missions, ctx.db.missionEvents, async () => {
    const goal = await ctx.db.goals.get(goalId);
    if (!goal) return false;
    const next = nextToActivate(goal, missionMap(await loadMissions(ctx.db)), today);
    if (next === undefined) return false;
    await ctx.db.goals.put({ ...goal, milestones: await activate(ctx, goal, next, today) });
    return true;
  });
}

/** OB-09: abandona el hito activo (reglas de las misiones) y el objetivo; el resto de hitos no se crea. */
export async function abandonGoal(ctx: DataContext, goalId: string): Promise<boolean> {
  const today = toLocalDate(ctx.now());
  const goal = await ctx.db.goals.get(goalId);
  if (!goal || goal.abandonedOn) return false;
  const status = goalStatus(goal, missionMap(await loadMissions(ctx.db)), today);
  if (status.state !== 'active') return false;
  const active = status.activeIndex !== undefined ? goal.milestones[status.activeIndex]?.missionId : undefined;
  if (active) await abandonMission(ctx, active);
  await ctx.db.goals.update(goalId, { abandonedOn: today });
  return true;
}

/** OB-08: la celebración de un objetivo cumplido se hace una sola vez. */
export async function markGoalCelebrated(db: ArvidDB, goalId: string): Promise<void> {
  await db.goals.update(goalId, { celebrated: true });
}
