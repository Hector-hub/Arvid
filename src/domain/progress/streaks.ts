import type { EvaluatedPeriod } from '../activities/periods';
import type { LocalDate } from '../time/localDate';

/** Parámetros ajustables (R-S2). */
export const WILDCARD_EVERY = 7;
export const MAX_WILDCARDS = 2;

export interface StreakState {
  current: number;
  best: number;
  wildcards: number;
  /** Inicio de los periodos cuya racha salvó un comodín (STR-04). */
  protectedPeriods: LocalDate[];
}

/** Rachas y comodines a partir de los periodos evaluados, en orden (R-S1 a R-S6, D-044, STR-01). */
export function computeStreak(periods: readonly EvaluatedPeriod[]): StreakState {
  const state: StreakState = { current: 0, best: 0, wildcards: 0, protectedPeriods: [] };
  for (const p of periods) {
    if (!p.evaluable) continue;
    if (p.fulfilled) {
      state.current++;
      state.best = Math.max(state.best, state.current);
      if (state.current % WILDCARD_EVERY === 0 && state.wildcards < MAX_WILDCARDS) state.wildcards++;
    } else if (p.closed) {
      if (state.wildcards > 0) {
        state.wildcards--;
        state.protectedPeriods.push(p.period.start);
      } else {
        state.current = 0;
      }
    }
  }
  return state;
}
