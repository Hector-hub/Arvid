import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_MUSIC, saveSetting } from '../../data/repository';
import { useT } from '../../i18n';
import { useData, useSettings } from '../data';
import { SpeakerOffIcon, SpeakerOnIcon } from '../design/icons';
import { MusicPlayer, type PlayerState } from './player';
import { TRACKS } from './tracks';

export interface Music extends PlayerState {
  /** Preferencia guardada (MUS-01: desactivada por defecto). */
  enabled: boolean;
  volume: number;
  toggle: () => void;
  next: () => void;
  setVolume: (volume: number) => void;
  /** Calla la música mientras suena otra cosa (un juego, spec 09) sin tocar la preferencia guardada; devuelve cómo reanudarla. */
  hush: () => () => void;
}

const MusicCtx = createContext<Music | null>(null);

/** Los controles de música llevan este atributo: su toque no cuenta como "primera interacción" (MUS-04). */
export const MUSIC_CONTROL = 'data-music-control';

/** Música de fondo opcional (spec 05, MUS). El reproductor se crea con el primer gesto que la activa. */
export function MusicProvider({ children }: { children: ReactNode }) {
  const { db } = useData();
  const music = useSettings()?.music ?? DEFAULT_MUSIC;
  const player = useRef<MusicPlayer | undefined>(undefined);
  const [state, setState] = useState<PlayerState>({ playing: false, needsConnection: false });
  const volume = music.volume;

  const get = useCallback(() => (player.current ??= new MusicPlayer(TRACKS, volume, setState)), [volume]);

  // Si quedó activada, empieza con la primera interacción de la sesión (los navegadores no permiten autoarranque).
  // Solo sirven los eventos que dan permiso para sonar: en iPhone, al levantar el dedo, no al apoyarlo.
  useEffect(() => {
    if (!music.enabled) return;
    const events = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    const start = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(`[${MUSIC_CONTROL}]`)) return;
      if (!get().isEnabled()) void get().start();
      remove();
    };
    const remove = () => events.forEach((name) => window.removeEventListener(name, start));
    events.forEach((name) => window.addEventListener(name, start));
    return remove;
  }, [music.enabled, get]);

  useEffect(() => () => player.current?.destroy(), []);

  // Estable: quien la usa en un efecto no debe volver a callarla en cada cambio de estado
  const hush = useCallback(() => {
    const p = player.current;
    if (!p?.isEnabled()) return () => undefined;
    p.stop();
    return () => void p.start();
  }, []);

  const value = useMemo<Music>(
    () => ({
      ...state,
      enabled: music.enabled,
      volume,
      toggle() {
        // Cambia la preferencia guardada (lo que muestra la bocina), aunque la música aún espere al primer toque
        const p = get();
        const on = !music.enabled;
        if (on) void p.start();
        else p.stop();
        void saveSetting(db, 'music', { enabled: on, volume });
      },
      next: () => get().skip(),
      hush,
      setVolume(v) {
        player.current?.setVolume(v);
        void saveSetting(db, 'music', { enabled: music.enabled, volume: v });
      },
    }),
    [state, music.enabled, volume, get, db, hush],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic(): Music {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error('useMusic requiere MusicProvider');
  return ctx;
}

/** Bocina de la música arriba a la derecha de la escena: con ondas si está activada y tachada si no (MU-01, MUS-09). */
export function MusicButton() {
  const music = useMusic();
  const t = useT();
  return (
    <button
      type="button"
      className="btn btn-icon scene-icon"
      aria-pressed={music.enabled}
      aria-label={t('scene.music')}
      title={t('scene.music')}
      {...{ [MUSIC_CONTROL]: '' }}
      onClick={music.toggle}
    >
      {music.enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  );
}
