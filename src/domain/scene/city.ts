// Ciudad viva (spec 11, CV): qué hay en la escena según el nivel. No se guarda: se deriva del nivel, que nunca baja.

/** Vecinos (D-111): fila del atlas de peatones y nombre (las descripciones van en i18n `city.neighbors.<id>`). */
export const NEIGHBORS = [
  { id: 'kenji', ped: 0, name: 'Kenji' },
  { id: 'sombra', ped: 1, name: 'Sombra' },
  { id: 'nova', ped: 2, name: 'Nova' },
  { id: 'lia', ped: 3, name: 'Lía' },
  { id: 'dex', ped: 4, name: 'Dex' },
  { id: 'omar', ped: 5, name: 'Omar' },
  { id: 'roxy', ped: 6, name: 'Roxy' },
  { id: 'teo', ped: 7, name: 'Teo' },
  { id: 'pip', ped: 8, name: 'Pip' },
  { id: 'mia', ped: 9, name: 'Mía' },
] as const;
export type NeighborId = (typeof NEIGHBORS)[number]['id'];

/**
 * Elementos que embellecen la escena; `cars` son el rojo y el amarillo, `police` el de policía; `skyline` y
 * `buildings`, las capas 2 y 3 del fondo (la 1, el horizonte lejano, está siempre).
 */
export type CityThing = 'skyline' | 'buildings' | 'lamps' | 'sky' | 'cars' | 'props' | 'police';
export type CityItem = CityThing | NeighborId;

/** Llegadas por nivel (CV-02, ajustable aquí, R11-2). */
export const CITY_UNLOCKS: readonly { level: number; items: readonly CityItem[] }[] = [
  { level: 2, items: ['lamps', 'dex'] },
  { level: 3, items: ['skyline', 'sky', 'omar'] },
  { level: 4, items: ['cars', 'lia'] },
  { level: 5, items: ['nova', 'pip'] },
  { level: 6, items: ['props', 'kenji'] },
  { level: 7, items: ['buildings', 'roxy'] },
  { level: 8, items: ['mia', 'teo'] },
  { level: 9, items: ['police'] },
  { level: 10, items: ['sombra'] },
];

export const CITY_ITEMS: readonly { level: number; item: CityItem }[] = CITY_UNLOCKS.flatMap(({ level, items }) =>
  items.map((item) => ({ level, item })),
);

export const isNeighbor = (item: CityItem): item is NeighborId => NEIGHBORS.some((n) => n.id === item);
export const neighbor = (id: NeighborId) => NEIGHBORS.find((n) => n.id === id)!;
export const neighborByPed = (ped: number) => NEIGHBORS.find((n) => n.ped === ped);

/** Lo que hay en la escena con este nivel. */
export interface City {
  /** Capas del fondo dibujadas (1–3). */
  layers: number;
  lamps: boolean;
  sky: boolean;
  props: boolean;
  /** Modelos de vehículo disponibles (0 rojo, 1 amarillo, 2 policía). */
  cars: number[];
  /** Filas de peatones disponibles. */
  peds: number[];
}

export function unlockedItems(level: number): CityItem[] {
  return CITY_ITEMS.filter((u) => u.level <= level).map((u) => u.item);
}

export function cityAt(level: number): City {
  const has = new Set(unlockedItems(level));
  return {
    layers: 1 + (has.has('skyline') ? 1 : 0) + (has.has('buildings') ? 1 : 0),
    lamps: has.has('lamps'),
    sky: has.has('sky'),
    props: has.has('props'),
    cars: [...(has.has('cars') ? [0, 1] : []), ...(has.has('police') ? [2] : [])],
    peds: NEIGHBORS.filter((n) => has.has(n.id)).map((n) => n.ped).sort((a, b) => a - b),
  };
}

/** Lo que llega al pasar del nivel `from` al `to` (AN-01, AN-03). */
export function arrivals(from: number, to: number): CityItem[] {
  return CITY_ITEMS.filter((u) => u.level > from && u.level <= to).map((u) => u.item);
}

/** Siguiente nivel con llegadas, o `undefined` con la ciudad completa (TC-02). */
export function nextArrivalLevel(level: number): number | undefined {
  return CITY_UNLOCKS.find((u) => u.level > level)?.level;
}
