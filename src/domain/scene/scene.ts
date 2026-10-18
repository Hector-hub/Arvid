// Simulación de la escena neón (spec 05, ESC y PAR). Pura y determinista: el azar llega como `rng` y el tiempo
// como `dt` en fotogramas de 60 Hz, así que va igual a 60, 120 o 144 Hz (ESC-09) y se prueba sin navegador.
// app/scene la dibuja; aquí solo hay posiciones y estados.

export type Rng = () => number;

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Geometría (lienzo lógico de 384×192, ESC-01) ----------
export const SCENE_W = 384;
export const SCENE_H = 192;
export const LAYOUT = {
  bgY: -32,
  road: 138,
  walk: 158,
  rail: 176,
  heroFeet: 174,
  /** Pies de los peatones: un poco más atrás que el protagonista. */
  backFeet: 167,
  /** Centro del cuerpo del protagonista. */
  heroX: 158,
  heroHeight: 49,
  lampGap: 112,
  lampTop: 72,
} as const;

/** Desplazamiento del suelo por fotograma de 60 Hz (ESC-04). */
export const WALK_SPEED = 0.55;
/** Velocidad relativa de las capas del fondo (ESC-02). */
export const PARALLAX = [0.02, 0.08, 0.2] as const;
/** Como máximo se simulan 3 fotogramas de golpe (tras una pausa larga no hay saltos). */
export const MAX_DT = 3;

const R = (rng: Rng, a: number, b: number) => a + rng() * (b - a);

// ---------- Estado ----------
export interface Car {
  /** Índice del modelo en `SceneConfig.carWidths`. */
  model: number;
  dir: 1 | -1;
  /** Posición en el mundo (x de pantalla = wx − offset). */
  wx: number;
  v: number;
}

export interface Pedestrian {
  /** Índice del tipo en `SceneConfig.pedestrians`. */
  type: number;
  dir: 1 | -1;
  wx: number;
  v: number;
  /** Desfase de su animación. */
  t0: number;
  /** Lado del sprite cuadrado escalado a la altura del protagonista. */
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Vida restante (1 → 0); también es su opacidad. */
  life: number;
  size: 1 | 2;
  /** Índice en la paleta de partículas. */
  color: 0 | 1 | 2;
}

export interface SceneState {
  /** Tiempo de la escena en fotogramas de 60 Hz. */
  t: number;
  /** Desplazamiento del suelo en px. */
  offset: number;
  cars: Car[];
  nextCar: number;
  carDir: 1 | -1;
  peds: Pedestrian[];
  nextPed: number;
  pedDir: 1 | -1;
  /** Fotogramas de parpadeo restantes por farola (índice en el mundo). */
  flicker: Map<number, number>;
  /** Farolas visibles encendidas en este fotograma. */
  lit: Map<number, boolean>;
  drone: { scanT: number; scanIn: number };
  particles: Particle[];
}

export interface SceneConfig {
  /** Anchos de los sprites de vehículo (miran a la izquierda). */
  carWidths: number[];
  /** Peatones disponibles: altura del personaje dentro de su fotograma cuadrado y número de fotogramas. */
  pedestrians: { height: number; frames: number }[];
  frameSize: number;
}

export function createScene(rng: Rng): SceneState {
  return {
    t: 0,
    offset: 0,
    cars: [],
    nextCar: 30,
    carDir: -1,
    peds: [],
    nextPed: Math.round(R(rng, 120, 360)),
    pedDir: -1,
    flicker: new Map(),
    lit: new Map(),
    drone: { scanT: -1, scanIn: 400 },
    particles: [],
  };
}

/** Carril de cada sentido: los que van a la derecha, más cerca (y = 156); los de la izquierda, detrás (y = 150). */
export const carBaseline = (dir: 1 | -1) => (dir > 0 ? 156 : 150);

/** Índices de las farolas visibles con el desplazamiento actual. */
export function visibleLamps(offset: number): number[] {
  const first = Math.floor(offset / LAYOUT.lampGap) - 1;
  return Array.from({ length: Math.ceil(SCENE_W / LAYOUT.lampGap) + 3 }, (_, i) => first + i);
}

export const lampScreenX = (i: number, offset: number) => Math.round(i * LAYOUT.lampGap - offset + 40);

/** Alterna el sentido; a veces (20 %) lo repite para que no parezca mecánico (ESC-05). */
const nextCarDir = (last: 1 | -1, rng: Rng): 1 | -1 => (rng() < 0.8 ? (-last as 1 | -1) : last);

function spawnCar(s: SceneState, cfg: SceneConfig, rng: Rng) {
  const dir = nextCarDir(s.carDir, rng);
  // Nunca dos a la vez en el mismo carril: si sigue ocupado, se reintenta en medio segundo
  if (s.cars.some((c) => c.dir === dir)) {
    s.nextCar = 30;
    return;
  }
  s.carDir = dir;
  const model = Math.floor(rng() * cfg.carWidths.length);
  const w = cfg.carWidths[model] ?? 0;
  s.cars.push({ model, dir, wx: dir > 0 ? s.offset - w - 10 : s.offset + SCENE_W + 10, v: R(rng, 2.0, 3.2) });
  s.nextCar = Math.round(R(rng, 140, 340));
}

function spawnPed(s: SceneState, cfg: SceneConfig, rng: Rng) {
  const type = Math.floor(rng() * cfg.pedestrians.length);
  s.pedDir = -s.pedDir as 1 | -1; // siempre alterna
  const size = Math.round(cfg.frameSize * (LAYOUT.heroHeight / (cfg.pedestrians[type]?.height ?? LAYOUT.heroHeight)));
  // Todos entran por la derecha y caminan tranquilos: la cámara sigue al protagonista, que adelanta a quien va
  // en su sentido y se cruza con quien viene de frente.
  s.peds.push({ type, dir: s.pedDir, size, v: R(rng, 0.26, 0.34), wx: s.offset + SCENE_W + 10, t0: Math.floor(R(rng, 0, 60)) });
  s.nextPed = Math.round(R(rng, 900, 1500)); // uno cada 15–25 s (ESC-06)
}

/**
 * Avanza la escena `dt` fotogramas de 60 Hz. Con `reduced` (movimiento reducido, ESC-11) no se mueve nada:
 * solo se marcan las farolas encendidas para poder dibujar una imagen fija.
 */
export function stepScene(s: SceneState, rawDt: number, rng: Rng, cfg: SceneConfig, reduced = false): void {
  const dt = Math.max(0, Math.min(MAX_DT, rawDt));
  s.lit = new Map();
  if (reduced) {
    for (const i of visibleLamps(s.offset)) s.lit.set(i, true);
    s.particles = [];
    return;
  }
  s.t += dt;
  s.offset += WALK_SPEED * dt;

  // Farolas: parpadeo aleatorio e independiente (ESC-03)
  for (const i of visibleLamps(s.offset)) {
    let fl = s.flicker.get(i) ?? 0;
    if (fl <= 0 && rng() < 0.0012 * dt) fl = Math.round(R(rng, 20, 50));
    if (fl > 0) {
      fl -= dt;
      s.lit.set(i, rng() < 0.45);
    } else s.lit.set(i, true);
    s.flicker.set(i, fl);
  }
  for (const i of s.flicker.keys()) if (!s.lit.has(i)) s.flicker.delete(i);

  // Vehículos
  if (cfg.carWidths.length > 0 && (s.nextCar -= dt) <= 0) spawnCar(s, cfg, rng);
  for (const c of s.cars) c.wx += c.v * c.dir * dt;
  s.cars = s.cars.filter((c) => {
    const x = c.wx - s.offset;
    return x > -(cfg.carWidths[c.model] ?? 0) - 40 && x < SCENE_W + 40;
  });

  // Peatones
  if (cfg.pedestrians.length > 0 && (s.nextPed -= dt) <= 0) spawnPed(s, cfg, rng);
  for (const p of s.peds) p.wx += p.v * p.dir * dt;
  s.peds = s.peds.filter((p) => {
    const x = p.wx - s.offset;
    return x > -p.size - 20 && x < SCENE_W + 40;
  });

  // Dron: de vez en cuando escanea (ESC-07)
  const d = s.drone;
  d.scanIn -= dt;
  if (d.scanIn <= 0 && d.scanT < 0) d.scanT = 0;
  if (d.scanT >= 0) {
    d.scanT += dt;
    if (d.scanT > DRONE_SCAN_FRAMES * DRONE_SCAN_TICKS) {
      d.scanT = -1;
      d.scanIn = R(rng, 600, 1200);
    }
  }

  // Partículas: caen con gravedad y se desvanecen
  for (const p of s.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.05 * dt;
    p.life -= 0.018 * dt;
  }
  s.particles = s.particles.filter((p) => p.life > 0);
}

export const DRONE_SCAN_FRAMES = 8;
export const DRONE_SCAN_TICKS = 7;

/** Posición del dron (esquina superior izquierda de su sprite de 48 px antes de escalar). */
export function dronePosition(s: SceneState): { x: number; y: number } {
  const bob = Math.sin(s.t / 22) * 2.5;
  const sway = Math.sin(s.t / 61) * 4;
  return { x: Math.round(LAYOUT.heroX - 50 + sway), y: Math.round(LAYOUT.heroFeet - 88 + bob) };
}

// ---------- Partículas (PAR) ----------
export type BurstKind = 'small' | 'big';

function burstAt(s: SceneState, rng: Rng, x: number, y: number, n: number, speed: number) {
  for (let i = 0; i < n; i++) {
    const a = R(rng, 0, Math.PI * 2);
    const v = R(rng, 0.5, speed);
    s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, size: rng() < 0.7 ? 1 : 2, color: (i % 3) as 0 | 1 | 2 });
  }
}

/** Ráfaga pequeña desde el protagonista (PAR-01) o grande, también en el cielo (PAR-02). */
export function burst(s: SceneState, kind: BurstKind, rng: Rng): void {
  if (kind === 'small') burstAt(s, rng, LAYOUT.heroX, 140, 30, 2);
  else {
    burstAt(s, rng, LAYOUT.heroX, 130, 70, 3.2);
    burstAt(s, rng, 80, 60, 30, 2.4);
    burstAt(s, rng, 300, 60, 30, 2.4);
  }
}

/** Ráfagas pendientes por eventos ocurridos con la escena fuera de la pantalla (PAR-03). */
export interface PendingBurst {
  kind: BurstKind;
  at: number;
}

export const PENDING_BURST_MAX_MS = 10_000;

/** Las que aún valen (menos de 10 s); si hay una grande, basta con esa. */
export function duePendingBursts(pending: PendingBurst[], now: number): BurstKind[] {
  const fresh = pending.filter((p) => now - p.at < PENDING_BURST_MAX_MS);
  if (fresh.length === 0) return [];
  return fresh.some((p) => p.kind === 'big') ? ['big'] : ['small'];
}
