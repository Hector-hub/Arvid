import { describe, expect, it } from 'vitest';
import { choose, finishContact, type OrigenState } from './origen';
import { currentChapter, MIN_TARGET, nextTarget, openChapter, periodPassed, readyForNext } from './periods';

const DAY = 86_400_000;
const T0 = new Date('2026-11-01T10:00:00.000Z');
const at = (days: number) => new Date(T0.getTime() + days * DAY);
const start = (xp = 0): OrigenState => choose(finishContact(undefined, T0, xp), 'investigate');

describe('tramos (RI)', () => {
  it('el primer contacto abre el capítulo 1 con la vara mínima', () => {
    const s = start(200);
    expect(currentChapter(s)).toBe(1);
    expect(readyForNext(s, at(7), 200 + MIN_TARGET, 5)).toBe(true);
    expect(readyForNext(s, at(7), 200 + MIN_TARGET - 1, 5)).toBe(false);
  });

  it('no se abre antes de 7 días aunque sobre XP; sin plazo si tarda más (RI-02)', () => {
    const s = start();
    expect(readyForNext(s, at(6.9), 9999, 5)).toBe(false);
    expect(readyForNext(s, at(21), 50, 5)).toBe(true);
  });

  it('la vara es la XP del tramo anterior, con mínimo 50 y, desde el tercero, +25 % como mucho (RI-03, RI-04)', () => {
    let s = start(0);
    expect(nextTarget(s, 320)).toBe(320);
    s = openChapter(s, at(7), 320); // capítulo 2, vara 320
    expect(s.periods![1]!.target).toBe(320);
    expect(nextTarget(s, 320 + 700)).toBe(400); // tercer tramo: tope 320 × 1,25
    expect(nextTarget(s, 320 + 10)).toBe(MIN_TARGET);
    expect(readyForNext(s, at(14), 320 + 319, 5)).toBe(false);
    expect(readyForNext(s, at(14), 320 + 320, 5)).toBe(true);
  });

  it('superar la prueba del tramo es el pase: basta con los 7 días (RI-02)', () => {
    let s = openChapter(openChapter(start(0), at(7), 300), at(14), 600); // capítulo 3
    expect(readyForNext(s, at(21), 610, 5)).toBe(false);
    s = {
      ...s,
      tests: [
        {
          n: 1,
          type: 'noBlank',
          times: 3,
          period: 2,
          offeredAt: '',
          offeredOn: '2026-11-15' as never,
          result: 'passed',
        },
      ],
    };
    expect(periodPassed(s)).toBe(true);
    expect(readyForNext(s, at(20.9), 610, 5)).toBe(false);
    expect(readyForNext(s, at(21), 610, 5)).toBe(true);
  });

  it('más allá del último capítulo publicado, la historia espera (NFR17-10)', () => {
    let s = start(0);
    for (let i = 1; i < 5; i++) s = openChapter(s, at(7 * i), 100 * i);
    expect(currentChapter(s)).toBe(5);
    expect(readyForNext(s, at(60), 99999, 5)).toBe(false);
  });
});
