import { describe, expect, it } from 'vitest';
import { asLocalDate, type LocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';
import {
  canLog,
  completionToUndo,
  detailDays,
  latestUndoableDate,
  planNewVersion,
  progressAt,
  statusAt,
  validateActivityInput,
  versionAt,
} from './rules';
import { buildTodayView, forgottenYesterday } from './today';
import type { ActivityRecord, ActivityStatusType, Completion } from './types';

const d = (s: string): LocalDate => asLocalDate(s);

let seq = 0;
function activity(
  name: string,
  opts: {
    period: PeriodKind;
    target: number;
    createdOn: string;
    effectiveFrom?: string;
    logs?: string[];
    events?: [string, ActivityStatusType][];
    order?: number;
  },
): ActivityRecord {
  const id = `a-${name}`;
  const completions: Completion[] = (opts.logs ?? []).map((date, i) => ({
    id: `c-${++seq}`,
    activityId: id,
    date: d(date),
    at: `${date}T10:00:0${i % 10}.000Z`,
    tzOffsetMin: 120,
  }));
  return {
    activity: { id, name, order: opts.order ?? 0 },
    versions: [
      {
        id: `v-${name}`,
        activityId: id,
        effectiveFrom: d(opts.effectiveFrom ?? opts.createdOn),
        period: opts.period,
        target: opts.target,
        difficulty: 'medium',
        categoryId: 'body',
      },
    ],
    events: [
      { id: `e-${name}`, activityId: id, date: d(opts.createdOn), type: 'created', at: `${opts.createdOn}T09:00:00.000Z` },
      ...(opts.events ?? []).map(([date, type], i) => ({
        id: `e-${name}-${i}`,
        activityId: id,
        date: d(date),
        type,
        at: `${date}T12:00:00.000Z`,
      })),
    ],
    completions,
  };
}

describe('versiones y estado', () => {
  it('versionAt elige la vigente', () => {
    const r = activity('gym', { period: 'week', target: 3, createdOn: '2026-10-01', effectiveFrom: '2026-09-28' });
    r.versions.push({ ...r.versions[0]!, id: 'v2', effectiveFrom: d('2026-10-12'), target: 4 });
    expect(versionAt(r.versions, d('2026-10-11'))?.target).toBe(3);
    expect(versionAt(r.versions, d('2026-10-14'))?.target).toBe(4);
    expect(versionAt(r.versions, d('2026-09-01'))).toBeUndefined();
  });

  it('statusAt sigue el ciclo de vida (ACT-05)', () => {
    const r = activity('gym', {
      period: 'day',
      target: 1,
      createdOn: '2026-10-01',
      events: [
        ['2026-10-05', 'paused'],
        ['2026-10-08', 'resumed'],
        ['2026-10-10', 'archived'],
        ['2026-10-12', 'unarchived'],
      ],
    });
    expect(statusAt(r.events, d('2026-09-30'))).toBeUndefined();
    expect(statusAt(r.events, d('2026-10-04'))).toBe('active');
    expect(statusAt(r.events, d('2026-10-06'))).toBe('paused');
    expect(statusAt(r.events, d('2026-10-09'))).toBe('active');
    expect(statusAt(r.events, d('2026-10-11'))).toBe('archived');
    expect(statusAt(r.events, d('2026-10-12'))).toBe('active');
  });
});

describe('ACT-04 · cambiar la configuración', () => {
  it('ejemplo §7: 3/semana → 4/semana el miércoles sustituye la versión de esa semana', () => {
    const r = activity('gym', {
      period: 'week',
      target: 3,
      createdOn: '2026-10-12',
      logs: ['2026-10-12', '2026-10-13'],
    });
    const plan = planNewVersion(r.versions, { period: 'week', target: 4, difficulty: 'medium', categoryId: 'body' }, d('2026-10-14'));
    expect(plan.effectiveFrom).toBe('2026-10-12');
    expect(plan.supersededIds).toEqual(['v-gym']);
  });

  it('de diario a semanal empieza el lunes de la semana actual', () => {
    const r = activity('leer', { period: 'day', target: 1, createdOn: '2026-10-01' });
    const plan = planNewVersion(r.versions, { period: 'week', target: 3, difficulty: 'medium', categoryId: 'body' }, d('2026-10-15'));
    expect(plan.effectiveFrom).toBe('2026-10-12');
    expect(plan.supersededIds).toEqual([]);
  });
});

describe('registro (LOG-02, LOG-03, LOG-04, ACT-06)', () => {
  it('LOG-02: no se registra si el periodo ya tiene N', () => {
    const logs = Array.from({ length: 8 }, () => '2026-10-17');
    const r = activity('agua', { period: 'day', target: 8, createdOn: '2026-10-01', logs });
    expect(canLog(r, d('2026-10-17'), d('2026-10-17'))).toEqual({ ok: false, reason: 'full' });
    expect(progressAt(r, d('2026-10-17'))?.done).toBe(true);
  });

  it('LOG-03: el lunes se puede registrar el domingo, no el sábado', () => {
    const r = activity('leer', { period: 'week', target: 3, createdOn: '2026-10-01', effectiveFrom: '2026-09-28' });
    const monday = d('2026-10-19');
    expect(canLog(r, d('2026-10-18'), monday)).toEqual({ ok: true });
    expect(progressAt(r, d('2026-10-18'))?.period.start).toBe('2026-10-12');
    expect(canLog(r, d('2026-10-17'), monday)).toEqual({ ok: false, reason: 'not-editable' });
  });

  it('no se registra antes de la creación', () => {
    const r = activity('nueva', { period: 'day', target: 1, createdOn: '2026-10-17' });
    expect(canLog(r, d('2026-10-16'), d('2026-10-17'))).toEqual({ ok: false, reason: 'before-creation' });
  });

  it('ACT-06: una actividad pausada no admite registros', () => {
    const r = activity('gym', { period: 'day', target: 1, createdOn: '2026-10-01', events: [['2026-10-16', 'paused']] });
    expect(canLog(r, d('2026-10-17'), d('2026-10-17'))).toEqual({ ok: false, reason: 'inactive' });
  });

  it('LOG-04: deshacer quita el más reciente del día y no actúa fuera de plazo', () => {
    const r = activity('agua', { period: 'day', target: 8, createdOn: '2026-10-01', logs: ['2026-10-16', '2026-10-17', '2026-10-17'] });
    const latest = completionToUndo(r, d('2026-10-17'), d('2026-10-17'));
    expect(latest?.at).toBe(r.completions[2]!.at);
    expect(completionToUndo(r, d('2026-10-16'), d('2026-10-18'))).toBeUndefined();
  });

  it('HOY-03: el "−" de Hoy deshace el más reciente del periodo actual, no el de ayer de otro periodo', () => {
    const r = activity('gym', { period: 'week', target: 4, createdOn: '2026-10-01', effectiveFrom: '2026-09-28', logs: ['2026-10-18', '2026-10-19'] });
    expect(latestUndoableDate(r, d('2026-10-19'))).toBe('2026-10-19');
    const onlyYesterday = activity('leer', { period: 'week', target: 4, createdOn: '2026-10-01', effectiveFrom: '2026-09-28', logs: ['2026-10-18'] });
    expect(latestUndoableDate(onlyYesterday, d('2026-10-19'))).toBeUndefined();
  });

  it('bajar N por debajo de lo registrado deja el periodo completo', () => {
    const r = activity('gym', { period: 'week', target: 4, createdOn: '2026-10-12', logs: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'] });
    r.versions[0] = { ...r.versions[0]!, target: 3 };
    const p = progressAt(r, d('2026-10-15'))!;
    expect(p.done).toBe(true);
    expect(canLog(r, d('2026-10-15'), d('2026-10-15'))).toEqual({ ok: false, reason: 'full' });
  });
});

describe('validación del formulario (ACT-01)', () => {
  it('detecta errores', () => {
    expect(validateActivityInput('  ', { period: 'week', target: 4, categoryId: 'x' }).name).toBeDefined();
    expect(validateActivityInput('a'.repeat(41), { period: 'week', target: 4, categoryId: 'x' }).name).toBeDefined();
    expect(validateActivityInput('Gym', { period: 'day', target: 11, categoryId: 'x' }).target).toBe('Entre 1 y 10');
    expect(validateActivityInput('Gym', { period: 'month', target: 29, categoryId: 'x' }).target).toBe('Entre 1 y 28');
    expect(validateActivityInput('Gym', { period: 'week', target: 4 }).categoryId).toBeDefined();
    expect(validateActivityInput('Gym', { period: 'week', target: 4, categoryId: 'x' })).toEqual({});
  });
});

describe('Hoy (HOY-01 a HOY-05)', () => {
  const today = d('2026-10-14');

  it('agrupa por sección, ordena incompletas primero y calcula lo pendiente', () => {
    const records = [
      activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-14'], order: 0 }),
      activity('agua', { period: 'day', target: 8, createdOn: '2026-10-01', logs: ['2026-10-14', '2026-10-14', '2026-10-14'], order: 1 }),
      activity('gym', { period: 'week', target: 4, createdOn: '2026-10-01', effectiveFrom: '2026-09-28', logs: ['2026-10-12', '2026-10-13'], order: 2 }),
      activity('finanzas', { period: 'month', target: 1, createdOn: '2026-10-01', order: 3 }),
      activity('pausada', { period: 'day', target: 1, createdOn: '2026-10-01', events: [['2026-10-10', 'paused']], order: 4 }),
    ];
    const view = buildTodayView(records, today);
    expect(view.sections.map((s) => s.kind)).toEqual(['day', 'week', 'month']);
    expect(view.sections[0]!.items.map((i) => i.name)).toEqual(['agua', 'caminar']);
    expect(view.pendingToday).toBe(5);
    expect(view.sections[1]!.items[0]).toMatchObject({ count: 2, target: 4, daysRemaining: 5 });
    expect(view.sections[2]!.items[0]!.daysRemaining).toBe(18);
    expect(view.sections.flatMap((s) => s.items).some((i) => i.name === 'pausada')).toBe(false);
  });

  it('HOY-06: vacío sin actividades activas', () => {
    expect(buildTodayView([], today).isEmpty).toBe(true);
  });

  it('HOY-07: al cambiar de día la actividad diaria vuelve a estar pendiente', () => {
    const r = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-17'] });
    expect(buildTodayView([r], d('2026-10-17')).pendingToday).toBe(0);
    expect(buildTodayView([r], d('2026-10-18')).pendingToday).toBe(1);
  });

  it('HOY-05: olvidos de ayer solo con periodo cerrado e incompleto', () => {
    const records = [
      activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01' }),
      activity('leer', { period: 'day', target: 1, createdOn: '2026-10-01', logs: ['2026-10-13'] }),
      activity('gym', { period: 'week', target: 4, createdOn: '2026-10-01', effectiveFrom: '2026-09-28' }),
      activity('nueva', { period: 'day', target: 1, createdOn: '2026-10-14' }),
    ];
    expect(forgottenYesterday(records, today).map((f) => f.name)).toEqual(['caminar']);
    // El lunes, la semana anterior ya cerró: la semanal también aparece.
    const monday = d('2026-10-19');
    expect(forgottenYesterday(records, monday).map((f) => f.name)).toEqual(['caminar', 'leer', 'gym', 'nueva']);
  });
});

describe('detalle (DET-01, DET-02)', () => {
  it('semanal: el lunes muestra ayer (domingo) y la semana actual', () => {
    const r = activity('gym', { period: 'week', target: 4, createdOn: '2026-10-01', effectiveFrom: '2026-09-28', logs: ['2026-10-18'] });
    const days = detailDays(r, d('2026-10-19'));
    expect(days.map((x) => x.date)).toEqual([
      '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ]);
    expect(days[0]).toMatchObject({ count: 1, editable: true, future: false });
    expect(days[2]).toMatchObject({ editable: false, future: true });
  });

  it('diaria: ayer y hoy', () => {
    const r = activity('caminar', { period: 'day', target: 1, createdOn: '2026-10-01' });
    expect(detailDays(r, d('2026-10-17')).map((x) => x.date)).toEqual(['2026-10-16', '2026-10-17']);
  });
});
