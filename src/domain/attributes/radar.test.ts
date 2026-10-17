import { describe, expect, it } from 'vitest';
import { radarGeometry } from './radar';

describe('geometría del radar (PJ-02)', () => {
  it('R-AT6: menos de 3 ejes no dibuja radar', () => {
    expect(radarGeometry([{ id: 'a', value: 50 }, { id: 'b', value: 50 }])).toBeUndefined();
  });

  it('vértices en el radio proporcional al valor; el primer eje arriba', () => {
    const g = radarGeometry(
      [
        { id: 'a', value: 100 },
        { id: 'b', value: 50 },
        { id: 'c', value: 0 },
        { id: 'd', value: 100 },
      ],
      200,
      20,
    )!;
    expect(g.center).toEqual({ x: 100, y: 100 });
    expect(g.radius).toBe(68);
    expect(g.axes[0]!.point).toEqual({ x: 100, y: 32 }); // arriba
    expect(g.axes[1]!.point).toEqual({ x: 134, y: 100 }); // derecha, a la mitad
    expect(g.axes[2]!.point).toEqual({ x: 100, y: 100 }); // 0 = centro (es un dato real)
    expect(g.rings).toHaveLength(4);
    expect(g.current.polygon).toHaveLength(4);
  });

  it('R-AT7: un eje sin datos no tiene vértice y rompe los segmentos que lo tocan', () => {
    const g = radarGeometry([1, 2, undefined, 4, 5].map((v, i) => ({ id: `e${i + 1}`, value: v === undefined ? undefined : 60 })))!;
    expect(g.axes[2]!.point).toBeUndefined();
    // Segmentos 1-2, 4-5 y 5-1; no 2-3 ni 3-4.
    expect(g.current.segments).toHaveLength(3);
    expect(g.current.polygon).toBeUndefined();
    const touches = (p: { x: number; y: number }) => g.current.segments.some(([a, b]) => (a.x === p.x && a.y === p.y) || (b.x === p.x && b.y === p.y));
    expect(touches(g.axes[1]!.point!)).toBe(true);
    expect(touches(g.axes[3]!.point!)).toBe(true);
  });

  it('la superposición anterior sigue la misma regla', () => {
    const g = radarGeometry([
      { id: 'a', value: 50, previous: 40 },
      { id: 'b', value: 50 },
      { id: 'c', value: 50, previous: 70 },
    ])!;
    expect(g.previous.segments).toHaveLength(1); // solo c→a
    expect(g.previous.polygon).toBeUndefined();
  });
});
