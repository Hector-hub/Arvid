// DARIS en la escena (spec 08, DE): atlas `public/scene/daris.png`, celdas de 48 px, una fila por animación.
export const DARIS_CELL = 48;
/** Fila, fotogramas y duración de cada fotograma (en fotogramas de 60 Hz) de cada animación (DE-02). */
export const DARIS_ANIM = {
  idle: { row: 0, frames: 12, ticks: 6 },
  happy: { row: 1, frames: 11, ticks: 6 },
  dash: { row: 2, frames: 10, ticks: 5 },
  cheer: { row: 3, frames: 15, ticks: 6 },
} as const;
export type DarisAnim = keyof typeof DARIS_ANIM;
/** Distancia por delante del protagonista y fila inferior del cuerpo dentro de la celda (DE-01). */
export const DARIS_AHEAD = 36;
export const DARIS_BOTTOM = 39;
/** La entrada con acelerón dura 60 fotogramas (1 s) desde el borde izquierdo de la escena. */
export const DARIS_ENTRY_FRAMES = 60;
