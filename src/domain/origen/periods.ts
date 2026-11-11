// Ritmo de la historia (spec 17 §3.3, RI): los capítulos van por tramos de 7 días y experiencia, no por nivel.
import type { OrigenPeriod, OrigenState } from './origen';

/** Ninguna vara baja de aquí (RI-04). */
export const MIN_TARGET = 50;
/** Desde el tercer tramo, la vara sube como mucho un 25 % (RI-04). */
export const MAX_RISE = 1.25;
export const PERIOD_DAYS = 7;
const DAY_MS = 86_400_000;

/** Capítulo abierto ahora: el primer contacto abre el 1 (RI-01). */
export const currentChapter = (state: OrigenState | undefined) => state?.periods?.length ?? 0;

export const targetOf = (period: OrigenPeriod | undefined) => period?.target ?? MIN_TARGET;

/** XP ganada en el tramo en curso (RI-05): la de ahora menos la de su apertura. Sin la de las pruebas. */
export function periodXp(state: OrigenState | undefined, baseXp: number): number {
  const last = state?.periods?.at(-1);
  return last ? Math.max(0, baseXp - last.xpAtOpen) : 0;
}

/** El tramo en curso se superó con su prueba (el pase, RI-02). */
export function periodPassed(state: OrigenState | undefined): boolean {
  const index = currentChapter(state) - 1;
  return index >= 0 && !!state?.tests?.some((t) => t.result === 'passed' && t.period === index);
}

/**
 * El capítulo siguiente puede abrirse (RI-02): 7 días desde el anterior **y** la vara alcanzada o la prueba del tramo
 * superada. `published`: último capítulo que trae esta versión de la app; más allá, la historia espera (NFR17-10).
 */
export function readyForNext(state: OrigenState | undefined, now: Date, baseXp: number, published: number): boolean {
  const last = state?.periods?.at(-1);
  if (!last || currentChapter(state) >= published) return false;
  if (now.getTime() - Date.parse(last.openedAt) < PERIOD_DAYS * DAY_MS) return false;
  return periodXp(state, baseXp) >= targetOf(last) || periodPassed(state);
}

/** La vara del tramo que empieza (RI-03, RI-04): la XP del tramo que acaba, con el mínimo y el tope de subida. */
export function nextTarget(state: OrigenState | undefined, baseXp: number): number {
  const periods = state?.periods ?? [];
  if (periods.length === 0) return MIN_TARGET;
  let target = Math.max(MIN_TARGET, periodXp(state, baseXp));
  // El tramo que empieza es el `periods.length + 1`: desde el tercero se aplica el tope
  if (periods.length >= 2) target = Math.min(target, Math.floor(targetOf(periods.at(-1)) * MAX_RISE));
  return target;
}

/** Abre el capítulo siguiente: empieza su tramo con la XP de ahora y su vara. */
export function openChapter(state: OrigenState | undefined, now: Date, baseXp: number): OrigenState {
  const period: OrigenPeriod = { openedAt: now.toISOString(), xpAtOpen: baseXp, target: nextTarget(state, baseXp) };
  return { ...state, periods: [...(state?.periods ?? []), period] };
}
