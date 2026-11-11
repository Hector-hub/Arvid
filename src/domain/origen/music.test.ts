import { describe, expect, it } from 'vitest';
import { advanceBlocked, storyProgress, unlockedTracks } from './music';
import { choose, finishContact, type OrigenState } from './origen';
import { openChapter } from './periods';

const T0 = new Date('2026-11-01T10:00:00.000Z');
const at = (days: number) => new Date(T0.getTime() + days * 86_400_000);

describe('música bloqueada (MU, D-236)', () => {
  it('al empezar, tres canciones; una más con los capítulos 3, 6, 9, 12, 15 y 18 (MU-02, MU-04)', () => {
    expect(unlockedTracks(undefined, 9)).toBe(3);
    let s: OrigenState = choose(finishContact(undefined, T0, 0), 'investigate');
    expect(unlockedTracks(s, 9)).toBe(3);
    s = openChapter(s, at(7), 50);
    expect(unlockedTracks(s, 9)).toBe(3);
    s = openChapter(s, at(14), 100);
    expect(storyProgress(s)).toBe(3);
    expect(unlockedTracks(s, 9)).toBe(4);
    expect(unlockedTracks({ ...s, periods: Array.from({ length: 20 }, () => s.periods![0]!) }, 9)).toBe(9);
  });

  it('quien bloqueó la señal tiene tramos sin capítulos y desbloquea al mismo ritmo (RI-10)', () => {
    const s = choose(finishContact(undefined, T0, 0), 'block');
    expect(advanceBlocked(s, at(6), 999)).toBeUndefined();
    const one = advanceBlocked(s, at(7), 60)!;
    expect(one.blockPeriods).toHaveLength(2);
    expect(one.periods).toHaveLength(1);
    const two = advanceBlocked(one, at(14), 200)!;
    expect(storyProgress(two)).toBe(3);
    expect(unlockedTracks(two, 9)).toBe(4);
    // Con la historia en marcha, no cuenta así
    expect(advanceBlocked(choose(s, 'investigate'), at(30), 999)).toBeUndefined();
  });
});
