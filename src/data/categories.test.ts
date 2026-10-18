import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { categoryHasHistory, createCategory, deleteCategory, updateCategory } from './categories';
import { ArvidDB } from './db';
import { createMission } from './missions';
import { changeStatus, createActivity, ensureSeed, loadCategories, setCategoryActive, type DataContext } from './repository';
import { suggestColor } from '../domain/categories';

let db: ArvidDB;
let ctx: DataContext;
let n = 0;

beforeEach(async () => {
  db = new ArvidDB(`cats-${++n}`);
  let id = 0;
  ctx = { db, now: () => new Date('2026-10-14T10:00:00'), newId: () => `id-${++id}` };
  await ensureSeed(ctx);
});
afterEach(async () => {
  await db.delete();
});

describe('categorías propias (CAT-04 a CAT-07)', () => {
  it('crear: activa, con orden al final; nombre único sin distinguir mayúsculas', async () => {
    const result = await createCategory(ctx, { name: ' Música ', color: 'green', icon: 'cat-music' });
    expect(result.ok).toBe(true);
    const created = (await loadCategories(db)).at(-1)!;
    expect(created).toMatchObject({ name: 'Música', active: true, color: 'green', icon: 'cat-music', order: 6 });
    expect(await createCategory(ctx, { name: 'MÚSICA', color: 'white', icon: 'cat-key' })).toEqual({
      ok: false,
      errors: { name: 'nameDuplicate' },
    });
    expect(await createCategory(ctx, { name: 'X', color: 'red' as never, icon: 'nav-today' })).toMatchObject({ ok: false, errors: { color: 'colorRequired', icon: 'iconRequired' } });
  });

  it('con 8 activas, la nueva se crea inactiva', async () => {
    await createCategory(ctx, { name: 'Siete', color: 'green', icon: 'cat-key' });
    await createCategory(ctx, { name: 'Ocho', color: 'white', icon: 'cat-gem' });
    await createCategory(ctx, { name: 'Nueve', color: 'green', icon: 'cat-tree' });
    const nine = (await loadCategories(db)).find((c) => c.name === 'Nueve')!;
    expect(nine.active).toBe(false);
    expect(await setCategoryActive(ctx, nine.id, true)).toEqual({ ok: false, reason: 'too-many' });
  });

  it('renombrar una predefinida', async () => {
    const body = (await loadCategories(db))[0]!;
    expect(await updateCategory(ctx, body.id, { name: 'Salud', color: body.color, icon: body.icon })).toMatchObject({ ok: true });
    expect((await loadCategories(db))[0]!.name).toBe('Salud');
    expect(await updateCategory(ctx, body.id, { name: 'Mente', color: body.color, icon: body.icon })).toMatchObject({ ok: false });
  });

  it('CAT-06: eliminar solo propias sin historial', async () => {
    const preset = (await loadCategories(db))[0]!;
    expect(await deleteCategory(ctx, preset.id)).toBe(false);

    const music = await createCategory(ctx, { name: 'Música', color: 'green', icon: 'cat-music' });
    if (!music.ok) throw new Error();
    expect(await categoryHasHistory(ctx, music.id)).toBe(false);
    const activity = await createActivity(ctx, { name: 'Guitarra', config: { period: 'day', target: 1, difficulty: 'easy', categoryId: music.id } });
    await changeStatus(ctx, activity, 'archived');
    expect(await categoryHasHistory(ctx, music.id)).toBe(true);
    expect(await deleteCategory(ctx, music.id)).toBe(false);

    const art = await createCategory(ctx, { name: 'Arte', color: 'white', icon: 'cat-gem' });
    if (!art.ok) throw new Error();
    await createMission(ctx, { title: 'Pintar', categoryId: art.id, difficulty: 'easy' });
    expect(await deleteCategory(ctx, art.id)).toBe(false);

    const free = await createCategory(ctx, { name: 'Libre', color: 'white', icon: 'cat-key' });
    if (!free.ok) throw new Error();
    expect(await deleteCategory(ctx, free.id)).toBe(true);
  });

  it('CAT-07: las reglas de desactivación se mantienen', async () => {
    const music = await createCategory(ctx, { name: 'Música', color: 'green', icon: 'cat-music' });
    if (!music.ok) throw new Error();
    await createActivity(ctx, { name: 'Guitarra', config: { period: 'day', target: 1, difficulty: 'easy', categoryId: music.id } });
    expect(await setCategoryActive(ctx, music.id, false)).toMatchObject({ ok: false, reason: 'in-use' });
  });

  it('color sugerido: el primero no usado por las activas', async () => {
    expect(suggestColor(await loadCategories(db))).toBe('green');
  });
});
