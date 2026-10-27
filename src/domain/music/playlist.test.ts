import { describe, expect, it } from 'vitest';
import { stepTrack, trackPosition } from './playlist';

const T = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

describe('stepTrack (spec 16, PS-01)', () => {
  it('sin pista actual empieza por la primera', () => {
    expect(stepTrack(T, T, undefined, 0)?.id).toBe('a');
    expect(stepTrack(T, T, undefined, 1)?.id).toBe('a');
  });

  it('siguiente y anterior en orden y en bucle', () => {
    expect(stepTrack(T, T, 'b', 1)?.id).toBe('c');
    expect(stepTrack(T, T, 'd', 1)?.id).toBe('a');
    expect(stepTrack(T, T, 'a', -1)?.id).toBe('d');
    expect(stepTrack(T, T, 'c', 0)?.id).toBe('c');
  });

  it('salta las que no están disponibles (sin conexión, MUS-07)', () => {
    const cached = [T[0]!, T[3]!];
    expect(stepTrack(T, cached, 'a', 1)?.id).toBe('d');
    expect(stepTrack(T, cached, 'b', 0)?.id).toBe('d');
    expect(stepTrack(T, [], 'a', 1)).toBeUndefined();
  });

  it('una pista guardada que ya no existe se trata como sin pista', () => {
    expect(stepTrack(T, T, 'retirada', 0)?.id).toBe('a');
  });

  it('posición para «Pista 2 de 4»', () => {
    expect(trackPosition(T, 'b')).toBe(2);
    expect(trackPosition(T, undefined)).toBe(0);
  });
});
