// Spec 10: lista de recordatorios (RA, PV-04) y texto de las notificaciones (RS, RA-04, PV-03, BG-01).
import { describe, expect, it } from 'vitest';
import type { ActivityRecord, Reminder } from '../activities/types';
import type { MissionRecord } from '../missions/missions';
import { asLocalDate } from '../time/localDate';
import type { PeriodKind } from '../time/period';
import { buildDigest } from './digest';
import { upcomingReminders, validReminders } from './schedule';

const d = asLocalDate;
let seq = 0;

function activity(name: string, period: PeriodKind, target: number, logs: string[] = [], reminders?: Reminder[]): ActivityRecord {
  const id = `a-${name}`;
  return {
    activity: { id, name, order: seq, reminders },
    versions: [{ id: `v-${name}`, activityId: id, effectiveFrom: d('2026-10-01'), period, target, difficulty: 'medium', categoryId: 'body' }],
    events: [{ id: `e-${name}`, activityId: id, date: d('2026-10-01'), type: 'created', at: '2026-10-01T09:00:00.000Z' }],
    completions: logs.map((date) => ({ id: `c-${++seq}`, activityId: id, date: d(date), at: `${date}T10:00:00.000Z`, tzOffsetMin: 0 })),
  };
}

function mission(title: string, deadline: string): MissionRecord {
  const id = `m-${title}`;
  return {
    mission: { id, title, categoryId: 'body', difficulty: 'medium', createdAt: '2026-10-20T08:00:00.000Z', createdOn: d('2026-10-20') },
    events: [{ id: `me-${++seq}`, missionId: id, type: 'deadlineSet', date: d('2026-10-20'), deadline: d(deadline), at: '2026-10-20T08:00:00.000Z' }],
  };
}

// Domingo 25 de octubre de 2026, 12:00 (hora local)
const now = new Date(2026, 9, 25, 12, 0);

describe('recordatorios (RA, PV-04)', () => {
  it('diaria × 2: dos horas cada día durante 7 días, sin las ya pasadas de hoy', () => {
    const slots = upcomingReminders([activity('agua', 'day', 2, [], [{ time: '10:00' }, { time: '18:00' }])], now);
    expect(slots).toHaveLength(13); // hoy solo la de las 18:00
    expect(new Date(slots[0]!.at)).toEqual(new Date(2026, 9, 25, 18, 0));
    expect(slots[0]!.ref).toBe('a-agua:1');
  });

  it('RA-03: se salta hoy si la diaria ya está cumplida', () => {
    const slots = upcomingReminders([activity('leer', 'day', 1, ['2026-10-25'], [{ time: '21:00' }])], now);
    expect(slots.some((s) => new Date(s.at).getDate() === 25)).toBe(false);
    expect(slots).toHaveLength(6);
  });

  it('semanal: día de la semana; se salta la semana cumplida (3 de 3)', () => {
    const r = [{ day: 1, time: '07:00' }, { day: 3, time: '07:00' }, { day: 5, time: '18:00' }];
    const slots = upcomingReminders([activity('gym', 'week', 3, [], r)], now);
    // Lunes 26, miércoles 28 y viernes 30
    expect(slots.map((s) => new Date(s.at).getDate())).toEqual([26, 28, 30]);
  });

  it('mensual: el día 31 cae en el último día de los meses cortos', () => {
    expect(validReminders([{ day: 31, time: '09:00' }], 'month', 1)).toHaveLength(1);
    const slots = upcomingReminders([activity('pago', 'month', 1, [], [{ day: 31, time: '09:00' }])], new Date(2026, 10, 28, 12));
    expect(new Date(slots[0]!.at)).toEqual(new Date(2026, 10, 30, 9, 0));
  });

  it('RA-02: no más recordatorios que veces del periodo, y se descartan los inválidos', () => {
    expect(validReminders([{ time: '07:00' }, { time: '08:00' }], 'day', 1)).toHaveLength(1);
    expect(validReminders([{ time: '25:00' }], 'day', 1)).toHaveLength(0);
    expect(validReminders([{ time: '07:00' }], 'week', 1)).toHaveLength(0); // falta el día
  });
});

describe('texto de las notificaciones (RS, RA-04, PV-03)', () => {
  const morning = new Date(2026, 9, 25, 7, 0);
  const night = new Date(2026, 9, 25, 22, 0);

  it('RS-01: mañana con actividades y una misión que vence hoy', () => {
    const digest = buildDigest({ records: [activity('leer', 'day', 1), activity('gym', 'week', 3)], missions: [mission('Pagar luz', '2026-10-25')], now: morning, kind: 'morning' });
    expect(digest.body).toBe('Hoy tienes 2 actividades por hacer. La misión «Pagar luz» vence hoy.');
    expect(digest.calm).toBe(false);
  });

  it('RS-02: noche con racha en peligro', () => {
    const leer = activity('Leer', 'day', 1, ['2026-10-22', '2026-10-23', '2026-10-24']);
    const digest = buildDigest({ records: [leer, activity('Correr', 'day', 1)], missions: [], now: night, kind: 'night' });
    expect(digest.body).toBe('Te quedan 2 actividades para hoy. Tu racha de Leer se rompe hoy si no la registras.');
    expect(digest.badge).toBe(2);
  });

  it('RA-04: recordatorio de una actividad', () => {
    const agua = activity('Agua', 'day', 3, ['2026-10-25'], [{ time: '10:00' }, { time: '13:00' }, { time: '17:00' }]);
    expect(buildDigest({ records: [agua], missions: [], now: morning, kind: 'activity', ref: 'a-Agua:1' }).body).toBe('Es hora de Agua (2 de 3 hoy).');
  });

  it('PV-03: si ya no queda nada, mensaje breve de ánimo y badge a cero', () => {
    const digest = buildDigest({ records: [activity('Leer', 'day', 1, ['2026-10-25'], [{ time: '21:00' }])], missions: [], now: night, kind: 'activity', ref: 'a-Leer:0' });
    expect(digest).toEqual({ body: 'Todo en orden por ahora. ¡Bien!', badge: 0, calm: true });
    expect(buildDigest({ records: [], missions: [], now: night, kind: 'night' }).calm).toBe(true);
  });
});

describe('descansos en los avisos (spec 12, DS-09)', () => {
  const rested = (r: ActivityRecord, from: string, to: string): ActivityRecord => ({ ...r, rests: [{ from: d(from), to: d(to) }] });

  it('los recordatorios de una actividad en descanso no se envían', () => {
    const agua = rested(activity('agua', 'day', 1, [], [{ time: '18:00' }]), '2026-10-25', '2026-10-27');
    const days = upcomingReminders([agua], now).map((s) => new Date(s.at).getDate());
    expect(days).toEqual([28, 29, 30, 31]);
  });

  it('si todo descansa, la mañana dice «Hoy descansas» y la noche no avisa ni cuenta en el número', () => {
    const leer = rested(activity('Leer', 'day', 1, ['2026-10-22', '2026-10-23', '2026-10-24']), '2026-10-25', '2026-10-25');
    expect(buildDigest({ records: [leer], missions: [], now: new Date(2026, 9, 25, 7, 0), kind: 'morning' }).body).toBe('Hoy descansas. Disfrútalo.');
    expect(buildDigest({ records: [leer], missions: [], now: new Date(2026, 9, 25, 22, 0), kind: 'night' })).toMatchObject({ calm: true, badge: 0 });
  });
});
