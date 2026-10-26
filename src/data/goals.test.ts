// Spec 12, OB: objetivos con hitos en secuencia, activación, fecha pasada, abandono y backup.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { goalStatus } from '../domain/goals/goals';
import { analyzeMission } from '../domain/missions/missions';
import { asLocalDate } from '../domain/time/localDate';
import { buildBackup, parseBackup, replaceAllData } from './backup';
import { ArvidDB } from './db';
import { abandonGoal, createGoal, loadGoals, updateGoal } from './goals';
import { completeMission, deleteMission, loadMissions, uncompleteMission } from './missions';
import { ensureSeed, loadCategories, type DataContext } from './repository';

let db: ArvidDB;
let ctx: DataContext;
let n = 0;
let now = new Date('2026-10-26T10:00:00');
const d = asLocalDate;

beforeEach(async () => {
  db = new ArvidDB(`goals-${++n}`);
  let id = 0;
  now = new Date('2026-10-26T10:00:00');
  ctx = { db, now: () => now, newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});
afterEach(async () => {
  await db.delete();
});

const category = async () => (await loadCategories(db))[0]!.id;
const status = async (id: string) => {
  const goal = (await loadGoals(db)).find((g) => g.id === id)!;
  const missions = new Map((await loadMissions(db)).map((m) => [m.mission.id, m]));
  return { goal, missions, ...goalStatus(goal, missions, d(now.toISOString().slice(0, 10))) };
};

async function correr() {
  const r = await createGoal(ctx, {
    title: 'Correr 10 km',
    categoryId: await category(),
    targetDate: d('2026-12-24'),
    milestones: [
      { title: 'Correr 3 km', difficulty: 'easy', deadline: d('2026-10-30'), time: '18:00' },
      { title: 'Correr 5 km', difficulty: 'medium', deadline: d('2026-11-01') },
      { title: 'Correr 10 km', difficulty: 'hard' },
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.id;
}

describe('hitos en secuencia (OB-03, OB-04)', () => {
  it('al crear, solo el primer hito es misión, con su fecha, hora y la categoría del objetivo', async () => {
    const s = await status(await correr());
    expect(s).toMatchObject({ state: 'active', done: 0, total: 3, activeIndex: 0 });
    expect(s.missions.size).toBe(1);
    const [first] = [...s.missions.values()];
    expect(first!.mission).toMatchObject({ title: 'Correr 3 km', time: '18:00', goalId: s.goal.id, categoryId: s.goal.categoryId });
    expect(analyzeMission(first!, d('2026-10-26')).deadline).toBe('2026-10-30');
  });

  it('completar un hito activa el siguiente; el último cumple el objetivo', async () => {
    const id = await correr();
    for (let i = 0; i < 3; i++) {
      const s = await status(id);
      await completeMission(ctx, s.goal.milestones[i]!.missionId!, d('2026-10-26'));
    }
    const s = await status(id);
    expect(s).toMatchObject({ state: 'completed', done: 3, completedOn: '2026-10-26' });
    expect(s.missions.size).toBe(3);
  });

  it('OB-05: si la fecha de un hito ya pasó al activarse, se activa sin fecha y se indica', async () => {
    const id = await correr();
    now = new Date('2026-11-05T10:00:00');
    await completeMission(ctx, (await status(id)).goal.milestones[0]!.missionId!, d('2026-11-05'));
    const s = await status(id);
    const second = s.goal.milestones[1]!;
    expect(second.deadlineDropped).toBe(true);
    expect(analyzeMission(s.missions.get(second.missionId!)!, d('2026-11-05'))).toMatchObject({ state: 'pending', deadline: undefined });
  });

  it('OB-06: desmarcar el anterior no vuelve a bloquear el siguiente; un hito no se puede borrar', async () => {
    const id = await correr();
    const first = (await status(id)).goal.milestones[0]!.missionId!;
    await completeMission(ctx, first, d('2026-10-26'));
    await uncompleteMission(ctx, first);
    const s = await status(id);
    expect(s.goal.milestones[1]!.missionId).toBeDefined();
    expect(await deleteMission(ctx, s.goal.milestones[1]!.missionId!)).toBe(false);
  });
});

describe('editar y abandonar (OB-07, OB-09)', () => {
  it('editar sustituye los hitos pendientes y mantiene el activado', async () => {
    const id = await correr();
    const s = await status(id);
    const r = await updateGoal(ctx, id, {
      title: 'Correr 10 km en Navidad',
      categoryId: s.goal.categoryId,
      milestones: [
        { id: s.goal.milestones[0]!.id, title: 'Correr 3 km', difficulty: 'easy' },
        { title: 'Correr 7 km', difficulty: 'medium' },
      ],
    });
    expect(r.ok).toBe(true);
    const after = await status(id);
    expect(after.goal.milestones.map((m) => m.title)).toEqual(['Correr 3 km', 'Correr 7 km']);
    expect(after.goal.milestones[0]!.missionId).toBe(s.goal.milestones[0]!.missionId);
  });

  it('abandonar abandona el hito activo y no crea los demás', async () => {
    const id = await correr();
    expect(await abandonGoal(ctx, id)).toBe(true);
    const s = await status(id);
    expect(s.state).toBe('abandoned');
    expect(analyzeMission([...s.missions.values()][0]!, d('2026-10-26')).state).toBe('abandoned');
    expect(s.missions.size).toBe(1);
  });

  it('validación: sin hitos, título largo o fecha pasada en un hito', async () => {
    const categoryId = await category();
    expect(await createGoal(ctx, { title: 'X', categoryId, milestones: [] })).toMatchObject({ ok: false, errors: { milestones: 'milestonesRequired' } });
    expect(await createGoal(ctx, { title: 'X', categoryId, milestones: [{ title: 'a', difficulty: 'easy', deadline: d('2026-10-01') }] })).toMatchObject({
      ok: false,
      errors: { milestone: { 0: 'deadlinePast' } },
    });
    expect(await createGoal(ctx, { title: 'X', categoryId, milestones: [{ title: 'a', difficulty: 'easy', time: '10:00' }] })).toMatchObject({
      ok: false,
      errors: { milestone: { 0: 'timeNeedsDeadline' } },
    });
  });
});

describe('backup (R12-3)', () => {
  it('los objetivos y sus misiones viajan en el backup', async () => {
    await correr();
    const backup = JSON.parse(JSON.stringify(await buildBackup(db, '1.4.0', now)));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await replaceAllData(ctx, parsed.backup);
    expect(await loadGoals(db)).toHaveLength(1);
    expect((await loadMissions(db))[0]!.mission.goalId).toBeDefined();
  });
});
