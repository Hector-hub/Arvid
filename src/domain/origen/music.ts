// Música bloqueada (spec 17, MU, D-236): al empezar suenan las tres primeras canciones; las demás se desbloquean al
// avanzar, una cada tres tramos. Quien bloqueó la señal también tiene tramos (RI-10), sin capítulos.
import { storyOn, type OrigenState } from './origen';
import { currentChapter, openChapter, readyForNext } from './periods';

export const FREE_TRACKS = 3;
/** Al abrirse estos capítulos (o completarse sus tramos, si bloqueaste la señal), llega una canción más (MU-04). */
export const UNLOCK_AT = [3, 6, 9, 12, 15, 18];

/** Hasta dónde ha llegado el reloj de la historia: el capítulo abierto, o el tramo si se bloqueó la señal. */
export function storyProgress(state: OrigenState | undefined): number {
  const blocked = state?.blockPeriods?.length ?? (state?.contactAt ? 1 : 0);
  return Math.max(currentChapter(state), blocked);
}

/**
 * Cuántas canciones de la lista se pueden escuchar (MU-02, MU-04). La última, «Glass and Gravity», solo al terminar la
 * temporada (MU-05): hasta entonces se ve bloqueada al final de la lista.
 */
export function unlockedTracks(state: OrigenState | undefined, total: number): number {
  if (state?.seasonEndAt) return total;
  return Math.min(total - 1, FREE_TRACKS + UNLOCK_AT.filter((at) => at <= storyProgress(state)).length);
}

/** Tramos de quien bloqueó la señal (RI-10): el mismo reloj, sin capítulos. Abre el siguiente si toca. */
export function advanceBlocked(state: OrigenState, now: Date, baseXp: number): OrigenState | undefined {
  if (storyOn(state) || !state.contactAt || !state.periods?.length) return undefined;
  const shadow: OrigenState = { periods: state.blockPeriods ?? state.periods.slice(0, 1) };
  if (!readyForNext(shadow, now, baseXp, 20)) return undefined;
  return { ...state, blockPeriods: openChapter(shadow, now, baseXp).periods };
}
