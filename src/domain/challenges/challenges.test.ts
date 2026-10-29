import { describe, expect, it } from 'vitest';
import { challengeDay, challengeResult, endDate, fulfilled, groupGoal, ranking, type ChallengeView, type Participant } from './challenges';

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

describe('el final (FN)', () => {
  const view = (mode: 'coop' | 'versus', parts: Participant[]): ChallengeView => ({ challenge: { ...challenge, mode }, participants: parts });

  it('FN-01: mientras dura y durante el margen no hay resultado', () => {
    const v = view('coop', [p('A', days(7))]);
    expect(challengeResult(v, 'A', '2026-11-07').state).toBe('running');
    expect(challengeResult(v, 'A', '2026-11-09')).toEqual({ state: 'pending', resultOn: '2026-11-10' });
  });

  it('FN-02/FN-04: cooperativo logrado cuenta para quien no abandonó', () => {
    const v = view('coop', [p('A', days(7)), p('B', days(6)), p('C', days(6)), p('D', days(5))]);
    expect(challengeResult(v, 'A', '2026-11-10')).toEqual({ state: 'coop', success: true, percent: 86 });
    expect(fulfilled(v, 'D', '2026-11-10')).toBe(true);
    const failed = view('coop', [p('A', days(5)), p('B', days(4))]);
    expect(challengeResult(failed, 'A', '2026-11-10')).toMatchObject({ success: false, percent: 64 });
    expect(fulfilled(failed, 'A', '2026-11-10')).toBe(false);
  });

  it('FN-03/S15-06: competitivo con empate; cumplido con el 80 % aunque no ganes', () => {
    const v = view('versus', [p('Ana', days(7)), p('Luis', days(7)), p('Eva', days(6)), p('Leo', days(5))]);
    const r = challengeResult(v, 'Eva', '2026-11-10');
    expect(r).toMatchObject({ state: 'versus', place: 3, days: 6 });
    expect(r.state === 'versus' && r.winners.map((w) => w.alias)).toEqual(['Ana', 'Luis']);
    expect(fulfilled(v, 'Eva', '2026-11-10')).toBe(true);
    expect(fulfilled(v, 'Leo', '2026-11-10')).toBe(false);
  });
});
