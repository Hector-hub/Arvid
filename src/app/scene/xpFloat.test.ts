import { describe, expect, it } from 'vitest';
import { advanceFrames, currentXpFloats, floatXp, XP_FLOAT_FRAMES } from './engine';

describe('XP sobre la cabeza del protagonista (D-158)', () => {
  it('aparece, envejece con la escena y desaparece a los 1,4 s; la perdida va en gris', () => {
    floatXp('+10 XP');
    floatXp('−10 XP');
    expect(currentXpFloats().map((f) => [f.text, f.minus])).toEqual([
      ['+10 XP', false],
      ['−10 XP', true],
    ]);
    advanceFrames(XP_FLOAT_FRAMES / 2, true);
    expect(currentXpFloats()).toHaveLength(2);
    advanceFrames(XP_FLOAT_FRAMES / 2, true);
    expect(currentXpFloats()).toHaveLength(0);
  });

  it('como mucho tres a la vez', () => {
    for (let i = 1; i <= 5; i++) floatXp(`+${i} XP`);
    expect(currentXpFloats().map((f) => f.text)).toEqual(['+3 XP', '+4 XP', '+5 XP']);
    advanceFrames(XP_FLOAT_FRAMES, true);
  });
});
