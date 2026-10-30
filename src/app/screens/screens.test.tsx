import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createActivity, loadCategories, logCompletion, type DataContext } from '../../data/repository';
import { toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { ActivityFormScreen } from './ActivityFormScreen';
import { CategoryFormScreen } from './CategoryFormScreen';
import { SettingsAccountScreen, SettingsCategoriesScreen, SettingsScreen } from './SettingsScreen';
import { TodayScreen } from './TodayScreen';

vi.mock('../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
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

async function cat(name: string) {
  return (await loadCategories(ctx.db)).find((c) => c.name === name)!.id;
}

async function add(name: string, period: 'day' | 'week' | 'month', target: number) {
  return createActivity(ctx, {
    name,
    config: { period, target, difficulty: 'medium', categoryId: await cat('Cuerpo') },
  });
}

const today = () => toLocalDate(new Date());

describe('Hoy', () => {
  it('HOY-06: estado vacío con invitación', async () => {
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    expect(await screen.findByRole('heading', { name: 'Crea tu primera actividad' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nueva actividad/ })).toHaveAttribute('href', '/actividades/nueva');
  });

  it('HOY-01 a HOY-04: secciones, pendientes y fila completada', async () => {
    await add('Agua', 'day', 3);
    const caminar = await add('Caminar', 'day', 1);
    await add('Gym', 'week', 4);
    await logCompletion(ctx, caminar, today());
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');

    expect(await screen.findByText('3 actividades pendientes')).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Hoy', 'Esta semana']);

    const daily = within(screen.getByRole('region', { name: 'Hoy' })).getAllByRole('listitem');
    expect(daily.map((li) => within(li).getAllByRole('link')[0]!.textContent)).toEqual(['Agua', 'Caminar']);
    expect(within(daily[1]!).getByText('Hecho')).toBeInTheDocument();
    expect(within(daily[1]!).queryByRole('button', { name: 'Registrar Caminar' })).toBeNull();
    expect(within(daily[1]!).getByRole('button', { name: 'Deshacer Caminar' })).toBeInTheDocument();
  });

  it('LOG-05: registrar actualiza la fila sin recargar y muestra el feedback', async () => {
    await add('Agua', 'day', 3);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar Agua' }));
    expect(await screen.findByText('+1 · 1 de 3 · +3,33 XP')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('1 de 3')).toBeInTheDocument());
    expect(screen.getByText('2 actividades pendientes')).toBeInTheDocument();
  });
});

describe('Formulario de actividad', () => {
  it('ACT-01: muestra errores en línea y no crea nada', async () => {
    renderRoutes(ctx, [{ path: '/actividades/nueva', element: <ActivityFormScreen /> }], '/actividades/nueva');
    await userEvent.click(await screen.findByRole('button', { name: 'Crear actividad' }));
    expect(await screen.findByText('Escribe un nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveFocus();
    expect(await ctx.db.activities.count()).toBe(0);
  });

  it('ACT-01: el máximo de veces depende del periodo', async () => {
    renderRoutes(ctx, [{ path: '/actividades/nueva', element: <ActivityFormScreen /> }], '/actividades/nueva');
    await userEvent.click(await screen.findByLabelText('Semanal'));
    expect(screen.getByText('Entre 1 y 14')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Mensual'));
    expect(screen.getByText('Entre 1 y 28')).toBeInTheDocument();
  });

  it('CAT-03: una categoría desactivada no aparece', async () => {
    await ctx.db.categories.update(await cat('Orden'), { active: false });
    renderRoutes(ctx, [{ path: '/actividades/nueva', element: <ActivityFormScreen /> }], '/actividades/nueva');
    expect(await screen.findByLabelText('Cuerpo')).toBeInTheDocument();
    expect(screen.queryByLabelText('Orden')).toBeNull();
  });
});

describe('Ajustes', () => {
  it('SET-01: estado del almacenamiento y versión', async () => {
    const { unmount } = renderRoutes(ctx, [{ path: '/ajustes/cuenta', element: <SettingsAccountScreen /> }], '/ajustes/cuenta');
    expect(await screen.findByText('Protegido')).toBeInTheDocument();
    unmount();
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    expect(await screen.findByText(/^ARVID \d+\.\d+\.\d+( · .+)?$/)).toBeInTheDocument();
  });

  it('CAT-02: explica por qué no se puede desactivar una categoría en uso', async () => {
    await add('Gym', 'week', 3);
    const cuerpo = (await loadCategories(ctx.db)).find((c) => c.name === 'Cuerpo')!;
    renderRoutes(ctx, [{ path: '/ajustes/categorias/:id', element: <CategoryFormScreen /> }], `/ajustes/categorias/${cuerpo.id}`);
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Activa' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Tiene 1 actividad');
  });

  it('D-199: Categorías muestra las activas con sus actividades y cada una lleva a su edición', async () => {
    await add('Gym', 'week', 3);
    renderRoutes(ctx, [{ path: '/ajustes/categorias', element: <SettingsCategoriesScreen /> }], '/ajustes/categorias');
    const cuerpo = await screen.findByRole('link', { name: /^Cuerpo/ });
    expect(cuerpo).toHaveTextContent('1 actividad');
    expect(screen.getByRole('img', { name: '6 de 8 activas' })).toBeInTheDocument();
  });

  it('SET-02: guardar movimiento reducido', async () => {
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    await userEvent.click(await screen.findByLabelText('Activado'));
    await waitFor(async () => expect((await ctx.db.settings.get('reducedMotion'))?.value).toBe('on'));
  });
});
