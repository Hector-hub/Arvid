// Iconos pixel dibujados con rectángulos (12×12), en `currentColor` (spec 06, MU-01 y CH-01).
import type { ReactNode } from 'react';

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
