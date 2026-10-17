import { MAX_ACTIVE_CATEGORIES } from './config';
import type { Instant } from './activities/types';

/** Colores de categoría válidos (design-system §3). */
export type CategoryColor = 'orange' | 'sky' | 'cyan' | 'gold' | 'lime' | 'fog' | 'green' | 'white';

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
  icon: string;
  presetKey?: string;
  active: boolean;
  archivedAt?: Instant;
  order: number;
}

export interface CategoryPreset {
  key: string;
  name: string;
  color: CategoryColor;
  icon: string;
}

/** Categorías predefinidas (S1-01, D-042). */
export const CATEGORY_PRESETS: readonly CategoryPreset[] = [
  { key: 'body', name: 'Cuerpo', color: 'orange', icon: 'cat-body' },
  { key: 'rest', name: 'Descanso', color: 'sky', icon: 'cat-rest' },
  { key: 'mind', name: 'Mente', color: 'cyan', icon: 'cat-mind' },
  { key: 'learning', name: 'Aprendizaje', color: 'gold', icon: 'cat-learning' },
  { key: 'relationships', name: 'Relaciones', color: 'lime', icon: 'cat-relationships' },
  { key: 'order', name: 'Orden', color: 'fog', icon: 'cat-order' },
];

export type CategoryToggleCheck =
  | { ok: true }
  | { ok: false; reason: 'in-use'; count: number }
  | { ok: false; reason: 'last-active' }
  | { ok: false; reason: 'too-many' };

/**
 * ¿Se puede activar o desactivar? No se desactiva una categoría con actividades activas o pausadas (CAT-02),
 * ni la última activa; no se superan las 8 activas (D-017).
 */
export function checkCategoryToggle(
  categories: readonly Category[],
  id: string,
  active: boolean,
  activitiesInUse: number,
): CategoryToggleCheck {
  const activeCount = categories.filter((c) => c.active && !c.archivedAt).length;
  if (active) {
    return activeCount >= MAX_ACTIVE_CATEGORIES ? { ok: false, reason: 'too-many' } : { ok: true };
  }
  if (activitiesInUse > 0) return { ok: false, reason: 'in-use', count: activitiesInUse };
  const target = categories.find((c) => c.id === id);
  if (target?.active && activeCount <= 1) return { ok: false, reason: 'last-active' };
  return { ok: true };
}
