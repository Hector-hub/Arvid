// Reproductor de música de fondo (spec 05, MUS; spec 16, PS-01). Lista en orden y en bucle con anterior, siguiente y
// salto dentro de la pista; fundidos (MUS-03) y, sin conexión, solo las pistas ya guardadas en caché (MUS-07).
// Dos formas de sonar (D-163):
// - En primer plano (MUS-05): el volumen va por Web Audio (GainNode), porque en iOS `audio.volume` es de solo lectura,
//   y se pausa con la app oculta. El contexto es el mismo que el de los efectos (spec 16).
// - En segundo plano: directa, sin Web Audio (iOS lo corta al bloquear la pantalla), y sigue sonando con la app oculta.
//   Volumen y fundidos van sobre `audio.volume`: en iOS se ignoran y el volumen lo llevan los botones del teléfono.
import { stepTrack } from '../../domain/music/playlist';
import { getAudioContext } from '../sound/audio';
import { MUSIC_CACHE, type Track } from './tracks';

const FADE_S = 1.2;
/** «Anterior» vuelve al inicio de la pista si ya lleva más que esto (PS-01). */
const RESTART_AFTER_S = 3;

export interface PlayerState {
  playing: boolean;
  track?: Track;
  /** Cuándo empezó la pista actual (`Date.now()`), para mostrar su nombre unos segundos (MUS-08). */
  startedAt?: number;
  /** Sin conexión y sin ninguna pista en caché. */
  needsConnection: boolean;
  /** Segundos transcurridos y duración de la pista actual (barra de progreso, PS-01). */
  time: number;
  duration: number;
}

export class MusicPlayer {
  private audio = new Audio();
  private ctx?: AudioContext;
  private gain?: GainNode;
  private enabled = false;
  private failures = 0;
  private fadingOut = false;
  private state: PlayerState = { playing: false, needsConnection: false, time: 0, duration: 0 };

  constructor(
    private readonly tracks: Track[],
    private level: number,
    private readonly onChange: (state: PlayerState) => void,
    /** Pista por la que seguir (la guardada) y aviso al cambiar de pista, para guardarla (DT-01). */
    private current: string | undefined = undefined,
    private readonly onTrack: (id: string) => void = () => undefined,
    /** Seguir sonando con la app oculta (D-163). */
    readonly background = false,
  ) {
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('timeupdate', this.onTime);
    this.audio.addEventListener('loadedmetadata', this.onMeta);
    this.audio.addEventListener('error', this.onError);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Debe llamarse desde un gesto del usuario (MUS-04). */
  async start(): Promise<void> {
    this.setup();
    this.enabled = true;
    this.failures = 0;
    await this.ctx?.resume().catch(() => undefined);
    if (this.state.track && this.audio.src && !this.audio.ended) {
      await this.resume();
      this.emit({ playing: true });
    } else await this.play(0);
  }

  stop(): void {
    this.enabled = false;
    this.fadeTo(0, 0.4);
    setTimeout(() => {
      if (!this.enabled) this.audio.pause();
    }, 400);
    this.emit({ playing: false });
  }

  skip(): void {
    this.change(1);
  }

  /** Anterior: al inicio de la pista si ya lleva un rato; si no, la pista anterior (PS-01). */
  previous(): void {
    if (this.state.track && this.audio.currentTime > RESTART_AFTER_S) {
      this.seek(0);
      return;
    }
    this.change(-1);
  }

  /** Salta a un segundo de la pista actual (barra de progreso). */
  seek(seconds: number): void {
    if (!this.state.track || !Number.isFinite(this.audio.duration)) return;
    this.fadingOut = false;
    this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration - 0.5));
    if (this.enabled) this.fadeTo(this.level, 0.1);
    this.emit({ time: this.audio.currentTime });
  }

  setVolume(volume: number): void {
    this.level = volume;
    if (this.enabled) this.fadeTo(volume, 0.1);
  }

  destroy(): void {
    this.enabled = false;
    clearInterval(this.ramp);
    this.audio.pause();
    this.audio.removeEventListener('ended', this.onEnded);
    this.audio.removeEventListener('timeupdate', this.onTime);
    this.audio.removeEventListener('loadedmetadata', this.onMeta);
    this.audio.removeEventListener('error', this.onError);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.gain?.disconnect();
  }

  /** Cambia de pista: sonando, con un fundido corto; en pausa, la deja preparada sin sonar. */
  private change(step: -1 | 1) {
    if (!this.enabled) {
      // Apagada: empieza a sonar directamente en la pista pedida
      this.setup();
      this.enabled = true;
      this.failures = 0;
      void this.ctx?.resume().catch(() => undefined);
      void this.play(step);
      return;
    }
    this.fadeTo(0, 0.3);
    setTimeout(() => void this.play(step), 300);
  }

  private setup() {
    // En segundo plano no se usa Web Audio: el elemento suena directo (D-163)
    if (this.ctx || this.background) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      ctx.createMediaElementSource(this.audio).connect(gain).connect(ctx.destination);
      this.ctx = ctx;
      this.gain = gain;
    } catch {
      // Sin Web Audio se usa el volumen del elemento (ignorado en iOS)
    }
  }

  private fadeTo(value: number, seconds = FADE_S) {
    if (!this.ctx || !this.gain) {
      this.rampVolume(value, seconds);
      return;
    }
    const now = this.ctx.currentTime;
    const g = this.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
  }

  /** Fundido sobre `audio.volume` (sin Web Audio); en iOS es de solo lectura y no hace nada. */
  private ramp?: ReturnType<typeof setInterval>;
  private rampVolume(target: number, seconds: number) {
    clearInterval(this.ramp);
    const from = this.audio.volume;
    const steps = Math.max(1, Math.round(seconds * 20));
    let i = 0;
    this.ramp = setInterval(() => {
      i++;
      try {
        this.audio.volume = Math.max(0, Math.min(1, from + ((target - from) * i) / steps));
      } catch {
        // Solo lectura (iOS)
      }
      if (i >= steps) clearInterval(this.ramp);
    }, 50);
  }

  private async resume() {
    try {
      await this.audio.play();
      this.failures = 0;
      this.fadeTo(this.level);
    } catch {
      this.emit({ playing: false });
    }
  }

  /** Sin conexión, solo las pistas guardadas en caché (MUS-07). */
  private async available(): Promise<Track[]> {
    if (navigator.onLine !== false) return this.tracks;
    if (typeof caches === 'undefined') return [];
    const cache = await caches.open(MUSIC_CACHE);
    const cached = await Promise.all(this.tracks.map(async (t) => ((await cache.match(t.src)) ? t : undefined)));
    return cached.filter((t): t is Track => !!t);
  }

  /** Suena la pista a `step` de la actual (0 = la actual, o la primera si no hay). */
  private async play(step: -1 | 0 | 1) {
    const track = stepTrack(this.tracks, await this.available(), this.current, step);
    if (!track) {
      this.enabled = false;
      this.emit({ playing: false, needsConnection: true });
      return;
    }
    this.current = track.id;
    this.onTrack(track.id);
    this.fadingOut = false;
    this.audio.src = track.src;
    if (!this.gain) {
      clearInterval(this.ramp);
      try {
        this.audio.volume = 0;
      } catch {
        // Solo lectura (iOS)
      }
    }
    this.emit({ track, startedAt: Date.now(), playing: true, needsConnection: false, time: 0, duration: 0 });
    await this.resume();
    this.warmCache(track);
  }

  /**
   * El reproductor pide la pista por rangos (respuestas 206, que no se guardan); una descarga completa en segundo
   * plano la deja en la caché del service worker para que suene sin conexión (MUS-07).
   */
  private warmCache(track: Track) {
    if (!navigator.serviceWorker?.controller || navigator.onLine === false) return;
    void fetch(track.src).catch(() => undefined);
  }

  private emit(patch: Partial<PlayerState>) {
    this.state = { ...this.state, ...patch };
    this.onChange(this.state);
  }

  private onEnded = () => {
    if (this.enabled) void this.play(1);
  };

  private onMeta = () => {
    if (Number.isFinite(this.audio.duration)) this.emit({ duration: this.audio.duration });
  };

  /** Progreso (cada segundo entero, para no redibujar de más) y fundido de salida al acercarse el final (MUS-03). */
  private onTime = () => {
    const { duration, currentTime } = this.audio;
    if (Math.floor(currentTime) !== Math.floor(this.state.time)) this.emit({ time: currentTime });
    if (!this.enabled || this.fadingOut || !duration || duration - currentTime >= FADE_S) return;
    this.fadingOut = true;
    this.fadeTo(0, Math.max(0.1, duration - currentTime));
  };

  /** Una pista que no carga pasa a la siguiente; si fallan todas seguidas, se detiene. */
  private onError = () => {
    if (!this.enabled) return;
    if (++this.failures >= this.tracks.length) {
      this.stop();
      return;
    }
    setTimeout(() => void this.play(1), 500);
  };

  private onVisibility = () => {
    // En segundo plano sigue sonando: no se pausa al ocultar la app (D-163)
    if (!this.enabled || this.background) return;
    if (document.hidden) this.audio.pause();
    else {
      void this.ctx?.resume().catch(() => undefined);
      void this.resume();
    }
  };
}
