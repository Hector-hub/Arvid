import { describe, expect, it } from 'vitest';
import { asLocalDate } from '../domain/time/localDate';
import { missionDueText, streakText, todaySummaryText, xpDeltaText } from './text';

describe('textos', () => {
  const today = asLocalDate('2026-10-17'); // sábado
  it('MHOY-02: plazos de misión', () => {
    expect(missionDueText(undefined, today)).toBe('sin fecha');
    expect(missionDueText(asLocalDate('2026-10-17'), today)).toBe('vence hoy');
    expect(missionDueText(asLocalDate('2026-10-18'), today)).toBe('vence mañana');
    expect(missionDueText(asLocalDate('2026-10-23'), today)).toBe('vence el vie 23');
    expect(missionDueText(asLocalDate('2026-11-30'), today)).toBe('vence el 30 nov');
  });

  it('MHOY-04, STR-02, PRG-05', () => {
    expect(todaySummaryText(1, 0)).toBe('1 actividad pendiente');
    expect(todaySummaryText(2, 0)).toBe('2 actividades pendientes');
    expect(todaySummaryText(0, 1)).toBe('1 misión pendiente');
    expect(todaySummaryText(1, 1)).toBe('1 actividad y 1 misión pendientes');
    expect(todaySummaryText(3, 2)).toBe('3 actividades y 2 misiones pendientes');
    expect(todaySummaryText(0, 0)).toBe('Día completo');
    expect(streakText(1, 'week')).toBe('racha 1 semana');
    expect(xpDeltaText(250)).toBe('+2,5 XP');
    expect(xpDeltaText(-1000)).toBe('−10 XP');
  });
});
