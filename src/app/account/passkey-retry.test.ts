// D-192: si el teléfono rechaza el PRF al crear la passkey, se reintenta sin él; cancelar no se reintenta.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupData } from '../test-utils';
import { newDataKey } from '../../domain/account/crypto';
import type { DataContext } from '../../data/repository';

const startRegistration = vi.fn();
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: (...a: unknown[]) => startRegistration(...a),
  startAuthentication: vi.fn(),
  browserSupportsWebAuthn: () => true,
}));

const reply = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
let ctx: DataContext;
beforeEach(async () => {
  ctx = await setupData();
  startRegistration.mockReset();
  vi.stubGlobal('fetch', vi.fn((url: string) => reply(url.endsWith('options') ? { challengeId: 'c1', options: { challenge: 'x' } } : { ok: true })));
});
afterEach(() => vi.unstubAllGlobals());

const account = async () => ({ id: 'acc-1', alias: 'H', session: 's', dataKey: await newDataKey(), viaRecovery: true });

describe('crear passkey (D-192)', () => {
  it('si el teléfono rechaza el PRF, se reintenta sin él', async () => {
    const { addPasskey } = await import('./account');
    startRegistration.mockRejectedValueOnce(Object.assign(new Error('prf'), { name: 'NotSupportedError' })).mockResolvedValueOnce({ id: 'cred', clientExtensionResults: {} });
    await addPasskey(ctx, await account());
    expect(startRegistration).toHaveBeenCalledTimes(2);
    expect(startRegistration.mock.calls[0]![0].optionsJSON.extensions.prf).toBeDefined();
    expect(startRegistration.mock.calls[1]![0].optionsJSON.extensions).toBeUndefined();
  });

  it('cancelar el diálogo del sistema no se reintenta', async () => {
    const { addPasskey } = await import('./account');
    startRegistration.mockRejectedValueOnce(Object.assign(new Error('cancel'), { name: 'NotAllowedError' }));
    await expect(addPasskey(ctx, await account())).rejects.toThrow('cancel');
    expect(startRegistration).toHaveBeenCalledTimes(1);
  });
});
