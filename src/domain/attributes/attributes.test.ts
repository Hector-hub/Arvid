import { describe, expect, it } from 'vitest';
import { analyze } from '../progress/progress';
import { activity, d, days, missionFixture } from '../testing/fixtures';
import { computeProfile, percent, recordsAsOf, scoresFromAnalysis, trend } from './attributes';

// Hoy = sábado 31 oct 2026; ventana de 30 días = [2 oct, 31 oct].
const TODAY = d('2026-10-31');

const gym = () =>
  activity('gym', {
    period: 'week',
    target: 4,
    createdOn: '2026-09-01',
    effectiveFrom: '2026-08-31',
    categoryId: 'body',
    // Semanas con domingo en la ventana: c = 4, 3, 4, 2 (E-2).
    logs: ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-19', '2026-10-20'],
  });
// 29 días cerrados (2–30 oct), 22 cumplidos; hoy sin caminar.
const caminar = () => activity('caminar', { period: 'day', target: 1, difficulty: 'easy', createdOn: '2026-09-01', categoryId: 'body', logs: days('2026-10-02', 22) });
// 29 días cerrados, 25 cumplidos.
const leer = () => activity('leer', { period: 'day', target: 1, createdOn: '2026-09-01', categoryId: 'learning', logs: days('2026-10-02', 25) });
const revision = () =>
  missionFixture('revision', {
    createdOn: '2026-10-10',
    difficulty: 'hard',
    categoryId: 'body',
    events: [
      ['2026-10-10', 'deadlineSet', '2026-10-20'],
      ['2026-10-15', 'completed'],
    ],
  });
const informe = (extra: [string, 'completed' | 'abandoned'][] = []) =>
  missionFixture('informe', { createdOn: '2026-10-10', categoryId: 'learning', events: [['2026-10-10', 'deadlineSet', '2026-10-25'], ...extra] });

const scores = (records = [gym(), caminar(), leer()], missions = [revision(), informe()], categories = ['body', 'learning', 'relationships']) =>
  scoresFromAnalysis(analyze(records, TODAY, missions), TODAY, 30, categories);

describe('atributos (R-AT1 a R-AT3)', () => {
  it('E-2: Cuerpo = 79 con 162,5 de 205 y su desglose', () => {
    const body = scores().attributes.get('body')!;
    expect(body).toMatchObject({ earnedCents: 16_250, possibleCents: 20_500, items: 4 + 29 + 1, value: 79 });
    expect(body.breakdown).toEqual([
      { source: 'activity', activityId: 'a-gym', kind: 'week', periods: 4, earnedCents: 3250, possibleCents: 4000 },
      { source: 'activity', activityId: 'a-caminar', kind: 'day', periods: 29, earnedCents: 11_000, possibleCents: 14_500 },
      { source: 'missions', count: 1, earnedCents: 2000, possibleCents: 2000 },
    ]);
  });

  it('el periodo abierto completo cuenta con fecha de hoy', () => {
    const r = caminar();
    r.completions.push({ ...r.completions[0]!, id: 'hoy', date: TODAY, at: '2026-10-31T10:00:00.000Z' });
    expect(scores([gym(), r, leer()]).attributes.get('body')!.items).toBe(4 + 30 + 1);
  });

  it('E-8: categoría con 2 elementos → sin datos', () => {
    const rel = activity('llamar', { period: 'week', target: 1, createdOn: '2026-09-01', effectiveFrom: '2026-08-31', categoryId: 'relationships', logs: ['2026-10-14'] });
    // Ventana de 7 días [25 oct, 31 oct]: solo la semana que termina el 25 oct.
    const s = scoresFromAnalysis(analyze([rel], TODAY), TODAY, 7, ['relationships']).attributes.get('relationships')!;
    expect(s).toMatchObject({ items: 1, value: undefined });
    const thirty = scoresFromAnalysis(analyze([rel], TODAY), TODAY, 30, ['relationships']).attributes.get('relationships')!;
    expect(thirty.items).toBe(4);
  });

  it('redondeo a la mitad hacia arriba', () => {
    expect(percent(16_250, 20_500)).toBe(79);
    expect(percent(41_250, 50_000)).toBe(83); // 82,5 → 83
    expect(percent(0, 1000)).toBe(0);
  });
});

describe('Disciplina (R-D1)', () => {
  it('E-3: 82 con la misión vencida', () => {
    expect(scores().discipline).toMatchObject({ earnedCents: 41_250, possibleCents: 50_500, value: 82 });
    const penalty = scores().discipline.breakdown.find((b) => b.source === 'penalty');
    expect(penalty).toEqual({ source: 'penalty', reason: 'expired', missionIds: ['m-informe'], possibleCents: 1000 });
  });

  it('E-4: completada tarde → 83', () => {
    expect(scores(undefined, [revision(), informe([['2026-10-28', 'completed']])]).discipline.value).toBe(83);
  });

  it('E-4b: abandonada antes de vencer → 83 con penalización de 5', () => {
    const s = scores(undefined, [revision(), informe([['2026-10-14', 'abandoned']])]).discipline;
    expect(s.value).toBe(83);
    expect(s.breakdown.find((b) => b.source === 'penalty')).toMatchObject({ reason: 'abandoned', possibleCents: 500 });
  });

  it('R-AT9: una categoría desactivada no aparece en atributos pero cuenta en Disciplina', () => {
    const s = scores(undefined, undefined, ['body']);
    expect([...s.attributes.keys()]).toEqual(['body']);
    expect(s.discipline.value).toBe(82);
  });
});

describe('R-AT8: cambio de categoría', () => {
  it('cada semana cuenta para la categoría de su versión', () => {
    const paseo = activity('paseo', {
      period: 'week',
      target: 1,
      createdOn: '2026-09-01',
      effectiveFrom: '2026-08-31',
      categoryId: 'body',
      versions: [{ effectiveFrom: '2026-10-12', period: 'week', target: 1, categoryId: 'mind' }],
      logs: ['2026-10-01', '2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27'],
    });
    const s = scoresFromAnalysis(analyze([paseo], TODAY), TODAY, 30, ['body', 'mind']);
    // Semanas que terminan el 4 y el 11 → Cuerpo; el 18 y el 25 → Mente (la del 1 nov está abierta y completa → Mente).
    expect(s.attributes.get('body')!.items).toBe(2);
    expect(s.attributes.get('mind')!.items).toBe(3);
  });
});

describe('ventana anterior y tendencia (R-AT4, R-AT5)', () => {
  it('recordsAsOf ignora todo lo posterior a la referencia', () => {
    const past = recordsAsOf([gym(), leer()], [revision()], d('2026-10-01'));
    expect(past.records[0]!.completions.every((c) => c.date <= '2026-10-01')).toBe(true);
    expect(past.missions).toHaveLength(0); // creada el 10 oct
  });

  it('el periodo abierto en la referencia no ve registros posteriores', () => {
    // Referencia = 1 oct (jueves): la semana del 28 sep está abierta con 4 registros hasta el 1 oct.
    const past = recordsAsOf([gym()], [], d('2026-10-01'));
    const periods = analyze(past.records, d('2026-10-01')).byActivity.get('a-gym')!.periods;
    expect(periods.at(-1)).toMatchObject({ count: 4, closed: false, fulfilled: true });
  });

  it('computeProfile calcula la ventana actual y la anterior', () => {
    const records = [gym(), caminar(), leer()];
    const missions = [revision(), informe()];
    const profile = computeProfile({ analysis: analyze(records, TODAY, missions), records, missions, today: TODAY, window: 30, categoryIds: ['body', 'learning'] });
    expect(profile.current.attributes.get('body')!.value).toBe(79);
    // Ventana anterior [2 sep, 1 oct]: Caminar y Leer sin registros en septiembre → 0 %.
    expect(profile.previous.attributes.get('learning')!.value).toBe(0);
  });

  it('tendencia con umbral de 5', () => {
    expect(trend(79, 70)).toEqual({ delta: 9, direction: 'up' });
    expect(trend(79, 75)).toEqual({ delta: 4, direction: 'stable' });
    expect(trend(70, 78)).toEqual({ delta: -8, direction: 'down' });
    expect(trend(undefined, 70)).toBeUndefined();
  });
});

describe('rendimiento (NFR4-01)', () => {
  it('ventana actual y anterior con un año de datos y 200 misiones en < 25 ms', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      activity(`r${i}`, { period: 'day', target: 1, createdOn: '2025-11-01', categoryId: `c${i % 6}`, logs: days('2025-11-01', 364).filter((_, j) => (i + j) % 4 !== 0) }),
    );
    const missions = Array.from({ length: 200 }, (_, i) =>
      missionFixture(`p${i}`, { createdOn: '2026-01-01', categoryId: `c${i % 6}`, events: [['2026-01-01', 'deadlineSet', '2026-10-20'], ['2026-10-10', 'completed']] }),
    );
    const analysis = analyze(records, TODAY, missions);
    const categoryIds = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'];
    const run = () => computeProfile({ analysis, records, missions, today: TODAY, window: 90, categoryIds });
    run();
    // Mejor de 7: mide el coste propio del cálculo.
    const times = Array.from({ length: 7 }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[0]).toBeLessThan(25);
  });
});
