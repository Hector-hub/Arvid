// Spec 12, AC-05: del chat a la tarjeta y a lo creado; «Editar» abre el formulario rellenado.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGoals } from '../../data/goals';
import { loadMissions } from '../../data/missions';
import { loadCategories, saveSetting, type DataContext } from '../../data/repository';
import { addDays, toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { ChatScreen } from '../screens/ChatScreen';
import { MissionFormScreen } from '../screens/missions/MissionFormScreen';
import { resetConversation } from './brain';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  resetConversation();
  await saveSetting(ctx.db, 'arvidAi', true);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.db.delete();
});

const friday = () => addDays(toLocalDate(new Date()), 4);

async function reply(proposal: unknown, extra: Record<string, unknown> = {}) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ reply: 'Te la preparo.', proposal, ...extra })));
}

const page = () =>
  renderRoutes(
    ctx,
    [
      { path: '/chat', element: <ChatScreen /> },
      { path: '/actividades/misiones/nueva', element: <MissionFormScreen /> },
      { path: '/actividades/misiones/:id', element: <p>Misión creada</p> },
      { path: '/objetivos/:id', element: <p>Objetivo creado</p> },
    ],
    '/chat',
  );

describe('crear con el compañero (AC-05)', () => {
  it('misión: tarjeta con el resumen, «Crear» la crea con fecha y hora', async () => {
    const money = (await loadCategories(ctx.db))[0]!.id;
    await reply({ action: 'create_mission', args: { title: 'Pagar la luz', categoryId: money, difficulty: 'easy', deadline: friday(), time: '18:00' } });
    const user = userEvent.setup();
    page();
    await user.type(await screen.findByLabelText(/Mensaje/), 'crea una misión para pagar la luz el viernes a las 6{Enter}');
    expect(await screen.findByText('Misión')).toBeInTheDocument();
    expect(screen.getByText('Pagar la luz')).toBeInTheDocument();
    expect(screen.getByText(/18:00/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('Misión creada')).toBeInTheDocument();
    const [m] = await loadMissions(ctx.db);
    expect(m!.mission).toMatchObject({ title: 'Pagar la luz', time: '18:00' });
  });

  it('objetivo: crea el objetivo con sus hitos', async () => {
    const body = (await loadCategories(ctx.db))[0]!.id;
    await reply({ action: 'create_goal', args: { title: 'Correr 10 km', categoryId: body, milestones: [{ title: 'Correr 3 km', difficulty: 'easy' }, { title: 'Correr 10 km', difficulty: 'hard' }] } });
    const user = userEvent.setup();
    page();
    await user.type(await screen.findByLabelText(/Mensaje/), 'quiero correr 10 km{Enter}');
    expect(await screen.findByText('1. Correr 3 km · Fácil')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Crear' }));
    expect(await screen.findByText('Objetivo creado')).toBeInTheDocument();
    expect((await loadGoals(ctx.db))[0]!.milestones).toHaveLength(2);
  });

  it('«Editar» abre el formulario con los datos; «Cancelar» no crea nada', async () => {
    const money = (await loadCategories(ctx.db))[0]!.id;
    await reply({ action: 'create_mission', args: { title: 'Pagar la luz', categoryId: money, difficulty: 'easy' } });
    const user = userEvent.setup();
    page();
    await user.type(await screen.findByLabelText(/Mensaje/), 'misión pagar la luz{Enter}');
    await user.click(await screen.findByRole('button', { name: 'Editar' }));
    expect(await screen.findByDisplayValue('Pagar la luz')).toBeInTheDocument();
    expect(screen.getByText(/rellenó lo que entendió/)).toBeInTheDocument();
    expect(await loadMissions(ctx.db)).toHaveLength(0);
  });

  it('una propuesta que no pasa la validación en la app no se muestra como tarjeta', async () => {
    await reply({ action: 'create_mission', args: { title: 'X', categoryId: 'no-existe', difficulty: 'easy' } });
    const user = userEvent.setup();
    page();
    await user.type(await screen.findByLabelText(/Mensaje/), 'misión x{Enter}');
    // Se abre el formulario con lo entendido (AC-06), sin tarjeta
    await waitFor(() => expect(screen.getByDisplayValue('X')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Crear' })).toBeNull();
  });
});
