// Cuenta en la app (spec 14, 14c): panel de Ajustes, clave de recuperación, entrar y restaurar, conflicto y copia
// pendiente. La API se simula con `fetch`; el cifrado es el real.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBackup } from '../../data/backup';
import { createActivity, loadCategories, loadSettings, type DataContext } from '../../data/repository';
import { deriveRecovery, encryptBackup, newDataKey, newRecoveryKey, wrapDataKey } from '../../domain/account/crypto';
import { SettingsAccountScreen } from '../screens/SettingsScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { saveSetting } from '../../data/repository';
import { renderRoutes, setupData } from '../test-utils';
import { resetCloud, setCloud, uploadBackup } from './account';

const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  resetCloud();
  vi.stubEnv('VITE_ACCOUNTS', '1');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function addActivity(c: DataContext, name: string) {
  const categoryId = (await loadCategories(c.db))[0]!.id;
  await createActivity(c, { name, config: { period: 'day', target: 1, difficulty: 'easy', categoryId } });
}

describe('Ajustes → Cuenta', () => {

  it('CU-02/CU-04: sin passkeys se crea con la clave, que se muestra una vez y obliga a marcar que se guardó', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      calls.push(`${init.method} ${url}`);
      if (url.endsWith('register/recovery')) return reply(200, { accountId: 'acc-1', session: 'sesion' });
      if (url.endsWith('backup')) return reply(200, { version: 1, updatedAt: new Date().toISOString() });
      return reply(404, {});
    }));
    renderRoutes(ctx, [{ path: '/ajustes/cuenta', element: <SettingsAccountScreen /> }], '/ajustes/cuenta');
    await user.click(await screen.findByRole('button', { name: 'Crear con clave de recuperación' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tu clave de recuperación' });
    expect(dialog).toHaveTextContent(/ARVID(-[0-9A-Z]{3,4}){7}/);
    const go = screen.getByRole('button', { name: 'Continuar' });
    expect(go).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'La he guardado' }));
    await user.click(go);
    expect(calls).toEqual(['POST /api/account/register/recovery', 'PUT /api/account/backup']);
    expect((await loadSettings(ctx.db)).account).toMatchObject({ id: 'acc-1', session: 'sesion', viaRecovery: true });
    expect(await screen.findByText(/Copia al día/)).toBeInTheDocument();
  });

  it('RC-04/RC-05: entrar con la clave en un teléfono con datos pide confirmar y sustituye por los de la cuenta', async () => {
    const user = userEvent.setup();
    // La cuenta: una copia con «Leer», cifrada con su clave de datos
    const other = await setupData();
    await addActivity(other, 'Leer');
    const key = newRecoveryKey();
    const { auth, wrap } = await deriveRecovery(key.bytes);
    const dataKey = await newDataKey();
    const data = await encryptBackup(dataKey, JSON.stringify(await buildBackup(other.db, '1.8.6', new Date())));
    const wrapped = await wrapDataKey(dataKey, wrap);
    vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
      if (url.endsWith('login/recovery')) return reply(JSON.parse(init.body as string).auth === auth ? 200 : 401, { accountId: 'acc-9', alias: 'Ana', session: 's9', wrapped: { recovery: wrapped } });
      if (url.endsWith('backup')) return reply(200, { version: 4, data });
      return reply(404, {});
    }));
    // Este teléfono ya tiene «Caminar»
    await addActivity(ctx, 'Caminar');
    renderRoutes(ctx, [{ path: '/ajustes/cuenta', element: <SettingsAccountScreen /> }], '/ajustes/cuenta');
    await user.click(await screen.findByRole('button', { name: 'Ya tengo cuenta' }));
    await user.type(screen.getByRole('textbox', { name: 'Clave de recuperación' }), key.text.toLowerCase());
    await user.click(screen.getByRole('button', { name: 'Entrar con la clave' }));
    await user.click(await screen.findByRole('button', { name: 'Sustituir por mi cuenta' }));
    expect(await screen.findByText('Listo: tu progreso está en este dispositivo.')).toBeInTheDocument();
    expect((await ctx.db.activities.toArray()).map((a) => a.name)).toEqual(['Leer']);
    expect((await loadSettings(ctx.db)).account).toMatchObject({ id: 'acc-9', alias: 'Ana' });
  });

  it('RC-06: una clave mal escrita no llega al servidor', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => reply(404, {}));
    vi.stubGlobal('fetch', fetchMock);
    renderRoutes(ctx, [{ path: '/ajustes/cuenta', element: <SettingsAccountScreen /> }], '/ajustes/cuenta');
    await user.click(await screen.findByRole('button', { name: 'Ya tengo cuenta' }));
    await user.type(screen.getByRole('textbox', { name: 'Clave de recuperación' }), 'ARVID-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAA');
    await user.click(screen.getByRole('button', { name: 'Entrar con la clave' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esa clave no es válida.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('copia en la nube', () => {
  const account = async () => ({ id: 'acc-1', alias: 'H', session: 's', dataKey: await newDataKey() });

  it('CP-05: si otro dispositivo subió antes, se ofrece elegir la copia', async () => {
    vi.stubGlobal('fetch', vi.fn(() => reply(409, { error: 'conflict', version: 3 })));
    await ctx.db.settings.put({ key: 'account', value: await account() });
    renderRoutes(ctx, [{ path: '/ajustes/cuenta', element: <SettingsAccountScreen /> }], '/ajustes/cuenta');
    await uploadBackup(ctx, (await loadSettings(ctx.db)).account!);
    expect(await screen.findByText('Otro dispositivo subió una copia más nueva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar la de este teléfono' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar la de la nube' })).toBeInTheDocument();
  });

  it('CP-02/NFR14-02: sin conexión queda pendiente, sin llamar al servidor', async () => {
    const fetchMock = vi.fn(() => reply(200, {}));
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    setCloud({ dirty: false });
    await uploadBackup(ctx, await account());
    expect(fetchMock).not.toHaveBeenCalled();
    const { useCloud } = await import('./account');
    expect(useCloud).toBeDefined();
    await waitFor(() => expect(JSON.parse(localStorage.getItem('arvid-cloud')!)).toMatchObject({ dirty: true, error: 'offline' }));
    vi.restoreAllMocks();
  });
});

describe('ofrecer la cuenta (CU-01)', () => {
  it('a quien ya usaba la app se le ofrece una vez en Hoy; «Ahora no» no la vuelve a mostrar', async () => {
    const user = userEvent.setup();
    await saveSetting(ctx.db, 'onboardingCompletedAt', new Date().toISOString());
    renderRoutes(ctx, [{ path: '/hoy', element: <TodayScreen /> }], '/hoy');
    const card = await screen.findByRole('region', { name: 'Guarda tu progreso' });
    expect(card).toHaveTextContent('Sin email ni contraseña');
    await user.click(screen.getByRole('button', { name: 'Ahora no' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Guarda tu progreso' })).toBeNull());
    expect((await loadSettings(ctx.db)).accountOffered).toBe(true);
  });

});
