// Geometría del radar como datos puros (PJ-02, R-AT6, R-AT7). El componente SVG solo dibuja.

export const MIN_RADAR_AXES = 3;
export const RING_LEVELS = [25, 50, 75, 100] as const;

export interface Point {
  x: number;
  y: number;
}

export interface RadarAxis {
  id: string;
  /** Extremo del eje (valor 100). */
  end: Point;
  /** Posición para el icono, fuera del anillo exterior. */
  label: Point;
  /** Vértice del valor actual; no existe si no hay datos (R-AT7). */
  point?: Point;
  previousPoint?: Point;
}

export interface RadarShape {
  segments: [Point, Point][];
  /** Polígono relleno: solo si todos los ejes tienen datos. */
  polygon?: Point[];
}

export interface RadarGeometry {
  size: number;
  center: Point;
  radius: number;
  axes: RadarAxis[];
  rings: Point[][];
  current: RadarShape;
  previous: RadarShape;
}

const round = (n: number) => Math.round(n * 100) / 100;

function polar(center: Point, radius: number, angle: number): Point {
  return { x: round(center.x + radius * Math.cos(angle)), y: round(center.y + radius * Math.sin(angle)) };
}

/** Une solo ejes consecutivos con datos; rellena solo si no hay huecos (R-AT7). */
function shape(points: (Point | undefined)[]): RadarShape {
  const segments: [Point, Point][] = [];
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length];
    if (p && next) segments.push([p, next]);
  });
  const complete = points.every((p): p is Point => p !== undefined);
  return { segments, polygon: complete ? (points as Point[]) : undefined };
}

/**
 * Ejes desde arriba en sentido horario. `values` y `previous` en 0–100 o `undefined` (sin datos).
 * Devuelve `undefined` con menos de 3 ejes (R-AT6).
 */
export function radarGeometry(
  axes: { id: string; value?: number; previous?: number }[],
  size = 280,
  labelGap = 22,
): RadarGeometry | undefined {
  if (axes.length < MIN_RADAR_AXES) return undefined;
  const center = { x: size / 2, y: size / 2 };
  const radius = size / 2 - labelGap - 12;
  const angleOf = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / axes.length;
  const at = (i: number, value: number) => polar(center, (radius * Math.max(0, Math.min(100, value))) / 100, angleOf(i));

  const built: RadarAxis[] = axes.map((a, i) => ({
    id: a.id,
    end: polar(center, radius, angleOf(i)),
    label: polar(center, radius + labelGap, angleOf(i)),
    point: a.value === undefined ? undefined : at(i, a.value),
    previousPoint: a.previous === undefined ? undefined : at(i, a.previous),
  }));

  return {
    size,
    center,
    radius,
    axes: built,
    rings: RING_LEVELS.map((level) => axes.map((_, i) => at(i, level))),
    current: shape(built.map((a) => a.point)),
    previous: shape(built.map((a) => a.previousPoint)),
  };
}
