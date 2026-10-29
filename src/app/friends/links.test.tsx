// Amigos en la app (spec 15, 15a): el enlace `/a/:id`, «Tengo un enlace» y la lista. La API se simula con `fetch`.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveSetting, type DataContext } from '../../data/repository';
import { newDataKey } from '../../domain/account/crypto';
import { renderRoutes, setupData } from '../test-utils';
import { FriendLinkScreen } from './FriendLinkScreen';
import { FriendsScreen } from './FriendsScreen';
import { linkPath } from './friends';

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const ANA = 'ana-0000-cuenta';

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  vi.stubEnv('VITE_ACCOUNTS', '1');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const signIn = async () => saveSetting(ctx.db, 'account', { id: 'luis-000-cuenta', alias: 'Luis', session: 's', dataKey: await newDataKey() });

const routes = [
  { path: '/a/:id', element: <FriendLinkScreen /> },
  { path: '/perfil/amigos', element: <FriendsScreen /> },
];

describe('enlaces de amistad (EN-01, AM-02)', () => {
  it('linkPath reconoce enlaces de ARVID con o sin dominio', () => {
    expect(linkPath(`https://arvid-app.netlify.app/a/${ANA}`)).toBe(`/a/${ANA}`);
    expect(linkPath(` /a/${ANA}/ `)).toBe(`/a/${ANA}`);
    expect(linkPath('https://example.com/otra')).toBeUndefined();
  });

  it('abrir /a/:id muestra «Ana quiere ser tu amigo» y aceptar os hace amigos', async () => {
    const user = userEvent.setup();
    await signIn();
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      calls.push(`${init.method} ${url}`);
      if (url.endsWith(`profile/${ANA}`)) return reply(200, { id: ANA, alias: 'Ana', level: 4, friend: false });
      if (url.endsWith('accept')) return reply(200, { ok: true });
      return reply(404, {});
    }));
    renderRoutes(ctx, routes, `/a/${ANA}`);
    expect(await screen.findByRole('heading', { name: 'Ana quiere ser tu amigo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(await screen.findByRole('heading', { name: 'Ahora sois amigos: tú y Ana' })).toBeInTheDocument();
    expect(calls).toContain('POST /api/social/accept');
  });

  it('IN-05: un enlace bloqueado no está disponible', async () => {
    await signIn();
    vi.stubGlobal('fetch', vi.fn(() => reply(404, { error: 'unavailable' })));
    renderRoutes(ctx, routes, `/a/${ANA}`);
    expect(await screen.findByRole('heading', { name: 'Este enlace no está disponible' })).toBeInTheDocument();
  });

  it('AM-02: sin cuenta, primero se ofrece crearla', async () => {
    renderRoutes(ctx, routes, `/a/${ANA}`);
    expect(await screen.findByText(/Primero crea tu cuenta/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Cuenta' })).toBeInTheDocument();
  });
});

describe('Perfil → Amigos (AM-04, AM-07, EN-03)', () => {
  it('muestra solicitudes y amigos; «Tengo un enlace» abre la invitación', async () => {
    const user = userEvent.setup();
    await signIn();
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.endsWith('friends'))
        return reply(200, { friends: [{ id: 'eva-0000-cuenta', alias: 'Eva', level: 7, together: 0 }], requests: [{ id: 'leo-0000-cuenta', alias: 'Leo', level: 2 }], blocked: [] });
      if (url.endsWith(`profile/${ANA}`)) return reply(200, { id: ANA, alias: 'Ana', level: 4 });
      return reply(404, {});
    }));
    renderRoutes(ctx, routes, '/perfil/amigos');
    expect(await screen.findByText('Leo quiere ser tu amigo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 amigo' })).toBeInTheDocument();
    expect(screen.getByText('Eva')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Tengo un enlace'), `https://arvid-app.netlify.app/a/${ANA}`);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('heading', { name: 'Ana quiere ser tu amigo' })).toBeInTheDocument();
  });

  it('un enlace que no es de ARVID avisa', async () => {
    const user = userEvent.setup();
    await signIn();
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { friends: [], requests: [], blocked: [] })));
    renderRoutes(ctx, routes, '/perfil/amigos');
    await user.type(await screen.findByLabelText('Tengo un enlace'), 'https://example.com/x');
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese no parece un enlace de ARVID.');
  });
});
