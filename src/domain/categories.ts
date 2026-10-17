import { CATEGORY_NAME_MAX, MAX_ACTIVE_CATEGORIES } from './config';
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

/** Colores e iconos disponibles para categorías (design-system §3, CAT-04). */
export const CATEGORY_COLORS: readonly CategoryColor[] = ['orange', 'sky', 'cyan', 'gold', 'lime', 'fog', 'green', 'white'];
export const CATEGORY_ICONS: readonly string[] = [
  'cat-body',
  'cat-rest',
  'cat-mind',
  'cat-learning',
  'cat-relationships',
  'cat-order',
  'cat-key',
  'cat-music',
  'cat-coin',
  'cat-apple',
  'cat-potion',
  'cat-gem',
  'cat-tree',
  'cat-sword',
];

export interface CategoryInput {
  name: string;
  color: CategoryColor;
  icon: string;
}

export interface CategoryInputErrors {
  name?: string;
  color?: string;
  icon?: string;
}

/** Nombre de 1 a 24 caracteres, único sin distinguir mayúsculas; color e icono del set (CAT-04, CAT-05). */
export function validateCategoryInput(input: CategoryInput, categories: readonly Category[], excludeId?: string): CategoryInputErrors {
  const errors: CategoryInputErrors = {};
  const name = input.name.trim();
  if (!name) errors.name = 'Escribe un nombre';
  else if (name.length > CATEGORY_NAME_MAX) errors.name = `Máximo ${CATEGORY_NAME_MAX} caracteres`;
  else if (categories.some((c) => c.id !== excludeId && c.name.trim().toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
    errors.name = 'Ya tienes una categoría con ese nombre';
  }
  if (!CATEGORY_COLORS.includes(input.color)) errors.color = 'Elige un color';
  if (!CATEGORY_ICONS.includes(input.icon)) errors.icon = 'Elige un icono';
  return errors;
}

/** Primer color que no usa ninguna categoría activa (CAT-04). */
export function suggestColor(categories: readonly Category[]): CategoryColor {
  const used = new Set(categories.filter((c) => c.active).map((c) => c.color));
  return CATEGORY_COLORS.find((c) => !used.has(c)) ?? CATEGORY_COLORS[0]!;
}
