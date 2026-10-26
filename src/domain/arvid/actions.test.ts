// Spec 12, AC-03, AC-04: validación y limpieza de las propuestas, y calendario para resolver fechas.
import { describe, expect, it } from 'vitest';
import { asLocalDate } from '../time/localDate';
import { actionTools, calendarContext, checkProposal } from './actions';

const ctx = { today: asLocalDate('2026-10-26'), categoryIds: ['body', 'mind', 'money', 'order', 'work'] };

describe('calendario (AC-04)', () => {
  it('fin de semana y de mes y los próximos días con su nombre', () => {
    const c = calendarContext(asLocalDate('2026-10-26'), '10:00');
    expect(c).toMatchObject({ today: '2026-10-26', weekday: 'Monday', endOfWeek: '2026-11-01', endOfMonth: '2026-10-31', endOfNextMonth: '2026-11-30' });
    expect(c.next7Days[3]).toEqual({ date: '2026-10-30', weekday: 'Friday' });
  });
});

describe('validación de propuestas (AC-03)', () => {
  it('misión válida; la hora sin fecha se quita', () => {
    expect(checkProposal('create_mission', { title: 'Pagar luz', categoryId: 'money', difficulty: 'easy', time: '18:00' }, ctx)).toEqual({
      ok: true,
      proposal: { action: 'create_mission', args: { title: 'Pagar luz', categoryId: 'money', difficulty: 'easy', time: undefined } },
    });
  });

  it('rechaza categoría desconocida, fecha pasada y acción inexistente, con lo entendido como borrador', () => {
    const bad = checkProposal('create_mission', { title: 'X', categoryId: 'casa', difficulty: 'easy' }, ctx);
    expect(bad).toMatchObject({ ok: false, error: expect.stringMatching(/categoryId must be one of/), partial: { action: 'create_mission' } });
    expect(checkProposal('create_mission', { title: 'X', categoryId: 'money', difficulty: 'easy', deadline: '2026-10-01' }, ctx)).toMatchObject({ ok: false, error: 'deadline is in the past' });
    expect(checkProposal('delete_everything', {}, ctx).ok).toBe(false);
  });

  it('título de más de 60 caracteres → error de esquema (para el reintento)', () => {
    const r = checkProposal('create_goal', { title: 'Leer', categoryId: 'mind', milestones: [{ title: 'x'.repeat(61), difficulty: 'easy' }] }, ctx);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/milestones\.0\.title/) });
  });

  it('actividad: quita el día en diarias, recordatorios de más y días imposibles; límite de veces', () => {
    const daily = checkProposal('create_activity', { name: 'Meditar', categoryId: 'mind', period: 'day', target: 1, difficulty: 'easy', reminders: [{ day: 1, time: '07:00' }, { time: '20:00' }] }, ctx);
    expect(daily.ok && daily.proposal.args).toMatchObject({ reminders: [{ time: '07:00' }] });
    const weekly = checkProposal('create_activity', { name: 'Gym', categoryId: 'body', period: 'week', target: 2, difficulty: 'hard', reminders: [{ day: 9, time: '07:00' }, { day: 3, time: '18:00' }] }, ctx);
    expect(weekly.ok && weekly.proposal.args).toMatchObject({ reminders: [{ day: 3, time: '18:00' }] });
    expect(checkProposal('create_activity', { name: 'Agua', categoryId: 'body', period: 'day', target: 20, difficulty: 'easy' }, ctx)).toMatchObject({ ok: false });
  });

  it('descanso: desde hoy y fin no anterior al inicio', () => {
    expect(checkProposal('create_rest', { from: '2026-10-31', to: '2026-11-01', note: 'Viaje' }, ctx).ok).toBe(true);
    expect(checkProposal('create_rest', { from: '2026-10-31', to: '2026-10-30' }, ctx)).toMatchObject({ ok: false, error: 'to is before from' });
  });

  it('el catálogo tiene las cuatro acciones con su esquema JSON', () => {
    const tools = actionTools();
    expect(tools.map((t) => t.function.name)).toEqual(['create_mission', 'create_goal', 'create_rest', 'create_activity']);
    expect(tools[0]!.function.parameters).toMatchObject({ type: 'object', required: expect.arrayContaining(['title', 'categoryId', 'difficulty']) });
  });
});
