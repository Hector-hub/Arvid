// Reproductor de música de fondo (spec 05, MUS). Lista aleatoria en bucle (MUS-02), fundidos (MUS-03), pausa con la
// app oculta (MUS-05) y, sin conexión, solo las pistas ya guardadas en caché (MUS-07).
// El volumen va por Web Audio (GainNode) porque en iOS `audio.volume` es de solo lectura.
import { emptyBag, nextTrack, type Bag } from '../../domain/music/playlist';
import { MUSIC_CACHE, type Track } from './tracks';

const FADE_S = 1.2;

export interface PlayerState {
  playing: boolean;
  track?: Track;
  /** Sin conexión y sin ninguna pista en caché. */
  needsConnection: boolean;
}

type AudioContextCtor = typeof AudioContext;

export class MusicPlayer {
  private audio = new Audio();
  private ctx?: AudioContext;
  private gain?: GainNode;
  private bag: Bag<Track> = emptyBag();
  private enabled = false;
  private failures = 0;
  private fadingOut = false;
  private state: PlayerState = { playing: false, needsConnection: false };

  constructor(
    private readonly tracks: Track[],
    private level: number,
    private readonly onChange: (state: PlayerState) => void,
    private readonly rng: () => number = Math.random,
  ) {
    this.audio.preload = 'auto';
    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('timeupdate', this.onTime);
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
    } else await this.playNext();
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
    if (!this.enabled) {
      void this.start();
      return;
    }
    this.fadeTo(0, 0.3);
    setTimeout(() => void this.playNext(), 300);
  }

  setVolume(volume: number): void {
    this.level = volume;
    if (this.enabled) this.fadeTo(volume, 0.1);
  }

  destroy(): void {
    this.enabled = false;
    this.audio.pause();
    this.audio.removeEventListener('ended', this.onEnded);
    this.audio.removeEventListener('timeupdate', this.onTime);
    this.audio.removeEventListener('error', this.onError);
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close().catch(() => undefined);
  }

  private setup() {
    if (this.ctx) return;
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as
      | AudioContextCtor
      | undefined;
    if (!Ctor) return;
    try {
      const ctx = new Ctor();
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
      this.audio.volume = value;
      return;
    }
    const now = this.ctx.currentTime;
    const g = this.gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(value, now + seconds);
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

  private async playNext() {
    const available = await this.available();
    const next = nextTrack(this.bag, available, this.rng);
    this.bag = next.bag;
    if (!next.track) {
      this.enabled = false;
      this.emit({ playing: false, needsConnection: true });
      return;
    }
    this.fadingOut = false;
    this.audio.src = next.track.src;
    this.emit({ track: next.track, playing: true, needsConnection: false });
    await this.resume();
    this.warmCache(next.track);
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
    if (this.enabled) void this.playNext();
  };

  /** Fundido de salida al acercarse el final (MUS-03). */
  private onTime = () => {
    const { duration, currentTime } = this.audio;
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
    setTimeout(() => void this.playNext(), 500);
  };

  private onVisibility = () => {
    if (!this.enabled) return;
    if (document.hidden) this.audio.pause();
    else {
      void this.ctx?.resume().catch(() => undefined);
      void this.resume();
    }
  };
}
