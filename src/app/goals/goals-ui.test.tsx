// Spec 12, OB en la interfaz: crear un objetivo con hitos, verlo en la pestaña y en el detalle, y la etiqueta del hito.
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoal, loadGoals } from '../../data/goals';
import { completeMission } from '../../data/missions';
import { loadCategories, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { MissionsScreen } from '../screens/missions/MissionsScreen';
import { GoalDetailScreen } from './GoalDetailScreen';
import { GoalFormScreen } from './GoalFormScreen';
import { GoalsScreen } from './GoalsScreen';

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

describe('crear un objetivo (OB-02)', () => {
  it('con dos hitos, el segundo con fecha y hora; abre su detalle', async () => {
    const user = userEvent.setup();
    renderRoutes(
      ctx,
      [
        { path: '/objetivos/nuevo', element: <GoalFormScreen /> },
        { path: '/objetivos/:id', element: <p>Detalle</p> },
      ],
      '/objetivos/nuevo',
    );
    await user.type(await screen.findByLabelText('Título'), 'Correr 10 km');
    await user.type(screen.getByLabelText('Hito 1 · Título'), 'Correr 3 km');
    await user.click(screen.getByRole('button', { name: 'Añadir hito' }));
    await user.type(screen.getByLabelText('Hito 2 · Título'), 'Correr 5 km');
    fireEvent.change(screen.getByLabelText('Hito 2 · fecha límite'), { target: { value: addDays(today(), 7) } });
    fireEvent.change(screen.getByLabelText('Hito 2 · hora'), { target: { value: '18:00' } });
    await user.click(screen.getByRole('button', { name: 'Crear objetivo' }));
    expect(await screen.findByText('Detalle')).toBeInTheDocument();
    const [goal] = await loadGoals(ctx.db);
    expect(goal!.milestones.map((m) => [m.title, m.time, !!m.missionId])).toEqual([
      ['Correr 3 km', undefined, true],
      ['Correr 5 km', '18:00', false],
    ]);
  });

  it('sin título en un hito, error en ese hito', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/objetivos/nuevo', element: <GoalFormScreen /> }], '/objetivos/nuevo');
    await user.type(await screen.findByLabelText('Título'), 'Leer más');
    await user.click(screen.getByRole('button', { name: 'Crear objetivo' }));
    expect(await screen.findByText('Escribe un título')).toBeInTheDocument();
  });
});

describe('pestaña, detalle y etiqueta (OB-01, OB-03, OB-04)', () => {
  async function goal() {
    const categoryId = (await loadCategories(ctx.db))[0]!.id;
    const r = await createGoal(ctx, {
      title: 'Correr 10 km',
      categoryId,
      milestones: [
        { title: 'Correr 3 km', difficulty: 'easy' },
        { title: 'Correr 5 km', difficulty: 'medium' },
      ],
    });
    if (!r.ok) throw new Error('no');
    return r.id;
  }

  it('la pestaña muestra el progreso y el hito actual', async () => {
    await goal();
    renderRoutes(ctx, [{ path: '/objetivos', element: <GoalsScreen /> }], '/objetivos');
    expect(await screen.findByText('Correr 10 km')).toBeInTheDocument();
    expect(screen.getByText(/0 de 2 hitos · Ahora: Correr 3 km/)).toBeInTheDocument();
  });

  it('el detalle muestra el hito activo y el bloqueado; al completar, el siguiente se activa', async () => {
    const id = await goal();
    renderRoutes(ctx, [{ path: '/objetivos/:id', element: <GoalDetailScreen /> }], `/objetivos/${id}`);
    expect(await screen.findByText('Ahora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Correr 3 km' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Correr 5 km' })).toBeNull();
    const [g] = await loadGoals(ctx.db);
    await completeMission(ctx, g!.milestones[0]!.missionId!, today());
    await waitFor(() => expect(screen.getByRole('link', { name: 'Correr 5 km' })).toBeInTheDocument());
    expect(screen.getByText('1 de 2 hitos')).toBeInTheDocument();
  });

  it('la misión del hito lleva «Objetivo: X · hito 1/2»', async () => {
    await goal();
    renderRoutes(ctx, [{ path: '/actividades/misiones', element: <MissionsScreen /> }], '/actividades/misiones');
    expect(await screen.findByRole('link', { name: 'Objetivo: Correr 10 km · hito 1/2' })).toBeInTheDocument();
  });
});
