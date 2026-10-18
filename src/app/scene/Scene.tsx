import { Suspense, lazy, useSyncExternalStore, type ReactNode } from 'react';
import { DEFAULT_ARVID_COLOR, type ArvidColor } from '../../domain/arvid/arvid';
import { DEFAULT_AVATAR, type Avatar } from '../../domain/avatar/catalog';
import { useT } from '../../i18n';
import { useSettings } from '../data';
import { MusicButton } from '../music/MusicProvider';
import { TrackName } from '../music/TrackName';
import { ChatControl } from './Chat';
import { currentSpeechText, subscribeSpeech } from './engine';

// El dibujo se carga aparte: Hoy es usable antes de que llegue la escena (NFR5-04)
const SceneCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.SceneCanvas })));
const AvatarCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.AvatarCanvas })));
const ArvidCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.ArvidCanvas })));

/** Lo que ARVID dice ahora, para lectores de pantalla: el texto del lienzo no se lee (BP-04). */
function SpeechAnnouncer() {
  const t = useT();
  const text = useSyncExternalStore(subscribeSpeech, currentSpeechText, () => '');
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {text && `${t('scene.arvidSays')}: ${text}`}
    </p>
  );
}

/**
 * Escena neón con el protagonista y ARVID (spec 05 UB, spec 06). El contenedor mantiene la proporción 2:1 y el
 * color de fondo mientras carga o si falla (ESC-12), así que no hay saltos de layout.
 * - `overlay`, arriba a la izquierda (nivel en Perfil).
 * - Con `controls`: nombre de la pista arriba a la izquierda (MUS-08), bocina arriba a la derecha (MU-01) y chat
 *   abajo a la derecha (CH-01).
 */
export function Scene({ overlay, controls = true }: { overlay?: ReactNode; controls?: boolean }) {
  const settings = useSettings();
  const avatar = settings?.avatar ?? DEFAULT_AVATAR;
  const arvidColor = settings?.arvidColor ?? DEFAULT_ARVID_COLOR;
  return (
    <div className="scene">
      <Suspense fallback={null}>
        <SceneCanvas avatar={avatar} arvidColor={arvidColor} />
      </Suspense>
      {(overlay || controls) && (
        <div className="scene-overlay">
          {overlay}
          {controls && <TrackName />}
        </div>
      )}
      {controls && (
        <>
          <div className="scene-top-right">
            <MusicButton />
          </div>
          <div className="scene-corner">
            <ChatControl />
          </div>
        </>
      )}
      <SpeechAnnouncer />
    </div>
  );
}

/** Protagonista caminando en el sitio; por defecto, el elegido en los ajustes. */
export function AvatarPreview({ avatar, scale = 2 }: { avatar?: Avatar; scale?: number }) {
  const saved = useSettings()?.avatar ?? DEFAULT_AVATAR;
  return (
    // Ancho fluido con máximo: en pantallas estrechas se encoge sin desbordar
    <span className="avatar-preview" style={{ width: '100%', maxWidth: 100 * scale, aspectRatio: '100 / 72' }}>
      <Suspense fallback={null}>
        <AvatarCanvas avatar={avatar ?? saved} scale={scale} />
      </Suspense>
    </span>
  );
}

/** ARVID flotando en su color; por defecto, el elegido en los ajustes. */
export function ArvidPreview({ color, size = 64, talking = false }: { color?: ArvidColor; size?: number; talking?: boolean }) {
  const saved = useSettings()?.arvidColor ?? DEFAULT_ARVID_COLOR;
  return (
    <span className="avatar-preview" style={{ width: size, height: size }}>
      <Suspense fallback={null}>
        <ArvidCanvas color={color ?? saved} size={size} talking={talking} />
      </Suspense>
    </span>
  );
}
