// Miniatura de un elemento de la ciudad (spec 11, TC-01) dibujada con los sprites de la escena; lo que aún no se ha
// ganado se ve como una silueta oscura (NFR11-01: sin imágenes nuevas).
import { useEffect, useRef, useState } from 'react';
import { isNeighbor, neighbor, type CityItem } from '../../domain/scene/city';
import { loadSceneImages, type SceneImages } from '../scene/assets';
import { EXTRAS_FRAME } from '../scene/extras';
import { SKY_SPRITES } from '../scene/sky.generated';

const SIZE = 48;
let images: Promise<SceneImages> | undefined;

function drawItem(c: CanvasRenderingContext2D, imgs: SceneImages, item: CityItem) {
  const fit = (img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number) => {
    const k = Math.min(SIZE / sw, SIZE / sh, 2);
    const w = Math.round(sw * k);
    const h = Math.round(sh * k);
    c.drawImage(img, sx, sy, sw, sh, Math.round((SIZE - w) / 2), SIZE - h, w, h);
  };
  if (isNeighbor(item)) return fit(imgs.extras, 0, neighbor(item).ped * EXTRAS_FRAME, EXTRAS_FRAME, EXTRAS_FRAME);
  if (item === 'cars' || item === 'police') {
    const img = imgs.cars[item === 'police' ? 2 : 0]!;
    return fit(img, 0, 0, img.width, img.height);
  }
  if (item === 'props') {
    const img = imgs.props[0]!;
    return fit(img, 0, 0, img.width, img.height);
  }
  if (item === 'skyline' || item === 'buildings') {
    // Un trozo de la capa, a lo ancho
    const img = imgs.bg[item === 'skyline' ? 1 : 2]!;
    const sx = item === 'skyline' ? 0 : 60;
    return c.drawImage(img, sx, 80, 112, 112, 0, 0, SIZE, SIZE);
  }
  if (item === 'sky') {
    const s = SKY_SPRITES.find((d) => d.depth === 'near' && d.model === '4')!;
    return fit(imgs.sky, 0, s.y, s.w, s.h);
  }
  // Farola: los mismos rectángulos que en la escena (draw.ts)
  c.fillStyle = '#3b5dc9';
  c.fillRect(20, 6, 3, 42);
  c.fillRect(20, 4, 18, 3);
  c.fillStyle = '#41a6f6';
  c.fillRect(21, 6, 1, 42);
  c.fillStyle = '#ffcd75';
  c.fillRect(31, 7, 7, 2);
}

export function CityThumb({ item, unlocked }: { item: CityItem; unlocked: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<SceneImages>();
  useEffect(() => {
    let live = true;
    (images ??= loadSceneImages()).then(
      (i) => live && setImgs(i),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const c = ref.current?.getContext('2d');
    if (!c || !imgs) return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, SIZE, SIZE);
    drawItem(c, imgs, item);
    if (!unlocked) {
      // Silueta: se pinta encima solo donde hay dibujo
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = '#4a5078';
      c.fillRect(0, 0, SIZE, SIZE);
      c.globalCompositeOperation = 'source-over';
    }
  }, [imgs, item, unlocked]);
  return <canvas ref={ref} width={SIZE} height={SIZE} className="avatar-canvas city-thumb" aria-hidden="true" />;
}
