import { describe, expect, it } from 'vitest';
import { analyze } from '../progress/progress';
import { activity, d } from '../testing/fixtures';
import type { Difficulty } from '../config';
import { analyzeMission, canCompleteOn, missionActions, validateMissionInput, type MissionEventType, type MissionRecord } from './missions';
import { selectTodayMissions } from './today';

let seq = 0;
/** Misión con eventos `[fecha del evento, tipo, fecha límite?]` en orden. */
function mission(
  title: string,
  createdOn: string,
  events: [string, MissionEventType, string?][] = [],
  difficulty: Difficulty = 'medium',
): MissionRecord {
  const id = `m-${title}`;
  return {
    mission: { id, title, categoryId: 'body', difficulty, createdAt: `${createdOn}T08:00:00.000Z`, createdOn: d(createdOn) },
    events: events.map(([date, type, deadline]) => ({
      id: `me-${++seq}`,
      missionId: id,
      type,
      date: d(date),
      deadline: deadline ? d(deadline) : undefined,
      at: `${date}T${String(10 + (seq % 10)).padStart(2, '0')}:00:00.${String(seq).padStart(3, '0')}Z`,
    })),
  };
}

const at = (r: MissionRecord, today: string) => analyzeMission(r, d(today));

describe('estados y contribuciones (MIS-01 a MIS-04)', () => {
  const informe = (extra: [string, MissionEventType, string?][] = []) =>
    mission('informe', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-15'], ...extra]);

  it('pendiente antes y el mismo día de la fecha límite (R-M1)', () => {
    expect(at(informe(), '2026-10-15')).toMatchObject({ state: 'pending', deadline: '2026-10-15', xpCents: 0 });
  });

  it('E-3: vencida → Disciplina 0/10 en su fecha límite', () => {
    expect(at(informe(), '2026-10-16')).toMatchObject({
      state: 'expired',
      expiredOn: '2026-10-15',
      discipline: { date: '2026-10-15', earnedCents: 0, possibleCents: 1000 },
    });
  });

  it('MIS-02: reprogramar una vencida no penaliza de nuevo', () => {
    const r = informe([['2026-10-16', 'deadlineSet', '2026-10-20']]);
    const a = at(r, '2026-10-21');
    expect(a).toMatchObject({ state: 'expired', expiredOn: '2026-10-15', deadline: '2026-10-20' });
    expect(a.discipline).toEqual({ date: '2026-10-15', earnedCents: 0, possibleCents: 1000 });
  });

  it('GD-A6: reprogramar antes de vencer mueve el vencimiento', () => {
    const r = informe([['2026-10-14', 'deadlineSet', '2026-10-20']]);
    expect(at(r, '2026-10-16').state).toBe('pending');
    expect(at(r, '2026-10-21')).toMatchObject({ state: 'expired', expiredOn: '2026-10-20' });
  });

  it('E-4 · D-032: completar tarde da XP y anula el fallo', () => {
    const a = at(informe([['2026-10-18', 'completed']]), '2026-10-18');
    expect(a).toMatchObject({ state: 'completedLate', xpCents: 1000, completedOn: '2026-10-18' });
    expect(a.discipline).toBeUndefined();
    expect(a.category).toBeUndefined();
  });

  it('a tiempo con fecha límite: XP, categoría y Disciplina v/v', () => {
    const a = at(informe([['2026-10-14', 'completed']]), '2026-10-20');
    expect(a).toMatchObject({
      state: 'completedOnTime',
      xpCents: 1000,
      category: { date: '2026-10-14', earnedCents: 1000, possibleCents: 1000 },
      discipline: { date: '2026-10-14', earnedCents: 1000, possibleCents: 1000 },
    });
  });

  it('sin fecha límite: XP y categoría, sin Disciplina; nunca vence', () => {
    const r = mission('limpiar', '2026-10-01');
    expect(at(r, '2027-01-01').state).toBe('pending');
    const done = mission('limpiar2', '2026-10-01', [['2026-10-05', 'completed']]);
    expect(at(done, '2026-10-05')).toMatchObject({ state: 'completedOnTime', category: { earnedCents: 1000 } });
    expect(at(done, '2026-10-05').discipline).toBeUndefined();
  });

  it('R-M2: completar con fecha de ayer cuando la fecha límite era ayer cuenta a tiempo', () => {
    // El evento se registra el 16, pero su fecha imputada es el 15.
    const r = informe();
    r.events.push({ id: 'x', missionId: r.mission.id, type: 'completed', date: d('2026-10-15'), at: '2026-10-16T09:00:00.000Z' });
    expect(at(r, '2026-10-16')).toMatchObject({ state: 'completedOnTime', completedOn: '2026-10-15', discipline: { earnedCents: 1000 } });
  });

  it('E-4b · D-033: abandonar antes de vencer → Disciplina 0/5 en la fecha de abandono', () => {
    const r = mission('informe', '2026-10-10', [
      ['2026-10-10', 'deadlineSet', '2026-10-20'],
      ['2026-10-14', 'abandoned'],
    ]);
    expect(at(r, '2026-10-25')).toMatchObject({
      state: 'abandoned',
      xpCents: 0,
      discipline: { date: '2026-10-14', earnedCents: 0, possibleCents: 500 },
    });
  });

  it('abandonar sin fecha límite no penaliza; abandonar vencida mantiene el fallo', () => {
    expect(at(mission('a', '2026-10-10', [['2026-10-12', 'abandoned']]), '2026-10-12').discipline).toBeUndefined();
    expect(at(informe([['2026-10-17', 'abandoned']]), '2026-10-20')).toMatchObject({
      state: 'abandonedExpired',
      discipline: { date: '2026-10-15', possibleCents: 1000 },
    });
  });

  it('GD-A3: quitar la fecha a una pendiente evita el vencimiento; a una vencida no anula el fallo', () => {
    expect(at(informe([['2026-10-14', 'deadlineCleared']]), '2026-10-30')).toMatchObject({ state: 'pending', deadline: undefined });
    expect(at(informe([['2026-10-16', 'deadlineCleared']]), '2026-10-30')).toMatchObject({ state: 'expired', expiredOn: '2026-10-15' });
  });

  it('GD-A4: desmarcar tras la fecha límite → vencida; desmarcar una tarde → vencida', () => {
    const onTime = informe([
      ['2026-10-15', 'completed'],
      ['2026-10-16', 'uncompleted'],
    ]);
    expect(at(onTime, '2026-10-16')).toMatchObject({ state: 'expired', expiredOn: '2026-10-15', discipline: { possibleCents: 1000 } });
    const late = informe([
      ['2026-10-18', 'completed'],
      ['2026-10-18', 'uncompleted'],
    ]);
    expect(at(late, '2026-10-18')).toMatchObject({ state: 'expired', expiredOn: '2026-10-15' });
  });

  it('dificultad Difícil vale 20', () => {
    expect(at(mission('h', '2026-10-01', [['2026-10-01', 'completed']], 'hard'), '2026-10-01').xpCents).toBe(2000);
  });
});

describe('acciones (MIS-05, MIS-06, S3-02, S3-03, GD-A5)', () => {
  it('pendiente creada hoy: todo menos "ayer" y desmarcar', () => {
    const r = mission('n', '2026-10-17');
    expect(missionActions(r, at(r, '2026-10-17'), d('2026-10-17'))).toEqual({
      complete: true,
      completeYesterday: false,
      uncomplete: false,
      reschedule: true,
      clearDeadline: false,
      abandon: true,
      delete: true,
      editCategoryAndDifficulty: true,
    });
    expect(canCompleteOn(r, at(r, '2026-10-17'), d('2026-10-16'), d('2026-10-17'))).toBe(false);
  });

  it('vencida: completar, reprogramar y abandonar; sin eliminar ni editar categoría', () => {
    const r = mission('v', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-12']]);
    const actions = missionActions(r, at(r, '2026-10-17'), d('2026-10-17'));
    expect(actions).toMatchObject({ complete: true, completeYesterday: true, reschedule: true, clearDeadline: true, abandon: true, delete: false, editCategoryAndDifficulty: false });
  });

  it('completada: solo desmarcar mientras la fecha es editable', () => {
    const r = mission('c', '2026-10-10', [['2026-10-15', 'completed']]);
    expect(missionActions(r, at(r, '2026-10-16'), d('2026-10-16')).uncomplete).toBe(true);
    expect(missionActions(r, at(r, '2026-10-17'), d('2026-10-17')).uncomplete).toBe(false);
    expect(missionActions(r, at(r, '2026-10-16'), d('2026-10-16')).complete).toBe(false);
  });

  it('abandonada: ninguna acción (R-M6)', () => {
    const r = mission('a', '2026-10-10', [['2026-10-11', 'abandoned']]);
    expect(Object.values(missionActions(r, at(r, '2026-10-12'), d('2026-10-12'))).every((v) => v === false)).toBe(true);
  });
});

describe('validación (MIS-07, S3-01)', () => {
  it('título, categoría y fecha no pasada', () => {
    const today = d('2026-10-17');
    expect(validateMissionInput({ title: ' ', categoryId: 'x' }, today).title).toBeDefined();
    expect(validateMissionInput({ title: 'a'.repeat(61), categoryId: 'x' }, today).title).toBeDefined();
    expect(validateMissionInput({ title: 'Ok' }, today).categoryId).toBeDefined();
    expect(validateMissionInput({ title: 'Ok', categoryId: 'x', deadline: d('2026-10-16') }, today).deadline).toBeDefined();
    expect(validateMissionInput({ title: 'Ok', categoryId: 'x', deadline: d('2026-10-17') }, today)).toEqual({});
  });
});

describe('Hoy (MHOY-01, MHOY-04)', () => {
  it('ejemplo §6: máximo 5 en orden y contador total', () => {
    const today = '2026-10-17';
    const records = [
      mission('sin-1', '2026-10-01'),
      mission('sin-2', '2026-10-02'),
      mission('sin-3', '2026-10-03'),
      mission('sin-4', '2026-10-04'),
      mission('proxima-2', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-20']]),
      mission('proxima-1', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-18']]),
      mission('hoy', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-17']]),
      mission('vencida', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-10-12']]),
      mission('lejana', '2026-10-10', [['2026-10-10', 'deadlineSet', '2026-11-30']]),
      mission('hecha-hoy', '2026-10-10', [[today, 'completed']]),
    ];
    const items = records.map((record) => ({ record, analysis: at(record, today) }));
    const view = selectTodayMissions(items, d(today));
    expect(view.items.map((i) => i.record.mission.title)).toEqual(['vencida', 'hoy', 'proxima-1', 'proxima-2', 'sin-1']);
    expect(view.openCount).toBe(9);
    expect(view.dueCount).toBe(2);
    expect(view.completedToday.map((i) => i.record.mission.title)).toEqual(['hecha-hoy']);
  });
});

describe('XP total con misiones (INT-01)', () => {
  it('analyze suma la XP de misiones completadas', () => {
    const act = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-01'] });
    const m = mission('m', '2026-10-01', [['2026-10-02', 'completed']], 'hard');
    const result = analyze([act], d('2026-10-02'), [m]);
    expect(result.progress.xpCents).toBe(1000 + 2000);
    expect(result.byMission.get('m-m')?.state).toBe('completedOnTime');
  });
});

describe('rendimiento (NFR3-01)', () => {
  it('500 misiones con 5 eventos en < 10 ms', () => {
    const records = Array.from({ length: 500 }, (_, i) =>
      mission(`p${i}`, '2026-01-01', [
        ['2026-01-01', 'deadlineSet', '2026-02-01'],
        ['2026-01-20', 'deadlineSet', '2026-03-01'],
        ['2026-02-10', 'completed'],
        ['2026-02-10', 'uncompleted'],
        ['2026-02-11', 'completed'],
      ]),
    );
    const run = () => records.map((r) => analyzeMission(r, d('2026-10-17')));
    run();
    // Mejor de 7: mide el coste propio del cálculo; la mediana fluctúa cuando la suite corre en paralelo.
    const times = Array.from({ length: 7 }, () => {
      const start = performance.now();
      run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[0]).toBeLessThan(10);
  });
});
