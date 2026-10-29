import { describe, expect, it } from 'vitest';
import { challengeDay, endDate, groupGoal, ranking, type ChallengeView, type Participant } from './challenges';

const challenge = { id: 'c', owner: 'a', name: 'Leer', difficulty: 'easy' as const, days: 7, start: '2026-11-01', mode: 'coop' as const, createdAt: '' };
const p = (alias: string, done: string[], left?: string): Participant => ({ id: alias, alias, level: 1, joinedAt: '', done, left });
const days = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `2026-11-0${from + i}`);

describe('retos (spec 15)', () => {
  it('fechas: fin, día del reto, antes y después', () => {
    expect(endDate(challenge)).toBe('2026-11-07');
    expect(challengeDay(challenge, '2026-10-31')).toBe(0);
    expect(challengeDay(challenge, '2026-11-03')).toBe(3);
    expect(challengeDay(challenge, '2026-11-09')).toBe(8);
  });

  it('MK-02: 4 participantes × 7 días = 28; meta 23 (ejemplo de la spec)', () => {
    const view: ChallengeView = { challenge, participants: [p('A', days(7)), p('B', days(6)), p('C', days(6)), p('D', days(5))] };
    expect(groupGoal(view)).toMatchObject({ done: 24, total: 28, goal: 23 });
  });

  it('MK-02: quien abandona deja de sumar al total desde ese día; fechas fuera del reto no cuentan', () => {
    const view: ChallengeView = { challenge, participants: [p('A', [...days(2), '2026-10-30']), p('B', days(3), '2026-11-03')] };
    expect(groupGoal(view)).toMatchObject({ done: 4, total: 9 });
  });

  it('MK-03: los empates comparten puesto', () => {
    const view: ChallengeView = { challenge, participants: [p('Ana', days(3)), p('Luis', days(5)), p('Eva', days(3))] };
    expect(ranking(view).map((r) => [r.participant.alias, r.place])).toEqual([['Luis', 1], ['Ana', 2], ['Eva', 2]]);
  });
});
