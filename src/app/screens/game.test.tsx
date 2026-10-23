import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSetting, type DataContext } from '../../data/repository';
import { renderRoutes, setupData } from '../test-utils';
import { GameScreen } from './GameScreen';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
});
afterEach(async () => {
  vi.restoreAllMocks();
  await ctx.db.delete();
});

const page = () => renderRoutes(ctx, [{ path: '/juego', element: <GameScreen /> }], '/juego');

describe('GameScreen (spec 09)', () => {
  it('JG-02: con conexión muestra el juego desde su sitio y el botón de pantalla completa', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    page();
    expect(await screen.findByTitle('CombinaDos')).toHaveAttribute('src', 'https://velvety-pasca-9a2e5c.netlify.app/');
    expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeInTheDocument();
  });

  it('JG-03: sin conexión muestra el aviso en lugar del juego', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    page();
    expect(await screen.findByText(/necesita conexión/)).toBeInTheDocument();
    expect(screen.queryByTitle('CombinaDos')).toBeNull();
  });

  it('JG-08: con los juegos desactivados, /juego lleva a Hoy', async () => {
    await saveSetting(ctx.db, 'games', false);
    renderRoutes(ctx, [{ path: '/juego', element: <GameScreen /> }, { path: '/hoy', element: <p>Pantalla Hoy</p> }], '/juego');
    expect(await screen.findByText('Pantalla Hoy')).toBeInTheDocument();
    expect(screen.queryByTitle('CombinaDos')).toBeNull();
  });
});
