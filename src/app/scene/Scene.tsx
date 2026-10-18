import { Suspense, lazy, type ReactNode } from 'react';
import { DEFAULT_AVATAR, type Avatar } from '../../domain/avatar/catalog';
import { useSettings } from '../data';

// El dibujo se carga aparte: Hoy es usable antes de que llegue la escena (NFR5-04)
const SceneCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.SceneCanvas })));
const AvatarCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.AvatarCanvas })));

/**
 * Escena neón con el protagonista elegido (spec 05, UB). El contenedor mantiene la proporción 2:1 y el color de
 * fondo mientras carga o si falla (ESC-12), así que no hay saltos de layout. `overlay` va arriba a la izquierda
 * (nivel en Personaje) y `corner`, abajo a la derecha (botón de música en Hoy).
 */
export function Scene({ overlay, corner }: { overlay?: ReactNode; corner?: ReactNode }) {
  const avatar = useSettings()?.avatar ?? DEFAULT_AVATAR;
  return (
    <div className="scene">
      <Suspense fallback={null}>
        <SceneCanvas avatar={avatar} />
      </Suspense>
      {overlay && <div className="scene-overlay">{overlay}</div>}
      {corner && <div className="scene-corner">{corner}</div>}
    </div>
  );
}

/** Protagonista caminando en el sitio; por defecto, el elegido en los ajustes. */
export function AvatarPreview({ avatar, scale = 2 }: { avatar?: Avatar; scale?: number }) {
  const saved = useSettings()?.avatar ?? DEFAULT_AVATAR;
  return (
    <span className="avatar-preview" style={{ width: 100 * scale, height: 72 * scale }}>
      <Suspense fallback={null}>
        <AvatarCanvas avatar={avatar ?? saved} scale={scale} />
      </Suspense>
    </span>
  );
}
