import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completeMission, createMission } from '../../../data/missions';
import { loadCategories, type DataContext } from '../../../data/repository';
import { addDays, toLocalDate } from '../../../domain/time/localDate';
import { renderRoutes, setupData } from '../../test-utils';
import { TodayScreen } from '../TodayScreen';
import { MissionDetailScreen } from './MissionDetailScreen';
import { MissionFormScreen } from './MissionFormScreen';
import { MissionsScreen } from './MissionsScreen';

vi.mock('../../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
  currentPersistState: () => Promise.resolve('granted'),
  requestPersistentStorage: () => Promise.resolve('granted'),
}));

let ctx: DataContext;
const today = () => toLocalDate(new Date());

beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  await ctx.db.delete();
});

/** Crea una misión "en el pasado" (creada hace `daysAgo` días) con fecha límite relativa a hoy. */
async function mission(title: string, opts: { daysAgo?: number; deadlineIn?: number; difficulty?: 'easy' | 'medium' | 'hard' } = {}) {
  const categoryId = (await loadCategories(ctx.db))[0]!.id;
  const created = addDays(today(), -(opts.daysAgo ?? 0));
  const past = { ...ctx, now: () => new Date(`${created}T09:00:00`) };
  const result = await createMission(past, {
    title,
    categoryId,
    difficulty: opts.difficulty ?? 'medium',
    deadline: opts.deadlineIn !== undefined ? addDays(today(), opts.deadlineIn) : undefined,
  });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.id;
}

const routes = [
  { path: '/hoy', element: <TodayScreen /> },
  { path: '/actividades/misiones', element: <MissionsScreen /> },
  { path: '/actividades/misiones/nueva', element: <MissionFormScreen /> },
  { path: '/actividades/misiones/:id', element: <MissionDetailScreen /> },
  { path: '/actividades/misiones/:id/editar', element: <MissionFormScreen /> },
];

describe('Hoy → Misiones (MHOY)', () => {
  it('MHOY-01/02/04: vencida primero, plazo, contador y "Ver todas"', async () => {
    await mission('Vencida', { daysAgo: 5, deadlineIn: -2 });
    await mission('Hoy', { deadlineIn: 0 });
    for (const t of ['S1', 'S2', 'S3', 'S4', 'S5']) await mission(t);
    renderRoutes(ctx, routes, '/hoy');
    const section = await screen.findByRole('region', { name: 'Misiones' });
    const titles = within(section).getAllByRole('listitem').map((li) => within(li).getAllByRole('link')[0]!.textContent);
    expect(titles).toEqual(['Vencida', 'Hoy', 'S1', 'S2', 'S3']);
    expect(within(section).getByText('Vencida', { selector: '.chip' })).toBeInTheDocument();
    expect(within(section).getByText('vence hoy')).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: 'Ver todas (7)' })).toBeInTheDocument();
    expect(screen.getByText('2 misiones para hoy')).toBeInTheDocument();
  });

  it('MHOY-03: completar muestra la XP; recuperar una vencida; deshacer', async () => {
    await mission('Informe', { deadlineIn: 1 });
    await mission('Atrasada', { daysAgo: 4, deadlineIn: -1 });
    renderRoutes(ctx, routes, '/hoy');
    await userEvent.click(await screen.findByRole('button', { name: 'Completar Informe' }));
    expect(await screen.findByText('Misión cumplida · +10 XP')).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Completar Atrasada' }));
    expect(await screen.findByText('Misión recuperada · +10 XP')).toBeInTheDocument();
    // El botón queda desactivado 400 ms tras completar (enfriamiento contra dobles toques).
    const undo = await screen.findByRole('button', { name: 'Deshacer Informe' });
    await waitFor(() => expect(undo).toBeEnabled());
    await userEvent.click(undo);
    expect(await screen.findByRole('button', { name: 'Completar Informe' })).toBeInTheDocument();
  });

  it('sección oculta sin misiones relevantes (lejanas no aparecen)', async () => {
    await mission('Lejana', { deadlineIn: 30 });
    renderRoutes(ctx, routes, '/hoy');
    await screen.findByRole('heading', { name: 'Crea tu primera actividad' });
    expect(screen.queryByRole('region', { name: 'Misiones' })).toBeNull();
  });
});

describe('lista, formulario y detalle (MUI)', () => {
  it('MUI-01: estado vacío y grupos', async () => {
    renderRoutes(ctx, routes, '/actividades/misiones');
    expect(await screen.findByRole('heading', { name: 'Crea una misión' })).toBeInTheDocument();
  });

  it('MUI-01: pendientes y completadas', async () => {
    await mission('Pendiente');
    const done = await mission('Hecha');
    await completeMission(ctx, done, today());
    renderRoutes(ctx, routes, '/actividades/misiones');
    expect(await screen.findByRole('region', { name: 'Pendientes' })).toHaveTextContent('Pendiente');
    expect(screen.getByRole('region', { name: 'Completadas' })).toHaveTextContent('Hecha');
  });

  it('MUI-02 · S3-01: el formulario rechaza fechas pasadas y crea la misión', async () => {
    renderRoutes(ctx, routes, '/actividades/misiones/nueva');
    await userEvent.type(await screen.findByLabelText('Título'), 'Pedir cita');
    // jsdom no permite teclear en inputs de fecha: se usa el evento de cambio.
    const date = screen.getByLabelText('Fecha límite (opcional)');
    fireEvent.change(date, { target: { value: addDays(today(), -1) } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear misión' }));
    expect(await screen.findByText('La fecha límite no puede ser pasada')).toBeInTheDocument();
    fireEvent.change(date, { target: { value: addDays(today(), 3) } });
    await userEvent.click(screen.getByRole('button', { name: 'Crear misión' }));
    await waitFor(async () => expect(await ctx.db.missions.count()).toBe(1));
  });

  it('MIS-06: editar una completada bloquea categoría y dificultad', async () => {
    const id = await mission('Hecha');
    await completeMission(ctx, id, today());
    renderRoutes(ctx, routes, `/actividades/misiones/${id}/editar`);
    expect(await screen.findByText(/solo se pueden cambiar mientras la misión está pendiente/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Dificultad' })).toBeDisabled();
  });

  it('MUI-04/05: vencida explica cómo recuperar y el texto de abandonar mantiene el fallo', async () => {
    const id = await mission('Atrasada', { daysAgo: 4, deadlineIn: -1 });
    renderRoutes(ctx, routes, `/actividades/misiones/${id}`);
    expect(await screen.findByText(/Complétala cuando puedas para recuperar lo perdido/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abandonar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('El fallo se mantiene');
  });

  it('MUI-04: abandonar con fecha pendiente cuesta la mitad; sin fecha no afecta', async () => {
    const withDeadline = await mission('Con fecha', { deadlineIn: 5 });
    const { unmount } = renderRoutes(ctx, routes, `/actividades/misiones/${withDeadline}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('cuesta la mitad de su valor');
    unmount();
    const without = await mission('Sin fecha');
    renderRoutes(ctx, routes, `/actividades/misiones/${without}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Abandonar' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('No afecta a tus puntos');
  });

  it('GD-A5: "La hice ayer" no aparece si se creó hoy', async () => {
    const id = await mission('Nueva');
    renderRoutes(ctx, routes, `/actividades/misiones/${id}`);
    expect(await screen.findByRole('button', { name: 'Completar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'La hice ayer' })).toBeNull();
  });
});
