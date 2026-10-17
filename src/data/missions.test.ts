import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { analyzeMission } from '../domain/missions/missions';
import { asLocalDate, toLocalDate } from '../domain/time/localDate';
import { buildBackup, deleteAllData, parseBackup, replaceAllData } from './backup';
import { ArvidDB } from './db';
import {
  abandonMission,
  clearMissionDeadline,
  completeMission,
  createMission,
  deleteMission,
  loadMissions,
  rescheduleMission,
  uncompleteMission,
  updateMission,
} from './missions';
import { ensureSeed, loadCategories, loadSettings, type DataContext } from './repository';

let db: ArvidDB;
let ctx: DataContext;
let clock: Date;
let n = 0;
const d = asLocalDate;
const setNow = (iso: string) => (clock = new Date(iso));

beforeEach(async () => {
  db = new ArvidDB(`missions-${++n}`);
  setNow('2026-10-14T10:00:00');
  let id = 0;
  ctx = { db, now: () => new Date(clock.getTime()), newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});

afterEach(async () => {
  await db.delete();
});

async function create(deadline?: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
  const categoryId = (await loadCategories(db))[0]!.id;
  const result = await createMission(ctx, { title: '  Entregar informe ', categoryId, difficulty, deadline: deadline ? d(deadline) : undefined });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.id;
}

async function state(id: string) {
  const record = (await loadMissions(db)).find((m) => m.mission.id === id)!;
  return analyzeMission(record, toLocalDate(clock));
}

describe('comandos de misiones', () => {
  it('crear guarda createdOn y deadlineSet; valida (MIS-07)', async () => {
    const id = await create('2026-10-15');
    const [record] = await loadMissions(db);
    expect(record!.mission).toMatchObject({ id, title: 'Entregar informe', createdOn: '2026-10-14' });
    expect(record!.events).toEqual([expect.objectContaining({ type: 'deadlineSet', deadline: '2026-10-15', date: '2026-10-14' })]);
    const categoryId = (await loadCategories(db))[0]!.id;
    const bad = await createMission(ctx, { title: 'x', categoryId, difficulty: 'easy', deadline: d('2026-10-13') });
    expect(bad).toEqual({ ok: false, errors: { deadline: 'La fecha límite no puede ser pasada' } });
  });

  it('completar hoy, desmarcar y "ayer" antes de la creación no permitido (GD-A5)', async () => {
    const id = await create();
    expect(await completeMission(ctx, id, d('2026-10-13'))).toBe(false);
    expect(await completeMission(ctx, id, d('2026-10-14'))).toBe(true);
    expect((await state(id)).state).toBe('completedOnTime');
    expect(await completeMission(ctx, id, d('2026-10-14'))).toBe(false);
    expect(await uncompleteMission(ctx, id)).toBe(true);
    expect((await state(id)).state).toBe('pending');
  });

  it('vence, se reprograma sin penalizar de nuevo y se recupera completándola tarde', async () => {
    const id = await create('2026-10-15');
    setNow('2026-10-16T09:00:00');
    expect((await state(id)).state).toBe('expired');
    expect(await rescheduleMission(ctx, id, d('2026-10-15'))).toBe(false); // fecha pasada
    expect(await rescheduleMission(ctx, id, d('2026-10-20'))).toBe(true);
    setNow('2026-10-21T09:00:00');
    expect(await state(id)).toMatchObject({ state: 'expired', expiredOn: '2026-10-15' });
    expect(await completeMission(ctx, id, d('2026-10-21'))).toBe(true);
    expect(await state(id)).toMatchObject({ state: 'completedLate', xpCents: 1000 });
  });

  it('quitar la fecha a una pendiente; abandonar es definitivo (R-M6)', async () => {
    const id = await create('2026-10-20');
    expect(await clearMissionDeadline(ctx, id)).toBe(true);
    expect(await clearMissionDeadline(ctx, id)).toBe(false); // ya no tiene fecha
    expect(await abandonMission(ctx, id)).toBe(true);
    expect(await completeMission(ctx, id, d('2026-10-14'))).toBe(false);
    expect(await rescheduleMission(ctx, id, d('2026-10-30'))).toBe(false);
    expect((await state(id)).state).toBe('abandoned');
  });

  it('S3-02: categoría y dificultad bloqueadas si no está pendiente; el título siempre', async () => {
    const id = await create('2026-10-15');
    const [c1, c2] = await loadCategories(db);
    await completeMission(ctx, id, d('2026-10-14'));
    expect(await updateMission(ctx, id, { title: 'Nuevo', categoryId: c2!.id, difficulty: 'hard' })).toMatchObject({ ok: true });
    const [record] = await loadMissions(db);
    expect(record!.mission).toMatchObject({ title: 'Nuevo', categoryId: c1!.id, difficulty: 'medium' });
  });

  it('S3-03: eliminar solo el mismo día y pendiente', async () => {
    const today = await create();
    const yesterday = await (async () => {
      setNow('2026-10-13T10:00:00');
      const id = await create();
      setNow('2026-10-14T10:00:00');
      return id;
    })();
    expect(await deleteMission(ctx, yesterday)).toBe(false);
    expect(await deleteMission(ctx, today)).toBe(true);
    expect((await loadMissions(db)).map((m) => m.mission.id)).toEqual([yesterday]);
  });

  it('eventos con instantes crecientes aunque el reloj no avance', async () => {
    const id = await create('2026-10-20');
    await completeMission(ctx, id, d('2026-10-14'));
    await uncompleteMission(ctx, id);
    await completeMission(ctx, id, d('2026-10-14'));
    const ats = (await loadMissions(db))[0]!.events.map((e) => e.at).sort();
    expect(new Set(ats).size).toBe(ats.length);
    expect((await state(id)).state).toBe('completedOnTime');
  });
});

describe('backup con misiones (INT-02, INT-03)', () => {
  it('ida y vuelta; el nivel celebrado incluye la XP de misiones', async () => {
    const id = await create(undefined, 'hard');
    await completeMission(ctx, id, d('2026-10-14'));
    for (let i = 0; i < 4; i++) {
      const extra = await create(undefined, 'hard');
      await completeMission(ctx, extra, d('2026-10-14'));
    }
    const text = JSON.stringify(await buildBackup(db, '0.3.0', ctx.now()));
    await deleteAllData(ctx);
    const parsed = parseBackup(text);
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.error));
    await replaceAllData(ctx, parsed.backup);
    expect(await db.missions.count()).toBe(5);
    expect((await loadSettings(db)).lastCelebratedLevel).toBe(2); // 5 × 20 XP = 100 XP
  });

  it('rechaza eventos huérfanos y deadlineSet sin fecha', async () => {
    await create('2026-10-20');
    const backup = JSON.parse(JSON.stringify(await buildBackup(db, '0.3.0', ctx.now())));
    const noDeadline = structuredClone(backup);
    delete noDeadline.data.missionEvents[0].deadline;
    expect(parseBackup(JSON.stringify(noDeadline))).toMatchObject({ ok: false, error: { code: 'invalid' } });
    const orphan = structuredClone(backup);
    orphan.data.missionEvents[0].missionId = 'no-existe';
    expect(parseBackup(JSON.stringify(orphan))).toMatchObject({ ok: false, error: { code: 'broken-references' } });
  });

  it('eliminar todo borra las misiones', async () => {
    await create();
    await deleteAllData(ctx);
    expect(await db.missions.count()).toBe(0);
    expect(await db.missionEvents.count()).toBe(0);
  });
});
