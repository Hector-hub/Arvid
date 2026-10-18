// Orden de la música (spec 05, MUS-02): se barajan todas las pistas, suenan todas una vez y se vuelve a barajar
// sin empezar por la última que sonó. Puro: el azar llega como `rng`.

export interface Bag<T> {
  /** Pistas que faltan por sonar en esta ronda. */
  remaining: T[];
  last?: T;
}

export function emptyBag<T>(): Bag<T> {
  return { remaining: [] };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Siguiente pista entre `available` (p. ej. solo las guardadas en caché si no hay conexión, MUS-07).
 * Devuelve `undefined` si no hay ninguna disponible.
 */
export function nextTrack<T>(bag: Bag<T>, available: T[], rng: () => number): { track?: T; bag: Bag<T> } {
  if (available.length === 0) return { bag };
  let remaining = bag.remaining.filter((t) => available.includes(t));
  if (remaining.length === 0) {
    remaining = shuffle(available, rng);
    // No repetir la que acaba de sonar al empezar una ronda nueva
    if (remaining.length > 1 && remaining[0] === bag.last) remaining.push(remaining.shift()!);
  }
  const [track, ...rest] = remaining;
  return { track, bag: { remaining: rest, last: track } };
}
