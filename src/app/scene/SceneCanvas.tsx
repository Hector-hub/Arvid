// Lienzos de la escena y de la vista previa del protagonista. Se cargan aparte (lazy) para no retrasar la primera
// pintura (NFR5-04); las pantallas usan los envoltorios de `Scene.tsx`.
import { useEffect, useRef, useState } from 'react';
import { CASTS, VARIANT_NAMES, type Avatar } from '../../domain/avatar/catalog';
import { SCENE_H, SCENE_W } from '../../domain/scene/scene';
import { useReducedMotion } from '../motion';
import { loadHero, loadSceneImages, type HeroSheets, type SceneImages } from './assets';
import { drawHero, drawScene } from './draw';
import { advance, resetClock, scene, setActive } from './engine';

export const SCENE_LABEL = 'Tu protagonista camina por un puente de la ciudad de noche';

function useHero(avatar: Avatar) {
  const [hero, setHero] = useState<{ key: string; sheets: HeroSheets }>();
  const [failed, setFailed] = useState(false);
  const key = `${avatar.cast}:${avatar.variant}`;
  useEffect(() => {
    let live = true;
    loadHero(avatar).then(
      (sheets) => live && setHero({ key, sheets }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
    // `key` resume el avatar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Mientras llega la variante nueva se sigue mostrando la anterior
  return { sheets: hero?.sheets, failed };
}

/**
 * Escena animada (ESC). Solo se anima con la app visible y el lienzo en pantalla (ESC-10); con movimiento reducido
 * se dibuja una imagen fija (ESC-11). Si algo no carga, no se dibuja nada y queda el panel de fondo (ESC-12).
 */
export function SceneCanvas({ avatar }: { avatar: Avatar }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [images, setImages] = useState<SceneImages>();
  const [imagesFailed, setImagesFailed] = useState(false);
  const hero = useHero(avatar);
  const cast = CASTS[avatar.cast];

  useEffect(() => {
    let live = true;
    loadSceneImages().then(
      (i) => live && setImages(i),
      () => live && setImagesFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const sheets = hero.sheets;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !images || !sheets) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const draw = () => drawScene(c, scene, images, { cast, sheets }, reduced);

    if (reduced) {
      advance(performance.now(), true);
      draw();
      return;
    }

    let raf = 0;
    let onScreen = typeof IntersectionObserver === 'undefined';
    let running = false;
    const loop = (now: number) => {
      advance(now, false);
      draw();
      raf = requestAnimationFrame(loop);
    };
    const update = () => {
      const visible = onScreen && document.visibilityState === 'visible';
      if (visible === running) return;
      running = visible;
      setActive(visible);
      if (visible) {
        resetClock();
        raf = requestAnimationFrame(loop);
      } else cancelAnimationFrame(raf);
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? undefined
        : new IntersectionObserver(([entry]) => {
            onScreen = entry?.isIntersecting ?? false;
            update();
          });
    observer?.observe(canvas);
    document.addEventListener('visibilitychange', update);
    draw();
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      cancelAnimationFrame(raf);
      if (running) setActive(false);
    };
  }, [images, sheets, cast, reduced]);

  if (imagesFailed || hero.failed) return null;
  return <canvas ref={ref} width={SCENE_W} height={SCENE_H} className="scene-canvas" role="img" aria-label={SCENE_LABEL} />;
}

const PREVIEW_W = 100;
const PREVIEW_H = 72;

/** Vista previa del protagonista caminando en el sitio (selector, onboarding y subida de nivel). */
export function AvatarCanvas({ avatar, scale = 2 }: { avatar: Avatar; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const { sheets, failed } = useHero(avatar);
  const cast = CASTS[avatar.cast];

  useEffect(() => {
    if (!sheets) return;
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const draw = (t: number) => {
      c.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      drawHero(c, cast, sheets, t, reduced, PREVIEW_W / 2, PREVIEW_H - 2);
    };
    if (reduced) {
      draw(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      draw((now - start) / (1000 / 60));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sheets, cast, reduced]);

  if (failed) return null;
  return (
    <canvas
      ref={ref}
      width={PREVIEW_W}
      height={PREVIEW_H}
      className="avatar-canvas"
      style={{ width: PREVIEW_W * scale, height: PREVIEW_H * scale }}
      role="img"
      aria-label={`${cast.name} · ${VARIANT_NAMES[avatar.variant]}`}
    />
  );
}
