// Efectos de sonido (spec 16): sintetizados con Web Audio, sin archivos (S16-01). Las recetas son las de la página de
// prueba que aprobó el responsable. Un efecto pedido se agrupa con los que lleguen en el mismo instante y solo suena el
// de más prioridad (EF-02); el compañero se calla mientras suena otro.
import { getAudioContext } from './audio';

export type SfxId = 'tap' | 'log' | 'undo' | 'xp' | 'day' | 'mission' | 'level' | 'achievement' | 'talk' | 'arrival';
export type Timbre = 'soft' | 'chip';

/** De más a menos importante (EF-02). */
const PRIORITY: readonly SfxId[] = ['level', 'achievement', 'day', 'mission', 'arrival', 'xp', 'log', 'undo', 'tap', 'talk'];
/** Lo que llega dentro de esta ventana cuenta como «a la vez». */
const GROUP_MS = 40;
/** Duración aproximada de cada efecto, para que la voz del compañero no los pise. */
const LENGTH_S: Record<SfxId, number> = {
  tap: 0.04, log: 0.2, undo: 0.2, xp: 0.25, day: 0.8, mission: 0.6, level: 1.6, achievement: 0.9, talk: 0, arrival: 0.7,
};
/** El compañero «teclea» como mucho 40 letras por burbuja (EF-01). */
const TALK_MAX_CHARS = 40;
/** Una nota cada dos letras: la burbuja escribe 40 letras por segundo (speech.ts). */
const TALK_STEP_S = 0.05;

interface Config {
  enabled: boolean;
  /** 0–1 */
  volume: number;
  timbre: Timbre;
}

let config: Config = { enabled: true, volume: 0.5, timbre: 'soft' };
let suppressed = 0;
let pending: { id: SfxId; chars?: number }[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let busyUntil = 0;
let gain: GainNode | undefined;

export function configureSfx(next: Config): void {
  config = next;
  if (gain) gain.gain.value = curve(next.volume);
}

/** Curva perceptiva (PS-04): la mitad del control suena a la mitad. */
export function curve(volume: number): number {
  return Math.pow(Math.max(0, Math.min(1, volume)), 2) * 0.9;
}

/** Calla los efectos mientras dura algo (un juego, EF-03); devuelve cómo reanudarlos. */
export function suppressSfx(): () => void {
  suppressed++;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    suppressed--;
  };
}

/** Pide un efecto. `chars`: letras de la burbuja, para la voz del compañero. */
export function playSfx(id: SfxId, opts: { chars?: number; delayMs?: number } = {}): void {
  if (!config.enabled || suppressed > 0 || (typeof document !== 'undefined' && document.hidden)) return;
  if (opts.delayMs) {
    setTimeout(() => playSfx(id, { chars: opts.chars }), opts.delayMs);
    return;
  }
  pending.push({ id, chars: opts.chars });
  flushTimer ??= setTimeout(flush, GROUP_MS);
}

/** Suena siempre, aunque los efectos estén apagados: es el botón «Escuchar» del panel (PS-03). */
export function previewSfx(cfg: Config): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const out = ctx.createGain();
  out.gain.value = curve(cfg.volume);
  out.connect(ctx.destination);
  const t = ctx.currentTime + 0.02;
  RECIPES.log(ctx, out, t, cfg.timbre);
  RECIPES.xp(ctx, out, t + 0.13, cfg.timbre);
}

/** El más prioritario de lo pedido a la vez (EF-02). Exportado para las pruebas. */
export function pickSfx(ids: readonly SfxId[]): SfxId | undefined {
  return [...ids].sort((a, b) => PRIORITY.indexOf(a) - PRIORITY.indexOf(b))[0];
}

function flush() {
  flushTimer = undefined;
  const batch = pending;
  pending = [];
  const id = pickSfx(batch.map((p) => p.id));
  if (!id) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  // La voz se calla mientras suena otro efecto
  if (id === 'talk' && now < busyUntil) return;
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = curve(config.volume);
    gain.connect(ctx.destination);
  }
  const t = now + 0.01;
  if (id === 'talk') talk(ctx, gain, t, batch.find((p) => p.id === 'talk')?.chars ?? 12);
  else {
    RECIPES[id](ctx, gain, t, config.timbre);
    busyUntil = t + LENGTH_S[id];
  }
}

// ---------- Recetas ----------

type Recipe = (ctx: AudioContext, out: AudioNode, t: number, timbre: Timbre) => void;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface NoteOpts {
  type?: OscillatorType;
  gain?: number;
  slide?: number;
  attack?: number;
  release?: number;
}

function note(ctx: AudioContext, out: AudioNode, t: number, freq: number, dur: number, timbre: Timbre, o: NoteOpts = {}) {
  const type = o.type ?? (timbre === 'chip' ? 'square' : 'triangle');
  const { gain: level = 0.22, slide, attack = 0.004, release = 0.06 } = o;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  // La cuadrada suena más fuerte: se compensa
  const peak = type === 'square' ? level * 0.55 : level;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + dur + release + 0.02);
}

function noise(ctx: AudioContext, out: AudioNode, t: number, dur: number, level: number, highpass: number) {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = buf;
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  g.gain.value = level;
  src.connect(filter).connect(g).connect(out);
  src.start(t);
}

const RECIPES: Record<Exclude<SfxId, 'talk'>, Recipe> = {
  tap: (c, o, t, tb) => note(c, o, t, midi(84), 0.018, tb, { gain: 0.12, release: 0.02 }),
  log: (c, o, t, tb) => {
    note(c, o, t, midi(76), 0.06, tb);
    note(c, o, t + 0.06, midi(83), 0.09, tb);
  },
  undo: (c, o, t, tb) => {
    note(c, o, t, midi(79), 0.06, tb, { gain: 0.16 });
    note(c, o, t + 0.06, midi(72), 0.09, tb, { gain: 0.16 });
  },
  xp: (c, o, t, tb) => {
    note(c, o, t, midi(83), 0.05, tb, { gain: 0.18 });
    note(c, o, t + 0.05, midi(88), 0.14, tb, { gain: 0.18 });
  },
  day: (c, o, t, tb) => {
    [72, 76, 79].forEach((n, i) => note(c, o, t + i * 0.07, midi(n), 0.08, tb, { gain: 0.18 }));
    [72, 76, 79, 84].forEach((n) => note(c, o, t + 0.24, midi(n), 0.35, tb, { gain: 0.1, type: 'triangle', release: 0.25 }));
  },
  mission: (c, o, t, tb) => {
    [79, 84, 88].forEach((n, i) => note(c, o, t + i * 0.08, midi(n), 0.07, tb, { gain: 0.18 }));
    note(c, o, t + 0.26, midi(91), 0.22, tb, { gain: 0.16, release: 0.2 });
  },
  level: (c, o, t, tb) => {
    const seq = [60, 64, 67, 72, 76, 79, 84];
    seq.forEach((n, i) => note(c, o, t + i * 0.065, midi(n), 0.06, tb, { gain: 0.18 }));
    const e = t + seq.length * 0.065 + 0.05;
    [72, 76, 79, 84].forEach((n) => note(c, o, e, midi(n), 0.6, tb, { gain: 0.12, type: 'triangle', release: 0.45 }));
    note(c, o, e, midi(48), 0.5, tb, { gain: 0.16, type: 'triangle', release: 0.35 });
    [84, 88].forEach((n, i) => note(c, o, e + 0.35 + i * 0.09, midi(n), 0.08, tb, { gain: 0.07 }));
  },
  achievement: (c, o, t, tb) => {
    noise(c, o, t, 0.25, 0.05, 6000);
    [88, 91, 96, 100].forEach((n, i) => note(c, o, t + i * 0.05, midi(n), 0.05, tb, { gain: 0.11 }));
    note(c, o, t + 0.22, midi(96), 0.4, tb, { gain: 0.1, type: 'triangle', release: 0.4 });
    note(c, o, t + 0.22, midi(103), 0.3, tb, { gain: 0.05, type: 'sine', release: 0.4 });
  },
  arrival: (c, o, t, tb) => {
    note(c, o, t, midi(67), 0.35, tb, { gain: 0.1, type: 'triangle', slide: midi(79), release: 0.2 });
    note(c, o, t + 0.3, midi(83), 0.2, tb, { gain: 0.08, type: 'triangle', release: 0.3 });
  },
};

/** La voz del compañero: una nota corta cada dos letras, con poca variación de tono (máquina de escribir). */
function talk(ctx: AudioContext, out: AudioNode, t: number, chars: number) {
  const steps = Math.ceil(Math.min(chars, TALK_MAX_CHARS) / 2);
  const melody = [0, 2, 0, 3, 2, 0, 0];
  for (let i = 0; i < steps; i++) {
    if (i % 7 === 6) continue; // un respiro, como un espacio
    note(ctx, out, t + i * TALK_STEP_S, midi(74 + melody[i % 7]!), 0.018, config.timbre, { gain: 0.08, release: 0.015 });
  }
}
