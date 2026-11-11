// Secuencia de la señal (spec 17, PC-02, TR): el primer contacto con el buscador y las transmisiones. Es el motor del
// prototipo aprobado (D-211), llevado a la app: un bucle de animación que dibuja en un lienzo y mueve el DOM de la
// portada. Los tiempos son los del prototipo; los textos y la voz llegan desde fuera.
import { getAudioContext } from '../sound/audio';
import { cueAt, TYPING_DELAYS, type VoiceTrack } from '../../domain/origen/origen';

export interface SignalElements {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Portada del buscador; sin ella (al volver a ver una sesión) la secuencia empieza en negro. */
  search?: { layer: HTMLElement; wrap: HTMLElement; page: HTMLElement; slices: HTMLElement; bars: HTMLElement; dim: HTMLElement; scan: HTMLElement; text: HTMLElement; caret: HTMLElement };
  box: HTMLElement;
  boxText: HTMLElement;
  boxDot: HTMLElement;
}

export interface SignalOptions {
  query: string;
  /** Subtítulos (ya en el idioma y el género de la voz). */
  cues: string[];
  track: VoiceTrack;
  /** Audio de la voz ya decodificado; sin él, los subtítulos siguen su ritmo en silencio (PC-09). */
  voice?: AudioBuffer;
  /** Efectos: volumen 0–1 o `null` si están apagados (PC-09). */
  volume: number | null;
  reduced: boolean;
  figure: HTMLImageElement;
  /**
   * `first`: primer contacto, con buscador. `chapter`: un capítulo con sesión (interferencia, 1 s de negro y la sesión,
   * RI-07). `replay`: al volver a verla desde «???» (TR-08). `blip`: solo la interferencia, para un capítulo sin sesión o
   * una prueba nueva.
   */
  mode: 'first' | 'chapter' | 'replay' | 'blip';
  /** La voz terminó: el primer contacto cuenta como visto (PC-06). */
  onVoiceEnd: () => void;
  onDone: () => void;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const steps = (v: number, n: number) => Math.round(v * n) / n;
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SCRAMBLE = '#%&$@*+=?/<>';
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];

/** Tiempos de la portada (PC-02): coletazo, 5 s quieta, escritura, 1,5 s escrita. */
const CHAR_AT = TYPING_DELAYS.reduce<number[]>((acc, d) => [...acc, (acc.at(-1) ?? 0) + d], []);
const G_IN = 0.5;
const G_TYPE = G_IN + 5;
/** Interferencia sobre la app (fase 1). */
const IN_S = 0.45;
/** Negro antes de los ojos: 3 s la primera vez (con el zumbido al segundo 1), 1 s al volver a verla (TR). */
const BLACK_FIRST = 3;
const BLACK_REPLAY = 1;
// Aparición (s desde que acaba el negro): ojos, figura con dos tirones, neón, caja y voz
const E0 = 0.15;
const R0 = E0 + 0.6;
const R1 = R0 + 2;
const N1 = R1 + 0.8;
const X0 = N1 + 0.25;
const T0 = X0 + 0.25;
const PULSES: [number, number][] = [[R0 + 0.7, 0.17], [R0 + 1.5, 0.12]];
const FLICK = [0, 1, 0, 0, 1, 0, 1, 1, 0, 1];

type Phase = 'in' | 'search' | 'black' | 'entity' | 'lost' | 'done';

/** Arranca la secuencia; devuelve cómo pararla (al desmontar o al cerrar una repetición). */
export function playSignal(el: SignalElements, o: SignalOptions): () => void {
  const searchQuery = o.query;
  const ctx = el.canvas.getContext('2d');
  const W = el.root.clientWidth || window.innerWidth;
  const H = el.root.clientHeight || window.innerHeight;
  const D = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  el.canvas.width = Math.round(W * D);
  el.canvas.height = Math.round(H * D);
  if (ctx) ctx.imageSmoothingEnabled = false;
  const cw = el.canvas.width;
  const ch = el.canvas.height;
  const mk = (w = cw, h = ch) => Object.assign(document.createElement('canvas'), { width: w, height: h });
  const scan = mk();
  const snap = mk();
  {
    const c = scan.getContext('2d');
    if (c) {
      c.fillStyle = 'rgba(0,0,0,.22)';
      for (let y = 0; y < ch; y += 3) c.fillRect(0, y, cw, 1);
    }
  }
  const black = () => {
    if (!ctx) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
  };

  // ---------- Sonido (sintetizado, como en el prototipo) ----------
  const ac = o.volume === null ? undefined : getAudioContext();
  let master: GainNode | undefined;
  let noiseBuf: AudioBuffer | undefined;
  let hum: { g: GainNode; nodes: (OscillatorNode | AudioScheduledSourceNode)[] } | undefined;
  let voiceNode: AudioBufferSourceNode | undefined;
  if (ac) {
    try {
      master = ac.createGain();
      master.gain.value = 0.25 + 0.75 * (o.volume ?? 0.5);
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      master = undefined;
    }
  }
  const noise = (dur: number, { vol = 0.3, freq = 2200, rise = false } = {}) => {
    if (!ac || !master || !noiseBuf) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    const f = ac.createBiquadFilter();
    const g = ac.createGain();
    src.buffer = noiseBuf;
    src.loop = true;
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.7;
    g.gain.setValueAtTime(0, t);
    for (let x = 0; x < dur; x += 0.02 + Math.random() * 0.05) {
      const k = rise ? 0.25 + 0.75 * (x / dur) : 1 - 0.5 * (x / dur);
      g.gain.setValueAtTime(Math.random() < 0.7 ? vol * k * (0.6 + Math.random() * 0.4) : 0, t + x);
      f.frequency.setValueAtTime(freq * (0.5 + Math.random()), t + x);
    }
    g.gain.setValueAtTime(0, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.05);
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = 55 + Math.random() * 40;
    og.gain.setValueAtTime(vol * 0.12, t);
    og.gain.setValueAtTime(0, t + dur);
    osc.connect(og).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };
  const blip = (freq: number) => {
    if (!ac || !master) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.008, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + 0.03);
  };
  const humStart = () => {
    if (!ac || !master || hum) return;
    const t = ac.currentTime;
    const g = ac.createGain();
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + 1.2);
    const a = ac.createOscillator();
    const b = ac.createOscillator();
    a.frequency.value = 55;
    b.type = 'triangle';
    b.frequency.value = 110.6;
    lfo.frequency.value = 5.5;
    lg.gain.value = 0.025;
    lfo.connect(lg).connect(g.gain);
    a.connect(g);
    b.connect(g);
    g.connect(master);
    a.start();
    b.start();
    lfo.start();
    hum = { g, nodes: [a, b, lfo] };
  };
  const humStop = () => {
    if (!ac || !hum) return;
    const t = ac.currentTime;
    const h = hum;
    hum = undefined;
    h.g.gain.cancelScheduledValues(t);
    h.g.gain.setValueAtTime(h.g.gain.value, t);
    h.g.gain.linearRampToValueAtTime(0, t + 0.15);
    h.nodes.forEach((n) => n.stop(t + 0.2));
  };
  // Filtro de radio AM con algo de saturación (M-19): la voz llega limpia y la app la filtra
  const voiceStart = () => {
    if (!ac || !master || !o.voice) return;
    const src = ac.createBufferSource();
    const hp = ac.createBiquadFilter();
    const lp = ac.createBiquadFilter();
    const sh = ac.createWaveShaper();
    const g = ac.createGain();
    src.buffer = o.voice;
    hp.type = 'highpass';
    hp.frequency.value = 280;
    lp.type = 'lowpass';
    lp.frequency.value = 3600;
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) curve[i] = Math.tanh(2.2 * (i / 511.5 - 1)) / Math.tanh(2.2);
    sh.curve = curve;
    g.gain.value = 1.15;
    src.connect(hp).connect(lp).connect(sh).connect(g).connect(master);
    src.start();
    voiceNode = src;
  };
  const voiceStop = () => {
    try {
      voiceNode?.stop();
    } catch {
      /* ya parada */
    }
    voiceNode = undefined;
  };

  // ---------- Interferencia en el lienzo ----------
  function glitch(source: HTMLCanvasElement | null, k: number, seed: number) {
    if (!ctx) return;
    const R = rng(seed);
    if (source) ctx.drawImage(source, 0, 0, cw, ch);
    else ctx.clearRect(0, 0, cw, ch);
    if (source)
      for (let i = 0, n = Math.round(4 + k * 14); i < n; i++) {
        const y = Math.floor(R() * ch);
        const h = Math.floor((4 + R() * 46) * D);
        const dx = Math.round((R() - 0.5) * 2 * k * 60 * D);
        ctx.drawImage(source, 0, y, cw, h, dx, y, cw, h);
      }
    for (let i = 0, n = Math.round(k * 26); i < n; i++) {
      ctx.fillStyle = ['#ff1f3d', '#7a0016', '#f4f4f4', '#000'][Math.floor(R() * 4)]!;
      ctx.globalAlpha = 0.5 + R() * 0.5;
      ctx.fillRect(Math.floor(R() * cw), Math.floor(R() * ch), Math.floor((4 + R() * 60) * D), Math.floor((2 + R() * 6) * D));
    }
    ctx.globalAlpha = k * 0.45;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalAlpha = 1;
    ctx.drawImage(scan, 0, 0);
  }
  function collapse(q: number) {
    if (!ctx) return;
    black();
    const cy = ch / 2;
    if (q < 0.6) {
      const h = Math.max(2 * D, ch * (1 - q / 0.6) ** 2);
      ctx.drawImage(snap, 0, cy - h / 2, cw, h);
      ctx.globalAlpha = q / 0.6;
      ctx.fillStyle = '#fee';
      ctx.fillRect(0, cy - h / 2, cw, h);
      ctx.globalAlpha = 1;
    } else if (q < 1) {
      const w = cw * (1 - (q - 0.6) / 0.4) ** 2;
      ctx.fillStyle = '#fee';
      ctx.fillRect(cw / 2 - w / 2, cy - D, Math.max(2 * D, w), 2 * D);
    }
  }

  // ---------- La figura, en tres capas: cuerpo, ojos y líneas rojas (PC-04) ----------
  const ent = buildEntity();
  function buildEntity() {
    const sp = o.figure;
    const scale = Math.min(1.2, (W * 0.8) / (sp.width || 1));
    const dw = Math.max(1, Math.round((sp.width || 1) * scale * D));
    const dh = Math.max(1, Math.round((sp.height || 1) * scale * D));
    const ox = Math.round((cw - dw) / 2);
    const boxTop = Math.min(H * 0.65, H - 190);
    const oy = Math.max(0, Math.round((boxTop - dh / D - 24) * D));
    const tmp = mk(dw, dh);
    const tctx = tmp.getContext('2d');
    const empty = { dw, dh, ox, oy, base: new Uint8ClampedArray(0), eyeC: tmp, accentC: tmp, bodyC: tmp, out: undefined as ImageData | undefined, key: -1 };
    if (!tctx || !sp.width) return empty;
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(sp, 0, 0, dw, dh);
    const src = tctx.getImageData(0, 0, dw, dh).data;
    const base = new Uint8ClampedArray(src.length);
    const eyes = new Uint8ClampedArray(src.length);
    const accent = new Uint8ClampedArray(src.length);
    for (let i = 0; i < src.length; i += 4) {
      const [r, g, b, a] = [src[i]!, src[i + 1]!, src[i + 2]!, src[i + 3]!];
      if (a < 40) continue;
      const isEye = r > 190 && g > 190 && b > 190;
      const isAccent = !isEye && r > 110 && r - g > 60 && r - b > 40;
      const p = i / 4;
      if (isEye) {
        eyes.set([r, g, b, 255], i);
        base.set([0, 0, 0, 255], i);
      } else if (isAccent) {
        if (shadow((Math.floor(p / dw)) / dh) > th(p % dw, Math.floor(p / dw))) accent.set([r, g, b, 255], i);
        base.set([30, 26, 36, 255], i);
      } else base.set([r, g, b, 255], i);
    }
    const toCanvas = (data: Uint8ClampedArray) => {
      const c = mk(dw, dh);
      c.getContext('2d')?.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, dw, dh), 0, 0);
      return c;
    };
    return { dw, dh, ox, oy, base, eyeC: toCanvas(eyes), accentC: toCanvas(accent), bodyC: mk(dw, dh), out: new ImageData(dw, dh), key: -1 };
  }
  function th(x: number, y: number) {
    const B = Math.round(4 * D);
    return (BAYER[(Math.floor(y / B) & 7) * 8 + (Math.floor(x / B) & 7)]! + 0.5) / 64;
  }
  function shadow(yn: number) {
    return yn < 0.55 ? 1 : Math.max(0, 1 - (yn - 0.55) / 0.42);
  }
  function drawEntity(t: number) {
    if (!ctx) return;
    black();
    // Con «Reducir movimiento», la figura aparece con un fundido, sin trama ni tirones (PC-08)
    const p = o.reduced ? clamp((t - R0) / (R1 - R0)) : steps(clamp((t - R0) / (R1 - R0)), 16);
    if (p > 0 && ent.out) {
      if (o.reduced) {
        ctx.globalAlpha = p;
        drawBodyFull();
        ctx.globalAlpha = 1;
      } else {
        const key = Math.round(p * 16);
        if (key !== ent.key) {
          ent.key = key;
          const bright = 0.3 + 0.7 * steps(p, 6);
          const out = ent.out.data;
          for (let y = 0; y < ent.dh; y++) {
            const yn = y / ent.dh;
            const m = Math.min(p * 1.4 - yn * 0.4, shadow(yn));
            for (let x = 0; x < ent.dw; x++) {
              const i = (y * ent.dw + x) * 4;
              if (ent.base[i + 3] && m > th(x, y)) {
                out[i] = ent.base[i]! * bright;
                out[i + 1] = ent.base[i + 1]! * bright;
                out[i + 2] = ent.base[i + 2]! * bright;
                out[i + 3] = 255;
              } else out[i + 3] = 0;
            }
          }
          ent.bodyC.getContext('2d')?.putImageData(ent.out, 0, 0);
        }
        ctx.drawImage(ent.bodyC, ent.ox, ent.oy);
      }
    }
    const ea = o.reduced ? clamp((t - E0) / 0.6) : steps(clamp((t - E0) / 0.6), 3);
    if (ea > 0) {
      ctx.globalAlpha = ea;
      ctx.shadowColor = 'rgba(255,255,255,.85)';
      ctx.shadowBlur = 10 * D * ea;
      ctx.drawImage(ent.eyeC, ent.ox, ent.oy);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    const nf = Math.floor((t - R1) * 12);
    if (t >= N1 || (t >= R1 && (o.reduced || FLICK[nf] === 1))) {
      if (o.reduced) ctx.globalAlpha = clamp((t - R1) / 0.8);
      ctx.shadowColor = 'rgba(255,31,61,.75)';
      ctx.shadowBlur = 14 * D;
      ctx.drawImage(ent.accentC, ent.ox, ent.oy);
      ctx.shadowColor = 'rgba(255,40,70,.9)';
      ctx.shadowBlur = 5 * D;
      ctx.drawImage(ent.accentC, ent.ox, ent.oy);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(scan, 0, 0);
  }
  /** Cuerpo entero (para el fundido): se pinta una vez la trama completa. */
  function drawBodyFull() {
    if (!ctx || !ent.out) return;
    if (ent.key !== 999) {
      ent.key = 999;
      const out = ent.out.data;
      for (let i = 0; i < ent.base.length; i += 4) {
        out[i] = ent.base[i]!;
        out[i + 1] = ent.base[i + 1]!;
        out[i + 2] = ent.base[i + 2]!;
        out[i + 3] = ent.base[i + 3] && shadow(Math.floor(i / 4 / ent.dw) / ent.dh) > 0.3 ? 255 : 0;
      }
      ent.bodyC.getContext('2d')?.putImageData(ent.out, 0, 0);
    }
    ctx.drawImage(ent.bodyC, ent.ox, ent.oy);
  }

  // ---------- Interferencia sobre la portada (es nuestro HTML: se corta en franjas de verdad) ----------
  const s = el.search;
  if (s) {
    s.slices.replaceChildren(
      ...Array.from({ length: 9 }, () => {
        const slice = document.createElement('div');
        slice.className = 'signal-slice';
        const copy = s.page.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        slice.append(copy);
        slice.hidden = true;
        return slice;
      }),
    );
  }
  function searchGlitch(k: number, seed: number) {
    if (!s) return;
    const R = rng(seed);
    const on = k > 0.03;
    [...s.slices.children].forEach((child, i) => {
      const slice = child as HTMLElement;
      if (!on || i >= Math.round(2 + k * 7)) return void (slice.hidden = true);
      const y = Math.round(R() * H);
      const h = Math.round(4 + R() * 56 * k);
      slice.hidden = false;
      slice.style.clipPath = `inset(${y}px 0 ${Math.max(0, H - y - h)}px 0)`;
      slice.style.transform = `translateX(${Math.round((R() - 0.5) * 2 * k * 46)}px)`;
      slice.style.filter = R() < 0.3 * k ? `hue-rotate(${Math.round(R() * 300)}deg) saturate(4)` : R() < 0.2 * k ? 'invert(1)' : 'none';
    });
    const bars: string[] = [];
    for (let i = 0, n = on ? Math.round(2 + k * 16) : 0; i < n; i++) {
      const y = Math.round(R() * H);
      const h = Math.round(2 + R() * 26 * k);
      const full = R() < 0.5;
      const x = full ? 0 : Math.round(R() * W * 0.6);
      const w = full ? W : Math.round(20 + R() * W * 0.6);
      const kind = R();
      const st = kind < 0.4 ? 'background:#fff;mix-blend-mode:difference' : kind < 0.65 ? 'background:#ff1f3d;opacity:.85' : kind < 0.85 ? 'background:#000' : 'background:#7a0016;mix-blend-mode:screen';
      bars.push(`<b style="top:${y}px;left:${x}px;width:${w}px;height:${h}px;${st}"></b>`);
    }
    s.bars.innerHTML = bars.join('');
    s.wrap.style.transform = k > 0.25 ? `translateX(${Math.round((R() - 0.5) * 2 * k * 18)}px)` : 'none';
    s.dim.style.opacity = String(k * 0.3);
    s.scan.style.opacity = on ? '1' : '0';
  }

  // ---------- Caja de la transmisión ----------
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let lastCue = -1;
  let lastN = 0;
  function typeBox(text: string, t: number, seed: number): number {
    // Con «Reducir movimiento», cada subtítulo aparece entero, sin letras revueltas (PC-08)
    const n = o.reduced ? text.length : Math.min(text.length, Math.floor(t * 30));
    const k = o.reduced ? 0 : Math.min(3, text.length - n);
    const R = rng(seed);
    const scr = Array.from({ length: k }, () => SCRAMBLE[Math.floor(R() * SCRAMBLE.length)]).join('');
    el.boxText.innerHTML = `<span>${esc(text.slice(0, n))}</span>${k ? `<span class="signal-scr">${esc(scr)}</span>` : ''}<span class="signal-rest">${esc(text.slice(n + k))}</span>`;
    return n;
  }

  // ---------- Fases ----------
  const now = () => performance.now() / 1000;
  let phase: Phase = o.mode === 'replay' ? 'black' : 'in';
  let t0 = now();
  const flags = new Set<string>();
  let voiceEnded = false;
  const go = (p: Phase) => {
    phase = p;
    t0 = now();
    flags.clear();
    enter();
  };
  const show = (node: HTMLElement | undefined, on: boolean) => node && (node.hidden = !on);
  function enter() {
    if (phase === 'in') {
      show(el.canvas, true);
      if (!o.reduced) noise(0.5, { vol: 0.32 });
    } else if (phase === 'search') {
      show(el.canvas, false);
      show(s?.layer, true);
      if (s) s.text.textContent = '';
    } else if (phase === 'black') {
      show(s?.layer, false);
      show(el.canvas, true);
      black();
    } else if (phase === 'lost') {
      if (!o.reduced) noise(0.75, { vol: 0.34, rise: true });
      humStop();
      voiceStop();
      drawEntity(99);
      snap.getContext('2d')?.drawImage(el.canvas, 0, 0);
    } else if (phase === 'done') {
      o.onDone();
    }
  }
  enter();

  const seq = TYPING_DELAYS.length;
  const typeEnd = G_TYPE + CHAR_AT[Math.min(seq, searchQuery.length) - 1]!;
  const holdEnd = typeEnd + 1.5;
  let frame = 0;
  const loop = () => {
    const t = now() - t0;
    const f = Math.floor(now() * 12);
    switch (phase) {
      case 'in': {
        // Fase 1: franjas y bloques sobre la app; con movimiento reducido, un fundido a blanco
        if (o.reduced) {
          if (ctx) {
            ctx.clearRect(0, 0, cw, ch);
            ctx.globalAlpha = clamp(t / IN_S);
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalAlpha = 1;
          }
        } else glitch(null, 0.2 + 0.8 * clamp(t / IN_S), f);
        if (t >= IN_S) go(s ? 'search' : o.mode === 'blip' ? 'done' : 'black');
        break;
      }
      case 'search': {
        if (!s) break;
        searchGlitch(o.reduced || t >= G_IN ? 0 : (1 - t / G_IN) ** 1.5, f);
        const n = CHAR_AT.filter((c, i) => i < searchQuery.length && t >= G_TYPE + c).length;
        if (s.text.textContent!.length !== n) s.text.textContent = searchQuery.slice(0, n);
        s.caret.style.visibility = t >= G_TYPE - 0.35 && (t < typeEnd + 0.1 || Math.floor(t * 2) % 2 === 0) ? 'visible' : 'hidden';
        // Corte seco a negro, sin interferencia ni sonido
        if (t >= holdEnd) go('black');
        break;
      }
      case 'black': {
        const length = o.mode === 'first' ? BLACK_FIRST : BLACK_REPLAY;
        if (t >= length - 2 || o.mode !== 'first') humStart();
        if (t >= length) go('entity');
        break;
      }
      case 'entity': {
        let k = 0;
        if (!o.reduced)
          PULSES.forEach(([p0, d], i) => {
            if (t >= p0 && t < p0 + d) {
              k = Math.max(k, 0.4);
              if (!flags.has(`p${i}`)) {
                flags.add(`p${i}`);
                noise(d + 0.08, { vol: 0.3, freq: 1800 });
              }
            }
          });
        drawEntity(t);
        if (k > 0.02) {
          snap.getContext('2d')?.drawImage(el.canvas, 0, 0);
          glitch(snap, k, f);
        }
        if (t < X0) {
          el.box.hidden = true;
          break;
        }
        el.box.hidden = false;
        const q = clamp((t - X0) / 0.25);
        el.box.style.transform = o.reduced ? 'none' : `scaleY(${q < 0.34 ? 0.08 : q < 0.67 ? 0.45 : 1})`;
        el.boxDot.style.visibility = Math.floor(t * 2) % 2 ? 'hidden' : 'visible';
        if (t < T0) {
          el.boxText.innerHTML = '';
          break;
        }
        if (!flags.has('voice')) {
          flags.add('voice');
          voiceStart();
        }
        const e = t - T0;
        const i = cueAt(o.track, e);
        if (i !== lastCue) {
          lastCue = i;
          lastN = 0;
        }
        const [cueStart, cueKey] = o.track.cues[i]!;
        const n = typeBox(o.cues[cueKey] ?? '', (e - cueStart) * 1.4, f * 7);
        if (n > lastN && n % 3 === 0) blip(1400 + Math.random() * 500);
        lastN = n;
        if (e >= o.track.end && !voiceEnded) {
          voiceEnded = true;
          o.onVoiceEnd();
        }
        if (e >= o.track.end + 1.2) go('lost');
        break;
      }
      case 'lost': {
        // Se pierde la señal (fase 11): tirones, la imagen se aplasta en una línea y vuelve la app
        if (o.reduced) {
          el.box.hidden = true;
          el.canvas.style.opacity = String(1 - clamp(t / 0.6));
          if (t >= 0.6) go('done');
          break;
        }
        if (t < 0.6) {
          const k = t / 0.6;
          glitch(snap, 0.3 + k * 0.7, f);
          el.box.hidden = f % 3 === 0 || k > 0.6;
          el.box.style.transform = `translateX(${Math.round((rng(f)() - 0.5) * 30 * k)}px)`;
          break;
        }
        el.box.hidden = true;
        if (t < 0.9) {
          collapse((t - 0.6) / 0.3);
          break;
        }
        black();
        el.canvas.style.opacity = String(1 - clamp((t - 0.9) / 0.35));
        if (t >= 1.25) go('done');
        break;
      }
      default:
        return;
    }
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(frame);
    humStop();
    voiceStop();
    try {
      master?.disconnect();
    } catch {
      /* ya desconectado */
    }
  };
}
