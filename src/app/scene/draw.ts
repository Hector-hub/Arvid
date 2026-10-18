// Dibujo de la escena neón sobre un canvas de 384×192 (spec 05, ESC). Solo lee el estado de la simulación.
// Los colores de la escena son una excepción a la paleta de la interfaz (design-system §1, DIS-02).
import { walkFrame, type CastSpec } from '../../domain/avatar/catalog';
import { hasMore, visibleLines, type Speech } from '../../domain/arvid/speech';
import { isScanningProp } from '../../domain/scene/arvid';
import {
  DRONE_SCAN_TICKS,
  LAYOUT,
  PARALLAX,
  PROP_BASELINE,
  SCENE_H,
  SCENE_W,
  arvidPose,
  carBaseline,
  lampScreenX,
  visibleLamps,
  type SceneState,
} from '../../domain/scene/scene';
import type { HeroSheets, SceneImages } from './assets';
import { BUBBLE_FONT } from './bubble';
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
  cyanLight: '#73eff7',
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

export interface SceneExtras {
  /** Atlas con ARVID en su color (si aún no está, se usa el original). */
  arvid?: CanvasImageSource;
  /** Lo que ARVID está diciendo (BP). */
  speech?: Speech;
}

export function drawScene(
  c: Ctx,
  s: SceneState,
  imgs: SceneImages,
  hero: { cast: CastSpec; sheets: HeroSheets },
  reduced: boolean,
  extras: SceneExtras = {},
) {
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

  // Detalles de la acera que ARVID inspecciona (MV-03)
  for (const p of s.props) {
    const img = imgs.props[p.kind];
    if (img) c.drawImage(img, Math.round(p.wx - off), PROP_BASELINE - img.height);
  }

  // Peatones: miran a la derecha; los que van a la izquierda, en espejo (ESC-06)
  for (const p of s.peds) {
    const type = PEDESTRIANS[p.type];
    if (!type) continue;
    const f = reduced ? 0 : Math.floor((s.t + p.t0) / type.ticks) % type.frames;
    sprite(c, imgs.extras, f * EXTRAS_FRAME, type.row * EXTRAS_FRAME, EXTRAS_FRAME, EXTRAS_FRAME, Math.round(p.wx - off), LAYOUT.backFeet - p.size, p.size, p.size, p.dir < 0);
  }

  // ARVID: escanea (luz encendida) al hablar, al inspeccionar un detalle y de vez en cuando en su sitio (AV-02)
  const pose = arvidPose(s);
  const talking = !!extras.speech;
  const scanning = talking || isScanningProp(s.arvid) || s.drone.scanT >= 0;
  const anim = scanning ? DRONE.scan : DRONE.walk;
  const df = reduced
    ? 0
    : s.drone.scanT >= 0 && !talking
      ? Math.floor(s.drone.scanT / DRONE_SCAN_TICKS) % anim.frames
      : Math.floor(s.t / anim.ticks) % anim.frames;
  const size = DRONE.size * pose.scale;
  c.globalAlpha = pose.alpha;
  c.drawImage(
    extras.arvid ?? imgs.extras,
    df * EXTRAS_FRAME,
    anim.row * EXTRAS_FRAME,
    EXTRAS_FRAME,
    EXTRAS_FRAME,
    Math.round(pose.x - size / 2),
    Math.round(pose.y - size / 2),
    Math.round(size),
    Math.round(size),
  );
  c.globalAlpha = 1;

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

  if (extras.speech) drawBubble(c, extras.speech, pose.x, pose.y);
}

// ---------- Burbuja pixel ×2 (BP-01) ----------
const LINE_H = 18;
/** Hueco a la derecha para no tapar la bocina. */
const BUBBLE_RIGHT_GAP = 50;
const PAD = 7;

/** Burbuja anclada a ARVID, con cola hacia él y ▼ si hay más páginas (BP-01 a BP-03). */
function drawBubble(c: Ctx, sp: Speech, ax: number, ay: number) {
  const lines = sp.pages[sp.page] ?? [];
  if (lines.length === 0) return;
  c.font = BUBBLE_FONT;
  const textW = Math.max(...lines.map((l) => c.measureText(l).width), 40);
  const w = Math.ceil(textW) + PAD * 2 + 8;
  const h = lines.length * LINE_H + PAD * 2 - 4;
  // Sin llegar a la esquina superior derecha, donde está la bocina (MU-01)
  const x = Math.round(Math.max(4, Math.min(SCENE_W - BUBBLE_RIGHT_GAP - w, ax - 24)));
  const y = Math.round(Math.max(4, ay - 22 - h));
  c.fillStyle = 'rgba(5, 9, 18, 0.92)';
  c.fillRect(x, y, w, h);
  // Borde de 2 px y cola en escalera hacia ARVID
  c.fillStyle = C.cyanLight;
  c.fillRect(x, y, w, 2);
  c.fillRect(x, y + h - 2, w, 2);
  c.fillRect(x, y, 2, h);
  c.fillRect(x + w - 2, y, 2, h);
  const tx = Math.round(Math.min(x + w - 12, Math.max(x + 8, ax - 2)));
  for (let i = 0; i < 6; i++) c.fillRect(tx - Math.floor(i / 2), y + h + i, 2, 1);
  c.fillStyle = '#f4f4f4';
  c.textBaseline = 'top';
  visibleLines(sp).forEach((line, i) => c.fillText(line, x + PAD + 2, y + PAD + i * LINE_H));
  if (hasMore(sp)) {
    c.fillStyle = C.cyanLight;
    const mx = x + w - 10;
    const my = y + h - 9;
    c.fillRect(mx - 2, my, 5, 1);
    c.fillRect(mx - 1, my + 1, 3, 1);
    c.fillRect(mx, my + 2, 1, 1);
  }
}

