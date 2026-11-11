import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSettings, saveSetting, type DataContext } from '../../data/repository';
import { choose, finishContact } from '../../domain/origen/origen';
import { renderRoutes, setupData } from '../test-utils';
import { ChatsScreen, NeighborChatScreen, SignalChatScreen } from './ChatsScreen';
import { deliverStep } from '../../domain/origen/chapters';
import { openChapter } from '../../domain/origen/periods';

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
  { path: '/mensajes/:chat', element: <NeighborChatScreen /> },
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

  it('el chat de un vecino muestra lo de la historia con las respuestas del compañero por ti (ME-03, ME-04)', async () => {
    const s = openChapter(choose(finishContact(undefined, AT, 0), 'investigate'), new Date('2026-11-18T10:00:00.000Z'), 80);
    await saveSetting(ctx.db, 'origen', deliverStep(s, 'c2.dex', new Date('2026-11-18T10:00:05.000Z')));
    renderRoutes(ctx, routes, '/mensajes');
    expect(await screen.findByText('Dex')).toBeInTheDocument();
    renderRoutes(ctx, routes, '/mensajes/dex');
    expect(await screen.findByText(/Hola, soy Dex/)).toBeInTheDocument();
    expect(screen.getByText(/ARVID, por ti/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('una prueba se acepta o se rechaza desde «???» y queda registrada (PR-06)', async () => {
    const user = userEvent.setup();
    const s = choose(finishContact(undefined, AT, 0), 'investigate');
    const test = { n: 1, type: 'noBlank' as const, times: 3, period: 0, offeredAt: '2026-11-11T11:00:00.000Z', offeredOn: '2026-11-11' as never };
    await saveSetting(ctx.db, 'origen', { ...s, tests: [test] });
    renderRoutes(ctx, routes, '/mensajes/senal');
    expect(await screen.findByText(/Prueba 01\. Objetivo: registrar algo cada día, 3 días seguidos\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Rechazar' }));
    await waitFor(async () => expect((await loadSettings(ctx.db)).origen?.tests?.[0]?.result).toBe('rejected'));
    expect(await screen.findByText('Rechazo registrado.')).toBeInTheDocument();
  });
});
