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
  it('linkPath reconoce enlaces de ARVID con o sin dominio, dentro de un mensaje o el código suelto', () => {
    expect(linkPath(`https://arvid-app.netlify.app/a/${ANA}`)).toBe(`/a/${ANA}`);
    expect(linkPath(` /a/${ANA}/ `)).toBe(`/a/${ANA}`);
    expect(linkPath(`Ana te invita https://arvid-app.netlify.app/a/${ANA} ¡vamos!`)).toBe(`/a/${ANA}`);
    expect(linkPath('3f2a9c1d-5b6e-4f70-8a9b-0c1d2e3f4a5b')).toBe('/a/3f2a9c1d-5b6e-4f70-8a9b-0c1d2e3f4a5b');
    expect(linkPath('hola')).toBeUndefined();
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

  it('AM-02/EN-10: sin cuenta, la invitación con «Registrarme» y «Copiar código»', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { id: ANA, alias: 'Ana' })));
    renderRoutes(ctx, routes, `/a/${ANA}`);
    expect(await screen.findByRole('heading', { name: 'Ana quiere ser tu amigo en ARVID' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrarme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copiar código de invitación' })).toBeInTheDocument();
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
    // Solicitud como fila (D-202): su alias y «Quiere ser tu amigo»
    expect(await screen.findByText('Leo')).toBeInTheDocument();
    expect(screen.getByText(/Quiere ser tu amigo/)).toBeInTheDocument();
    // Lista como las de Sonido (D-202): cada amigo con su inicial, nivel, código y retos juntos
    expect(screen.getByRole('heading', { name: '1 amigo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Eva/ })).toHaveTextContent('EEvaNv 7 · Código EVA-00000 retos juntos›');
    // Añadir va en una hoja que se abre con «+» (D-202)
    await user.click(screen.getByRole('button', { name: 'Añadir amigos' }));
    await user.type(screen.getByLabelText('Tengo un enlace o código de invitación'), `https://arvid-app.netlify.app/a/${ANA}`);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('heading', { name: 'Ana quiere ser tu amigo' })).toBeInTheDocument();
  });

  it('un enlace que no es de ARVID avisa', async () => {
    const user = userEvent.setup();
    await signIn();
    vi.stubGlobal('fetch', vi.fn(() => reply(200, { friends: [], requests: [], blocked: [] })));
    renderRoutes(ctx, routes, '/perfil/amigos');
    await user.click(await screen.findByRole('button', { name: 'Añadir amigos' }));
    await user.type(screen.getByLabelText('Tengo un enlace o código de invitación'), 'https://example.com/x');
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ese no parece un enlace de ARVID.');
  });
});

describe('buscador de amigos (AM-12)', () => {
  it('filtra por alias (sin acentos) o por código', async () => {
    const user = userEvent.setup();
    await signIn();
    vi.stubGlobal('fetch', vi.fn(() =>
      reply(200, { friends: [{ id: 'eva00000-cuenta', alias: 'Eva', level: 7, together: 0 }, { id: 'zed0beef-cuenta', alias: 'Zoé', level: 1, together: 0 }], requests: [], blocked: [] }),
    ));
    renderRoutes(ctx, routes, '/perfil/amigos');
    const search = await screen.findByRole('searchbox', { name: 'Buscar por alias o código' });
    await user.type(search, 'zoe');
    expect(screen.queryByRole('link', { name: /Eva/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Zoé/ })).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'EVA0');
    expect(screen.getByRole('link', { name: /Eva/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Zoé/ })).toBeNull();
  });
});
