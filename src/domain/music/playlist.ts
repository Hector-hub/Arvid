// Orden de la música (spec 16, PS-01; sustituye al barajado de MUS-02): las pistas suenan en orden y en bucle, con
// anterior y siguiente. Sin conexión solo cuentan las disponibles (MUS-07). Puro.

/**
 * La pista a `step` posiciones de `currentId` (1 = siguiente, −1 = anterior, 0 = la misma), saltando las que no están
 * en `available`. Sin pista actual, `step` 0 o 1 da la primera disponible. `undefined` si no hay ninguna.
 */
export function stepTrack<T extends { id: string }>(tracks: readonly T[], available: readonly T[], currentId: string | undefined, step: -1 | 0 | 1): T | undefined {
  if (available.length === 0) return undefined;
  const ok = new Set(available.map((t) => t.id));
  const n = tracks.length;
  let i = tracks.findIndex((t) => t.id === currentId);
  if (i < 0) {
    i = step === -1 ? 0 : n - 1;
    if (step === 0) step = 1;
  }
  if (step === 0 && ok.has(tracks[i]!.id)) return tracks[i];
  const dir = step === -1 ? -1 : 1;
  for (let k = 1; k <= n; k++) {
    const t = tracks[(((i + dir * k) % n) + n) % n]!;
    if (ok.has(t.id)) return t;
  }
  return undefined;
}

/** Posición (1…n) de la pista en la lista, para «Pista 2 de 5». */
export function trackPosition<T extends { id: string }>(tracks: readonly T[], id: string | undefined): number {
  return tracks.findIndex((t) => t.id === id) + 1;
}
