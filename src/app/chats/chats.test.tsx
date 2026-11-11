import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSetting, type DataContext } from '../../data/repository';
import { choose, finishContact } from '../../domain/origen/origen';
import { renderRoutes, setupData } from '../test-utils';
import { ChatsScreen, SignalChatScreen } from './ChatsScreen';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  await ctx.db.delete();
});

const AT = new Date('2026-11-11T10:00:00.000Z');
const routes = [
  { path: '/mensajes', element: <ChatsScreen /> },
  { path: '/mensajes/senal', element: <SignalChatScreen /> },
  { path: '/chat', element: <p>chat del compañero</p> },
];

describe('Mensajes (spec 17, ME)', () => {
  it('sin la historia en marcha, abre el chat del compañero directamente (ME-01, DE-03)', async () => {
    await saveSetting(ctx.db, 'origen', choose(finishContact(undefined, AT, 0), 'block'));
    renderRoutes(ctx, routes, '/mensajes');
    expect(await screen.findByText('chat del compañero')).toBeInTheDocument();
  });

  it('investigando: el compañero arriba y «???» con la sesión 1, sin leer (ME-01, ME-08, CA-03)', async () => {
    await saveSetting(ctx.db, 'origen', choose(finishContact(undefined, AT, 0), 'investigate'));
    renderRoutes(ctx, routes, '/mensajes');
    expect(await screen.findByText('ARVID')).toBeInTheDocument();
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.getByText(/Señal desconocida · Sesión 1/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Mensajes · hay algo nuevo' })).toBeInTheDocument();
  });

  it('«???»: una tarjeta por sesión, sin campo de escribir, y al abrirlo queda leído (ME-08)', async () => {
    await saveSetting(ctx.db, 'origen', choose(finishContact(undefined, AT, 0), 'investigate'));
    renderRoutes(ctx, routes, '/mensajes/senal');
    expect(await screen.findByRole('button', { name: 'Ver transmisión: Sesión 1' })).toBeInTheDocument();
    expect(screen.getByText('No puedes responder a este contacto.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    await waitFor(async () => expect((await loadSettings(ctx.db)).origen?.read?.signal).toBe(AT.toISOString()));
  });
});
