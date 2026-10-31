import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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
import { SettingsProfileScreen } from '../screens/ProfileSettingsScreen';
import { SoundScreen } from '../screens/SoundScreen';
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
    renderRoutes(ctx, [{ path: '/ajustes/perfil', element: <SettingsProfileScreen /> }], '/ajustes/perfil');
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
    expect(s.music).toEqual({ enabled: false, volume: 0.4, background: true });
  });

  it('valores desconocidos (asset retirado o backup manipulado) se normalizan', async () => {
    await ctx.db.settings.bulkPut([
      { key: 'avatar', value: { cast: 'robot', variant: 'neon' } },
      { key: 'music', value: { enabled: 'sí', volume: 7 } },
    ]);
    const s = await loadSettings(ctx.db);
    expect(s.avatar).toEqual({ cast: 'ella', variant: 'original' });
    expect(s.music).toEqual({ enabled: false, volume: 0.4, background: true });
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
    // La bocina abre la página Sonido (D-195) y se ve tachada mientras la música está apagada
    const music = await screen.findByRole('button', { name: 'Música' });
    expect(music).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('MUS-09: si la música quedó activada, la bocina lo muestra al volver a abrir la app', async () => {
    await saveSetting(ctx.db, 'music', { enabled: true, volume: 0.4, background: true } satisfies Settings['music']);
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    expect(await screen.findByRole('button', { name: 'Música' })).toBeInTheDocument();
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
  it('MUS-06, PS-01, D-195: la página Sonido muestra el reproductor apagado en la pista guardada y la lista de pistas', async () => {
    await saveSetting(ctx.db, 'music', { enabled: false, volume: 0.7, track: 'rain-on-the-expressway', background: true } satisfies Settings['music']);
    renderRoutes(ctx, [{ path: '/sonido', element: <SoundScreen /> }], '/sonido');
    expect(await screen.findByRole('button', { name: 'Reproducir' })).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText('Rain on the Expressway', { selector: '.player-track' })).toBeInTheDocument();
    expect(screen.queryByText('Música apagada')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pista anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pista siguiente' })).toBeInTheDocument();
    // Sin sonar no se puede saltar dentro de la pista
    expect(screen.getByRole('slider', { name: 'Progreso de la pista' })).toBeDisabled();
    // Las seis pistas con su portada y su duración; la guardada, resaltada
    expect(screen.getAllByRole('button', { name: /ARVID/ })).toHaveLength(6);
    expect(screen.getByRole('button', { name: /^Afterglow Avenue\s*ARVID\s*1:30$/ })).toBeInTheDocument();
    expect(document.querySelector('.sound-row.on')).toHaveTextContent('Rain on the Expressway');
  });

  it('PS-02 (spec 16): efectos encendidos y timbre Suave por defecto; se guardan al cambiarlos', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/sonido', element: <SoundScreen /> }], '/sonido');
    // Los ajustes de sonido van plegados, como un acordeón
    await user.click(await screen.findByText('Ajustes de sonido'));
    const effects = await screen.findByRole('checkbox', { name: 'Efectos de sonido' });
    expect(effects).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Suave' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Chiptune' }));
    await waitFor(async () => expect((await loadSettings(ctx.db)).sound.timbre).toBe('chip'));
    await user.click(effects);
    await waitFor(async () => expect((await loadSettings(ctx.db)).sound.effects).toBe(false));
    expect(screen.queryByRole('slider', { name: 'Volumen de los efectos' })).toBeNull();
  });

  it('D-155: los botones de la escena se ocultan y aparecen unos segundos al tocarla', async () => {
    // Reloj falso desde el principio: al abrir, los botones ya se muestran unos segundos (AM-11) con su propio temporizador
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
      await screen.findByRole('button', { name: 'Música' });
      const scene = document.querySelector('.scene')!;
      await act(() => vi.advanceTimersByTimeAsync(4100));
      expect(scene).not.toHaveClass('controls-shown');
      fireEvent.pointerDown(scene);
      expect(scene).toHaveClass('controls-shown');
      await act(() => vi.advanceTimersByTimeAsync(4100));
      expect(scene).not.toHaveClass('controls-shown');
    } finally {
      vi.useRealTimers();
    }
  });

  it('LIC-02: los créditos citan autor y licencia de cada recurso', async () => {
    renderRoutes(ctx, [{ path: '/ajustes/creditos', element: <CreditsScreen /> }], '/ajustes/creditos');
    expect(await screen.findByText(/Warped City/)).toBeInTheDocument();
    expect(screen.getAllByText(/CraftPix\.net · Licencia gratuita de CraftPix/)).toHaveLength(2);
    // Todas las pistas, una por línea, y el juego (D-162)
    for (const track of ['Midnight Sector Drive', 'Glass Tower Horizon', 'Black Chrome Horizon', 'Chrome Horizon Drive', 'Rain on the Expressway', 'Afterglow Avenue'])
      expect(screen.getByText(track)).toBeInTheDocument();
    expect(screen.getByText('CombinaDos')).toBeInTheDocument();
    expect(screen.getByText('hecrey · Propio')).toBeInTheDocument();
  });
});
