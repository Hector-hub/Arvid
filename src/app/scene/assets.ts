// Carga de las imágenes de la escena y hojas recoloreadas de cada protagonista (spec 05, PRO-04).
// Se cargan bajo demanda (NFR5-04) y se guardan en memoria: cada variante se recolorea una sola vez.
import { CASTS, type Avatar, type SheetSpec } from '../../domain/avatar/catalog';
import { recolorSheet } from '../../domain/avatar/recolor';
import { recolorArvid, type ArvidColor } from '../../domain/arvid/arvid';
import { recolorDaris, type DarisColor } from '../../domain/arvid/companion';
import { CAR_FILES, PROP_FILES } from './engine';
import { DRONE, EXTRAS_FRAME } from './extras';

const BASE = '/scene/';

export interface SceneImages {
  bg: HTMLImageElement[];
  cars: HTMLImageElement[];
  /** Atlas de peatones y dron. */
  extras: HTMLImageElement;
  /** Detalles de la acera (MV-03). */
  props: HTMLImageElement[];
  /** Atlas de drones del cielo (ESC-13). */
  sky: HTMLImageElement;
}

export interface HeroSheets {
  walk: HTMLCanvasElement;
  idle?: HTMLCanvasElement;
}

const images = new Map<string, Promise<HTMLImageElement>>();

function loadImage(file: string): Promise<HTMLImageElement> {
  let p = images.get(file);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo cargar ${file}`));
      img.src = BASE + file;
    });
    // Un fallo no se queda en caché: se reintenta en la próxima carga
    p.catch(() => images.delete(file));
    images.set(file, p);
  }
  return p;
}

let sceneImages: Promise<SceneImages> | undefined;

export function loadSceneImages(): Promise<SceneImages> {
  sceneImages ??= Promise.all([
    Promise.all(['bg-1.png', 'bg-2.png', 'bg-3.png'].map(loadImage)),
    Promise.all(CAR_FILES.map(loadImage)),
    loadImage('extras.png'),
    Promise.all(PROP_FILES.map(loadImage)),
    loadImage('sky.png'),
  ]).then(([bg, cars, extras, props, sky]) => ({ bg, cars, extras, props, sky }));
  sceneImages.catch(() => (sceneImages = undefined));
  return sceneImages;
}

function recolored(img: HTMLImageElement, spec: SheetSpec, avatar: Avatar): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  recolorSheet(data.data, cv.width, cv.height, spec.frameW, avatar.cast, avatar.variant);
  ctx.putImageData(data, 0, 0);
  return cv;
}

const heroes = new Map<string, Promise<HeroSheets>>();

/** Hojas del protagonista en su variante; se generan una vez por combinación. */
export function loadHero(avatar: Avatar): Promise<HeroSheets> {
  const key = `${avatar.cast}:${avatar.variant}`;
  let p = heroes.get(key);
  if (!p) {
    const cast = CASTS[avatar.cast];
    p = Promise.all([loadImage(cast.walk.file), cast.idle ? loadImage(cast.idle.file) : undefined]).then(([walk, idle]) => ({
      walk: recolored(walk, cast.walk, avatar),
      idle: idle && cast.idle ? recolored(idle, cast.idle, avatar) : undefined,
    }));
    p.catch(() => heroes.delete(key));
    heroes.set(key, p);
  }
  return p;
}

const arvids = new Map<ArvidColor, Promise<HTMLCanvasElement>>();

/** Atlas con ARVID en su color (AV-01): solo se recolorean las filas del dron. */
export function loadArvidAtlas(color: ArvidColor): Promise<HTMLCanvasElement> {
  let p = arvids.get(color);
  if (!p) {
    p = loadImage('extras.png').then((img) => {
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D no disponible');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, cv.width, cv.height);
      recolorArvid(data.data, cv.width, cv.height, color, DRONE.walk.row * EXTRAS_FRAME);
      ctx.putImageData(data, 0, 0);
      return cv;
    });
    p.catch(() => arvids.delete(color));
    arvids.set(color, p);
  }
  return p;
}

const darises = new Map<DarisColor, Promise<HTMLCanvasElement>>();

/** Atlas de DARIS en su color (spec 08, DC-01). */
export function loadDarisAtlas(color: DarisColor): Promise<HTMLCanvasElement> {
  let p = darises.get(color);
  if (!p) {
    p = loadImage('daris.png').then((img) => {
      const cv = document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas 2D no disponible');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, cv.width, cv.height);
      recolorDaris(data.data, color);
      ctx.putImageData(data, 0, 0);
      return cv;
    });
    p.catch(() => darises.delete(color));
    darises.set(color, p);
  }
  return p;
}
