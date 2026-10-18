// Dibujo de la escena neón sobre un canvas de 384×192 (spec 05, ESC). Solo lee el estado de la simulación.
// Los colores de la escena son una excepción a la paleta de la interfaz (design-system §1, DIS-02).
import { walkFrame, type CastSpec } from '../../domain/avatar/catalog';
import {
  DRONE_SCAN_TICKS,
  LAYOUT,
  PARALLAX,
  SCENE_H,
  SCENE_W,
  carBaseline,
  dronePosition,
  lampScreenX,
  visibleLamps,
  type SceneState,
} from '../../domain/scene/scene';
import type { HeroSheets, SceneImages } from './assets';
import { DRONE, EXTRAS_FRAME, PEDESTRIANS } from './extras';

const C = {
  night: '#050912',
  road: '#031325',
  teal: '#072b3a',
  blue: '#0b347f',
  cyan: '#177daa',
  magenta: '#9b0c8e',
  lamp: '#f07c36',
  glow: '#de9a41',
};
const PARTICLE_COLORS = [C.cyan, C.lamp, C.magenta];

const mod = (a: number, n: number) => ((a % n) + n) % n;

type Ctx = CanvasRenderingContext2D;

function rect(c: Ctx, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}

function sprite(
  c: Ctx,
  img: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  x: number,
  y: number,
  w: number,
  h: number,
  flip: boolean,
) {
  if (!flip) return c.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  c.save();
  c.scale(-1, 1);
  c.drawImage(img, sx, sy, sw, sh, -x - w, y, w, h);
  c.restore();
}

/** Capa de fondo repetida en horizontal con su factor de parallax (ESC-02). */
function tiled(c: Ctx, img: HTMLImageElement, offset: number, factor: number) {
  for (let x = -mod(offset * factor, img.width); x < SCENE_W; x += img.width) c.drawImage(img, Math.round(x), LAYOUT.bgY);
}

/** Protagonista en su fotograma: caminando o, con movimiento reducido, en reposo. */
export function drawHero(c: Ctx, cast: CastSpec, sheets: HeroSheets, t: number, reduced: boolean, x: number, feet: number) {
  const useIdle = reduced && sheets.idle && cast.idle;
  const spec = useIdle ? cast.idle! : cast.walk;
  const img = useIdle ? sheets.idle! : sheets.walk;
  const frame = reduced ? (useIdle ? 0 : cast.restFrame) : walkFrame(cast, t);
  const w = spec.frameW * cast.scale;
  const h = spec.frameH * cast.scale;
  const anchor = cast.flip ? spec.frameW - cast.anchorX : cast.anchorX;
  sprite(c, img, frame * spec.frameW, 0, spec.frameW, spec.frameH, Math.round(x - anchor * cast.scale), Math.round(feet - cast.feetY * cast.scale), w, h, cast.flip);
}

export function drawScene(c: Ctx, s: SceneState, imgs: SceneImages, hero: { cast: CastSpec; sheets: HeroSheets }, reduced: boolean) {
  const off = s.offset;
  const { road, walk, rail, lampTop } = LAYOUT;
  c.clearRect(0, 0, SCENE_W, SCENE_H);
  imgs.bg.forEach((img, i) => tiled(c, img, off, PARALLAX[i] ?? 0));

  // Carretera
  rect(c, 0, road - 6, SCENE_W, 1, C.cyan);
  for (let x = -mod(off, 10); x < SCENE_W; x += 10) rect(c, x, road - 6, 1, 6, C.blue);
  rect(c, 0, road, SCENE_W, walk - road, C.road);
  for (let x = -mod(off, 24); x < SCENE_W; x += 24) rect(c, x, road + 9, 12, 1, C.cyan);

  // Vehículos: los sprites miran a la izquierda; los que van a la derecha, en espejo
  for (const car of s.cars) {
    const img = imgs.cars[car.model];
    if (!img) continue;
    sprite(c, img, 0, 0, img.width, img.height, Math.round(car.wx - off), carBaseline(car.dir) - img.height, img.width, img.height, car.dir > 0);
  }

  // Acera
  rect(c, 0, walk, SCENE_W, rail - walk, C.teal);
  rect(c, 0, walk, SCENE_W, 1, C.cyan);
  for (let x = -mod(off, 32); x < SCENE_W; x += 32) rect(c, x, walk + 1, 1, rail - walk - 1, C.road);

  // Farolas de ~2× la altura del protagonista; el haz sale de la bombilla (ESC-03)
  for (const i of visibleLamps(off)) {
    const x = lampScreenX(i, off);
    const on = s.lit.get(i) ?? true;
    if (on) {
      c.globalAlpha = 0.14;
      c.fillStyle = C.glow;
      c.beginPath();
      c.moveTo(x + 11, lampTop + 3);
      c.lineTo(x + 18, lampTop + 3);
      c.lineTo(x + 42, rail);
      c.lineTo(x - 13, rail);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
    }
    rect(c, x, lampTop, 3, rail - lampTop, C.blue);
    rect(c, x + 1, lampTop, 1, rail - lampTop, C.cyan);
    rect(c, x, lampTop - 2, 18, 3, C.blue);
    rect(c, x + 11, lampTop + 1, 7, 2, on ? C.lamp : C.road);
    rect(c, x - 1, rail - 4, 5, 4, C.blue);
  }

  // Peatones: miran a la derecha; los que van a la izquierda, en espejo (ESC-06)
  for (const p of s.peds) {
    const type = PEDESTRIANS[p.type];
    if (!type) continue;
    const f = reduced ? 0 : Math.floor((s.t + p.t0) / type.ticks) % type.frames;
    sprite(c, imgs.extras, f * EXTRAS_FRAME, type.row * EXTRAS_FRAME, EXTRAS_FRAME, EXTRAS_FRAME, Math.round(p.wx - off), LAYOUT.backFeet - p.size, p.size, p.size, p.dir < 0);
  }

  // Dron mascota: detrás y por encima del hombro (ESC-07)
  const d = dronePosition(s);
  const anim = s.drone.scanT >= 0 ? DRONE.scan : DRONE.walk;
  const df = reduced ? 0 : s.drone.scanT >= 0 ? Math.floor(s.drone.scanT / DRONE_SCAN_TICKS) % anim.frames : Math.floor(s.t / anim.ticks) % anim.frames;
  c.drawImage(imgs.extras, df * EXTRAS_FRAME, anim.row * EXTRAS_FRAME, EXTRAS_FRAME, EXTRAS_FRAME, d.x + 6, d.y + 8, DRONE.size, DRONE.size);

  drawHero(c, hero.cast, hero.sheets, s.t, reduced, LAYOUT.heroX, LAYOUT.heroFeet);

  // Barandilla
  rect(c, 0, rail, SCENE_W, SCENE_H - rail, C.night);
  rect(c, 0, rail + 2, SCENE_W, 2, C.cyan);
  rect(c, 0, rail + 9, SCENE_W, 1, C.blue);
  for (let x = -mod(off, 8); x < SCENE_W; x += 8) rect(c, x, rail + 2, 2, 12, C.blue);

  // Partículas (PAR)
  for (const p of s.particles) {
    c.globalAlpha = Math.max(0, p.life);
    rect(c, p.x, p.y, p.size, p.size, PARTICLE_COLORS[p.color] ?? C.cyan);
  }
  c.globalAlpha = 1;
}

