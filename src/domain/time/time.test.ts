import { describe, expect, it } from 'vitest';
import { addDays, asLocalDate, diffDays, isLocalDate, isoWeekday, toLocalDate, type LocalDate } from './localDate';
import { datesOf, daysRemaining, isClosed, isEditableDate, periodOf } from './period';

const d = (s: string): LocalDate => asLocalDate(s);

describe('LocalDate', () => {
  it('valida fechas reales', () => {
    expect(isLocalDate('2026-10-17')).toBe(true);
    expect(isLocalDate('2026-02-29')).toBe(false);
    expect(isLocalDate('2028-02-29')).toBe(true);
    expect(isLocalDate('2026-13-01')).toBe(false);
    expect(isLocalDate('17/10/2026')).toBe(false);
  });

  it('suma días cruzando mes, año y febrero bisiesto', () => {
    expect(addDays(d('2026-10-31'), 1)).toBe('2026-11-01');
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2028-02-28'), 1)).toBe('2028-02-29');
    expect(addDays(d('2027-02-28'), 1)).toBe('2027-03-01');
    expect(diffDays(d('2026-10-17'), d('2026-10-19'))).toBe(2);
  });

  it('día de la semana ISO (17 oct 2026 es sábado)', () => {
    expect(isoWeekday(d('2026-10-17'))).toBe(6);
    expect(isoWeekday(d('2026-10-19'))).toBe(1);
    expect(isoWeekday(d('2026-10-18'))).toBe(7);
  });

  it('toma la fecha local del instante', () => {
    expect(toLocalDate(new Date(2026, 9, 17, 23, 59))).toBe('2026-10-17');
    expect(toLocalDate(new Date(2026, 9, 18, 0, 0))).toBe('2026-10-18');
  });
});

describe('periodos (R-T3)', () => {
  it('semana ISO de lunes a domingo', () => {
    expect(periodOf('week', d('2026-10-14'))).toEqual({ kind: 'week', start: '2026-10-12', end: '2026-10-18' });
    expect(periodOf('week', d('2026-10-19')).start).toBe('2026-10-19');
  });

  it('semana que cruza año (2026 tiene semana ISO 53)', () => {
    expect(periodOf('week', d('2026-12-31'))).toEqual({ kind: 'week', start: '2026-12-28', end: '2027-01-03' });
    expect(periodOf('week', d('2027-01-02')).start).toBe('2026-12-28');
  });

  it('meses naturales incluidos febrero bisiesto', () => {
    expect(periodOf('month', d('2026-02-10'))).toEqual({ kind: 'month', start: '2026-02-01', end: '2026-02-28' });
    expect(periodOf('month', d('2028-02-10')).end).toBe('2028-02-29');
    expect(datesOf(periodOf('month', d('2026-10-05')))).toHaveLength(31);
  });

  it('días restantes cuentan hoy (miércoles → quedan 5)', () => {
    expect(daysRemaining(periodOf('week', d('2026-10-14')), d('2026-10-14'))).toBe(5);
    expect(daysRemaining(periodOf('day', d('2026-10-14')), d('2026-10-14'))).toBe(1);
  });

  it('cerrado cuando hoy es posterior al último día (R-T4)', () => {
    const week = periodOf('week', d('2026-10-14'));
    expect(isClosed(week, d('2026-10-18'))).toBe(false);
    expect(isClosed(week, d('2026-10-19'))).toBe(true);
  });
});

describe('fechas editables (R-T5, LOG-03)', () => {
  const monday = d('2026-10-19');

  it('ayer es editable aunque pertenezca a otro periodo', () => {
    expect(isEditableDate('week', d('2026-10-18'), monday)).toBe(true);
  });

  it('antes de ayer y fuera del periodo abierto no es editable', () => {
    expect(isEditableDate('week', d('2026-10-17'), monday)).toBe(false);
    expect(isEditableDate('day', d('2026-10-16'), d('2026-10-18'))).toBe(false);
  });

  it('días anteriores del periodo abierto son editables', () => {
    expect(isEditableDate('week', d('2026-10-12'), d('2026-10-17'))).toBe(true);
    expect(isEditableDate('month', d('2026-10-01'), d('2026-10-17'))).toBe(true);
  });

  it('el futuro nunca es editable', () => {
    expect(isEditableDate('week', d('2026-10-18'), d('2026-10-17'))).toBe(false);
  });
});
