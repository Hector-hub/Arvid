// Deslizar para actualizar (D-185): tirar desde arriba y soltar descarga retos e invitaciones sin recargar.
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSetting, type DataContext } from '../../data/repository';
import { newDataKey } from '../../domain/account/crypto';
import { renderRoutes, setupData } from '../test-utils';
import { PullToRefresh } from './PullToRefresh';

function touch(type: string, y?: number) {
  const e = new Event(type, { bubbles: true });
  Object.defineProperty(e, 'touches', { value: y === undefined ? [] : [{ clientY: y }] });
  act(() => void document.body.dispatchEvent(e));
}

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  vi.stubEnv('VITE_ACCOUNTS', '1');
  await saveSetting(ctx.db, 'account', { id: 'luis-000-cuenta', alias: 'Luis', session: 's', dataKey: await newDataKey() });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('deslizar para actualizar', () => {
  it('tirar lo suficiente y soltar descarga retos e invitaciones', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      calls.push(url);
      return Promise.resolve(new Response(JSON.stringify(url.endsWith('invites') ? { invites: [] } : { challenges: [] }), { status: 200 }));
    }));
    renderRoutes(ctx, [{ path: '/hoy', element: <PullToRefresh /> }], '/hoy');
    await new Promise((r) => setTimeout(r, 100)); // la cuenta se lee de la base de datos
    touch('touchstart', 100);
    touch('touchmove', 140);
    expect(await screen.findByRole('status')).toHaveTextContent('Desliza para actualizar');
    touch('touchmove', 260);
    expect(screen.getByRole('status')).toHaveTextContent('Suelta para actualizar');
    touch('touchend');
    expect(await screen.findByText('Al día')).toBeInTheDocument();
    expect(calls).toEqual(['/api/social/challenges/mine', '/api/social/invites']);
  });

  it('si no se tira lo suficiente, no actualiza', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderRoutes(ctx, [{ path: '/hoy', element: <PullToRefresh /> }], '/hoy');
    await new Promise((r) => setTimeout(r, 50));
    touch('touchstart', 100);
    touch('touchmove', 150);
    touch('touchend');
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
