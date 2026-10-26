// Spec 12, DS: descansos (crear, editar, cancelar), migración a la versión 2 y backups con y sin descansos.
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { asLocalDate } from '../domain/time/localDate';
import { buildBackup, parseBackup, replaceAllData } from './backup';
import { ArvidDB } from './db';
import { cancelRest, createActivity, createRest, ensureSeed, loadCategories, loadRecords, loadRests, updateRest, type DataContext } from './repository';

let db: ArvidDB;
let ctx: DataContext;
let n = 0;
let now = new Date('2026-10-26T10:00:00');
const d = asLocalDate;

beforeEach(async () => {
  db = new ArvidDB(`rests-${++n}`);
  let id = 0;
  now = new Date('2026-10-26T10:00:00');
  ctx = { db, now: () => now, newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});
afterEach(async () => {
  await db.delete();
});

const activity = async (name: string) =>
  createActivity(ctx, { name, config: { period: 'day', target: 1, difficulty: 'medium', categoryId: (await loadCategories(db))[0]!.id } });

describe('crear, editar y cancelar (DS-01, DS-02)', () => {
  it('solo desde hoy en adelante; para todas o para las elegidas', async () => {
    const leer = await activity('Leer');
    const gym = await activity('Gym');
    expect(await createRest(ctx, { from: d('2026-10-25'), to: d('2026-10-27') })).toEqual({ ok: false, error: 'from-past' });
    expect(await createRest(ctx, { from: d('2026-10-28'), to: d('2026-10-27') })).toEqual({ ok: false, error: 'to-before-from' });
    expect((await createRest(ctx, { from: d('2026-10-31'), to: d('2026-11-01'), note: ' Viaje ' })).ok).toBe(true);
    expect((await createRest(ctx, { from: d('2026-10-28'), to: d('2026-10-28'), activityIds: [gym] })).ok).toBe(true);
    const records = await loadRecords(db);
    expect(records.find((r) => r.activity.id === leer)!.rests).toEqual([{ from: '2026-10-31', to: '2026-11-01' }]);
    expect(records.find((r) => r.activity.id === gym)!.rests).toHaveLength(2);
    expect((await loadRests(db)).find((r) => r.from === '2026-10-31')!.note).toBe('Viaje');
  });

  it('cancelar uno en curso conserva los días pasados; uno futuro se borra', async () => {
    const r = await createRest(ctx, { from: d('2026-10-26'), to: d('2026-10-30') });
    const f = await createRest(ctx, { from: d('2026-11-05'), to: d('2026-11-06') });
    now = new Date('2026-10-28T10:00:00');
    await cancelRest(ctx, (r as { id: string }).id);
    await cancelRest(ctx, (f as { id: string }).id);
    expect((await loadRests(db)).map(({ from, to }) => ({ from, to }))).toEqual([{ from: '2026-10-26', to: '2026-10-27' }]);
  });

  it('editar uno en curso mantiene su inicio', async () => {
    const r = (await createRest(ctx, { from: d('2026-10-26'), to: d('2026-10-28') })) as { id: string };
    now = new Date('2026-10-27T10:00:00');
    expect((await updateRest(ctx, r.id, { from: d('2026-10-27'), to: d('2026-10-31') })).ok).toBe(true);
    expect((await loadRests(db))[0]).toMatchObject({ from: '2026-10-26', to: '2026-10-31' });
  });
});

describe('migración y backup (R12-3)', () => {
  it('una base de la versión 1 se abre en la 2 con sus datos y la tabla de descansos vacía', async () => {
    const name = `v1-${++n}`;
    const old = new Dexie(name);
    old.version(1).stores({ activities: 'id, order', settings: 'key' });
    await old.open();
    await old.table('activities').add({ id: 'a1', name: 'Leer', order: 0 });
    old.close();
    const upgraded = new ArvidDB(name);
    expect(await upgraded.activities.get('a1')).toMatchObject({ name: 'Leer' });
    expect(await upgraded.rests.count()).toBe(0);
    await upgraded.delete();
  });

  it('un backup sin descansos (versión 1) se importa; uno con descansos los conserva', async () => {
    await activity('Leer');
    await createRest(ctx, { from: d('2026-10-30'), to: d('2026-10-31'), note: 'Viaje' });
    const backup = JSON.parse(JSON.stringify(await buildBackup(db, '1.3.0', now)));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) await replaceAllData(ctx, parsed.backup);
    expect(await loadRests(db)).toHaveLength(1);

    const legacy = { ...backup, schemaVersion: 1, data: { ...backup.data } };
    delete legacy.data.rests;
    const old = parseBackup(JSON.stringify(legacy));
    expect(old.ok).toBe(true);
    if (old.ok) await replaceAllData(ctx, old.backup);
    expect(await loadRests(db)).toHaveLength(0);
  });
});
