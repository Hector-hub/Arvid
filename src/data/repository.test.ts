import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asLocalDate } from '../domain/time/localDate';
import { ArvidDB } from './db';
import {
  loadSettings,
  saveSetting,
  changeStatus,
  createActivity,
  ensureSeed,
  loadCategories,
  loadRecord,
  loadRecords,
  logCompletion,
  moveActivity,
  renameActivity,
  setCategoryActive,
  undoCompletion,
  updateActivityConfig,
  type DataContext,
} from './repository';

let db: ArvidDB;
let ctx: DataContext;
let clock: Date;
let n = 0;

function setNow(local: string) {
  clock = new Date(local);
}

beforeEach(async () => {
  db = new ArvidDB(`test-${++n}`);
  setNow('2026-10-14T10:00:00');
  let id = 0;
  ctx = { db, now: () => new Date(clock.getTime()), newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});

afterEach(async () => {
  await db.delete();
});

async function categoryId(name: string) {
  return (await loadCategories(db)).find((c) => c.name === name)!.id;
}

async function gym(target = 3) {
  return createActivity(ctx, {
    name: '  Gym ',
    config: { period: 'week', target, difficulty: 'medium', categoryId: await categoryId('Cuerpo') },
  });
}

describe('categorías', () => {
  it('CAT-01: el seed es idempotente', async () => {
    await ensureSeed(ctx);
    const categories = await loadCategories(db);
    expect(categories.map((c) => c.name)).toEqual(['Cuerpo', 'Descanso', 'Mente', 'Aprendizaje', 'Relaciones', 'Orden']);
    expect(categories.every((c) => c.active)).toBe(true);
  });

  it('CAT-02: no se desactiva una categoría con actividades activas o pausadas', async () => {
    const id = await gym();
    const cuerpo = await categoryId('Cuerpo');
    expect(await setCategoryActive(ctx, cuerpo, false)).toEqual({ ok: false, reason: 'in-use', count: 1 });
    await changeStatus(ctx, id, 'paused');
    expect(await setCategoryActive(ctx, cuerpo, false)).toMatchObject({ ok: false, reason: 'in-use' });
    await changeStatus(ctx, id, 'archived');
    expect(await setCategoryActive(ctx, cuerpo, false)).toEqual({ ok: true });
  });

  it('no se desactiva la última categoría activa', async () => {
    const categories = await loadCategories(db);
    for (const c of categories.slice(1)) await setCategoryActive(ctx, c.id, false);
    expect(await setCategoryActive(ctx, categories[0]!.id, false)).toEqual({ ok: false, reason: 'last-active' });
  });
});

describe('actividades', () => {
  it('ACT-02: crear guarda actividad, versión desde el lunes y evento created', async () => {
    const id = await gym();
    const record = (await loadRecord(db, id))!;
    expect(record.activity.name).toBe('Gym');
    expect(record.versions).toHaveLength(1);
    expect(record.versions[0]).toMatchObject({ effectiveFrom: '2026-10-12', period: 'week', target: 3 });
    expect(record.events).toEqual([expect.objectContaining({ type: 'created', date: '2026-10-14' })]);
  });

  it('ACT-03: renombrar no crea versión', async () => {
    const id = await gym();
    await renameActivity(ctx, id, 'Gimnasio');
    const record = (await loadRecord(db, id))!;
    expect(record.activity.name).toBe('Gimnasio');
    expect(record.versions).toHaveLength(1);
  });

  it('ACT-04: cambiar a 4/semana sustituye la versión de esta semana', async () => {
    const id = await gym(3);
    const cuerpo = await categoryId('Cuerpo');
    await updateActivityConfig(ctx, id, { period: 'week', target: 4, difficulty: 'medium', categoryId: cuerpo });
    const record = (await loadRecord(db, id))!;
    expect(record.versions).toHaveLength(1);
    expect(record.versions[0]).toMatchObject({ effectiveFrom: '2026-10-12', target: 4 });
  });

  it('ACT-04: un cambio en una semana posterior conserva la versión anterior', async () => {
    const id = await gym(3);
    setNow('2026-10-21T10:00:00');
    await updateActivityConfig(ctx, id, { period: 'week', target: 4, difficulty: 'hard', categoryId: await categoryId('Cuerpo') });
    const record = (await loadRecord(db, id))!;
    expect(record.versions.map((v) => [v.effectiveFrom, v.target]).sort()).toEqual([
      ['2026-10-12', 3],
      ['2026-10-19', 4],
    ]);
  });

  it('ACT-05: transiciones válidas e inválidas', async () => {
    const id = await gym();
    expect(await changeStatus(ctx, id, 'resumed')).toBe(false);
    expect(await changeStatus(ctx, id, 'paused')).toBe(true);
    expect(await changeStatus(ctx, id, 'resumed')).toBe(true);
    expect(await changeStatus(ctx, id, 'archived')).toBe(true);
    expect(await changeStatus(ctx, id, 'unarchived')).toBe(true);
  });

  it('ACT-08: mover intercambia el orden', async () => {
    const a = await gym();
    const b = await createActivity(ctx, {
      name: 'Leer',
      config: { period: 'day', target: 1, difficulty: 'easy', categoryId: await categoryId('Aprendizaje') },
    });
    await moveActivity(ctx, b, -1);
    expect((await loadRecords(db)).map((r) => r.activity.id)).toEqual([b, a]);
    await moveActivity(ctx, b, -1);
    expect((await loadRecords(db)).map((r) => r.activity.id)).toEqual([b, a]);
  });
});

describe('registro', () => {
  it('LOG-01: guarda fecha, instante y desfase', async () => {
    const id = await gym();
    expect(await logCompletion(ctx, id, asLocalDate('2026-10-14'))).toEqual({ ok: true });
    const [c] = (await loadRecord(db, id))!.completions;
    expect(c).toMatchObject({ date: '2026-10-14', at: clock.toISOString(), tzOffsetMin: -clock.getTimezoneOffset() || 0 });
  });

  it('LOG-02 y LOG-06: no supera N aunque se registre en paralelo', async () => {
    const id = await gym(3);
    const date = asLocalDate('2026-10-14');
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => logCompletion(ctx, id, date)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect((await loadRecord(db, id))!.completions).toHaveLength(3);
  });

  it('LOG-04: deshacer quita el más reciente; no actúa fuera de plazo', async () => {
    const id = await createActivity(ctx, {
      name: 'Caminar',
      config: { period: 'day', target: 1, difficulty: 'easy', categoryId: await categoryId('Cuerpo') },
    });
    await logCompletion(ctx, id, asLocalDate('2026-10-14'));
    setNow('2026-10-16T09:00:00');
    expect(await undoCompletion(ctx, id, asLocalDate('2026-10-14'))).toBe(false);
    setNow('2026-10-15T09:00:00');
    expect(await undoCompletion(ctx, id, asLocalDate('2026-10-14'))).toBe(true);
    expect((await loadRecord(db, id))!.completions).toHaveLength(0);
  });

  it('ACT-06: una actividad pausada no admite registros', async () => {
    const id = await gym();
    await changeStatus(ctx, id, 'paused');
    expect(await logCompletion(ctx, id, asLocalDate('2026-10-14'))).toEqual({ ok: false, reason: 'inactive' });
  });
});

describe('compañero (spec 08, CO-01, DC-02)', () => {
  it('por defecto ARVID y DARIS rosa; los valores desconocidos se normalizan; cada color es independiente', async () => {
    let s = await loadSettings(db);
    expect([s.companion, s.darisColor]).toEqual(['arvid', 'rosa']);
    await db.settings.bulkPut([
      { key: 'companion', value: 'gato' },
      { key: 'darisColor', value: 'oro' },
    ]);
    s = await loadSettings(db);
    expect([s.companion, s.darisColor]).toEqual(['arvid', 'rosa']);
    await saveSetting(db, 'companion', 'daris');
    await saveSetting(db, 'darisColor', 'lima');
    s = await loadSettings(db);
    expect([s.companion, s.darisColor, s.arvidColor]).toEqual(['daris', 'lima', 'cian']);
  });
});
