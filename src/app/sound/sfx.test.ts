import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAudioForTests } from './audio';
import { configureSfx, curve, pickSfx, playSfx, suppressSfx } from './sfx';

/** AudioContext simulado: cuenta los osciladores que se arrancan (cada nota es uno). */
function fakeAudio() {
  const started: number[] = [];
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn((n: unknown) => n), disconnect: vi.fn() });
  class Ctx {
    state = 'running';
    currentTime = 10;
    sampleRate = 44100;
    destination = node();
    resume = vi.fn(() => Promise.resolve());
    createGain = () => ({ ...node(), gain: param() });
    createOscillator = () => ({ ...node(), type: '', frequency: param(), start: (t: number) => started.push(t), stop: vi.fn() });
    createBiquadFilter = () => ({ ...node(), type: '', frequency: param() });
    createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
    createBufferSource = () => ({ ...node(), buffer: null, start: vi.fn() });
  }
  vi.stubGlobal('AudioContext', Ctx);
  return started;
}

describe('efectos de sonido (spec 16)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAudioForTests();
    configureSfx({ enabled: true, volume: 0.5, timbre: 'soft' });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('EF-02: entre los pedidos a la vez gana el más importante', () => {
    expect(pickSfx(['log', 'level', 'xp'])).toBe('level');
    expect(pickSfx(['tap', 'log'])).toBe('log');
    expect(pickSfx(['talk', 'achievement', 'day'])).toBe('achievement');
    expect(pickSfx([])).toBeUndefined();
  });

  it('EF-02: varios pedidos en el mismo instante suenan como uno solo', () => {
    const started = fakeAudio();
    playSfx('tap');
    playSfx('log');
    vi.advanceTimersByTime(50);
    // «Registrar» son dos notas; el toque (una nota) no suena
    expect(started).toHaveLength(2);
  });

  it('EF-02: la voz del compañero se calla mientras suena otro efecto', () => {
    const started = fakeAudio();
    playSfx('level');
    vi.advanceTimersByTime(50);
    const afterLevel = started.length;
    playSfx('talk', { chars: 20 });
    vi.advanceTimersByTime(50);
    expect(started).toHaveLength(afterLevel);
  });

  it('PS-02, EF-03: nada suena con los efectos apagados ni en un juego', () => {
    const started = fakeAudio();
    configureSfx({ enabled: false, volume: 0.5, timbre: 'soft' });
    playSfx('log');
    vi.advanceTimersByTime(50);
    expect(started).toHaveLength(0);

    configureSfx({ enabled: true, volume: 0.5, timbre: 'soft' });
    const resume = suppressSfx();
    playSfx('log');
    vi.advanceTimersByTime(50);
    expect(started).toHaveLength(0);
    resume();
    playSfx('log');
    vi.advanceTimersByTime(50);
    expect(started).toHaveLength(2);
  });

  it('EF-01: +XP suena justo después de registrar', () => {
    const started = fakeAudio();
    playSfx('log');
    playSfx('xp', { delayMs: 130 });
    vi.advanceTimersByTime(50);
    expect(started).toHaveLength(2);
    vi.advanceTimersByTime(200);
    expect(started).toHaveLength(4);
  });

  it('NFR16-02: sin Web Audio no hay errores', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => {
      playSfx('level');
      vi.advanceTimersByTime(50);
    }).not.toThrow();
  });

  it('PS-04: curva perceptiva del volumen', () => {
    expect(curve(0)).toBe(0);
    expect(curve(1)).toBeCloseTo(0.9);
    expect(curve(0.5)).toBeCloseTo(0.225);
  });
});
