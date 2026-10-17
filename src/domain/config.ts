// Parámetros ajustables del motor (game-design §0). Cambiarlos recalcula todo el historial (data-model §5).
import type { PeriodKind } from './time/period';

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTY_POINTS: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 20 };

/** Límite de N por tipo de periodo (game-design §3.1). */
export const TARGET_LIMITS: Record<PeriodKind, number> = { day: 10, week: 14, month: 28 };

export const ACTIVITY_NAME_MAX = 40;
export const CATEGORY_NAME_MAX = 24;
export const MAX_ACTIVE_CATEGORIES = 8;
