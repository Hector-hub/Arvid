// Spec 11: qué hay en la ciudad según el nivel (CV), llegadas (AN) y la escena con lo desbloqueado.
import { describe, expect, it } from 'vitest';
import { CITY_ITEMS, arrivals, cityAt, nextArrivalLevel, unlockedItems } from './city';
import { createScene, seededRng, stepScene, type SceneConfig, type SceneState } from './scene';

describe('ciudad por nivel (CV-01, CV-02)', () => {
  it('nivel 1: solo lo imprescindible', () => {
    expect(cityAt(1)).toEqual({ layers: 1, water: true, lamps: false, sky: false, props: false, cars: [], peds: [] });
  });

  it('nivel 4: farolas, drones, coches rojo y amarillo, y Dex, Omar y Lía', () => {
    expect(cityAt(4)).toEqual({ layers: 1, water: true, lamps: true, sky: true, props: false, cars: [0, 1], peds: [3, 4, 5] });
  });

  it('nivel 10: la ciudad completa (17 elementos), como antes', () => {
    expect(unlockedItems(10)).toHaveLength(CITY_ITEMS.length);
    expect(CITY_ITEMS).toHaveLength(17);
    expect(cityAt(10)).toEqual({ layers: 3, water: false, lamps: true, sky: true, props: true, cars: [0, 1, 2], peds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(cityAt(25)).toEqual(cityAt(10));
    // D-125: el río llega hasta el nivel 5
    expect([5, 6].map((l) => cityAt(l).water)).toEqual([true, false]);
    expect(nextArrivalLevel(10)).toBeUndefined();
  });

  it('AN-03: varios niveles de golpe se anuncian juntos', () => {
    expect(arrivals(3, 5)).toEqual(['cars', 'lia', 'nova', 'pip']);
    expect(arrivals(5, 6)).toEqual(['skyline', 'props', 'kenji']);
    expect(arrivals(5, 5)).toEqual([]);
    expect(nextArrivalLevel(5)).toBe(6);
  });
});

describe('escena con lo desbloqueado (CV-02, AN-02)', () => {
  const base: SceneConfig = {
    carWidths: [96, 93, 163],
    pedestrians: Array.from({ length: 10 }, () => ({ height: 34, frames: 6 })),
    frameSize: 48,
  };

  function run(cfg: SceneConfig, seconds = 300, each?: (s: SceneState) => void) {
    const rng = seededRng(7);
    const s = createScene(rng);
    for (let i = 0; i < seconds * 60; i++) {
      stepScene(s, 1, rng, cfg);
      each?.(s);
    }
    return s;
  }

  it('solo aparecen los vehículos y peatones ganados', () => {
    const cars = new Set<number>();
    const peds = new Set<number>();
    run({ ...base, carModels: [0, 1], pedTypes: [4, 5] }, 300, (s) => {
      s.cars.forEach((c) => cars.add(c.model));
      s.peds.forEach((p) => peds.add(p.type));
    });
    expect([...cars].sort()).toEqual([0, 1]);
    expect([...peds].sort()).toEqual([4, 5]);
  });

  it('nivel 1: calle vacía', () => {
    let seen = 0;
    run({ ...base, carModels: [], pedTypes: [] }, 120, (s) => (seen += s.cars.length + s.peds.length));
    expect(seen).toBe(0);
  });

  it('el recién llegado aparece antes que los demás y brilla la primera vez', () => {
    const fresh = new Set(['ped:3']);
    let first: { type: number; glow?: number } | undefined;
    run({ ...base, pedTypes: [3, 4, 5], fresh }, 60, (s) => (first ??= s.peds[0] && { ...s.peds[0] }));
    expect(first?.type).toBe(3);
    expect(first?.glow).toBeGreaterThan(0);
    expect(fresh.size).toBe(0);
  });
});
