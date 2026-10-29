// D-190: la copia en la nube solo queda pendiente por cambios del usuario; no por lo que escribe la propia cuenta al
// restaurar ni por la copia local de los retos.
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildBackup } from '../../data/backup';
import { createActivity, loadCategories, saveSetting, type DataContext } from '../../data/repository';
import { encryptBackup, newDataKey } from '../../domain/account/crypto';
import { DataProvider } from '../data';
import { setupData } from '../test-utils';
import { resetCloud, restore, setCloud, type DeviceAccount } from './account';
import { CloudBackupWatcher } from './CloudBackupWatcher';

const cloud = () => JSON.parse(localStorage.getItem('arvid-cloud') ?? '{}') as { dirty?: boolean };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

let ctx: DataContext;
let account: DeviceAccount;
beforeEach(async () => {
  ctx = await setupData();
  resetCloud();
  vi.stubEnv('VITE_ACCOUNTS', '1');
  account = { id: 'acc-1', alias: 'H', session: 's', dataKey: await newDataKey() };
  await saveSetting(ctx.db, 'account', account);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountWatcher() {
  render(
    <DataProvider value={ctx}>
      <CloudBackupWatcher />
    </DataProvider>,
  );
  await pause(100); // el vigilante se suscribe cuando la cuenta se lee de la base de datos
}

describe('copia pendiente solo por cambios del usuario (D-190)', () => {
  it('restaurar la copia de la nube no la deja «pendiente de subir»; un cambio del usuario después, sí', async () => {
    const other = await setupData();
    const data = await encryptBackup(account.dataKey, JSON.stringify(await buildBackup(other.db, '1.9.9', new Date())));
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ version: 3, data }), { status: 200 }))));
    await mountWatcher();
    setCloud({ dirty: false });
    expect(await restore(ctx, account)).toBe('restored');
    // En el teléfono los avisos de cambio de la restauración llegan un poco después: se simula con una escritura más
    // dentro de la ventana de la cuenta
    await saveSetting(ctx.db, 'lastBackupAt', new Date().toISOString());
    await pause(300);
    expect(cloud().dirty).toBe(false);
    // Pasada la ventana de la cuenta, un cambio del usuario sí la marca
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000);
    const categoryId = (await loadCategories(ctx.db))[0]!.id;
    await createActivity(ctx, { name: 'Leer', config: { period: 'day', target: 1, difficulty: 'easy', categoryId } });
    await waitFor(() => expect(cloud().dirty).toBe(true));
  });

  it('guardar la copia local de un reto no la marca pendiente', async () => {
    await mountWatcher();
    setCloud({ dirty: false });
    await ctx.db.challenges.put({
      id: 'r1',
      view: { challenge: { id: 'r1', owner: 'acc-1', name: 'Leer', difficulty: 'easy', days: 7, start: '2026-10-29', mode: 'coop', createdAt: '' }, participants: [] },
      fetchedAt: new Date().toISOString(),
    });
    await pause(300);
    expect(cloud().dirty).toBe(false);
  });
});
