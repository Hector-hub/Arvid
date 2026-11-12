// Hojas de caras de los protagonistas (spec 18), recoloreadas a la variante (RT-05). Se cargan bajo demanda y se
// guardan en memoria: cada combinación se recolorea una sola vez. Un fallo no se guarda: se reintenta la próxima vez.
import type { Avatar } from '../../domain/avatar/catalog';
import { FACE, FACE_COLUMNS, portraitSrc, recolorPortrait, rolesSrc } from '../../domain/avatar/portrait';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

function pixels(img: HTMLImageElement): { cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData } {
  const cv = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(img, 0, 0);
  return { cv, ctx, data: ctx.getImageData(0, 0, cv.width, cv.height) };
}

const sheets = new Map<string, Promise<HTMLCanvasElement>>();

/** La hoja de caras de tu protagonista, en tu variante. */
export function loadPortrait(avatar: Avatar): Promise<HTMLCanvasElement> {
  const key = `${avatar.cast}:${avatar.variant}`;
  let p = sheets.get(key);
  if (!p) {
    p = Promise.all([
      loadImage(portraitSrc(avatar.cast)),
      avatar.variant === 'original' ? undefined : loadImage(rolesSrc(avatar.cast)),
    ]).then(([sheet, roles]) => {
      const { cv, ctx, data } = pixels(sheet);
      if (roles) {
        recolorPortrait(data.data, pixels(roles).data.data, avatar.cast, avatar.variant);
        ctx.putImageData(data, 0, 0);
      }
      return cv;
    });
    p.catch(() => sheets.delete(key));
    sheets.set(key, p);
  }
  return p;
}

/** Dibuja la cara `face` de la hoja en `ctx`, en (x, y), a `size` px de lado, sin suavizado. */
export function drawFace(
  ctx: CanvasRenderingContext2D,
  sheet: CanvasImageSource,
  face: number,
  x: number,
  y: number,
  size: number,
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet,
    (face % FACE_COLUMNS) * FACE,
    Math.floor(face / FACE_COLUMNS) * FACE,
    FACE,
    FACE,
    x,
    y,
    size,
    size,
  );
}
