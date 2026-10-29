// @vitest-environment node
// Servidor de la cuenta (spec 14) con almacenes en memoria y passkeys simuladas (NFR14-05).
import { beforeEach, describe, expect, it } from 'vitest';
import { handle, type Deps, type WebAuthn } from '../../../netlify/functions/account.mts';
import { verifySession, type Account, type AccountStores, type KV } from '../../../netlify/lib/account.mts';
import { deriveRecovery, encryptBackup, newDataKey, newRecoveryKey, wrapDataKey } from '../../domain/account/crypto';

const SECRET = 'secreto-de-prueba';

function memory<T>(): KV<T> & { map: Map<string, T> } {
  const map = new Map<string, T>();
  return {
    map,
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, structuredClone(v)),
    delete: async (k) => void map.delete(k),
  };
}

/** Passkeys simuladas: «firma» válida si la respuesta trae `ok: true`. */
const fakeWebAuthn: WebAuthn = {
  registrationOptions: (async () => ({ challenge: 'reto-registro' })) as never,
  authenticationOptions: (async () => ({ challenge: 'reto-entrar' })) as never,
  verifyRegistration: (async ({ response }: { response: { id: string; ok?: boolean } }) =>
    response.ok
      ? { verified: true, registrationInfo: { credential: { id: response.id, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] } } }
      : { verified: false }) as never,
  verifyAuthentication: (async ({ response }: { response: { ok?: boolean } }) =>
    response.ok ? { verified: true, authenticationInfo: { newCounter: 1 } } : { verified: false }) as never,
};

let stores: AccountStores & Record<keyof AccountStores, { map: Map<string, unknown> }>;
let now: number;
let ids: number;
let deps: Deps;

beforeEach(() => {
  stores = {
    accounts: memory(),
    credentials: memory(),
    recovery: memory(),
    backups: memory(),
    challenges: memory(),
    limits: memory(),
  } as never;
  now = Date.UTC(2026, 9, 28, 12);
  ids = 0;
  deps = { stores, webauthn: fakeWebAuthn, now: () => now, secret: SECRET, newId: () => `id-${++ids}` };
});

/** Lo que responde la API (solo lo que miran las pruebas). */
interface Reply {
  error?: string;
  accountId?: string;
  alias?: string;
  session?: string;
  challengeId?: string;
  version?: number;
  data?: string;
  wrapped?: { recovery?: string; prf?: string };
}

async function call(method: string, route: string, body?: unknown, session?: string, ip = '1.2.3.4') {
  const req = new Request(`https://arvid-app.netlify.app/api/account/${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-nf-client-connection-ip': ip, ...(session ? { Authorization: `Bearer ${session}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await handle(req, deps);
  return { status: res.status, body: (await res.json()) as Reply };
}

async function recoveryFor() {
  const key = newRecoveryKey();
  const { auth, wrap } = await deriveRecovery(key.bytes);
  const dataKey = await newDataKey();
  return { key, auth, wrap, dataKey, wrapped: await wrapDataKey(dataKey, wrap) };
}

async function register(cred = 'cred-1', alias = 'Hector') {
  const r = await recoveryFor();
  const opts = await call('POST', 'register/options', { alias });
  const res = await call('POST', 'register/verify', {
    challengeId: opts.body.challengeId,
    response: { id: cred, ok: true },
    recovery: { auth: r.auth, wrapped: r.wrapped },
    prfWrapped: 'prf-envuelta',
  });
  return { ...r, res };
}

describe('crear y entrar (CU-02, RC-02, RC-04)', () => {
  it('crea la cuenta con passkey: sesión válida, credencial y clave envuelta; nada en claro', async () => {
    const { res, wrapped } = await register();
    expect(res.status).toBe(200);
    expect(verifySession(res.body.session, SECRET, now)).toBe(res.body.accountId);
    const account = stores.accounts.map.get(res.body.accountId!) as Account;
    expect(account).toMatchObject({ alias: 'Hector', credentials: ['cred-1'], wrapped: { recovery: wrapped, prf: { 'cred-1': 'prf-envuelta' } } });
    expect(JSON.stringify([...stores.accounts.map.values()])).not.toMatch(/auth"/);
  });

  it('un reto se usa una sola vez y caduca a los 5 min', async () => {
    const r = await recoveryFor();
    const opts = await call('POST', 'register/options', { alias: 'H' });
    now += 6 * 60_000;
    const late = await call('POST', 'register/verify', { challengeId: opts.body.challengeId, response: { id: 'c', ok: true }, recovery: { auth: r.auth, wrapped: r.wrapped } });
    expect(late.status).toBe(400);
  });

  it('una passkey que no verifica no crea nada', async () => {
    const r = await recoveryFor();
    const opts = await call('POST', 'register/options', { alias: 'H' });
    const res = await call('POST', 'register/verify', { challengeId: opts.body.challengeId, response: { id: 'c', ok: false }, recovery: { auth: r.auth, wrapped: r.wrapped } });
    expect(res.status).toBe(401);
    expect(stores.accounts.map.size).toBe(0);
  });

  it('entrar con la passkey devuelve la sesión y las claves envueltas de esa passkey', async () => {
    const { res: created, wrapped } = await register();
    const opts = await call('POST', 'login/options', {});
    const res = await call('POST', 'login/verify', { challengeId: opts.body.challengeId, response: { id: 'cred-1', ok: true } });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ accountId: created.body.accountId, alias: 'Hector', wrapped: { recovery: wrapped, prf: 'prf-envuelta' } });
  });

  it('entrar con la clave de recuperación; una clave equivocada no dice si la cuenta existe', async () => {
    const { auth, res: created } = await register();
    const ok = await call('POST', 'login/recovery', { auth });
    expect(ok.body.accountId).toBe(created.body.accountId);
    const other = await recoveryFor();
    const bad = await call('POST', 'login/recovery', { auth: other.auth });
    expect(bad).toEqual({ status: 401, body: { error: 'recovery' } });
  });

  it('sin passkey (CU-04): la cuenta se crea solo con la clave de recuperación', async () => {
    const r = await recoveryFor();
    const res = await call('POST', 'register/recovery', { alias: 'Ana', recovery: { auth: r.auth, wrapped: r.wrapped } });
    expect(res.status).toBe(200);
    expect((await call('POST', 'login/recovery', { auth: r.auth })).body.alias).toBe('Ana');
  });
});

describe('copia en la nube (CP-01 a CP-06)', () => {
  it('sube, sube otra vez y baja la última; la versión crece y guarda el nivel', async () => {
    const { res, dataKey } = await register();
    const s = res.body.session;
    const data = await encryptBackup(dataKey, '{"a":1}');
    expect((await call('PUT', 'backup', { baseVersion: 0, data, level: 3 }, s)).body.version).toBe(1);
    expect((await call('PUT', 'backup', { baseVersion: 1, data, level: 4 }, s)).body.version).toBe(2);
    const got = await call('GET', 'backup', undefined, s);
    expect(got.body).toMatchObject({ version: 2, data });
    expect((stores.accounts.map.get(res.body.accountId!) as Account).level).toBe(4);
  });

  it('dos dispositivos: subir desde una versión antigua responde conflicto (CP-05)', async () => {
    const { res, dataKey } = await register();
    const s = res.body.session;
    const data = await encryptBackup(dataKey, '{}');
    await call('PUT', 'backup', { baseVersion: 0, data, level: 1 }, s);
    const stale = await call('PUT', 'backup', { baseVersion: 0, data, level: 1 }, s);
    expect(stale.status).toBe(409);
    expect(stale.body.version).toBe(1);
  });

  it('sin sesión o con una caducada, nada', async () => {
    const { res } = await register();
    expect((await call('GET', 'backup')).status).toBe(401);
    now += 366 * 86_400_000;
    expect((await call('GET', 'backup', undefined, res.body.session)).status).toBe(401);
  });
});

describe('gestionar y límites (GC-02, GC-05, RC-06, NFR14-03)', () => {
  it('otra clave de recuperación: la anterior deja de valer', async () => {
    const { auth, res } = await register();
    const next = await recoveryFor();
    expect((await call('POST', 'recovery/rotate', { recovery: { auth: next.auth, wrapped: next.wrapped } }, res.body.session)).status).toBe(200);
    expect((await call('POST', 'login/recovery', { auth })).status).toBe(401);
    expect((await call('POST', 'login/recovery', { auth: next.auth })).status).toBe(200);
  });

  it('añadir una passkey en otro dispositivo', async () => {
    const { res } = await register();
    const s = res.body.session;
    const opts = await call('POST', 'passkey/options', {}, s);
    expect((await call('POST', 'passkey/verify', { challengeId: opts.body.challengeId, response: { id: 'cred-2', ok: true }, prfWrapped: 'prf-2' }, s)).status).toBe(200);
    const login = await call('POST', 'login/options', {});
    const res2 = await call('POST', 'login/verify', { challengeId: login.body.challengeId, response: { id: 'cred-2', ok: true } });
    expect(res2.body.wrapped?.prf).toBe('prf-2');
  });

  it('borrar la cuenta no deja nada en el servidor', async () => {
    const { res, dataKey } = await register();
    await call('PUT', 'backup', { baseVersion: 0, data: await encryptBackup(dataKey, '{}'), level: 1 }, res.body.session);
    expect((await call('DELETE', '', undefined, res.body.session)).status).toBe(200);
    for (const s of ['accounts', 'credentials', 'recovery', 'backups'] as const) expect(stores[s].map.size, s).toBe(0);
  });

  it('5 claves equivocadas desde una IP: 15 min de espera, también con la buena', async () => {
    const { auth } = await register();
    for (let i = 0; i < 5; i++) await call('POST', 'login/recovery', { auth: (await recoveryFor()).auth });
    expect((await call('POST', 'login/recovery', { auth })).status).toBe(429);
    now += 16 * 60_000;
    expect((await call('POST', 'login/recovery', { auth })).status).toBe(200);
  });

  it('como mucho 5 cuentas al día por IP', async () => {
    for (let i = 0; i < 5; i++) expect((await register(`c${i}`)).res.status).toBe(200);
    expect((await register('c6')).res.status).toBe(429);
  });

  it('sin el secreto configurado responde 503', async () => {
    const res = await handle(new Request('https://arvid-app.netlify.app/api/account/login/options', { method: 'POST', body: '{}' }), { ...deps, secret: '' });
    expect(res.status).toBe(503);
  });
});
