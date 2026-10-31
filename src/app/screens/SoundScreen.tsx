import { useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_SOUND, saveSetting, type SoundSettings } from '../../data/repository';
import { COMPANION_NAME } from '../../domain/arvid/companion';
import { t } from '../../i18n';
import { isIOS } from '../../pwa/platform';
import { useData, useSettings } from '../data';
import { SwitchOption } from '../design/components';
import { NextTrackIcon, PauseIcon, PlayIcon, PrevTrackIcon } from '../design/icons';
import { useMusic, type Music } from '../music/MusicProvider';
import { trackCover, TRACKS } from '../music/tracks';
import { resumeAudio } from '../sound/audio';
import { previewSfx } from '../sound/sfx';

/**
 * Página Sonido (D-195): se abre con la bocina de la escena. Arriba el reproductor con la portada, debajo la lista de
 * pistas y al final los ajustes de sonido (seguir sonando fuera de la app, efectos y silenciar todo).
 */
export function SoundScreen() {
  const music = useMusic();
  const navigate = useNavigate();
  const { db } = useData();
  const settings = useSettings();
  const sound = settings?.sound ?? DEFAULT_SOUND;
  const saveSound = (patch: Partial<SoundSettings>) => void saveSetting(db, 'sound', { ...sound, ...patch });
  // La pista que se ve: la que suena o, si no, la guardada (o la primera)
  const track = music.track ?? TRACKS.find((tr) => tr.id === settings?.music.track) ?? TRACKS[0]!;
  const iosBackground = music.background && isIOS();
  const muted = !music.enabled && !sound.effects;

  // Silenciar todo apaga la música y los efectos; quitarlo los vuelve a encender
  function muteAll(on: boolean) {
    if (on) music.pause();
    else music.play();
    saveSound({ effects: !on });
  }

  // Vuelve a donde estaba (Hoy, Perfil, Ajustes…); si se abrió directamente, a Hoy
  const back = () => ((window.history.state as { idx?: number } | null)?.idx ? navigate(-1) : navigate('/hoy'));

  return (
    <div className="stack sound-page" style={{ gap: 'var(--s4)' }}>
      {/* Fijo arriba como la escena de Hoy: solo se desplazan la lista y los ajustes */}
      <div className="sound-sticky">
        <header className="sound-top">
          <button type="button" className="btn btn-icon btn-ghost" aria-label={t('common.back')} onClick={back}>
            <span aria-hidden="true">‹</span>
          </button>
          <h1>{t('settings.sound')}</h1>
        </header>

        {/* La portada difuminada de fondo y un brillo de su color en los bordes, como el reproductor de antes (D-168) */}
        <section className="player has-cover sound-player" aria-label={t('settings.music')} style={{ '--glow': track.glow } as CSSProperties}>
          <div key={`bg-${track.id}`} className="player-bg" style={{ backgroundImage: `url(${trackCover(track, 192)})` }} aria-hidden="true" />
          <img key={`cover-${track.id}`} className="player-cover" src={trackCover(track, 512)} alt="" width={240} height={240} />
          {/* Las barras encima del nombre; su hueco se reserva para que el nombre no se mueva al pausar */}
          <div className="sound-meta">
            <span className="sound-eq-slot">{music.playing && <Equalizer />}</span>
            <p className="player-track" aria-live="polite">
              {track.name}
            </p>
          </div>
          <div className="sound-seek">
            <SeekBar music={music} />
            <div className="sound-times">
              <span className="player-time">{clock(music.playing ? music.time : 0)}</span>
              <span className="player-time">{clock(music.playing && music.duration > 0 ? music.duration : track.seconds)}</span>
            </div>
          </div>
          <div className="sound-controls">
            <button type="button" className="btn btn-icon btn-ghost sound-skip" aria-label={t('settings.prevTrack')} onClick={music.previous} data-music-control="">
              <PrevTrackIcon />
            </button>
            <button
              type="button"
              className="btn btn-primary btn-icon player-main sound-play"
              aria-label={music.playing ? t('settings.pause') : t('settings.play')}
              aria-pressed={music.playing}
              // Idempotente: lo que dice el botón es lo que hace, aunque se toque dos veces seguidas
              onClick={() => (music.playing ? music.pause() : music.play())}
              data-music-control=""
            >
              {music.playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
            </button>
            <button type="button" className="btn btn-icon btn-ghost sound-skip" aria-label={t('settings.nextTrack')} onClick={music.next} data-music-control="">
              <NextTrackIcon />
            </button>
          </div>
        </section>
      </div>
      {music.needsConnection && (
        <p role="status" className="small field-error">
          {t('settings.needsConnection')}
        </p>
      )}

      <section className="stack sound-tracks" style={{ gap: 'var(--s2)' }}>
        <h2 className="sound-heading">{t('sound.list')}</h2>
        <ul className="sound-list">
          {TRACKS.map((tr) => {
            const current = tr.id === track.id;
            return (
              <li key={tr.id}>
                <button
                  type="button"
                  className={`sound-row${current ? ' on' : ''}`}
                  style={{ '--glow': tr.glow } as CSSProperties}
                  aria-current={current && music.playing ? 'true' : undefined}
                  onClick={() => (current && music.playing ? undefined : music.playTrack(tr.id))}
                  data-music-control=""
                >
                  <img src={trackCover(tr, 96)} alt="" width={48} height={48} />
                  <span className="grow sound-row-name">
                    <b>{tr.name}</b>
                    <span>ARVID</span>
                  </span>
                  {current && music.playing ? <Equalizer small /> : <span className="sound-row-time">{clock(tr.seconds)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Plegados por defecto, como un acordeón: la página es la música (D-195) */}
      <details className="sound-settings">
        <summary>
          <h2 className="sound-heading">{t('sound.settings')}</h2>
          <span className="sound-settings-chevron" aria-hidden="true">
            ›
          </span>
        </summary>
        <SwitchOption
          label={t('settings.musicBackground')}
          help={iosBackground ? t('settings.musicBackgroundIos') : t('settings.musicBackgroundHelp')}
          checked={music.background}
          onChange={music.setBackground}
          musicControl
        />
        <SwitchOption
          label={t('settings.effects')}
          help={t('settings.effectsNote', { companion: settings ? COMPANION_NAME[settings.companion] : '' })}
          checked={sound.effects}
          onChange={(on) => saveSound({ effects: on })}
        />
        {sound.effects && (
          <div className="stack sound-effects">
            <label className="field">
              <span className="small muted">{t('settings.effectsVolume')}</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sound.volume}
                style={fill(sound.volume)}
                onChange={(e) => saveSound({ volume: Number(e.target.value) })}
              />
            </label>
            <fieldset className="stack" style={{ gap: 'var(--s2)' }}>
              <legend className="small muted">{t('settings.timbre')}</legend>
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <div className="segmented">
                  {(['soft', 'chip'] as const).map((id) => (
                    <label key={id}>
                      <input type="radio" name="timbre" checked={sound.timbre === id} onChange={() => saveSound({ timbre: id })} />
                      <span>{t(id === 'soft' ? 'settings.timbreSoft' : 'settings.timbreChip')}</span>
                    </label>
                  ))}
                </div>
                <button type="button" className="btn" onClick={() => void resumeAudio().then(() => previewSfx({ ...sound, enabled: true }))}>
                  {t('settings.listen')}
                </button>
              </div>
              <p className="small muted">{t('settings.timbreHelp')}</p>
            </fieldset>
          </div>
        )}
        <SwitchOption label={t('sound.muteAll')} checked={muted} onChange={muteAll} musicControl />
      </details>
    </div>
  );
}

/**
 * Barra de progreso que avanza suave: el reproductor avisa del tiempo una vez por segundo y, entre aviso y aviso, la
 * barra sigue el reloj en cada fotograma. Se pinta directamente sobre el elemento, sin volver a pintar la página.
 */
function SeekBar({ music }: { music: Music }) {
  const ref = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);
  // El último tiempo conocido y cuándo llegó
  const anchor = useRef({ time: 0, at: 0 });
  const canSeek = music.playing && music.duration > 0;
  const { time, duration } = music;

  useEffect(() => {
    anchor.current = { time, at: performance.now() };
  }, [time]);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    const paint = (seconds: number) => {
      input.value = String(seconds);
      input.style.setProperty('--v', `${(Math.max(0, Math.min(1, seconds / Math.max(1, duration))) * 100).toFixed(2)}%`);
    };
    if (!canSeek || typeof requestAnimationFrame !== 'function') {
      paint(canSeek ? anchor.current.time : 0);
      return;
    }
    let frame = 0;
    const tick = () => {
      if (!dragging.current) paint(Math.min(duration, anchor.current.time + (performance.now() - anchor.current.at) / 1000));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [canSeek, duration]);

  return (
    <input
      ref={ref}
      type="range"
      min={0}
      max={Math.max(1, duration)}
      step="any"
      defaultValue={0}
      disabled={!canSeek}
      aria-label={t('settings.progress')}
      onPointerDown={() => (dragging.current = true)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onChange={(e) => {
        const seconds = Number(e.target.value);
        anchor.current = { time: seconds, at: performance.now() };
        e.target.style.setProperty('--v', `${((seconds / Math.max(1, duration)) * 100).toFixed(2)}%`);
        music.seek(seconds);
      }}
      data-music-control=""
    />
  );
}

/** Barras que suben y bajan mientras suena la música. */
function Equalizer({ small = false }: { small?: boolean }) {
  return (
    <span className={`equalizer${small ? ' small' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

/** Hasta dónde se pinta la pista del deslizador (0–1), para el estilo Cristal neón (D-155). */
const fill = (ratio: number) => ({ '--v': `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }) as CSSProperties;

/** 83 s → «1:23». */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
