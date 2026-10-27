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
import { DARIS_AHEAD, DARIS_ANIM, DARIS_BOTTOM, DARIS_CELL, DARIS_ENTRY_FRAMES, type DarisAnim } from './daris';
import { DRONE, EXTRAS_FRAME, PEDESTRIANS } from './extras';
import { skySprite } from './sky';

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

/** Río (D-125): banda entre el horizonte y la carretera, con el parallax del horizonte y sus 24 fotogramas a 12 fps. */
const WATER = { y: 117, w: 360, h: 15, frames: 24, ticks: 5 } as const;

function drawWater(c: Ctx, img: CanvasImageSource, offset: number, t: number, alpha: number) {
  const f = Math.floor(t / WATER.ticks) % WATER.frames;
  c.globalAlpha = alpha;
  for (let x = -mod(offset * (PARALLAX[0] ?? 0), WATER.w); x < SCENE_W; x += WATER.w) {
    c.drawImage(img, 0, f * WATER.h, WATER.w, WATER.h, Math.round(x), WATER.y, WATER.w, WATER.h);
  }
  c.globalAlpha = 1;
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

/** Drones del cielo a la distancia `depth`; los sprites miran a la derecha. */
function drawSky(c: Ctx, s: SceneState, img: HTMLImageElement, depth: number) {
  for (const d of s.sky) {
    if (d.depth !== depth) continue;
    const row = skySprite(d.model, d.depth);
    if (!row) continue;
    const f = Math.floor((s.t + d.t0) / 8) % row.frames;
    const bob = Math.round(Math.sin((s.t + d.t0) / 30));
    sprite(c, img, f * row.w, row.y, row.w, row.h, Math.round(d.x - row.w / 2), Math.round(d.y - row.h / 2) + bob, row.w, row.h, d.dir < 0);
  }
}

/** DARIS: atlas en su color y momentos de su entrada y su última celebración (spec 08, DE). */
export interface DarisExtras {
  /** Sin atlas todavía (cargando), no se dibuja: así no asoma ARVID. */
  atlas?: CanvasImageSource;
  entryT?: number;
  cheerT?: number;
}

/**
 * DARIS en tierra, por delante del protagonista (DE-01): entra con el acelerón desde la izquierda, pone la cara
 * contenta al hablar y hace el salto de corazones al celebrar (DE-02). Devuelve dónde sale su burbuja (DE-03).
 */
function drawDaris(c: Ctx, s: SceneState, d: DarisExtras, talking: boolean, reduced: boolean) {
  const home = LAYOUT.heroX + DARIS_AHEAD;
  const since = (t?: number) => (t === undefined ? Infinity : s.t - t);
  const entry = since(d.entryT);
  const cheering = since(d.cheerT) < DARIS_ANIM.cheer.frames * DARIS_ANIM.cheer.ticks;
  let x = home;
  let anim: DarisAnim = 'idle';
  let elapsed = s.t;
  if (!reduced && entry < DARIS_ENTRY_FRAMES) {
    const p = entry / DARIS_ENTRY_FRAMES;
    x = Math.round(-DARIS_CELL / 2 + (home + DARIS_CELL / 2) * (1 - (1 - p) ** 2));
    anim = 'dash';
  } else if (!reduced && cheering) {
    anim = 'cheer';
    elapsed = since(d.cheerT);
  } else if (talking) anim = 'happy';
  const a = DARIS_ANIM[anim];
  const f = reduced ? 0 : Math.floor(elapsed / a.ticks) % a.frames;
  const top = PROP_BASELINE - DARIS_BOTTOM;
  if (d.atlas) c.drawImage(d.atlas, f * DARIS_CELL, a.row * DARIS_CELL, DARIS_CELL, DARIS_CELL, x - DARIS_CELL / 2, top, DARIS_CELL, DARIS_CELL);
  return { x, y: top + 14 };
}

export interface SceneExtras {
  /** Atlas con ARVID en su color (si aún no está, se usa el original). */
  arvid?: CanvasImageSource;
  /** DARIS en lugar de ARVID (spec 08). */
  daris?: DarisExtras;
  /** Lo que ARVID está diciendo (BP). */
  speech?: Speech;
  /** Lo que dice un vecino y dónde está su cabeza (spec 11, VC-04). */
  neighbor?: { speech: Speech; x: number; y: number };
  /** Capas del fondo según el nivel (spec 11) y opacidad de la última si acaba de llegar; sin esto, las tres. */
  layers?: { count: number; fade: number };
  /** Opacidad del río (D-125); sin esto, sin río. */
  water?: number;
  /** Farolas según el nivel (spec 11, CV-02) y brillo de recién llegadas (AN-02); sin esto, encendidas. */
  lamps?: { on: boolean; glow: boolean };
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
  // Fondo: tras cada capa, los drones de esa distancia, así que pasan por detrás y por delante de edificios (ESC-13)
  const layers = extras.layers?.count ?? imgs.bg.length;
  imgs.bg.forEach((img, i) => {
    if (i < layers) {
      if (i === layers - 1 && i > 0) c.globalAlpha = extras.layers?.fade ?? 1;
      tiled(c, img, off, PARALLAX[i] ?? 0);
      c.globalAlpha = 1;
    }
    // El río (D-125), delante del horizonte lejano, hasta el nivel 5; en el 6 se desvanece mientras los rascacielos
    // aparecen encima (fundido cruzado)
    if (i === 0 && imgs.water && (extras.water ?? 0) > 0) drawWater(c, imgs.water, off, reduced ? 0 : s.t, extras.water!);
    drawSky(c, s, imgs.sky, i);
  });

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

  // Peatones: por detrás de los detalles de la acera; miran a la derecha; los que van a la izquierda, en espejo (ESC-06)
  for (const p of s.peds) {
    const type = PEDESTRIANS[p.type];
    if (!type) continue;
    const f = reduced ? 0 : Math.floor((s.t + p.t0) / type.ticks) % type.frames;
    sprite(c, imgs.extras, f * EXTRAS_FRAME, type.row * EXTRAS_FRAME, EXTRAS_FRAME, EXTRAS_FRAME, Math.round(p.wx - off), LAYOUT.backFeet - p.size, p.size, p.size, p.dir < 0);
  }

  // Detalles de la acera que ARVID inspecciona (MV-03), por delante de los peatones
  for (const p of s.props) {
    const img = imgs.props[p.kind];
    if (img) c.drawImage(img, Math.round(p.wx - off), PROP_BASELINE - img.height);
  }

  // Compañero: DARIS en tierra (spec 08) o ARVID en el aire
  const talking = !!extras.speech;
  let anchor: { x: number; y: number };
  if (extras.daris) {
    anchor = drawDaris(c, s, extras.daris, talking, reduced);
  } else {
    // ARVID: escanea (luz encendida) al hablar, al inspeccionar un detalle y de vez en cuando en su sitio (AV-02)
    const pose = arvidPose(s);
    anchor = pose;
    const scanning = talking || isScanningProp(s.arvid) || s.drone.scanT >= 0;
    const anim = scanning ? DRONE.scan : DRONE.walk;
    const df = reduced
      ? 0
      : s.drone.scanT >= 0 && !talking
        ? Math.floor(s.drone.scanT / DRONE_SCAN_TICKS) % anim.frames
        : Math.floor(s.t / anim.ticks) % anim.frames;
    const size = DRONE.size * pose.scale;
    // Al escanear (no al hablar), un cono de luz baja hasta la acera, como un rayo de abducción (MV-03)
    if (scanning && !talking) drawBeam(c, pose.x, pose.y - size / 2 + DRONE_BOTTOM * size, pose.alpha, reduced ? 0 : s.t);
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
  }

  drawHero(c, hero.cast, hero.sheets, s.t, reduced, LAYOUT.heroX, LAYOUT.heroFeet);

  // Farolas al frente, por delante de peatones, ARVID y protagonista, de ~2× la altura del protagonista; el haz sale
  // de la bombilla (ESC-03)
  for (const i of extras.lamps?.on === false ? [] : visibleLamps(off)) {
    const x = lampScreenX(i, off);
    const on = s.lit.get(i) ?? true;
    if (on) {
      // Recién llegadas: el haz late más fuerte unos segundos
      c.globalAlpha = extras.lamps?.glow ? 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(s.t / 6)) : 0.14;
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

  if (extras.speech) drawBubble(c, extras.speech, anchor.x, anchor.y);
  // Vecino (spec 11): borde ámbar para distinguirlo del compañero
  else if (extras.neighbor) drawBubble(c, extras.neighbor.speech, extras.neighbor.x, extras.neighbor.y, 'neighbor');
}

// ---------- Cono de escaneo ----------
/** Parte inferior del dron dentro de su fotograma (fracción de la altura). */
const DRONE_BOTTOM = 37 / 48;

/**
 * Cono blanco translúcido desde la base de ARVID hasta la acera, fila a fila para que los bordes queden en escalera
 * pixel. Con `t` > 0 late y lo recorren franjas hacia abajo; con movimiento reducido (`t` = 0) queda fijo.
 */
function drawBeam(c: Ctx, x: number, top: number, alpha: number, t: number) {
  const y0 = Math.round(top);
  const len = PROP_BASELINE - y0;
  if (len < 8) return;
  const cx = Math.round(x);
  const pulse = t ? 0.85 + 0.15 * Math.sin(t / 6) : 1;
  c.fillStyle = '#ffffff';
  for (let i = 0; i < len; i++) {
    const k = i / len;
    const half = Math.round(3 + k * 14);
    const band = t && (i - Math.floor(t / 3)) % 8 === 0 ? 0.12 : 0;
    const a = alpha * pulse * (0.3 - k * 0.2 + band);
    c.globalAlpha = a;
    c.fillRect(cx - half, y0 + i, half * 2, 1);
    // Bordes un poco más brillantes
    c.globalAlpha = Math.min(1, a + 0.12 * alpha);
    c.fillRect(cx - half, y0 + i, 1, 1);
    c.fillRect(cx + half - 1, y0 + i, 1, 1);
  }
  // Mancha de luz en el suelo
  c.globalAlpha = alpha * pulse * 0.3;
  c.fillRect(cx - 17, PROP_BASELINE, 34, 1);
  c.fillRect(cx - 13, PROP_BASELINE + 1, 26, 1);
  c.globalAlpha = 1;
}

// ---------- Burbuja pixel ×2 (BP-01) ----------
const LINE_H = 18;
/** Hueco a la derecha para no tapar la bocina. */
const BUBBLE_RIGHT_GAP = 50;
const PAD = 7;

/** Burbuja anclada a ARVID, con cola hacia él y ▼ si hay más páginas (BP-01 a BP-03). */
/** Colores de la burbuja pixel (D-137): la del compañero, como en el chat; la de un vecino, con borde dorado. */
const BUBBLE = {
  companion: { fill: '#f4f4f4', line: '#8f9ad6', shade: '#4b55a8' },
  neighbor: { fill: '#f4f4f4', line: '#ffcd75', shade: '#a8662f' },
} as const;
const U = 2;

/**
 * Burbuja pixel anclada a quien habla, con el mismo estilo que las del chat (D-137): relleno claro, contorno de 1 píxel
 * con las esquinas en escalón, sombra debajo y a la derecha, y cola en escalera; ▼ si hay más páginas (BP-01 a BP-03).
 */
function drawBubble(c: Ctx, sp: Speech, ax: number, ay: number, kind: keyof typeof BUBBLE = 'companion') {
  const lines = sp.pages[sp.page] ?? [];
  if (lines.length === 0) return;
  const col = BUBBLE[kind];
  c.font = BUBBLE_FONT;
  const textW = Math.max(...lines.map((l) => c.measureText(l).width), 40);
  const w = Math.ceil(textW) + PAD * 2 + 8;
  const h = lines.length * LINE_H + PAD * 2 - 4;
  // Sin llegar a la esquina superior derecha, donde está la bocina (MU-01)
  const x = Math.round(Math.max(4, Math.min(SCENE_W - BUBBLE_RIGHT_GAP - w, ax - 24)));
  const y = Math.round(Math.max(4, ay - 22 - h));
  // La punta (la última fila, de U píxeles) queda centrada en `ax`
  const tx = Math.round(Math.min(x + w - 6 * U, Math.max(x + 3 * U, ax - U / 2)));
  // Sombra
  c.fillStyle = col.shade;
  c.fillRect(x + U, y + h, w - U, U);
  c.fillRect(x + w, y + U, U, h);
  // Contorno sin las esquinas (escalón) y relleno
  c.fillStyle = col.line;
  c.fillRect(x + U, y, w - 2 * U, U);
  c.fillRect(x + U, y + h - U, w - 2 * U, U);
  c.fillRect(x, y + U, U, h - 2 * U);
  c.fillRect(x + w - U, y + U, U, h - 2 * U);
  c.fillStyle = col.fill;
  c.fillRect(x + U, y + U, w - 2 * U, h - 2 * U);
  // Cola en escalera hacia quien habla: filas de 4, 3, 2 y 1 píxeles con su contorno
  for (let i = 0; i < 4; i++) {
    const row = y + h - U + i * U;
    const width = (4 - i) * U;
    c.fillStyle = col.fill;
    c.fillRect(tx, row, width, U);
    c.fillStyle = col.line;
    c.fillRect(tx - U, row, U, U);
    c.fillRect(tx + width, row, U, U);
  }
  c.fillRect(tx - U, y + h - U + 4 * U, 2 * U, U);
  c.fillStyle = '#1a1c2c';
  c.textBaseline = 'top';
  visibleLines(sp).forEach((line, i) => c.fillText(line, x + PAD + 2, y + PAD + i * LINE_H));
  if (hasMore(sp)) {
    c.fillStyle = col.shade;
    const mx = x + w - 10;
    const my = y + h - 9;
    c.fillRect(mx - 2, my, 5, 1);
    c.fillRect(mx - 1, my + 1, 3, 1);
    c.fillRect(mx, my + 2, 1, 1);
  }
}

