import { Suspense, lazy, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { DEFAULT_ARVID_COLOR, type ArvidColor } from '../../domain/arvid/arvid';
import { DEFAULT_COMPANION, DEFAULT_DARIS_COLOR, type Companion, type DarisColor } from '../../domain/arvid/companion';
import { DEFAULT_AVATAR, type Avatar } from '../../domain/avatar/catalog';
import { useT } from '../../i18n';
import { useSettings } from '../data';
import { MusicButton } from '../music/MusicProvider';
import { TrackName } from '../music/TrackName';
import { Link } from 'react-router';
import { FriendsIcon, GameIcon } from '../design/icons';
import { accountsEnabled } from '../account/account';
import { ChatControl } from './Chat';
import { claimIntro, currentSpeechText, introAvailable, releaseEntrance, subscribeSpeech } from './engine';

// El dibujo se carga aparte: Hoy es usable antes de que llegue la escena (NFR5-04)
const SceneCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.SceneCanvas })));
const AvatarCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.AvatarCanvas })));
const ArvidCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.ArvidCanvas })));
const DarisCanvas = lazy(() => import('./SceneCanvas').then((m) => ({ default: m.DarisCanvas })));

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

/** Tiempos de la presentación de la fecha (UB-06), en ms. */
const INTRO_TYPE_MS = 60;
const INTRO_HOLD_MS = 700;
const INTRO_FADE_MS = 400;
const INTRO_OPEN_MS = 700;

/**
 * Presentación al abrir la app (UB-06): la escena empieza en negro, `text` se escribe letra a letra en el centro, se
 * desvanece y dos bandas negras se abren hacia arriba y hacia abajo. ARVID hace su entrada al abrirse.
 */
function SceneIntro({ text, onDone }: { text: string; onDone: () => void }) {
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'fade' | 'open'>('typing');
  const done = useEffectEvent(onDone);
  useEffect(() => {
    const timers: number[] = [];
    let i = 0;
    const typing = window.setInterval(() => {
      setTyped(++i);
      if (i < text.length) return;
      window.clearInterval(typing);
      timers.push(window.setTimeout(() => setPhase('fade'), INTRO_HOLD_MS));
      timers.push(
        window.setTimeout(() => {
          setPhase('open');
          releaseEntrance();
        }, INTRO_HOLD_MS + INTRO_FADE_MS),
      );
      timers.push(window.setTimeout(() => done(), INTRO_HOLD_MS + INTRO_FADE_MS + INTRO_OPEN_MS));
    }, INTRO_TYPE_MS);
    return () => {
      window.clearInterval(typing);
      timers.forEach((t) => window.clearTimeout(t));
      // Si se sale de Hoy a mitad, ARVID entra igualmente al volver a ver la escena
      releaseEntrance();
    };
  }, [text]);
  return (
    <div className={`scene-intro ${phase}`} aria-hidden="true">
      <span className="scene-intro-band top" />
      <span className="scene-intro-band bottom" />
      <p className="scene-intro-text">
        {text.slice(0, typed)}
        <span className="scene-intro-caret">_</span>
      </p>
    </div>
  );
}

/**
 * Escena neón con el protagonista y ARVID (spec 05 UB, spec 06). El contenedor mantiene la proporción 2:1 y el
 * color de fondo mientras carga o si falla (ESC-12), así que no hay saltos de layout.
 * - `overlay`, arriba a la izquierda (fecha en Hoy, nivel en Perfil).
 * - `intro`: texto de la presentación al abrir la app (UB-06); el `overlay` aparece al terminar.
 * - Con `controls`: bocina arriba a la derecha (MU-01), nombre de la pista abajo a la izquierda (MUS-08) y chat
 *   abajo a la derecha (CH-01).
 */
/** Abre el juego (spec 09, JG-01), encima del chat. */
function GameButton() {
  const t = useT();
  return (
    <Link to="/juego" className="btn chat-button" aria-label={t('game.open')} title={t('game.open')}>
      <GameIcon />
    </Link>
  );
}

/** Abre Perfil → Amigos (spec 15, AM-10). */
function FriendsButton() {
  const t = useT();
  return (
    <Link to="/perfil/amigos" className="btn chat-button" aria-label={t('friends.title')} title={t('friends.title')}>
      <FriendsIcon />
    </Link>
  );
}

/** Cuánto siguen a la vista los botones de la escena tras tocarla. */
const CONTROLS_VISIBLE_MS = 4000;

/**
 * `focus` (Ajustes → Perfil, D-197): la cámara cerca del protagonista y su compañero, sin botones ni burbujas.
 */
export function Scene({ overlay, controls = true, intro, focus = false }: { overlay?: ReactNode; controls?: boolean; intro?: string; focus?: boolean }) {
  const settings = useSettings();
  const avatar = settings?.avatar ?? DEFAULT_AVATAR;
  const arvidColor = settings?.arvidColor ?? DEFAULT_ARVID_COLOR;
  // Se decide al montar: solo la primera escena de la apertura y sin movimiento reducido
  const [playing, setPlaying] = useState(() => intro !== undefined && introAvailable());
  // Antes de que el lienzo se active (efecto normal del hijo), para que ARVID espere
  useLayoutEffect(() => {
    if (playing) claimIntro();
  }, [playing]);
  // Escena limpia (D-155): los botones (música, juego y chat) se desvanecen y aparecen unos segundos al tocarla
  const [revealed, setRevealed] = useState(false);
  const hideTimer = useRef<number>(undefined);
  const reveal = () => {
    setRevealed(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setRevealed(false), CONTROLS_VISIBLE_MS);
  };
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);
  // Al abrir (tras la presentación), los botones se ven unos segundos para que se sepa que están (AM-11)
  const shownOnce = useRef(false);
  useEffect(() => {
    if (!controls || playing || shownOnce.current) return;
    shownOnce.current = true;
    const timer = window.setTimeout(reveal, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controls, playing]);
  return (
    <div className={`scene${revealed ? ' controls-shown' : ''}${focus ? ' focus' : ''}`} onPointerDown={reveal}>
      <Suspense fallback={null}>
        <SceneCanvas avatar={avatar} arvidColor={arvidColor} companion={settings?.companion} darisColor={settings?.darisColor} quiet={focus} />
      </Suspense>
      {overlay && <div className={playing ? 'scene-overlay hidden' : 'scene-overlay'}>{overlay}</div>}
      {playing && intro && <SceneIntro text={intro} onDone={() => setPlaying(false)} />}
      {controls && (
        <>
          <div className="scene-bottom-left">
            <TrackName />
          </div>
          {/* Una sola columna arriba a la derecha, con la misma separación entre todos los botones (D-184) */}
          <div className="scene-corner">
            <MusicButton />
            {accountsEnabled() && <FriendsButton />}
            {settings?.games !== false && <GameButton />}
            <ChatControl />
          </div>
        </>
      )}
      {!focus && <SpeechAnnouncer />}
    </div>
  );
}

/** Protagonista caminando en el sitio; por defecto, el elegido en los ajustes. */
export function AvatarPreview({ avatar, scale = 2, still = false }: { avatar?: Avatar; scale?: number; still?: boolean }) {
  const saved = useSettings()?.avatar ?? DEFAULT_AVATAR;
  return (
    // Ancho fluido con máximo: en pantallas estrechas se encoge sin desbordar
    <span className="avatar-preview" style={{ width: '100%', maxWidth: 100 * scale, aspectRatio: '100 / 72' }}>
      <Suspense fallback={null}>
        <AvatarCanvas avatar={avatar ?? saved} scale={scale} still={still} />
      </Suspense>
    </span>
  );
}

/** ARVID flotando en su color; por defecto, el elegido en los ajustes. */
export function ArvidPreview({ color, size = 64, talking = false, still = false }: { color?: ArvidColor; size?: number; talking?: boolean; still?: boolean }) {
  const saved = useSettings()?.arvidColor ?? DEFAULT_ARVID_COLOR;
  return (
    <span className="avatar-preview" style={{ width: size, height: size }}>
      <Suspense fallback={null}>
        <ArvidCanvas color={color ?? saved} size={size} talking={talking} still={still} />
      </Suspense>
    </span>
  );
}

/** DARIS en su color; por defecto, el elegido en los ajustes (spec 08). */
export function DarisPreview({ color, size = 64, talking = false, still = false }: { color?: DarisColor; size?: number; talking?: boolean; still?: boolean }) {
  const saved = useSettings()?.darisColor ?? DEFAULT_DARIS_COLOR;
  return (
    <span className="avatar-preview" style={{ width: size, height: size }}>
      <Suspense fallback={null}>
        <DarisCanvas color={color ?? saved} size={size} talking={talking} still={still} />
      </Suspense>
    </span>
  );
}

/** El compañero elegido (ARVID o DARIS) en su color: retrato de los diálogos y del aviso de nivel. */
export function CompanionPreview({ companion, size = 64, talking = false }: { companion?: Companion; size?: number; talking?: boolean }) {
  const saved = useSettings()?.companion ?? DEFAULT_COMPANION;
  return (companion ?? saved) === 'daris' ? <DarisPreview size={size} talking={talking} /> : <ArvidPreview size={size} talking={talking} />;
}
