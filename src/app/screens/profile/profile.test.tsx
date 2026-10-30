import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCategory } from '../../../data/categories';
import { completeMission, createMission } from '../../../data/missions';
import { createActivity, loadCategories, logCompletion, setCategoryActive, type DataContext } from '../../../data/repository';
import { addDays, toLocalDate } from '../../../domain/time/localDate';
import { renderRoutes, setupData } from '../../test-utils';
import { CategoryFormScreen } from '../CategoryFormScreen';
import { ProfileScreen } from '../ProfileScreen';
import { AttributeDetailScreen, DisciplineDetailScreen } from './AttributeDetailScreen';

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

const routes = [
  { path: '/perfil', element: <ProfileScreen /> },
  { path: '/perfil/atributo/:categoryId', element: <AttributeDetailScreen /> },
  { path: '/perfil/disciplina', element: <DisciplineDetailScreen /> },
  { path: '/ajustes/categorias', element: <p>ajustes</p> },
  { path: '/ajustes/categorias/nueva', element: <CategoryFormScreen /> },
  { path: '/ajustes/categorias/:id', element: <CategoryFormScreen /> },
];

async function cat(name: string) {
  return (await loadCategories(ctx.db)).find((c) => c.name === name)!.id;
}

/**
 * Actividad diaria creada hace 11 días con registros los días indicados (hace N días). El día de creación es de gracia
 * (sin completar, no cuenta), así que hay 10 días cerrados evaluados.
 */
async function daily(name: string, category: string, doneDaysAgo: number[]) {
  const created = addDays(today(), -11);
  const id = await createActivity({ ...ctx, now: () => new Date(`${created}T08:00:00`) }, {
    name,
    config: { period: 'day', target: 1, difficulty: 'medium', categoryId: await cat(category) },
  });
  for (const ago of doneDaysAgo) {
    const date = addDays(today(), -ago);
    await logCompletion({ ...ctx, now: () => new Date(`${date}T20:00:00`) }, id, date);
  }
  return id;
}

describe('Perfil (PJ)', () => {
  it('PJ-07: sin datos muestra el aviso y no el radar', async () => {
    renderRoutes(ctx, routes, '/perfil');
    expect(await screen.findByText('Tus atributos aparecerán cuando registres tus primeras actividades.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Radar/ })).toBeNull();
  });

  it('PJ-02/04/05: radar con aria-label, lista con "sin datos" y nota fija', async () => {
    // Cuerpo: 10 días cerrados, 5 cumplidos → 50. Mente: sin actividad → sin datos.
    await daily('Caminar', 'Cuerpo', [1, 2, 3, 4, 5]);
    renderRoutes(ctx, routes, '/perfil');
    const radar = await screen.findByRole('img', { name: /Radar de atributos/ });
    expect(radar.getAttribute('aria-label')).toContain('Cuerpo 50');
    expect(radar.getAttribute('aria-label')).toContain('Mente sin datos (0 de 3)');
    const list = screen.getByRole('list', { name: 'Lista de atributos' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    expect(within(list).getByRole('link', { name: /Cuerpo/ })).toHaveAttribute('href', `/perfil/atributo/${await cat('Cuerpo')}`);
    expect(screen.getByText(/no tu salud ni tu capacidad/)).toBeInTheDocument();
  });

  it('PJ-01 · D-026: el selector de ventana se guarda', async () => {
    await daily('Caminar', 'Cuerpo', [1]);
    renderRoutes(ctx, routes, '/perfil');
    await userEvent.click(await screen.findByRole('button', { name: '7 días' }));
    await waitFor(async () => expect((await ctx.db.settings.get('radarWindow'))?.value).toBe(7));
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('R-AT6 · PJ-06: con menos de 3 categorías activas no hay radar', async () => {
    await daily('Caminar', 'Cuerpo', [1, 2, 3]);
    for (const name of ['Descanso', 'Mente', 'Aprendizaje', 'Relaciones']) await setCategoryActive(ctx, await cat(name), false);
    renderRoutes(ctx, routes, '/perfil');
    expect(await screen.findByText('Activa al menos 3 categorías para ver el radar.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Radar/ })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Lista de atributos' })).getAllByRole('listitem')).toHaveLength(2);
  });

  it('PJ-03: medidor de Disciplina con valor', async () => {
    await daily('Caminar', 'Cuerpo', [1, 2, 3, 4, 5]);
    renderRoutes(ctx, routes, '/perfil');
    const meter = await screen.findByRole('region', { name: /Disciplina/ });
    expect(within(meter).getByText('50')).toBeInTheDocument();
  });
});

describe('detalle (DA)', () => {
  it('DA-02/03: explicación y qué cuenta', async () => {
    const caminar = await daily('Caminar', 'Cuerpo', [1, 2, 3, 4, 5]);
    renderRoutes(ctx, routes, `/perfil/atributo/${await cat('Cuerpo')}`);
    expect(await screen.findByText(/Cuerpo 50: ganaste 50 de 100 puntos posibles en los últimos 30 días \(10 días de Caminar\)\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Caminar' })).toHaveAttribute('href', `/actividades/${caminar}`);
  });

  it('DA-02: sin datos', async () => {
    renderRoutes(ctx, routes, `/perfil/atributo/${await cat('Mente')}`);
    expect(await screen.findByText('Aún no hay suficiente información: 0 de 3 elementos necesarios.')).toBeInTheDocument();
  });

  it('DA-05: Disciplina lista la misión vencida con enlace', async () => {
    await daily('Caminar', 'Cuerpo', [1, 2, 3]);
    const created = addDays(today(), -10);
    const result = await createMission({ ...ctx, now: () => new Date(`${created}T08:00:00`) }, {
      title: 'Entregar informe',
      categoryId: await cat('Aprendizaje'),
      difficulty: 'medium',
      deadline: addDays(today(), -3),
    });
    if (!result.ok) throw new Error();
    renderRoutes(ctx, routes, '/perfil/disciplina');
    const region = await screen.findByRole('region', { name: 'Lo que resta' });
    expect(region).toHaveTextContent('1 misión vencida resta 10 puntos posibles; complétala para recuperarlos.');
    expect(within(region).getByRole('link', { name: 'Entregar informe' })).toHaveAttribute('href', `/actividades/misiones/${result.id}`);
  });

  it('DA-03: misiones cumplidas de la categoría', async () => {
    const result = await createMission(ctx, { title: 'Revisión', categoryId: await cat('Cuerpo'), difficulty: 'hard' });
    if (!result.ok) throw new Error();
    await completeMission(ctx, result.id, today());
    renderRoutes(ctx, routes, `/perfil/atributo/${await cat('Cuerpo')}`);
    expect(await screen.findByRole('link', { name: 'Misión: Revisión' })).toBeInTheDocument();
  });
});

describe('categorías propias (CAT-04 a CAT-06)', () => {
  it('crear con nombre, color e icono; nombre duplicado muestra error', async () => {
    renderRoutes(ctx, routes, '/ajustes/categorias/nueva');
    await userEvent.type(await screen.findByLabelText('Nombre'), 'mente');
    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
    expect(await screen.findByText('Ya tienes una categoría con ese nombre')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Nombre'));
    await userEvent.type(screen.getByLabelText('Nombre'), 'Música');
    await userEvent.click(screen.getByLabelText('Nota musical'));
    await userEvent.click(screen.getByRole('button', { name: 'Crear categoría' }));
    expect(await screen.findByText('ajustes')).toBeInTheDocument();
    const created = (await loadCategories(ctx.db)).find((c) => c.name === 'Música');
    expect(created).toMatchObject({ icon: 'cat-music', color: 'green', active: true });
  });

  it('eliminar solo si no tiene historial', async () => {
    const free = await createCategory(ctx, { name: 'Libre', color: 'white', icon: 'cat-key' });
    if (!free.ok) throw new Error();
    const { unmount } = renderRoutes(ctx, routes, `/ajustes/categorias/${free.id}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar categoría' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByText('ajustes')).toBeInTheDocument();
    unmount();
    renderRoutes(ctx, routes, `/ajustes/categorias/${await cat('Cuerpo')}`);
    expect(await screen.findByRole('heading', { name: 'Editar categoría' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar categoría' })).toBeNull();
  });
});
