import { describe, expect, it } from 'vitest';
import { ARVID_AREA, ARVID_HOME, ENTER_KINDS, createArvid, isHome, startEntrance, stepArvid, type Prop, type PropSpec } from './arvid';
import { seededRng } from './scene';

const SPECS: PropSpec[] = [{ width: 32, height: 30 }];
const NO_PROPS = { props: [] as Prop[], offset: 0, specs: SPECS, baseline: 171 };

describe('ARVID: entrada (MV-01)', () => {
  it('llega por las tres vías y termina en su sitio en ~2 s', () => {
    const rng = seededRng(1);
    const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const a = createArvid();
      startEntrance(a, rng);
      kinds.add(a.enter!.kind);
      for (let f = 0; f < 120; f++) stepArvid(a, 1, rng, NO_PROPS);
      expect(isHome(a)).toBe(true);
      expect({ x: a.x, y: a.y, scale: a.scale, alpha: a.alpha }).toEqual({ ...ARVID_HOME, scale: 1, alpha: 1 });
    }
    expect([...kinds].sort()).toEqual([...ENTER_KINDS].sort());
  });

  it('desde el fondo empieza pequeño y semitransparente', () => {
    const a = createArvid();
    startEntrance(a, seededRng(2), 'depth');
    expect(a.scale).toBeLessThan(0.5);
    expect(a.alpha).toBeLessThan(0.5);
  });
});

describe('ARVID: paseos (MV-02, MV-03)', () => {
  it('sale, se queda dentro de la escena y vuelve a su sitio', () => {
    const rng = seededRng(3);
    const a = createArvid();
    let outings = 0;
    let wasHome = true;
    for (let f = 0; f < 60 * 60 * 5; f++) {
      stepArvid(a, 1, rng, NO_PROPS);
      expect(a.x).toBeGreaterThanOrEqual(ARVID_AREA.minX - 1);
      expect(a.x).toBeLessThanOrEqual(ARVID_AREA.maxX + 1);
      expect(a.y).toBeGreaterThanOrEqual(ARVID_AREA.minY - 1);
      if (wasHome && !isHome(a)) outings++;
      wasHome = isHome(a);
    }
    expect(outings).toBeGreaterThanOrEqual(5); // cada 20–40 s más el paseo
  });

  it('a veces se acerca a un detalle de la acera, lo escanea y vuelve', () => {
    const rng = seededRng(4);
    const a = createArvid();
    a.nextOuting = 0;
    let scanned = false;
    for (let f = 0; f < 60 * 60 * 10 && !scanned; f++) {
      // Un detalle siempre a la vista para que pueda elegirlo
      stepArvid(a, 1, rng, { props: [{ id: 1, kind: 0, wx: 200 }], offset: 0, specs: SPECS, baseline: 171 });
      if (a.phase === 'scanProp') {
        scanned = true;
        expect(Math.round(a.x)).toBe(216); // centro del detalle
      }
    }
    expect(scanned).toBe(true);
  });
});

describe('ARVID: hablar desde su sitio (MV-04) y movimiento reducido (MV-05)', () => {
  it('si le piden hablar a mitad de un paseo, vuelve antes', () => {
    const rng = seededRng(5);
    const a = createArvid();
    a.nextOuting = 0;
    stepArvid(a, 1, rng, NO_PROPS);
    for (let f = 0; f < 200; f++) stepArvid(a, 1, rng, NO_PROPS);
    expect(isHome(a)).toBe(false);
    a.wantsHome = true;
    let f = 0;
    while (!isHome(a) && f++ < 1000) stepArvid(a, 1, rng, NO_PROPS);
    expect(isHome(a)).toBe(true);
    // Mientras deba hablar, no vuelve a salir
    for (let i = 0; i < 5000; i++) stepArvid(a, 1, rng, NO_PROPS);
    expect(isHome(a)).toBe(true);
  });

  it('con movimiento reducido no hay entrada ni paseos', () => {
    const rng = seededRng(6);
    const a = createArvid();
    startEntrance(a, rng, 'left');
    stepArvid(a, 1, rng, NO_PROPS, true);
    expect(isHome(a)).toBe(true);
    expect({ x: a.x, y: a.y }).toEqual(ARVID_HOME);
  });
});
