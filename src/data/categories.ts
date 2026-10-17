import { validateCategoryInput, type CategoryInput, type CategoryInputErrors } from '../domain/categories';
import { MAX_ACTIVE_CATEGORIES } from '../domain/config';
import type { DataContext } from './repository';

export type CategoryResult = { ok: true; id: string } | { ok: false; errors: CategoryInputErrors };

/** CAT-04: se crea activa si hay hueco (máximo 8 activas). */
export async function createCategory(ctx: DataContext, input: CategoryInput): Promise<CategoryResult> {
  const { db } = ctx;
  return db.transaction('rw', db.categories, async () => {
    const categories = await db.categories.toArray();
    const errors = validateCategoryInput(input, categories);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    const id = ctx.newId();
    const active = categories.filter((c) => c.active && !c.archivedAt).length < MAX_ACTIVE_CATEGORIES;
    const order = categories.reduce((max, c) => Math.max(max, c.order), -1) + 1;
    await db.categories.add({ id, name: input.name.trim(), color: input.color, icon: input.icon, active, order });
    return { ok: true, id };
  });
}

/** CAT-05: renombrar y cambiar color o icono (también las predefinidas). */
export async function updateCategory(ctx: DataContext, id: string, input: CategoryInput): Promise<CategoryResult> {
  const { db } = ctx;
  return db.transaction('rw', db.categories, async () => {
    const categories = await db.categories.toArray();
    if (!categories.some((c) => c.id === id)) return { ok: false, errors: { name: 'Categoría no encontrada' } };
    const errors = validateCategoryInput(input, categories, id);
    if (Object.keys(errors).length > 0) return { ok: false, errors };
    await db.categories.update(id, { name: input.name.trim(), color: input.color, icon: input.icon });
    return { ok: true, id };
  });
}

/** CAT-06: ¿tiene historial? Cualquier versión de actividad o misión que la use. */
export async function categoryHasHistory(ctx: DataContext, id: string): Promise<boolean> {
  const { db } = ctx;
  const [versions, missions] = await Promise.all([
    db.activityVersions.filter((v) => v.categoryId === id).count(),
    db.missions.filter((m) => m.categoryId === id).count(),
  ]);
  return versions + missions > 0;
}

/** CAT-06: solo las propias sin historial. */
export async function deleteCategory(ctx: DataContext, id: string): Promise<boolean> {
  const { db } = ctx;
  return db.transaction('rw', db.categories, db.activityVersions, db.missions, async () => {
    const category = await db.categories.get(id);
    if (!category || category.presetKey || (await categoryHasHistory(ctx, id))) return false;
    await db.categories.delete(id);
    return true;
  });
}
