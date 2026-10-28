import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, type DataContext } from '../../data/repository';
import { SettingsScreen } from '../screens/SettingsScreen';
import { renderRoutes, setupData } from '../test-utils';
import { MusicPlayer } from './player';
import { TRACKS } from './tracks';

/** Oculta o muestra la app y avisa como el navegador. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('música en segundo plano (D-163)', () => {
  let play: ReturnType<typeof vi.fn>;
  let pause: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    play = vi.fn(() => Promise.resolve());
    pause = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play as never);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause as never);
  });
  afterEach(() => {
    setHidden(false);
    vi.restoreAllMocks();
  });

  it('en segundo plano sigue sonando al ocultar la app', async () => {
    const p = new MusicPlayer(TRACKS, 0.5, () => undefined, undefined, () => undefined, true);
    await p.start();
    expect(play).toHaveBeenCalled();
    setHidden(true);
    expect(pause).not.toHaveBeenCalled();
    p.destroy();
  });

  it('en primer plano se pausa al ocultar la app (MUS-05)', async () => {
    const p = new MusicPlayer(TRACKS, 0.5, () => undefined, undefined, () => undefined, false);
    await p.start();
    setHidden(true);
    expect(pause).toHaveBeenCalled();
    p.destroy();
  });
});

describe('ajustes y pantalla de bloqueo (D-163)', () => {
  let ctx: DataContext;
  const handlers = new Map<string, unknown>();
  beforeEach(async () => {
    ctx = await setupData();
    handlers.clear();
    Object.defineProperty(navigator, 'mediaSession', {
      configurable: true,
      value: { setActionHandler: (action: string, h: unknown) => handlers.set(action, h), playbackState: 'none', metadata: null },
    });
  });
  afterEach(() => {
    delete (navigator as { mediaSession?: unknown }).mediaSession;
  });

  it('el interruptor viene encendido, se guarda al cambiarlo y los controles de bloqueo quedan registrados', async () => {
    const user = userEvent.setup();
    renderRoutes(ctx, [{ path: '/ajustes', element: <SettingsScreen /> }], '/ajustes');
    const toggle = await screen.findByRole('checkbox', { name: 'Seguir sonando al salir de la app' });
    expect(toggle).toBeChecked();
    expect([...handlers.keys()]).toEqual(expect.arrayContaining(['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']));
    await user.click(toggle);
    await waitFor(async () => expect((await loadSettings(ctx.db)).music.background).toBe(false));
  });
});
