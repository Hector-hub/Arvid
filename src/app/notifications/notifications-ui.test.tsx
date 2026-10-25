// Spec 10 en la interfaz: recordatorios en el formulario de actividad (RA-01, RA-02) y Ajustes → Notificaciones.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, loadCategories, type DataContext } from '../../data/repository';
import { renderRoutes, setupData } from '../test-utils';
import { ActivityFormScreen } from '../screens/ActivityFormScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

vi.mock('../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
  isStandalone: () => false,
  currentPersistState: () => Promise.resolve('granted'),
  requestPersistentStorage: () => Promise.resolve('granted'),
}));

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  await ctx.db.delete();
});

describe('recordatorios en la actividad (RA-01)', () => {
  it('una diaria × 2 guarda sus dos horas al crearla', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/actividades/nueva', element: <ActivityFormScreen /> }, { path: '/hoy', element: <p>Hoy</p> }], '/actividades/nueva');
    await user.type(await screen.findByLabelText('Nombre'), 'Agua');
    await user.click(screen.getByLabelText('Cuerpo'));
    fireEvent.change(screen.getByLabelText(/Veces por/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Recordatorio 1 · hora'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Recordatorio 2 · hora'), { target: { value: '17:30' } });
    await user.click(screen.getByRole('button', { name: 'Crear actividad' }));
    await screen.findByText('Hoy');
    const [activity] = await ctx.db.activities.toArray();
    expect(activity!.reminders).toEqual([{ time: '10:00' }, { time: '17:30' }]);
  });

  it('semanal: día de la semana y hora; al bajar las veces avisa de los que sobran (RA-02)', async () => {
    const categoryId = (await loadCategories(ctx.db)).find((c) => c.name === 'Cuerpo')!.id;
    const id = await createActivity(ctx, {
      name: 'Gym',
      config: { period: 'week', target: 2, difficulty: 'medium', categoryId },
      reminders: [{ day: 1, time: '07:00' }, { day: 3, time: '07:00' }],
    });
    renderRoutes(ctx, [{ path: '/actividades/:id/editar', element: <ActivityFormScreen /> }], `/actividades/${id}/editar`);
    expect(await screen.findByLabelText('Recordatorio 1 · día de la semana')).toHaveValue('1');
    fireEvent.change(screen.getByLabelText(/Veces por/), { target: { value: '1' } });
    expect(await screen.findByText('Al bajar las veces, 1 recordatorio dejará de usarse.')).toBeInTheDocument();
  });
});

describe('Ajustes → Notificaciones (NT-04)', () => {
  it('sin Web Push en este navegador lo explica y no ofrece el interruptor', async () => {
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    expect(await screen.findByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Este navegador no admite notificaciones de ARVID.')).toBeInTheDocument());
    expect(screen.queryByLabelText(/Notificaciones en este dispositivo/)).toBeNull();
  });
});
