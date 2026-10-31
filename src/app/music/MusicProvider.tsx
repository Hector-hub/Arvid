import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useOpenSound } from './soundSheetContext';
import { DEFAULT_MUSIC, saveSetting } from '../../data/repository';
import { useT } from '../../i18n';
import { useData, useSettings } from '../data';
import { SpeakerOnIcon } from '../design/icons';
import { MusicPlayer, type PlayerState } from './player';
import { trackArtwork, TRACKS } from './tracks';

export interface Music extends PlayerState {
  /** Preferencia guardada (MUS-01: desactivada por defecto). */
  enabled: boolean;
  volume: number;
  toggle: () => void;
  /** Suena (y queda activada). Idempotente: si ya suena, no hace nada. */
  play: () => void;
  /** Se para (y queda desactivada). Idempotente: si ya está parada, no hace nada. */
  pause: () => void;
  next: () => void;
  previous: () => void;
  /** Suena una pista de la lista (página Sonido, D-195); con la música apagada, la enciende. */
  playTrack: (id: string) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  /** Seguir sonando al salir de la app (D-163). */
  background: boolean;
  setBackground: (on: boolean) => void;
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
  const [state, setState] = useState<PlayerState>({ playing: false, needsConnection: false, time: 0, duration: 0 });
  const volume = music.volume;
  // Lo último guardado, para no reescribir el ajuste entero con valores viejos al cambiar de pista
  const latest = useRef(music);
  useEffect(() => {
    latest.current = music;
  });

  const create = useCallback(
    (background: boolean) =>
      new MusicPlayer(
        TRACKS,
        volume,
        setState,
        latest.current.track,
        (track) => {
          if (latest.current.track !== track) void saveSetting(db, 'music', { ...latest.current, track });
        },
        background,
      ),
    [volume, db],
  );
  const get = useCallback(() => (player.current ??= create(latest.current.background)), [create]);

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

  const value = useMemo<Music>(() => {
    const play = () => {
      void get().start();
      if (!music.enabled) void saveSetting(db, 'music', { ...latest.current, enabled: true });
    };
    const pause = () => {
      player.current?.stop();
      if (music.enabled) void saveSetting(db, 'music', { ...latest.current, enabled: false });
    };
    return {
      ...state,
      enabled: music.enabled,
      volume,
      // Según lo que pasa de verdad (suena o no), no según la preferencia guardada: con la música activada pero aún
      // esperando el primer toque, el botón dice «Reproducir» y debe hacer sonar, no apagar (D-195)
      toggle() {
        if (state.playing || player.current?.isEnabled()) pause();
        else play();
      },
      play,
      pause,
      // Cambiar de pista con la música apagada la enciende (PS-01)
      next() {
        if (!music.enabled) void saveSetting(db, 'music', { ...latest.current, enabled: true });
        get().skip();
      },
      previous() {
        if (!music.enabled) void saveSetting(db, 'music', { ...latest.current, enabled: true });
        get().previous();
      },
      playTrack(id) {
        if (!music.enabled) void saveSetting(db, 'music', { ...latest.current, enabled: true });
        get().playTrack(id);
      },
      seek: (seconds) => player.current?.seek(seconds),
      hush,
      setVolume(v) {
        player.current?.setVolume(v);
        void saveSetting(db, 'music', { ...latest.current, volume: v });
      },
      background: music.background,
      // Cambia la forma de sonar (D-163): un reproductor nuevo en el otro modo, que sigue por la misma pista. Se llama
      // desde el interruptor (un gesto), así que si estaba sonando puede volver a sonar en el acto
      setBackground(on) {
        const p = player.current;
        const wasPlaying = p?.isEnabled() ?? false;
        p?.destroy();
        player.current = create(on);
        if (wasPlaying) void player.current.start();
        void saveSetting(db, 'music', { ...latest.current, background: on });
      },
    };
  }, [state, music.enabled, music.background, volume, get, create, db, hush]);

  // Controles de la pantalla de bloqueo y de la notificación (Media Session, D-163)
  const actions = useRef(value);
  useEffect(() => {
    actions.current = value;
  });
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => actions.current.play()],
      ['pause', () => actions.current.pause()],
      ['previoustrack', () => actions.current.previous()],
      ['nexttrack', () => actions.current.next()],
      ['seekto', (d) => d.seekTime !== undefined && actions.current.seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Acción no admitida en este navegador
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Acción no admitida en este navegador
        }
      }
    };
  }, []);
  useEffect(() => {
    if (!('mediaSession' in navigator) || !state.track || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.track.name,
      artist: 'ARVID',
      album: 'ARVID',
      // La portada de la pista (D-167)
      artwork: trackArtwork(state.track),
    });
  }, [state.track]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = state.playing ? 'playing' : state.track ? 'paused' : 'none';
    if (state.duration > 0 && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({ duration: state.duration, position: Math.min(state.time, state.duration), playbackRate: 1 });
      } catch {
        // Posición fuera de rango mientras cambia de pista
      }
    }
  }, [state.playing, state.track, state.time, state.duration]);

  return <MusicCtx.Provider value={value}>{children}</MusicCtx.Provider>;
}

export function useMusic(): Music {
  const ctx = useContext(MusicCtx);
  if (!ctx) throw new Error('useMusic requiere MusicProvider');
  return ctx;
}

/**
 * Bocina de la música arriba a la derecha de la escena: con ondas si está activada y tachada si no (MU-01, MUS-09).
 * Abre la hoja de Sonido (D-195, 2.0.2); la música se enciende y se apaga allí.
 */
export function MusicButton() {
  const t = useT();
  const openSound = useOpenSound();
  return (
    <button type="button" className="btn btn-icon scene-icon" aria-label={t('scene.music')} title={t('scene.music')} onClick={openSound}>
      {/* Siempre igual, como los demás iconos de la escena: abre la hoja de Sonido (2.0.2) */}
      <SpeakerOnIcon />
    </button>
  );
}
