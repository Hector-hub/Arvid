// Simulación de la escena neón (spec 05, ESC y PAR). Pura y determinista: el azar llega como `rng` y el tiempo
// como `dt` en fotogramas de 60 Hz, así que va igual a 60, 120 o 144 Hz (ESC-09) y se prueba sin navegador.
// app/scene la dibuja; aquí solo hay posiciones y estados.
import { ARVID_HOME, createArvid, hop, hopOffset, isHome, nextPropDelay, stepArvid, type ArvidState, type Prop, type PropSpec } from './arvid';

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
  /** Fotogramas de brillo restantes: recién llegado a la ciudad (spec 11, AN-02). */
  glow?: number;
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
  glow?: number;
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
  /** Escaneo ocasional de ARVID en su sitio (ESC-07). */
  drone: { scanT: number; scanIn: number };
  particles: Particle[];
  /** La mascota (spec 06, MV). */
  arvid: ArvidState;
  /** Detalles de la acera que ARVID puede inspeccionar (MV-03). */
  props: Prop[];
  nextProp: number;
  propSeq: number;
  /** Drones a lo lejos, entre los edificios (ESC-13). */
  sky: SkyDrone[];
  nextSky: number;
}

export interface SceneConfig {
  /** Anchos de los sprites de vehículo (miran a la izquierda). */
  carWidths: number[];
  /** Peatones disponibles: altura del personaje dentro de su fotograma cuadrado y número de fotogramas. */
  pedestrians: { height: number; frames: number }[];
  frameSize: number;
  /** Detalles de la acera disponibles (MV-03). */
  props?: PropSpec[];
  /** Modelos de drones del cielo disponibles (ESC-13). */
  skyModels?: number;
  /** Ciudad viva (spec 11, CV): modelos de vehículo y tipos de peatón que pueden aparecer (sin ellos, todos). */
  carModels?: readonly number[];
  pedTypes?: readonly number[];
  /**
   * Recién llegados que aún no han aparecido (AN-02): `car:<modelo>`, `ped:<tipo>`. La primera vez que aparecen
   * brillan unos segundos y se quitan de aquí.
   */
  fresh?: Set<string>;
}

/** Duración del brillo de un recién llegado (3 s). */
export const GLOW_FRAMES = 180;

function takeFresh(cfg: SceneConfig, key: string): number | undefined {
  return cfg.fresh?.delete(key) ? GLOW_FRAMES : undefined;
}

/** Elige al azar uno de los permitidos (o de todos), o `undefined` si no hay ninguno. */
function pick(rng: Rng, allowed: readonly number[] | undefined, count: number): number | undefined {
  const pool = allowed ?? Array.from({ length: count }, (_, i) => i);
  return pool.length ? pool[Math.floor(rng() * pool.length)] : undefined;
}

/** Base de los detalles de la acera (un poco por detrás del protagonista). */
export const PROP_BASELINE = 171;

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
    arvid: createArvid(),
    props: [],
    nextProp: Math.round(R(rng, 300, 900)),
    propSeq: 0,
    sky: [],
    nextSky: Math.round(R(rng, 120, 360)),
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

// ---------- Drones del cielo (ESC-13) ----------
/** Distancia: 0 = lejos (detrás de la ciudad del fondo), 1 = en medio (detrás de los edificios delanteros), 2 = cerca. */
export type SkyDepth = 0 | 1 | 2;

export interface SkyDrone {
  model: number;
  depth: SkyDepth;
  /** Centro en pantalla. */
  x: number;
  y: number;
  v: number;
  dir: 1 | -1;
  t0: number;
}

/** Como mucho, 3 drones a la vez en el cielo. */
export const SKY_MAX = 3;
/** Se desplazan con el parallax de la capa que tienen detrás (PARALLAX) y algo más los de cerca. */
export const SKY_PARALLAX = [0.08, 0.14, 0.2] as const;
/** Velocidad propia (px por fotograma) y altura del centro, por distancia. */
const SKY_SPEED = [
  [0.12, 0.25],
  [0.25, 0.45],
  [0.4, 0.7],
] as const;
const SKY_Y = [
  [18, 60],
  [22, 80],
  [14, 84],
] as const;
/** Fuera de la escena a partir de aquí (el dron más ancho mide 44 px). */
const SKY_MARGIN = 30;

function spawnSky(s: SceneState, models: number, rng: Rng) {
  const r = rng();
  const depth: SkyDepth = r < 0.35 ? 0 : r < 0.75 ? 1 : 2;
  const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const [vMin, vMax] = SKY_SPEED[depth];
  const [yMin, yMax] = SKY_Y[depth];
  s.sky.push({
    model: Math.floor(rng() * models),
    depth,
    x: dir > 0 ? -SKY_MARGIN + 1 : SCENE_W + SKY_MARGIN - 1,
    y: Math.round(R(rng, yMin, yMax)),
    v: R(rng, vMin, vMax),
    dir,
    t0: Math.floor(R(rng, 0, 60)),
  });
}

/** Alterna el sentido; a veces (20 %) lo repite para que no parezca mecánico (ESC-05). */
const nextCarDir = (last: 1 | -1, rng: Rng): 1 | -1 => (rng() < 0.8 ? (-last as 1 | -1) : last);

function spawnCar(s: SceneState, cfg: SceneConfig, rng: Rng) {
  const dir = nextCarDir(s.carDir, rng);
  // Nunca dos a la vez en el mismo carril: si sigue ocupado, se reintenta en medio segundo
  if (s.cars.some((c) => c.dir === dir)) {
    s.nextCar = 30;
    return;
  }
  const model = pick(rng, cfg.carModels, cfg.carWidths.length);
  if (model === undefined) {
    s.nextCar = 120;
    return;
  }
  s.carDir = dir;
  const w = cfg.carWidths[model] ?? 0;
  s.cars.push({ model, dir, wx: dir > 0 ? s.offset - w - 10 : s.offset + SCENE_W + 10, v: R(rng, 2.0, 3.2), glow: takeFresh(cfg, `car:${model}`) });
  s.nextCar = Math.round(R(rng, 140, 340));
}

function spawnPed(s: SceneState, cfg: SceneConfig, rng: Rng) {
  // Un recién llegado tiene prioridad para que se vea pronto (AN-02)
  const freshPed = [...(cfg.fresh ?? [])].find((k) => k.startsWith('ped:'));
  const type = freshPed ? Number(freshPed.slice(4)) : pick(rng, cfg.pedTypes, cfg.pedestrians.length);
  if (type === undefined) {
    s.nextPed = 120;
    return;
  }
  s.pedDir = -s.pedDir as 1 | -1; // siempre alterna
  const size = Math.round(cfg.frameSize * (LAYOUT.heroHeight / (cfg.pedestrians[type]?.height ?? LAYOUT.heroHeight)));
  // Todos entran por la derecha y caminan tranquilos: la cámara sigue al protagonista, que adelanta a quien va
  // en su sentido y se cruza con quien viene de frente.
  s.peds.push({ type, dir: s.pedDir, size, v: R(rng, 0.26, 0.34), wx: s.offset + SCENE_W + 10, t0: Math.floor(R(rng, 0, 60)), glow: takeFresh(cfg, `ped:${type}`) });
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
    s.sky = [];
    stepArvid(s.arvid, dt, rng, { props: s.props, offset: s.offset, specs: cfg.props ?? [], baseline: PROP_BASELINE }, true);
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

  // Brillo de los recién llegados: chispas que salen de ellos (AN-02)
  for (const e of [...s.cars, ...s.peds]) {
    if (!e.glow) continue;
    e.glow = Math.max(0, e.glow - dt);
    if (rng() < 0.25 * dt) {
      const isPed = 'type' in e;
      const x = e.wx - s.offset + (isPed ? e.size / 2 : (cfg.carWidths[(e as Car).model] ?? 60) / 2) + R(rng, -10, 10);
      const y = isPed ? LAYOUT.backFeet - e.size * 0.5 : carBaseline((e as Car).dir) - 12;
      s.particles.push({ x, y: y + R(rng, -12, 12), vx: R(rng, -0.3, 0.3), vy: R(rng, -0.8, -0.2), life: 1, size: rng() < 0.6 ? 1 : 2, color: 2 });
    }
  }

  // Detalles de la acera (MV-03)
  const specs = cfg.props ?? [];
  if (specs.length > 0 && (s.nextProp -= dt) <= 0) {
    s.props.push({ id: ++s.propSeq, kind: Math.floor(rng() * specs.length), wx: s.offset + SCENE_W + 10 });
    s.nextProp = nextPropDelay(rng);
  }
  s.props = s.props.filter((p) => p.wx - s.offset > -(specs[p.kind]?.width ?? 0) - 10);

  // Drones del cielo: cruzan a lo lejos con el parallax de su distancia (ESC-13)
  if ((cfg.skyModels ?? 0) > 0 && (s.nextSky -= dt) <= 0) {
    if (s.sky.length < SKY_MAX) spawnSky(s, cfg.skyModels!, rng);
    s.nextSky = Math.round(R(rng, 240, 600)); // uno cada 4–10 s
  }
  for (const d of s.sky) d.x += (d.v * d.dir - WALK_SPEED * SKY_PARALLAX[d.depth]) * dt;
  s.sky = s.sky.filter((d) => d.x > -SKY_MARGIN && d.x < SCENE_W + SKY_MARGIN);

  // ARVID: entrada, paseos y vuelta a su sitio (MV)
  stepArvid(s.arvid, dt, rng, { props: s.props, offset: s.offset, specs, baseline: PROP_BASELINE });

  // Dron: de vez en cuando escanea en su sitio (ESC-07)
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

/**
 * Dónde se dibuja ARVID: su centro con el balanceo (flota siempre; en su sitio, además, se mece), el salto de
 * celebración, la escala y la opacidad de la entrada.
 */
export function arvidPose(s: SceneState): { x: number; y: number; scale: number; alpha: number } {
  const a = s.arvid;
  const bob = Math.sin(s.t / 22) * 2.5;
  const sway = isHome(a) ? Math.sin(s.t / 61) * 4 : 0;
  return { x: a.x + sway, y: a.y + bob + hopOffset(a), scale: a.scale, alpha: a.alpha };
}

/** Compatibilidad con el prototipo: esquina superior izquierda del sprite de 48 px (sitio de ARVID). */
export function dronePosition(s: SceneState): { x: number; y: number } {
  const p = arvidPose(s);
  return { x: Math.round(p.x - 24), y: Math.round(p.y - 26) };
}

export { ARVID_HOME };

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
  hop(s.arvid);
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
