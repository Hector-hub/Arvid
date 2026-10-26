// Spec 12, DS: pantalla de descansos y aviso en Hoy.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, createRest, loadCategories, loadRests, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { TodayScreen } from '../screens/TodayScreen';
import { RestsScreen } from './RestsScreen';

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

const today = () => toLocalDate(new Date());

describe('pantalla de descansos (DS-01 a DS-03)', () => {
  it('crea un descanso para todas las actividades con nota y lo lista', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/descansos', element: <RestsScreen /> }], '/descansos');
    fireEvent.change(await screen.findByLabelText('Hasta'), { target: { value: addDays(today(), 2) } });
    await user.type(screen.getByLabelText('Nota (opcional)'), 'Viaje');
    await user.click(screen.getByRole('button', { name: 'Planificar descanso' }));
    await waitFor(async () => expect(await loadRests(ctx.db)).toHaveLength(1));
    expect(await screen.findByText(/Todas las actividades · Viaje/)).toBeInTheDocument();
  });

  it('no deja empezar en el pasado', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/descansos', element: <RestsScreen /> }], '/descansos');
    fireEvent.change(await screen.findByLabelText('Desde'), { target: { value: addDays(today(), -1) } });
    await user.click(screen.getByRole('button', { name: 'Planificar descanso' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('tiene que empezar hoy');
  });
});

describe('Hoy en un día de descanso (DS-04)', () => {
  it('aviso, etiqueta en la actividad y no cuenta como pendiente', async () => {
    const categoryId = (await loadCategories(ctx.db))[0]!.id;
    await createActivity(ctx, { name: 'Leer', config: { period: 'day', target: 1, difficulty: 'medium', categoryId } });
    await createRest(ctx, { from: today(), to: today(), note: 'Viaje' });
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    expect(await screen.findByText('Hoy descansas · Viaje')).toBeInTheDocument();
    expect(screen.getByText('Descanso')).toBeInTheDocument();
    expect(screen.queryByText(/Te queda 1/)).toBeNull();
    expect(screen.getByText('Día de descanso')).toBeInTheDocument();
  });
});
