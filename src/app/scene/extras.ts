// Atlas `public/scene/extras.png`: peatones (Free Townspeople Cyberpunk) y dron (Free Drones Pack), de CraftPix.
// Su licencia no permite publicar los archivos originales, así que se combinan en un atlas propio (asset-licenses.md).
// Una fila de 48 px por animación; los fotogramas son cuadrados de 48×48.

export const EXTRAS_FRAME = 48;

/** Peatones: fila del atlas, altura del personaje dentro del fotograma, fotogramas y duración de cada uno. */
export const PEDESTRIANS = [
  { row: 0, height: 35, frames: 6 },
  { row: 1, height: 37, frames: 6 },
  { row: 2, height: 34, frames: 6 },
  { row: 3, height: 34, frames: 6 },
  { row: 4, height: 34, frames: 6 },
  { row: 5, height: 34, frames: 6 },
  { row: 6, height: 34, frames: 6 },
  { row: 7, height: 31, frames: 4 },
  { row: 8, height: 27, frames: 6 },
  { row: 9, height: 27, frames: 6 },
].map((p) => ({ ...p, ticks: p.frames === 4 ? 15 : 11 }));

export const DRONE = {
  walk: { row: 10, frames: 4, ticks: 6 },
  scan: { row: 11, frames: 8, ticks: 7 },
  /** Se dibuja al 75 % (48 → 36 px). */
  size: 36,
} as const;
