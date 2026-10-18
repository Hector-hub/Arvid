// Lienzos de la escena y de las vistas previas (protagonista y ARVID). Se cargan aparte (lazy) para no retrasar la
// primera pintura (NFR5-04); las pantallas usan los envoltorios de `Scene.tsx`.
import { useEffect, useRef, useState } from 'react';
import type { ArvidColor } from '../../domain/arvid/arvid';
import { CASTS, type Avatar } from '../../domain/avatar/catalog';
import { SCENE_H, SCENE_W } from '../../domain/scene/scene';
import { t, useLocale } from '../../i18n';
import { useReducedMotion } from '../motion';
import { loadArvidAtlas, loadHero, loadSceneImages, type HeroSheets, type SceneImages } from './assets';
import { drawHero, drawScene } from './draw';
import { DRONE, EXTRAS_FRAME } from './extras';
import {
  advance,
  advanceFrames,
  currentSpeech,
  currentSpeechText,
  isTalking,
  resetClock,
  scene,
  setActive,
  subscribeSpeech,
  tapScene,
} from './engine';

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

function useArvidAtlas(color: ArvidColor) {
  const [atlas, setAtlas] = useState<HTMLCanvasElement>();
  useEffect(() => {
    let live = true;
    loadArvidAtlas(color).then(
      (a) => live && setAtlas(a),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [color]);
  return atlas;
}

/**
 * Escena animada (ESC) con ARVID (MV) y su burbuja (BP). Solo se anima con la app visible y el lienzo en pantalla
 * (ESC-10); con movimiento reducido se dibuja una imagen fija (ESC-11). Si algo no carga, no se dibuja nada y queda
 * el panel de fondo (ESC-12). Un toque completa o pasa la página de lo que dice ARVID.
 */
export function SceneCanvas({ avatar, arvidColor }: { avatar: Avatar; arvidColor: ArvidColor }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useLocale();
  const [images, setImages] = useState<SceneImages>();
  const [imagesFailed, setImagesFailed] = useState(false);
  const hero = useHero(avatar);
  const arvid = useArvidAtlas(arvidColor);
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
    const draw = () => drawScene(c, scene, images, { cast, sheets }, reduced, { arvid, speech: currentSpeech() });

    let raf = 0;
    // `undefined` = sin temporizador (un id puede ser 0, p. ej. con relojes simulados)
    let slow: number | undefined;
    let onScreen = typeof IntersectionObserver === 'undefined';
    let running = false;
    const loop = (now: number) => {
      advance(now, reduced);
      draw();
      raf = requestAnimationFrame(loop);
    };
    // Movimiento reducido: imagen fija; solo se redibuja (4 veces por segundo) mientras ARVID habla
    // Cadena de temporizadores que solo se reprograma mientras ARVID habla
    const SLOW_MS = 250;
    // La imagen es fija: solo se redibuja cuando cambia la página de la burbuja
    let shownText: string | undefined;
    const tick = () => {
      slow = undefined;
      advanceFrames(SLOW_MS / (1000 / 60), true);
      if (currentSpeechText() !== shownText) {
        shownText = currentSpeechText();
        draw();
      }
      if (running && isTalking()) slow = window.setTimeout(tick, SLOW_MS);
    };
    const talk = () => {
      if (running && slow === undefined) tick();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      if (slow !== undefined) clearTimeout(slow);
      slow = undefined;
    };
    const unsubscribe = reduced ? subscribeSpeech(talk) : () => undefined;
    const update = () => {
      const visible = onScreen && document.visibilityState === 'visible';
      if (visible === running) return;
      running = visible;
      setActive(visible);
      if (!visible) return stop();
      resetClock();
      if (!reduced) raf = requestAnimationFrame(loop);
      else if (isTalking()) talk();
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
    advance(performance.now(), reduced);
    draw();
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', update);
      unsubscribe();
      stop();
      if (running) setActive(false);
    };
  }, [images, sheets, cast, reduced, arvid]);

  if (imagesFailed || hero.failed) return null;
  return (
    <canvas
      ref={ref}
      width={SCENE_W}
      height={SCENE_H}
      className="scene-canvas"
      role="img"
      aria-label={t('scene.label')}
      onClick={tapScene}
    />
  );
}

const PREVIEW_W = 100;
const PREVIEW_H = 72;

/** Vista previa del protagonista caminando en el sitio (carrusel, onboarding y Ajustes). */
export function AvatarCanvas({ avatar, scale = 2 }: { avatar: Avatar; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useLocale();
  const { sheets, failed } = useHero(avatar);
  const cast = CASTS[avatar.cast];

  useEffect(() => {
    if (!sheets) return;
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const draw = (frameTime: number) => {
      c.clearRect(0, 0, PREVIEW_W, PREVIEW_H);
      drawHero(c, cast, sheets, frameTime, reduced, PREVIEW_W / 2, PREVIEW_H - 2);
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
      style={{ width: '100%', maxWidth: PREVIEW_W * scale }}
      role="img"
      aria-label={`${t(`avatar.styles.${avatar.cast}`)} · ${t(`avatar.variants.${avatar.variant}`)}`}
    />
  );
}

/** ARVID flotando en su color; escanea mientras `talking` (retrato del diálogo, selector de color, aviso de nivel). */
export function ArvidCanvas({ color, size = 64, talking = false }: { color: ArvidColor; size?: number; talking?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const atlas = useArvidAtlas(color);

  useEffect(() => {
    if (!atlas) return;
    const c = ref.current?.getContext('2d');
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const anim = talking ? DRONE.scan : DRONE.walk;
    const draw = (frameTime: number) => {
      c.clearRect(0, 0, 40, 40);
      const f = reduced ? 0 : Math.floor(frameTime / anim.ticks) % anim.frames;
      const bob = reduced ? 0 : Math.round(Math.sin(frameTime / 22) * 1.5);
      c.drawImage(atlas, f * EXTRAS_FRAME + 4, anim.row * EXTRAS_FRAME + 6, 40, 36, 0, 2 + bob, 40, 36);
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
  }, [atlas, talking, reduced]);

  return (
    <canvas
      ref={ref}
      width={40}
      height={40}
      className="avatar-canvas"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${t('arvid.name')} · ${t(`arvid.colors.${color}`)}`}
    />
  );
}
