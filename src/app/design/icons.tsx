// Iconos pixel dibujados con rectángulos (12×12), en `currentColor` (spec 06, MU-01 y CH-01).
import type { ReactNode } from 'react';
import type { SpriteName } from './sprites.generated';

function PixelIcon({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      {children}
    </svg>
  );
}

const SPEAKER = (
  <>
    <rect x="1" y="4" width="2" height="4" />
    <rect x="3" y="3" width="1" height="6" />
    <rect x="4" y="2" width="1" height="8" />
    <rect x="5" y="1" width="1" height="10" />
  </>
);

/** Bocina con ondas (música sonando). */
export function SpeakerOnIcon() {
  return (
    <PixelIcon>
      {SPEAKER}
      <rect x="7" y="5" width="1" height="2" />
      <rect x="8" y="3" width="1" height="1" />
      <rect x="8" y="8" width="1" height="1" />
      <rect x="9" y="4" width="1" height="4" />
      <rect x="10" y="2" width="1" height="1" />
      <rect x="10" y="9" width="1" height="1" />
      <rect x="11" y="3" width="1" height="6" />
    </PixelIcon>
  );
}

/** Bocina tachada (música apagada). */
export function SpeakerOffIcon() {
  return (
    <PixelIcon>
      {SPEAKER}
      <rect x="7" y="4" width="1" height="1" />
      <rect x="8" y="5" width="1" height="1" />
      <rect x="9" y="6" width="1" height="1" />
      <rect x="10" y="7" width="1" height="1" />
      <rect x="10" y="4" width="1" height="1" />
      <rect x="9" y="5" width="1" height="1" />
      <rect x="8" y="6" width="1" height="1" />
      <rect x="7" y="7" width="1" height="1" />
    </PixelIcon>
  );
}

/** Bocadillo (abrir el chat con ARVID). */
export function ChatIcon() {
  return (
    <PixelIcon>
      <rect x="1" y="1" width="10" height="1" />
      <rect x="0" y="2" width="1" height="6" />
      <rect x="11" y="2" width="1" height="6" />
      <rect x="1" y="8" width="5" height="1" />
      <rect x="8" y="8" width="3" height="1" />
      <rect x="6" y="9" width="1" height="1" />
      <rect x="7" y="8" width="1" height="2" />
      <rect x="3" y="4" width="1" height="2" />
      <rect x="6" y="4" width="1" height="2" />
      <rect x="9" y="4" width="1" height="2" />
    </PixelIcon>
  );
}

/** Flecha de enviar. */
export function SendIcon() {
  return (
    <PixelIcon>
      <rect x="1" y="5" width="8" height="2" />
      <rect x="6" y="2" width="1" height="1" />
      <rect x="7" y="3" width="1" height="1" />
      <rect x="8" y="4" width="1" height="1" />
      <rect x="9" y="5" width="2" height="2" />
      <rect x="8" y="7" width="1" height="1" />
      <rect x="7" y="8" width="1" height="1" />
      <rect x="6" y="9" width="1" height="1" />
    </PixelIcon>
  );
}

/** Expandir: cuatro esquinas hacia fuera. */
export function ExpandIcon() {
  return (
    <PixelIcon>
      <rect x="1" y="1" width="4" height="1" />
      <rect x="1" y="1" width="1" height="4" />
      <rect x="7" y="1" width="4" height="1" />
      <rect x="10" y="1" width="1" height="4" />
      <rect x="1" y="10" width="4" height="1" />
      <rect x="1" y="7" width="1" height="4" />
      <rect x="7" y="10" width="4" height="1" />
      <rect x="10" y="7" width="1" height="4" />
      <rect x="3" y="3" width="1" height="1" />
      <rect x="8" y="3" width="1" height="1" />
      <rect x="3" y="8" width="1" height="1" />
      <rect x="8" y="8" width="1" height="1" />
    </PixelIcon>
  );
}

/** Mando de juego (spec 09). */
export function GameIcon() {
  return (
    <PixelIcon>
      <rect x="1" y="3" width="10" height="1" />
      <rect x="0" y="4" width="1" height="5" />
      <rect x="11" y="4" width="1" height="5" />
      <rect x="1" y="9" width="3" height="1" />
      <rect x="8" y="9" width="3" height="1" />
      <rect x="4" y="8" width="4" height="1" />
      <rect x="2" y="6" width="3" height="1" />
      <rect x="3" y="5" width="1" height="3" />
      <rect x="8" y="5" width="1" height="1" />
      <rect x="9" y="7" width="1" height="1" />
    </PixelIcon>
  );
}

/** Esquinas hacia dentro: salir de pantalla completa (spec 09). */
export function CollapseIcon() {
  return (
    <PixelIcon>
      <rect x="1" y="4" width="4" height="1" />
      <rect x="4" y="1" width="1" height="4" />
      <rect x="7" y="4" width="4" height="1" />
      <rect x="7" y="1" width="1" height="4" />
      <rect x="1" y="7" width="4" height="1" />
      <rect x="4" y="7" width="1" height="4" />
      <rect x="7" y="7" width="4" height="1" />
      <rect x="7" y="7" width="1" height="4" />
    </PixelIcon>
  );
}

/** Papelera: borrar la conversación (D-127). */
export function TrashIcon() {
  return (
    <PixelIcon>
      <rect x="4" y="0" width="4" height="1" />
      <rect x="1" y="1" width="10" height="2" />
      <rect x="2" y="3" width="1" height="8" />
      <rect x="9" y="3" width="1" height="8" />
      <rect x="3" y="10" width="6" height="1" />
      <rect x="4" y="4" width="1" height="5" />
      <rect x="7" y="4" width="1" height="5" />
    </PixelIcon>
  );
}

/** Flecha de volver. */
export function BackIcon() {
  return (
    <PixelIcon>
      <rect x="3" y="5" width="8" height="2" />
      <rect x="5" y="2" width="1" height="1" />
      <rect x="4" y="3" width="1" height="1" />
      <rect x="3" y="4" width="1" height="1" />
      <rect x="1" y="5" width="2" height="2" />
      <rect x="3" y="7" width="1" height="1" />
      <rect x="4" y="8" width="1" height="1" />
      <rect x="5" y="9" width="1" height="1" />
    </PixelIcon>
  );
}

/** Tres puntos verticales: menú de opciones (D-130). */
export function MoreIcon() {
  return (
    <PixelIcon>
      <rect x="5" y="1" width="2" height="2" />
      <rect x="5" y="5" width="2" height="2" />
      <rect x="5" y="9" width="2" height="2" />
    </PixelIcon>
  );
}

/** Reproductor de música (spec 16, PS-01): reproducir, pausa (dos barras paralelas), anterior y siguiente. */
export function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <PixelIcon size={size}>
      <rect x="3" y="1" width="2" height="10" />
      <rect x="5" y="2" width="1" height="8" />
      <rect x="6" y="3" width="1" height="6" />
      <rect x="7" y="4" width="1" height="4" />
      <rect x="8" y="5" width="1" height="2" />
    </PixelIcon>
  );
}

export function PauseIcon({ size = 16 }: { size?: number }) {
  return (
    <PixelIcon size={size}>
      <rect x="3" y="2" width="2" height="8" />
      <rect x="7" y="2" width="2" height="8" />
    </PixelIcon>
  );
}

export function PrevTrackIcon({ size = 16 }: { size?: number }) {
  return (
    <PixelIcon size={size}>
      <rect x="2" y="2" width="2" height="8" />
      <rect x="5" y="5" width="1" height="2" />
      <rect x="6" y="4" width="1" height="4" />
      <rect x="7" y="3" width="1" height="6" />
      <rect x="8" y="2" width="2" height="8" />
    </PixelIcon>
  );
}

export function NextTrackIcon({ size = 16 }: { size?: number }) {
  return (
    <PixelIcon size={size}>
      <rect x="2" y="2" width="2" height="8" />
      <rect x="4" y="3" width="1" height="6" />
      <rect x="5" y="4" width="1" height="4" />
      <rect x="6" y="5" width="1" height="2" />
      <rect x="8" y="2" width="2" height="8" />
    </PixelIcon>
  );
}

/**
 * Iconos pixel del estilo Cristal neón (D-157, D-175), en una cuadrícula de 12×12 como la maqueta: sustituyen a los del atlas
 * de sprites con el mismo nombre (ver `Sprite`). Cada rectángulo es [x, y, ancho, alto].
 */
export const PIXEL_ICON_RECTS: Partial<Record<SpriteName, readonly (readonly [number, number, number, number])[]>> = {
  'nav-today': [[5, 0, 2, 2], [5, 10, 2, 2], [0, 5, 2, 2], [10, 5, 2, 2], [1, 1, 2, 2], [9, 1, 2, 2], [1, 9, 2, 2], [9, 9, 2, 2], [4, 3, 4, 1], [3, 4, 6, 4], [4, 8, 4, 1]],
  'nav-activities': [[1, 2, 2, 2], [4, 2, 7, 2], [1, 5, 2, 2], [4, 5, 7, 2], [1, 8, 2, 2], [4, 8, 7, 2]],
  'nav-goals': [[2, 1, 1, 10], [3, 1, 7, 5], [1, 10, 3, 1]],
  'nav-character': [[4, 1, 4, 1], [3, 2, 6, 3], [4, 5, 4, 1], [2, 7, 8, 1], [1, 8, 10, 3]],
  'cat-body': [[2, 2, 3, 1], [7, 2, 3, 1], [1, 3, 10, 3], [2, 6, 8, 1], [3, 7, 6, 1], [4, 8, 4, 1], [5, 9, 2, 1]],
  'cat-relationships': [[2, 1, 2, 1], [8, 1, 2, 1], [1, 2, 4, 2], [7, 2, 4, 2], [2, 4, 2, 1], [8, 4, 2, 1], [1, 6, 4, 1], [7, 6, 4, 1], [0, 7, 12, 3]],
  'cat-music': [[4, 1, 8, 2], [4, 3, 1, 4], [11, 3, 1, 4], [2, 7, 3, 1], [9, 7, 3, 1], [1, 8, 4, 2], [8, 8, 4, 2], [2, 10, 2, 1], [9, 10, 2, 1]],
  'cat-potion': [[4, 0, 4, 1], [5, 1, 2, 2], [4, 3, 4, 1], [3, 4, 6, 1], [2, 5, 2, 1], [8, 5, 2, 1], [1, 6, 10, 1], [0, 7, 12, 3], [1, 10, 10, 1], [2, 11, 8, 1]],
  'cat-gem': [[2, 2, 8, 1], [1, 3, 2, 1], [4, 3, 4, 1], [9, 3, 2, 1], [0, 4, 12, 1], [1, 5, 10, 1], [2, 6, 8, 1], [3, 7, 6, 1], [4, 8, 4, 1], [5, 9, 2, 1]],
  'trophy': [[1, 0, 10, 1], [0, 1, 2, 1], [3, 1, 6, 3], [10, 1, 2, 1], [0, 2, 1, 1], [11, 2, 1, 1], [0, 3, 2, 1], [10, 3, 2, 1], [2, 4, 8, 1], [3, 5, 6, 1], [4, 6, 4, 1], [5, 7, 2, 2], [3, 9, 6, 1], [2, 10, 8, 1]],
  'arrow-up': [[5, 1, 2, 1], [4, 2, 4, 1], [3, 3, 6, 1], [2, 4, 8, 1], [1, 5, 3, 1], [5, 5, 2, 6], [8, 5, 3, 1], [1, 6, 2, 1], [9, 6, 2, 1]],
  'arrow-down': [[5, 1, 2, 6], [1, 5, 2, 1], [9, 5, 2, 1], [1, 6, 3, 1], [8, 6, 3, 1], [2, 7, 8, 1], [3, 8, 6, 1], [4, 9, 4, 1], [5, 10, 2, 1]],
};

/** Marca de completar (✓) en una cuadrícula de 16 px, del mismo tamaño que «+» y «−» en las tarjetas (D-160). */
export function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="8" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="6" y="12" width="2" height="2" />
      <rect x="8" y="10" width="2" height="2" />
      <rect x="10" y="8" width="2" height="2" />
      <rect x="12" y="6" width="2" height="2" />
      <rect x="14" y="4" width="2" height="2" />
    </svg>
  );
}
