import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessCode } from '../arvid/brain';
import { loadSettings, saveSetting, type DataContext } from '../../data/repository';
import { choose, finishContact } from '../../domain/origen/origen';
import { renderRoutes, setupData } from '../test-utils';
import { ChatsScreen, DossierScreen, NeighborChatScreen, SignalChatScreen } from './ChatsScreen';
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
  { path: '/mensajes/expediente', element: <DossierScreen /> },
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

  it('Expediente: desde el capítulo 2, con capítulos, pistas, pruebas y el porcentaje (EX-01 a EX-03)', async () => {
    const s = openChapter(choose(finishContact(undefined, AT, 0), 'investigate'), new Date('2026-11-18T10:00:00.000Z'), 80);
    const passed = { n: 1, type: 'noBlank' as const, times: 3, period: 1, offeredAt: AT.toISOString(), offeredOn: '2026-11-11' as never, result: 'passed' as const, resolvedAt: AT.toISOString() };
    await saveSetting(ctx.db, 'origen', { ...deliverStep(s, 'c2.dex', new Date('2026-11-18T10:00:05.000Z')), tests: [passed] });
    renderRoutes(ctx, routes, '/mensajes');
    expect(await screen.findByText('Expediente ORIGEN')).toBeInTheDocument();
    renderRoutes(ctx, routes, '/mensajes/expediente');
    // 2 capítulos × 3,5 + 1 fragmento = 8 %
    expect((await screen.findAllByText('Señal descifrada: 8 %')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Capítulo 2 · La melodía')).toBeInTheDocument();
    expect(screen.getByText('Capítulo 20 · ???')).toBeInTheDocument();
    expect(screen.getByText(/Dex tararea una melodía/)).toBeInTheDocument();
    expect(screen.getByText(/1 fragmento cifrado\. ARVID lo guarda/)).toBeInTheDocument();
    expect(screen.getByText('Superadas: 1 · No superadas: 0 · Rechazadas o sin respuesta: 0')).toBeInTheDocument();
  });

  it('Expediente: desde que Teo los abre, los fragmentos se leen; los que esperan a su capítulo siguen cifrados (PR-10)', async () => {
    let s = choose(finishContact(undefined, AT, 0), 'investigate');
    for (let c = 2; c <= 8; c++) s = openChapter(s, new Date(AT.getTime() + (c - 1) * 7 * 86_400_000), c * 100);
    const passed = (n: number) => ({ n, type: 'noBlank' as const, times: 3, period: 1, offeredAt: AT.toISOString(), offeredOn: '2026-11-11' as never, result: 'passed' as const, resolvedAt: AT.toISOString() });
    // 16 superadas: en el capítulo 8 salen las 15 primeras; la 16 es del 9
    s = { ...deliverStep(s, 'c8.teo2', new Date('2027-01-01T10:00:00.000Z')), tests: Array.from({ length: 16 }, (_, i) => passed(i + 1)) };
    await saveSetting(ctx.db, 'origen', s);
    renderRoutes(ctx, routes, '/mensajes/expediente');
    expect(await screen.findByText('Participante 4012. Abandonó el día 19.')).toBeInTheDocument();
    expect(screen.getByText('Participante 5603. Probabilidad máxima: 26 %. Abandonó el día 88.')).toBeInTheDocument();
    expect(screen.getByText('1 fragmento más, todavía cifrado.')).toBeInTheDocument();
    expect(screen.getByText('Capítulo 8 · El archivo')).toBeInTheDocument();
  });

  describe('hablar con un vecino (VI)', () => {
    const withDex = async () => {
      const s = openChapter(choose(finishContact(undefined, AT, 0), 'investigate'), new Date('2026-11-18T10:00:00.000Z'), 80);
      await saveSetting(ctx.db, 'origen', deliverStep(s, 'c2.dex', new Date('2026-11-18T10:00:05.000Z')));
    };
    afterEach(() => {
      vi.unstubAllGlobals();
      setAccessCode(undefined);
    });

    it('sin IA activada, en lugar del campo, el aviso (VI-05)', async () => {
      await withDex();
      renderRoutes(ctx, routes, '/mensajes/dex');
      expect(await screen.findByText('Para hablar con Dex, activa la IA con tu código en Ajustes → Compañero.')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('con código: envía, guarda la respuesta, cuenta los 3 del día y deja borrar solo lo tuyo (VI-01, ME-05)', async () => {
      const user = userEvent.setup();
      await withDex();
      await saveSetting(ctx.db, 'arvidAi', true);
      await saveSetting(ctx.db, 'aiCode', 'ARVID-ANA-XXXX');
      setAccessCode('ARVID-ANA-XXXX');
      const fetch = vi.fn(async () => new Response(JSON.stringify({ reply: 'Ni idea, se me pegó.', left: 2 }), { status: 200 }));
      vi.stubGlobal('fetch', fetch);
      renderRoutes(ctx, routes, '/mensajes/dex');
      expect(await screen.findByText('Te quedan 3 mensajes con Dex hoy')).toBeInTheDocument();
      await user.type(screen.getByRole('textbox', { name: 'Escribe a Dex…' }), '¿De dónde la sacaste?');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));
      expect(await screen.findByText('Ni idea, se me pegó.')).toBeInTheDocument();
      expect(screen.getByText('Te quedan 2 mensajes con Dex hoy')).toBeInTheDocument();
      const sent = JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
      expect(sent).toMatchObject({ moment: 'neighborChat', neighbor: 'dex', chapter: 2 });
      expect(sent.messages.at(-1)).toEqual({ role: 'user', content: '¿De dónde la sacaste?' });
      expect(Object.keys(sent.context).sort()).toEqual(['alias', 'daysInTheNeighborhood', 'didEverythingToday', 'title']);
      expect(sent.memory).toBeUndefined();
      expect(screen.getAllByRole('button', { name: 'Eliminar mi mensaje' })).toHaveLength(1);
      await user.click(screen.getByRole('button', { name: 'Eliminar mi mensaje' }));
      await waitFor(() => expect(screen.queryByText('¿De dónde la sacaste?')).toBeNull());
      expect(screen.getByText('Ni idea, se me pegó.')).toBeInTheDocument();
    });
  });
});

