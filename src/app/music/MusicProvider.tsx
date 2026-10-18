import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_MUSIC, saveSetting } from '../../data/repository';
import { useData, useSettings } from '../data';
import { MusicPlayer, type PlayerState } from './player';
import { TRACKS } from './tracks';

export interface Music extends PlayerState {
  /** Preferencia guardada (MUS-01: desactivada por defecto). */
  enabled: boolean;
  volume: number;
  toggle: () => void;
  next: () => void;
  setVolume: (volume: number) => void;
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

  // Si quedó activada, empieza con la primera interacción de la sesión (los navegadores no permiten autoarranque)
  useEffect(() => {
    if (!music.enabled) return;
    const start = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(`[${MUSIC_CONTROL}]`)) return;
      if (!get().isEnabled()) void get().start();
      remove();
    };
    const remove = () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
    window.addEventListener('pointerdown', start);
    window.addEventListener('keydown', start);
    return remove;
  }, [music.enabled, get]);

  useEffect(() => () => player.current?.destroy(), []);

  const value = useMemo<Music>(
    () => ({
      ...state,
      enabled: music.enabled,
      volume,
      toggle() {
        const p = get();
        const on = !(music.enabled && p.isEnabled());
        if (on) void p.start();
        else p.stop();
        void saveSetting(db, 'music', { enabled: on, volume });
      },
      next: () => get().skip(),
      setVolume(v) {
        player.current?.setVolume(v);
        void saveSetting(db, 'music', { enabled: music.enabled, volume: v });
      },
    }),
    [state, music.enabled, volume, get, db],
  );

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic(): Music {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error('useMusic requiere MusicProvider');
  return ctx;
}

/** Botón de activar o pausar la música (esquina de la escena en Hoy, MUS-06). */
export function MusicButton() {
  const music = useMusic();
  return (
    <button
      type="button"
      className="btn"
      aria-pressed={music.playing}
      {...{ [MUSIC_CONTROL]: '' }}
      onClick={music.toggle}
    >
      Música
    </button>
  );
}
