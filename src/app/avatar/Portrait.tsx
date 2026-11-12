// Retrato de tu protagonista (spec 18, RT): busto pixel art que parpadea solo, habla y pone caras. Sin hoja cargada
// (sin conexión la primera vez), se ve el sprite de cuerpo entero (RT-06).
import { useEffect, useRef, useState } from 'react';
import { DEFAULT_AVATAR, type Avatar } from '../../domain/avatar/catalog';
import {
  BLINK_EVERY_MS,
  BLINK_MS,
  EXPRESSION_FACE,
  FACE,
  FACES,
  TALK_MS,
  type Expression,
} from '../../domain/avatar/portrait';
import { t } from '../../i18n';
import { useSettings } from '../data';
import { useReducedMotion } from '../motion';
import { AvatarPreview } from '../scene/Scene';
import { drawFace, loadPortrait } from './portraitAssets';

/** Caras que salen al tocar el retrato (RD-01): las de las filas 3 y 4. */
const TAP_FACES = [FACES.smile, FACES.grin, FACES.laugh, FACES.surprise, FACES.determined, FACES.thinking, FACES.tired];
const FLASH_MS = 1000;

export function Portrait({
  avatar,
  scale = 3,
  expression = 'normal',
  talking = false,
  greet = false,
  tappable = false,
  className,
}: {
  avatar?: Avatar;
  scale?: number;
  expression?: Expression;
  talking?: boolean;
  /** Sonríe 1 s al aparecer (RD-01). */
  greet?: boolean;
  /** Al tocarlo pone una cara al azar 1 s (RD-01). */
  tappable?: boolean;
  className?: string;
}) {
  const saved = useSettings()?.avatar ?? DEFAULT_AVATAR;
  const who = avatar ?? saved;
  const reduced = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sheet, setSheet] = useState<{ key: string; cv: HTMLCanvasElement }>();
  const [failed, setFailed] = useState<string>();
  const [flash, setFlash] = useState<number | undefined>(greet ? FACES.smile : undefined);
  const [blink, setBlink] = useState<number>();
  const [mouth, setMouth] = useState(0);
  const key = `${who.cast}:${who.variant}`;

  useEffect(() => {
    let live = true;
    loadPortrait(who).then(
      (cv) => live && setSheet({ key, cv }),
      () => live && setFailed(key),
    );
    return () => {
      live = false;
    };
    // `who` cambia de identidad en cada render; basta con la combinación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Una cara pasajera (saludo o toque) vuelve a la expresión al segundo
  useEffect(() => {
    if (flash === undefined) return;
    const id = window.setTimeout(() => setFlash(undefined), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [flash]);

  // Parpadeo (RT-02): solo con la cara normal, sin hablar y con movimiento
  const canBlink = !reduced && !talking && flash === undefined && expression === 'normal';
  useEffect(() => {
    if (!canBlink) return;
    const ids: number[] = [];
    const later = (fn: () => void, ms: number) => ids.push(window.setTimeout(fn, ms));
    const schedule = () =>
      later(
        () => {
          let at = 0;
          BLINK_MS.forEach((ms, i) => {
            later(() => setBlink(FACES.blink[i]), at);
            at += ms;
          });
          later(() => {
            setBlink(undefined);
            schedule();
          }, at);
        },
        BLINK_EVERY_MS[0] + Math.random() * (BLINK_EVERY_MS[1] - BLINK_EVERY_MS[0]),
      );
    schedule();
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      setBlink(undefined);
    };
  }, [canBlink]);

  // Hablar (RT-03): la boca cambia cada 110 ms
  useEffect(() => {
    if (!talking || reduced) return;
    const id = window.setInterval(() => setMouth((m) => (m + 1) % FACES.talk.length), TALK_MS);
    return () => window.clearInterval(id);
  }, [talking, reduced]);

  const face = flash ?? (talking && !reduced ? FACES.talk[mouth]! : (blink ?? EXPRESSION_FACE[expression]));
  const ready = sheet?.key === key ? sheet.cv : undefined;
  const size = FACE * scale;

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !ready) return;
    ctx.clearRect(0, 0, size, size);
    drawFace(ctx, ready, face, 0, 0, size);
  }, [ready, face, size]);

  if (failed === key && !ready) return <AvatarPreview avatar={who} scale={Math.max(1, scale - 1)} still={reduced} />;
  const tap = () => tappable && setFlash(TAP_FACES[Math.floor(Math.random() * TAP_FACES.length)]);
  return (
    <canvas
      ref={canvas}
      width={size}
      height={size}
      className={`portrait${className ? ` ${className}` : ''}`}
      style={{
        width: '100%',
        maxWidth: size,
        aspectRatio: '1 / 1',
        imageRendering: 'pixelated',
        cursor: tappable ? 'pointer' : undefined,
      }}
      role="img"
      aria-label={t('profile.portrait')}
      onClick={tap}
    />
  );
}
