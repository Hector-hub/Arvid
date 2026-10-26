// D-128: una fecha opcional se puede volver a dejar vacía (el selector de iPhone no lo permite por sí solo).
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DataContext } from '../../../data/repository';
import { addDays, toLocalDate } from '../../../domain/time/localDate';
import { GoalFormScreen } from '../../goals/GoalFormScreen';
import { renderRoutes, setupData } from '../../test-utils';
import { MissionFormScreen } from './MissionFormScreen';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  await ctx.db.delete();
});

const soon = () => addDays(toLocalDate(new Date()), 3);

describe('quitar fecha (D-128)', () => {
  it('misión: «Quitar fecha» vacía la fecha y la hora', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/m', element: <MissionFormScreen /> }], '/m');
    const date = await screen.findByLabelText('Fecha límite (opcional)');
    expect(screen.queryByRole('button', { name: 'Quitar fecha' })).toBeNull();
    fireEvent.change(date, { target: { value: soon() } });
    fireEvent.change(screen.getByLabelText('Hora del aviso (opcional)'), { target: { value: '18:00' } });
    await user.click(screen.getByRole('button', { name: 'Quitar fecha' }));
    expect(date).toHaveValue('');
    expect(screen.queryByLabelText('Hora del aviso (opcional)')).toBeNull();
  });

  it('objetivo: fecha meta y fecha de un hito', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/o', element: <GoalFormScreen /> }], '/o');
    const target = await screen.findByLabelText('Fecha meta (opcional)');
    fireEvent.change(target, { target: { value: soon() } });
    await user.click(screen.getByRole('button', { name: 'Quitar fecha' }));
    expect(target).toHaveValue('');
    const milestone = screen.getByLabelText('Hito 1 · fecha límite');
    fireEvent.change(milestone, { target: { value: soon() } });
    await user.click(screen.getByRole('button', { name: 'Hito 1 · Quitar fecha' }));
    expect(milestone).toHaveValue('');
  });
});
