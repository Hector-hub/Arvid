import { describe, expect, it } from 'vitest';
import {
  PENDING_BURST_MAX_MS,
  burst,
  createScene,
  duePendingBursts,
  seededRng,
  stepScene,
  visibleLamps,
  type SceneConfig,
  type SceneState,
} from './scene';

const CFG: SceneConfig = {
  carWidths: [96, 93, 163],
  pedestrians: Array.from({ length: 10 }, () => ({ height: 34, frames: 6 })),
  frameSize: 48,
};

/** Simula `seconds` a `hz` y llama a `each` tras cada paso. */
function run(seconds: number, hz: number, seed = 1, each?: (s: SceneState) => void, cfg = CFG) {
  const rng = seededRng(seed);
  const s = createScene(rng);
  const dt = 60 / hz;
  for (let i = 0; i < seconds * hz; i++) {
    stepScene(s, dt, rng, cfg);
    each?.(s);
  }
  return s;
}

describe('escena: tiempo (ESC-09)', () => {
  it('a 60, 120 y 144 Hz avanza lo mismo en 10 s', () => {
    const a = run(10, 60).offset;
    for (const hz of [120, 144]) expect(Math.abs(run(10, hz).offset - a) / a).toBeLessThan(0.02);
    expect(a).toBeCloseTo(0.55 * 600, 5);
  });

  it('tras una pausa larga no salta: como mucho 3 fotogramas', () => {
    const rng = seededRng(2);
    const s = createScene(rng);
    stepScene(s, 500, rng, CFG);
    expect(s.offset).toBeCloseTo(0.55 * 3);
  });
});

describe('escena: vehículos (ESC-05)', () => {
  it('circulan en ambos sentidos, alternando, y nunca dos a la vez en el mismo carril', () => {
    const spawns: number[] = [];
    let prev = 0;
    run(30 * 60, 60, 3, (s) => {
      const right = s.cars.filter((c) => c.dir > 0).length;
      const left = s.cars.filter((c) => c.dir < 0).length;
      expect(right).toBeLessThanOrEqual(1);
      expect(left).toBeLessThanOrEqual(1);
      if (s.cars.length > prev) spawns.push(s.cars[s.cars.length - 1]!.dir);
      prev = s.cars.length;
    });
    expect(spawns.length).toBeGreaterThan(100);
    const repeats = spawns.slice(1).filter((d, i) => d === spawns[i]).length;
    expect(repeats / spawns.length).toBeLessThan(0.3);
    expect(spawns).toContain(1);
    expect(spawns).toContain(-1);
  });
});

describe('escena: peatones (ESC-06)', () => {
  it('aparecen uno cada 15–25 s, en ambos sentidos y escalados a la altura del protagonista', () => {
    const seen = new Set<object>();
    const dirs: number[] = [];
    run(10 * 60, 60, 4, (s) => {
      for (const p of s.peds)
        if (!seen.has(p)) {
          seen.add(p);
          dirs.push(p.dir);
          expect(p.size).toBe(Math.round(48 * (49 / 34)));
        }
    });
    expect(seen.size).toBeGreaterThanOrEqual(24);
    expect(seen.size).toBeLessThanOrEqual(41);
    // Siempre alternan: como mucho uno más en un sentido
    const right = dirs.filter((d) => d > 0).length;
    expect(Math.abs(right - (dirs.length - right))).toBeLessThanOrEqual(1);
    expect(dirs.slice(1).every((d, i) => d !== dirs[i])).toBe(true);
  });

  it('sin peatones disponibles (licencia sin verificar) no aparece ninguno', () => {
    const s = run(120, 60, 5, undefined, { ...CFG, pedestrians: [] });
    expect(s.peds).toHaveLength(0);
  });
});

describe('escena: farolas y dron (ESC-03, ESC-07)', () => {
  it('cada farola visible está encendida o parpadea; con el tiempo alguna parpadea', () => {
    let flickered = false;
    run(120, 60, 6, (s) => {
      for (const i of visibleLamps(s.offset)) expect(s.lit.has(i)).toBe(true);
      if ([...s.lit.values()].includes(false)) flickered = true;
    });
    expect(flickered).toBe(true);
  });

  it('el dron escanea de vez en cuando y vuelve a seguir', () => {
    let scans = 0;
    let scanning = false;
    run(120, 60, 7, (s) => {
      if (s.drone.scanT >= 0 && !scanning) scans++;
      scanning = s.drone.scanT >= 0;
    });
    expect(scans).toBeGreaterThanOrEqual(2);
  });
});

describe('escena: drones del cielo (ESC-13)', () => {
  const SKY: SceneConfig = { ...CFG, skyModels: 5 };

  it('cruzan a lo lejos en ambos sentidos, a las tres distancias, como mucho 3 a la vez', () => {
    const seen = new Set<string>();
    let max = 0;
    let count = 0;
    let last = new Set<object>();
    run(600, 60, 3, (s) => {
      max = Math.max(max, s.sky.length);
      for (const d of s.sky) {
        if (!last.has(d)) count++;
        seen.add(`${d.depth}:${d.dir}`);
        expect(d.model).toBeGreaterThanOrEqual(0);
        expect(d.model).toBeLessThan(5);
        expect(d.y).toBeLessThan(90);
      }
      last = new Set(s.sky);
    }, SKY);
    expect(max).toBeLessThanOrEqual(3);
    expect(count).toBeGreaterThan(40); // uno cada 4–10 s en 10 min, salvo cuando ya hay 3
    expect(seen.size).toBe(6);
  });

  it('cada uno avanza siempre en su sentido y desaparece al salir de la escena', () => {
    const rng = seededRng(4);
    const s = createScene(rng);
    s.nextSky = 0;
    stepScene(s, 1, rng, SKY);
    const d = s.sky[0]!;
    let x = d.x;
    for (let i = 0; i < 6000 && s.sky.includes(d); i++) {
      stepScene(s, 1, rng, SKY);
      if (s.sky.includes(d)) expect((d.x - x) * d.dir).toBeGreaterThan(0);
      x = d.x;
    }
    expect(s.sky).not.toContain(d);
  });

  it('sin modelos no aparece ninguno; con movimiento reducido no hay drones', () => {
    run(120, 60, 5, (s) => expect(s.sky).toHaveLength(0));
    const rng = seededRng(6);
    const s = run(60, 60, 6, undefined, SKY);
    expect(s.sky.length).toBeGreaterThan(0);
    stepScene(s, 1, rng, SKY, true);
    expect(s.sky).toHaveLength(0);
  });
});

describe('escena: movimiento reducido (ESC-11)', () => {
  it('no se mueve nada, las farolas quedan encendidas y no hay partículas', () => {
    const rng = seededRng(8);
    const s = createScene(rng);
    burst(s, 'small', rng);
    stepScene(s, 1, rng, CFG, true);
    expect(s.offset).toBe(0);
    expect(s.t).toBe(0);
    expect(s.particles).toHaveLength(0);
    expect([...s.lit.values()].every(Boolean)).toBe(true);
  });
});

describe('partículas (PAR)', () => {
  it('ráfaga pequeña de 30 y grande de 130; se desvanecen en menos de 1 s', () => {
    const rng = seededRng(9);
    const s = createScene(rng);
    burst(s, 'small', rng);
    expect(s.particles).toHaveLength(30);
    burst(s, 'big', rng);
    expect(s.particles).toHaveLength(160);
    for (let i = 0; i < 60; i++) stepScene(s, 1, rng, CFG);
    expect(s.particles).toHaveLength(0);
  });

  it('pendientes: valen durante 10 s; si hay una grande, basta con esa (PAR-03)', () => {
    const now = 100_000;
    expect(duePendingBursts([], now)).toEqual([]);
    expect(duePendingBursts([{ kind: 'small', at: now - 3_000 }], now)).toEqual(['small']);
    expect(duePendingBursts([{ kind: 'small', at: now - PENDING_BURST_MAX_MS }], now)).toEqual([]);
    expect(
      duePendingBursts(
        [
          { kind: 'small', at: now - 1_000 },
          { kind: 'big', at: now - 2_000 },
        ],
        now,
      ),
    ).toEqual(['big']);
  });
});
