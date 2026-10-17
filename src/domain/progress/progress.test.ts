import { describe, expect, it } from 'vitest';
import { earnedCents, evaluatePeriods } from '../activities/periods';
import { activity, d, days } from '../testing/fixtures';
import { computeProgress, computeXpCents, levelForCents, progressFromCents, titleForLevel } from './progress';
import { computeStreak } from './streaks';

describe('puntos por periodo (ENG-02, game-design §3.3)', () => {
  it('redondeo a la mitad hacia arriba en centésimas', () => {
    expect(earnedCents(10, 1, 3)).toBe(333);
    expect(earnedCents(10, 2, 3)).toBe(667);
    expect(earnedCents(5, 1, 8)).toBe(63); // 62,5 → 63
    expect(earnedCents(20, 9, 4)).toBe(2000); // c > N se limita a N
  });

  it('E-1: Gym 4/semana Media con 3 registros → E = 7,5', () => {
    const r = activity('gym', { period: 'week', target: 4, createdOn: '2026-10-05', logs: ['2026-10-05', '2026-10-06', '2026-10-07'] });
    const [week] = evaluatePeriods(r, d('2026-10-14'));
    expect(week).toMatchObject({ count: 3, earnedCents: 750, possibleCents: 1000, closed: true, fulfilled: false });
  });
});

describe('evaluabilidad (ENG-03 a ENG-06)', () => {
  it('E-6: gracia incompleta se excluye pero da XP', () => {
    // Creada el sábado 17 oct, 3/semana, 1 registro; la semana cierra el domingo 18.
    const r = activity('lectura', { period: 'week', target: 3, createdOn: '2026-10-17', effectiveFrom: '2026-10-12', logs: ['2026-10-17'] });
    const [week] = evaluatePeriods(r, d('2026-10-19'));
    expect(week).toMatchObject({ closed: true, evaluable: false, reason: 'grace', earnedCents: 333 });
  });

  it('gracia completa sí se evalúa', () => {
    const r = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-17', logs: ['2026-10-17'] });
    expect(evaluatePeriods(r, d('2026-10-18'))[0]).toMatchObject({ evaluable: true, fulfilled: true });
  });

  it('pausa: el último día pausado excluye el periodo; reanudar abre un periodo de gracia', () => {
    const r = activity('gym', {
      period: 'week',
      target: 2,
      createdOn: '2026-09-28',
      events: [
        ['2026-10-09', 'paused'],
        ['2026-10-21', 'resumed'],
      ],
      logs: ['2026-10-06'],
    });
    const periods = evaluatePeriods(r, d('2026-10-26'));
    expect(periods.map((p) => [p.period.start, p.reason])).toEqual([
      ['2026-09-28', 'grace'],
      ['2026-10-05', 'paused'],
      ['2026-10-12', 'paused'],
      ['2026-10-19', 'grace'],
      ['2026-10-26', 'open'],
    ]);
    expect(periods[1]!.earnedCents).toBe(500);
  });

  it('archivada: periodos posteriores sin XP ni evaluación', () => {
    const r = activity('agua', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-02'], events: [['2026-10-03', 'archived']] });
    const periods = evaluatePeriods(r, d('2026-10-06'));
    expect(periods.filter((p) => p.reason === 'paused').map((p) => p.period.start)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
    expect(computeXpCents([r], d('2026-10-06'))).toBe(1000);
  });

  it('abierto incompleto no se evalúa; completo sí', () => {
    const r = activity('agua', { period: 'day', target: 2, createdOn: '2026-10-01', logs: ['2026-10-14'] });
    expect(evaluatePeriods(r, d('2026-10-14')).at(-1)).toMatchObject({ closed: false, evaluable: false, reason: 'open' });
    r.completions.push({ ...r.completions[0]!, id: 'x', at: '2026-10-14T11:00:00.000Z' });
    expect(evaluatePeriods(r, d('2026-10-14')).at(-1)).toMatchObject({ evaluable: true, fulfilled: true });
  });

  it('GD-A1: semanal → mensual deja la semana truncada (no evaluable, con XP) y el mes de gracia', () => {
    const r = activity('gym', {
      period: 'week',
      target: 2,
      createdOn: '2026-09-07',
      logs: ['2026-09-29', '2026-09-30', '2026-10-02'],
      versions: [{ effectiveFrom: '2026-10-01', period: 'month', target: 8 }],
    });
    const periods = evaluatePeriods(r, d('2026-10-14'));
    const truncated = periods.find((p) => p.period.start === '2026-09-28')!;
    expect(truncated).toMatchObject({ period: { end: '2026-09-30' }, count: 2, evaluable: false, reason: 'truncated', earnedCents: 1000 });
    const october = periods.at(-1)!;
    expect(october).toMatchObject({ period: { kind: 'month', start: '2026-10-01', end: '2026-10-31' }, count: 1, reason: 'grace' });
  });

  it('un año de una actividad diaria genera 365 periodos', () => {
    const r = activity('caminar', { period: 'day', target: 1, createdOn: '2025-10-15' });
    expect(evaluatePeriods(r, d('2026-10-14'))).toHaveLength(365);
  });
});

describe('XP, nivel y título (PRG-01, PRG-02, E-9)', () => {
  it('E-9', () => {
    expect(progressFromCents(99_900)).toMatchObject({ xp: 999, level: 4, title: 'Recluta' });
    expect(progressFromCents(100_000)).toMatchObject({ xp: 1000, level: 5, title: 'Aprendiz' });
    expect(progressFromCents(450_000)).toMatchObject({ level: 10, title: 'Vigía' });
    expect(progressFromCents(0)).toMatchObject({ xp: 0, level: 1, title: 'Recluta', levelStartXp: 0, nextLevelXp: 100 });
  });

  it('límites de nivel y títulos', () => {
    expect(levelForCents(9_999)).toBe(1);
    expect(levelForCents(10_000)).toBe(2);
    expect(progressFromCents(123_400)).toMatchObject({ level: 5, levelStartXp: 1000, nextLevelXp: 1500 });
    expect(titleForLevel(39)).toBe('Élite');
    expect(titleForLevel(40)).toBe('Leyenda');
  });

  it('la XP suma todas las actividades, incluidos gracia, pausa y truncados', () => {
    const a = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01', logs: days('2026-10-01', 10) });
    const b = activity('gym', { period: 'week', target: 3, createdOn: '2026-10-17', effectiveFrom: '2026-10-12', logs: ['2026-10-17'] });
    expect(computeProgress([a, b], d('2026-10-18'))).toMatchObject({ xpCents: 10_000 + 333, xp: 103, level: 2 });
  });
});

describe('rachas y comodines (STR-01)', () => {
  const streakOf = (logs: string[], today: string, extra: Partial<Parameters<typeof activity>[1]> = {}) =>
    computeStreak(evaluatePeriods(activity('x', { period: 'day', target: 1, createdOn: '2026-10-01', logs, ...extra }), d(today)));

  it('E-5: comodines a los 7 y 14, protegen fallos, y la racha cae sin comodín', () => {
    // Días 1–7 cumplidos, 8 falla, 9–15 cumplidos, 16 y 17 fallan.
    const logs = [...days('2026-10-01', 7), ...days('2026-10-09', 7)];
    expect(streakOf(logs, '2026-10-08')).toMatchObject({ current: 7, wildcards: 1 }); // día 8 abierto
    expect(streakOf(logs, '2026-10-09')).toMatchObject({ current: 8, wildcards: 0, protectedPeriods: ['2026-10-08'] });
    expect(streakOf(logs, '2026-10-16')).toMatchObject({ current: 14, wildcards: 1 });
    expect(streakOf(logs, '2026-10-17')).toMatchObject({ current: 14, wildcards: 0 });
    expect(streakOf(logs, '2026-10-18')).toMatchObject({ current: 0, wildcards: 0, best: 14 });
  });

  it('E-7: registrar ayer devuelve el comodín consumido', () => {
    const logs = days('2026-10-01', 7);
    expect(streakOf(logs, '2026-10-09')).toMatchObject({ current: 7, wildcards: 0 });
    expect(streakOf([...logs, '2026-10-08'], '2026-10-09')).toMatchObject({ current: 8, wildcards: 1 });
  });

  it('GD-A2: completar hoy el 7.º periodo gana el comodín; deshacer lo retira', () => {
    const six = days('2026-10-01', 6);
    expect(streakOf(six, '2026-10-07')).toMatchObject({ current: 6, wildcards: 0 });
    expect(streakOf([...six, '2026-10-07'], '2026-10-07')).toMatchObject({ current: 7, wildcards: 1 });
  });

  it('máximo 2 comodines', () => {
    expect(streakOf(days('2026-09-01', 28), '2026-09-29', { createdOn: '2026-09-01' })).toMatchObject({ current: 28, wildcards: 2 });
  });

  it('una pausa larga ni suma ni rompe', () => {
    const s = streakOf([...days('2026-10-01', 3), '2026-10-20'], '2026-10-21', {
      events: [
        ['2026-10-04', 'paused'],
        ['2026-10-20', 'resumed'],
      ],
    });
    expect(s).toMatchObject({ current: 4, wildcards: 0 });
  });

  it('un periodo parcial cerrado rompe la racha (D-034)', () => {
    const r = activity('gym', { period: 'week', target: 2, createdOn: '2026-09-28', logs: ['2026-09-28', '2026-09-29', '2026-10-05'] });
    expect(computeStreak(evaluatePeriods(r, d('2026-10-12')))).toMatchObject({ current: 0, best: 1 });
  });
});

describe('XP por registro (PRG-05)', () => {
  it('Gym 4/semana Media: cada registro vale 2,5; el quinto no suma', async () => {
    const { logDeltaCents } = await import('../activities/periods');
    const r = activity('gym', { period: 'week', target: 4, createdOn: '2026-10-12', logs: ['2026-10-12'] });
    expect(logDeltaCents(r, d('2026-10-14'), 1)).toBe(250);
    expect(logDeltaCents(r, d('2026-10-14'), -1)).toBe(-250);
    const full = activity('gym2', { period: 'week', target: 1, createdOn: '2026-10-12', logs: ['2026-10-12'] });
    expect(logDeltaCents(full, d('2026-10-14'), 1)).toBe(0);
  });
});
