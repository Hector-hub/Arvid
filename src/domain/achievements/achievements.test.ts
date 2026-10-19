import { describe, expect, it } from 'vitest';
import type { ActivityRecord } from '../activities/types';
import { scoresFromAnalysis } from '../attributes/attributes';
import type { MissionRecord } from '../missions/missions';
import { analyze } from '../progress/progress';
import { activity, d, days, missionFixture } from '../testing/fixtures';
import { ACHIEVEMENT_IDS, detectAchievements, evaluateAchievements, type AchievementId } from './achievements';

const TODAY = d('2026-10-31');

function statuses(
  records: ActivityRecord[] = [],
  missions: MissionRecord[] = [],
  categories = ['body', 'learning', 'mind', 'social'],
) {
  const analysis = analyze(records, TODAY, missions);
  return evaluateAchievements({ records, analysis, scores30: scoresFromAnalysis(analysis, TODAY, 30, categories) });
}
const met = (s: ReturnType<typeof statuses>, id: AchievementId) => s.find((x) => x.id === id)!.met;
const prog = (s: ReturnType<typeof statuses>, id: AchievementId) => s.find((x) => x.id === id)!.progress;

/** Actividad diaria registrada `n` días seguidos terminando hoy. */
const daily = (name: string, n: number, opts: { categoryId?: string; until?: string } = {}) => {
  const until = d(opts.until ?? '2026-10-31');
  const from = days('2026-01-01', 400).find((x) => days(x, n).at(-1) === until)!;
  return activity(name, {
    period: 'day',
    target: 1,
    createdOn: '2026-01-01',
    categoryId: opts.categoryId,
    logs: days(from, n),
  });
};

const onTime = (name: string) =>
  missionFixture(name, {
    createdOn: '2026-10-01',
    events: [
      ['2026-10-01', 'deadlineSet', '2026-10-20'],
      ['2026-10-10', 'completed'],
    ],
  });

describe('logros (LO-01)', () => {
  it('sin datos no se cumple ninguno; están los 11 en orden', () => {
    const s = statuses();
    expect(s.map((x) => x.id)).toEqual(ACHIEVEMENT_IDS);
    expect(s.every((x) => !x.met)).toBe(true);
  });

  it('L-01: el primer registro', () => {
    expect(
      met(
        statuses([activity('a', { period: 'day', target: 1, createdOn: '2026-10-31', logs: ['2026-10-31'] })]),
        'L-01',
      ),
    ).toBe(true);
  });

  it('L-02: racha de 7 en una diaria (6 no); una semanal con racha 7 no cuenta', () => {
    expect(met(statuses([daily('a', 7)]), 'L-02')).toBe(true);
    expect(met(statuses([daily('a', 6)]), 'L-02')).toBe(false);
    expect(prog(statuses([daily('a', 6)]), 'L-02')).toEqual({ current: 6, goal: 7 });
    // Un registro cada lunes del 17 ago al 26 oct: 11 semanas seguidas
    const weekly = activity('w', {
      period: 'week',
      target: 1,
      createdOn: '2026-08-17',
      logs: days('2026-08-17', 71).filter((_, i) => i % 7 === 0),
    });
    const s = statuses([weekly]);
    expect(analyze([weekly], TODAY).byActivity.get('a-w')!.streak.best).toBeGreaterThanOrEqual(7);
    expect(met(s, 'L-02')).toBe(false);
  });

  it('L-03: racha de 30 en cualquier actividad (29 no)', () => {
    expect(met(statuses([daily('a', 30)]), 'L-03')).toBe(true);
    expect(met(statuses([daily('a', 29)]), 'L-03')).toBe(false);
    expect(prog(statuses([daily('a', 29)]), 'L-03')).toEqual({ current: 29, goal: 30 });
  });

  it('L-04: 100 registros en total (99 no), con tope en la meta', () => {
    expect(met(statuses([daily('a', 50), daily('b', 50)]), 'L-04')).toBe(true);
    expect(met(statuses([daily('a', 50), daily('b', 49)]), 'L-04')).toBe(false);
    expect(prog(statuses([daily('a', 80), daily('b', 80)]), 'L-04')).toEqual({ current: 100, goal: 100 });
  });

  it('L-05 y L-06: misiones con fecha límite completadas a tiempo (sin fecha no cuentan)', () => {
    const noDeadline = missionFixture('libre', { createdOn: '2026-10-01', events: [['2026-10-05', 'completed']] });
    expect(met(statuses([], [noDeadline]), 'L-05')).toBe(false);
    expect(met(statuses([], [onTime('m1')]), 'L-05')).toBe(true);
    const nine = Array.from({ length: 9 }, (_, i) => onTime(`m${i}`));
    expect(met(statuses([], nine), 'L-06')).toBe(false);
    expect(prog(statuses([], nine), 'L-06')).toEqual({ current: 9, goal: 10 });
    expect(met(statuses([], [...nine, onTime('m9')]), 'L-06')).toBe(true);
  });

  it('L-07: completar una misión vencida', () => {
    const late = missionFixture('tarde', {
      createdOn: '2026-10-01',
      events: [
        ['2026-10-01', 'deadlineSet', '2026-10-05'],
        ['2026-10-20', 'completed'],
      ],
    });
    expect(met(statuses([], [late]), 'L-07')).toBe(true);
    expect(met(statuses([], [onTime('m')]), 'L-07')).toBe(false);
  });

  it('L-08: 7 días completos sin registros y un registro previo (6 días no; sin registro previo no)', () => {
    const gap = (last: string, next: string) =>
      activity('a', { period: 'day', target: 1, createdOn: '2026-09-01', logs: [last, next] });
    expect(met(statuses([gap('2026-10-01', '2026-10-09')]), 'L-08')).toBe(true); // 2–8 oct: 7 días
    expect(met(statuses([gap('2026-10-01', '2026-10-08')]), 'L-08')).toBe(false); // 2–7 oct: 6 días
    expect(
      met(
        statuses([activity('a', { period: 'day', target: 1, createdOn: '2026-09-01', logs: ['2026-10-20'] })]),
        'L-08',
      ),
    ).toBe(false);
  });

  it('L-09: 4 categorías con atributo ≥ 60 en 30 días (3 no)', () => {
    const four = ['body', 'learning', 'mind', 'social'].map((c) => daily(c, 30, { categoryId: c }));
    expect(met(statuses(four), 'L-09')).toBe(true);
    expect(met(statuses(four.slice(0, 3)), 'L-09')).toBe(false);
    expect(prog(statuses(four.slice(0, 3)), 'L-09')).toEqual({ current: 3, goal: 4 });
  });

  it('L-10: Disciplina ≥ 80 en 30 días; "sin datos" no cuenta', () => {
    expect(met(statuses([daily('a', 30)]), 'L-10')).toBe(true);
    // 23 de 30 días: 77
    const partial = activity('p', { period: 'day', target: 1, createdOn: '2026-09-01', logs: days('2026-10-09', 23) });
    expect(met(statuses([partial]), 'L-10')).toBe(false);
    expect(prog(statuses([]), 'L-10')).toEqual({ current: 0, goal: 80 });
  });

  it('L-11: nivel 10', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      activity(`h${i}`, {
        period: 'day',
        target: 1,
        difficulty: 'hard',
        createdOn: '2026-01-01',
        logs: days('2026-01-01', 300),
      }),
    );
    const s = statuses(many);
    expect(analyze(many, TODAY).progress.level).toBeGreaterThanOrEqual(10);
    expect(met(s, 'L-11')).toBe(true);
    expect(prog(statuses([daily('a', 3)]), 'L-11')!.current).toBeLessThan(10);
  });
});

describe('detección (LO-02)', () => {
  it('devuelve solo los que se cumplen y no están desbloqueados; es pura', () => {
    const records = [daily('a', 7)];
    const s = statuses(records);
    expect(detectAchievements(s, new Set())).toEqual(['L-01', 'L-02']);
    expect(detectAchievements(s, new Set(['L-01']))).toEqual(['L-02']);
    expect(statuses(records)).toEqual(s);
  });
});
