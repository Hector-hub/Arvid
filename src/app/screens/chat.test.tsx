import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { appendChatLog, loadSettings, type DataContext } from '../../data/repository';
import { ChatLogWatcher } from '../arvid/chatLog';
import { renderRoutes, setupData } from '../test-utils';
import { ChatScreen } from './ChatScreen';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  await ctx.db.delete();
});

const page = () =>
  renderRoutes(
    ctx,
    [
      {
        path: '/chat',
        element: (
          <>
            <ChatLogWatcher />
            <ChatScreen />
          </>
        ),
      },
    ],
    '/chat',
  );

describe('conversación completa (D-098)', () => {
  it('muestra lo guardado con quién lo dijo, incluido lo que el compañero dijo por su cuenta', async () => {
    await appendChatLog(ctx.db, [
      { at: '2026-10-21T08:00:00.000Z', from: 'companion', companion: 'arvid', text: 'Buenos días. Empieza por la más pequeña.' },
      { at: '2026-10-22T09:00:00.000Z', from: 'user', companion: 'arvid', text: '¿Qué hago hoy?' },
    ]);
    page();
    expect(await screen.findByText('Buenos días. Empieza por la más pequeña.')).toBeInTheDocument();
    expect(screen.getByText('¿Qué hago hoy?')).toBeInTheDocument();
    expect(screen.getAllByText(/^ARVID ·/)).toHaveLength(1);
    expect(screen.getAllByText(/^Tú ·/)).toHaveLength(1);
  });

  it('enviar guarda el mensaje y la respuesta; sin IA, la frase que pide activarla', async () => {
    const user = userEvent.setup();
    page();
    await user.type(await screen.findByLabelText('Mensaje para ARVID'), 'Hola');
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Hola')).toBeInTheDocument();
    expect(await screen.findByText(/activa «ARVID con IA»/)).toBeInTheDocument();
    await waitFor(async () => expect((await loadSettings(ctx.db)).chatLog?.map((e) => e.from)).toEqual(['user', 'companion']));
  });

  it('borrar pide confirmación y deja la conversación vacía', async () => {
    const user = userEvent.setup();
    await appendChatLog(ctx.db, [{ at: new Date().toISOString(), from: 'user', companion: 'arvid', text: 'Hola' }]);
    page();
    // Menú de tres puntos (D-130) → «Borrar conversación» → confirmación flotante
    await user.click(await screen.findByRole('button', { name: 'Opciones' }));
    await user.click(screen.getByRole('menuitem', { name: 'Borrar conversación' }));
    await user.click(screen.getByRole('button', { name: 'Borrar' }));
    expect(await screen.findByText(/Aún no habéis hablado/)).toBeInTheDocument();
    expect((await loadSettings(ctx.db)).chatLog).toBeUndefined();
  });
});
