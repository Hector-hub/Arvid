import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createActivity,
  loadCategories,
  loadSettings,
  saveSetting,
  type DataContext,
  type Settings,
} from '../../data/repository';
import { renderRoutes, setupData } from '../test-utils';
import { CreditsScreen } from '../screens/CreditsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { celebrate } from './engine';

vi.mock('../../pwa/platform', () => ({
  needsInstallForSafety: () => false,
  isIOS: () => false,
  currentPersistState: () => Promise.resolve('granted'),
  requestPersistentStorage: () => Promise.resolve('granted'),
}));

vi.mock('./engine', async (original) => ({ ...(await original<typeof import('./engine')>()), celebrate: vi.fn() }));

let ctx: DataContext;

beforeEach(async () => {
  ctx = await setupData();
  vi.mocked(celebrate).mockClear();
});

afterEach(async () => {
  await ctx.db.delete();
});

describe('protagonista (PRO)', () => {
  it('PRO-03: elegir personaje y color seguidos guarda ambos', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    await user.click(await screen.findByRole('radio', { name: /^Drifter,/ }));
    await user.click(screen.getByRole('radio', { name: 'Ocaso' }));
    await waitFor(async () => expect((await loadSettings(ctx.db)).avatar).toEqual({ cast: 'el2', variant: 'ocaso' }));
    expect(screen.getByRole('radio', { name: /^Drifter,/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ocaso' })).toBeChecked();
  });
});

describe('ajustes guardados (§5)', () => {
  it('sin protagonista ni música guardados (backup de la 0.4.0) se usan los valores por defecto', async () => {
    const s = await loadSettings(ctx.db);
    expect(s.avatar).toEqual({ cast: 'ella', variant: 'original' });
    expect(s.music).toEqual({ enabled: false, volume: 0.4 });
  });

  it('valores desconocidos (asset retirado o backup manipulado) se normalizan', async () => {
    await ctx.db.settings.bulkPut([
      { key: 'avatar', value: { cast: 'robot', variant: 'neon' } },
      { key: 'music', value: { enabled: 'sí', volume: 7 } },
    ]);
    const s = await loadSettings(ctx.db);
    expect(s.avatar).toEqual({ cast: 'ella', variant: 'original' });
    expect(s.music).toEqual({ enabled: false, volume: 0.4 });
  });
});

describe('escena en Hoy', () => {
  async function addCaminar() {
    const categoryId = (await loadCategories(ctx.db)).find((c) => c.name === 'Cuerpo')!.id;
    await createActivity(ctx, { name: 'Caminar', config: { period: 'day', target: 2, difficulty: 'medium', categoryId } });
  }

  it('UB-01: la escena y la fecha encabezan Hoy; la música empieza desactivada (MUS-01)', async () => {
    await addCaminar();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    const music = await screen.findByRole('button', { name: 'Música' });
    expect(music).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('PAR-01/PAR-04: registrar lanza partículas; deshacer, no', async () => {
    await addCaminar();
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    await user.click(await screen.findByRole('button', { name: 'Registrar Caminar' }));
    await waitFor(() => expect(celebrate).toHaveBeenCalledWith('small'));
    const undo = await screen.findByRole('button', { name: 'Deshacer Caminar' });
    await waitFor(() => expect(undo).toBeEnabled()); // bloqueo antidoble toque (LOG-06)
    await user.click(undo);
    await screen.findByText(/Registro deshecho/);
    expect(celebrate).toHaveBeenCalledTimes(1);
  });
});

describe('sonido y créditos', () => {
  it('MUS-06: Ajustes → Sonido muestra la música apagada y el volumen guardado', async () => {
    await saveSetting(ctx.db, 'music', { enabled: false, volume: 0.7 } satisfies Settings['music']);
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    expect(await screen.findByRole('checkbox', { name: /Música de fondo/ })).not.toBeChecked();
    expect(screen.getByRole('slider', { name: 'Volumen' })).toHaveValue('0.7');
  });

  it('LIC-02: los créditos citan autor y licencia de cada recurso', async () => {
    renderRoutes(ctx, [{ path: '/ajustes/creditos', element: <CreditsScreen /> }], '/ajustes/creditos');
    expect(await screen.findByText(/Warped City/)).toBeInTheDocument();
    expect(screen.getAllByText(/CraftPix\.net · Licencia gratuita de CraftPix/)).toHaveLength(2);
    expect(screen.getByText(/Midnight Sector Drive/)).toBeInTheDocument();
  });
});
