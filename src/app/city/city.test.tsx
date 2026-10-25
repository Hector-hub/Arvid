// Spec 11 en la app: anuncio de llegadas (CV-04, AN-01), pantalla «Tu ciudad» (TC) y vecinos que hablan (VC).
import { act, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSetting, type DataContext } from '../../data/repository';
import { toLocalDate } from '../../domain/time/localDate';
import { renderRoutes, setupData } from '../test-utils';
import { CityScreen } from './CityScreen';
import { CityWatcher } from './CityWatcher';
import { NeighborTalk } from './NeighborTalk';

const level = vi.hoisted(() => ({ value: 1 }));
vi.mock('../analysis', async (original) => ({
  ...(await original<typeof import('../analysis')>()),
  useAnalysis: () => ({ progress: { level: level.value } }),
}));
const speak = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../arvid/voice', async (original) => ({ ...(await original<typeof import('../arvid/voice')>()), speak }));
const engine = vi.hoisted(() => ({ seen: undefined as ((type: number) => void) | undefined, said: vi.fn(() => true), city: vi.fn() }));
vi.mock('../scene/engine', async (original) => ({
  ...(await original<typeof import('../scene/engine')>()),
  setCity: engine.city,
  neighborSay: engine.said,
  isTalking: () => false,
  onNeighborSeen: (l: (type: number) => void) => {
    engine.seen = l;
    return () => undefined;
  },
}));

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  speak.mockClear();
  engine.said.mockClear();
  engine.city.mockClear();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.db.delete();
});

describe('anuncios (CV-04, AN-01)', () => {
  it('usuario actual: todo lo de su nivel y una sola frase de bienvenida', async () => {
    level.value = 6;
    await saveSetting(ctx.db, 'lastCelebratedLevel', 6);
    renderRoutes(ctx, [{ path: '/', element: <CityWatcher /> }], '/');
    await waitFor(() => expect(speak).toHaveBeenCalledWith(expect.stringMatching(/Tu ciudad ahora crece contigo/)), { timeout: 4000 });
    expect(engine.city).toHaveBeenCalledWith(6);
    expect((await loadSettings(ctx.db)).cityAnnounced).toBe(6);
  });

  it('al subir de nivel, tras cerrar el aviso, el compañero anuncia lo que llega', async () => {
    level.value = 4;
    await saveSetting(ctx.db, 'cityAnnounced', 3);
    await saveSetting(ctx.db, 'lastCelebratedLevel', 4);
    renderRoutes(ctx, [{ path: '/', element: <CityWatcher /> }], '/');
    await waitFor(() => expect(speak).toHaveBeenCalledWith('¡Novedades en tu calle! Han llegado los coches y Lía, que vuelve del trabajo.'), { timeout: 4000 });
    expect(engine.city).toHaveBeenCalledWith(4, ['cars', 'lia']);
  });

  it('mientras el aviso de nivel sigue abierto, espera', async () => {
    level.value = 4;
    await saveSetting(ctx.db, 'cityAnnounced', 3);
    await saveSetting(ctx.db, 'lastCelebratedLevel', 3);
    renderRoutes(ctx, [{ path: '/', element: <CityWatcher /> }], '/');
    await waitFor(() => expect(engine.city).toHaveBeenCalledWith(3));
    expect(speak).not.toHaveBeenCalled();
  });
});

describe('Tu ciudad (TC)', () => {
  it('muestra el avance, lo desbloqueado y lo que falta con su nivel', async () => {
    level.value = 3;
    renderRoutes(ctx, [{ path: '/perfil/ciudad', element: <CityScreen /> }], '/perfil/ciudad');
    expect(await screen.findByText(/5 de 17 · Siguiente: nivel 4/)).toBeInTheDocument();
    expect(screen.getByText('Farolas')).toBeInTheDocument();
    expect(screen.getByText('Dex')).toBeInTheDocument();
    expect(screen.queryByText('Sombra')).toBeNull();
    expect(screen.getByText('Nivel 10')).toBeInTheDocument();
  });
});

describe('vecinos que hablan (VC-02, VC-07)', () => {
  it('con suerte, el vecino desbloqueado dice una frase fija sin IA, y no habla otro ese día', async () => {
    level.value = 2;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderRoutes(ctx, [{ path: '/', element: <NeighborTalk /> }], '/');
    await waitFor(() => expect(engine.seen).toBeDefined());
    // Hasta que cargan los ajustes, el aviso no hace nada: se repite como haría la escena con otros peatones
    await waitFor(async () => {
      await act(async () => engine.seen!(4)); // Dex
      expect(engine.said).toHaveBeenCalledTimes(1);
    });
    expect((engine.said.mock.calls[0] as unknown as [number])[0]).toBe(4);
    expect((engine.said.mock.calls[0] as unknown as [number, string[][]])[1].flat().join(' ')).toMatch(/^Dex: Esta canción/);
    await waitFor(async () => expect((await loadSettings(ctx.db)).neighborSpoke).toBe(toLocalDate(new Date())));
    await act(async () => engine.seen!(4));
    expect(engine.said).toHaveBeenCalledTimes(1);
  });

  it('un vecino aún no desbloqueado no habla', async () => {
    level.value = 2;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    renderRoutes(ctx, [{ path: '/', element: <NeighborTalk /> }], '/');
    await waitFor(() => expect(engine.seen).toBeDefined());
    await new Promise((r) => setTimeout(r, 100)); // ajustes cargados
    await act(async () => engine.seen!(1)); // Sombra (nivel 10)
    await new Promise((r) => setTimeout(r, 50));
    expect(engine.said).not.toHaveBeenCalled();
  });
});
