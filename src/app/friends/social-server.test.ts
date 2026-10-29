// @vitest-environment node
// Servidor de amigos (spec 15, §3.1) con almacenes en memoria.
import { beforeEach, describe, expect, it } from 'vitest';
import { handle, MAX_FRIENDS, type SocialStores } from '../../../netlify/functions/social.mts';
import { signSession, type Account, type KV } from '../../../netlify/lib/account.mts';

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

let stores: SocialStores;
let now: number;

const ANA = 'ana-0000-cuenta';
const LUIS = 'luis-000-cuenta';
const EVA = 'eva-0000-cuenta';

function account(id: string, alias: string, level = 3): Account {
  return { id, alias, level, createdAt: '', backupVersion: 0, recoveryAuthHash: '', credentials: [], wrapped: { recovery: '', prf: {} } };
}

beforeEach(async () => {
  stores = { accounts: memory(), social: memory(), limits: memory() };
  now = Date.UTC(2026, 9, 28, 12);
  for (const [id, alias] of [[ANA, 'Ana'], [LUIS, 'Luis'], [EVA, 'Eva']] as const) await stores.accounts.set(id, account(id, alias));
});

interface Reply {
  error?: string;
  alias?: string;
  friend?: boolean;
  friends?: { id: string; alias: string; level: number }[];
  requests?: { id: string; alias: string }[];
  blocked?: { id: string }[];
}

async function call(as: string | undefined, method: string, route: string, body?: unknown): Promise<{ status: number; body: Reply }> {
  const res = await handle(
    new Request(`https://arvid.test/api/social/${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${signSession(as, SECRET, now)}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { stores, now: () => now, secret: SECRET },
  );
  return { status: res.status, body: (await res.json()) as Reply };
}

const friendsOf = async (id: string) => (await call(id, 'GET', 'friends')).body;

describe('amigos (spec 15, AM)', () => {
  it('sin sesión no hay nada', async () => {
    expect((await call(undefined, 'GET', 'friends')).status).toBe(401);
  });

  it('AM-01/AM-02: abrir un enlace muestra el alias y aceptar hace la amistad mutua al instante', async () => {
    const profile = await call(LUIS, 'GET', `profile/${ANA}`);
    expect(profile.body).toMatchObject({ alias: 'Ana', level: 3, friend: false });
    expect((await call(LUIS, 'POST', 'accept', { id: ANA })).status).toBe(200);
    expect((await friendsOf(ANA)).friends!.map((f) => f.alias)).toEqual(['Luis']);
    expect((await friendsOf(LUIS)).friends!.map((f) => f.alias)).toEqual(['Ana']);
    expect((await call(LUIS, 'GET', `profile/${ANA}`)).body.friend).toBe(true);
  });

  it('AM-03/AM-07: una solicitud solo es amistad cuando la otra persona la acepta', async () => {
    await call(LUIS, 'POST', 'request', { id: ANA });
    expect((await friendsOf(LUIS)).friends).toEqual([]);
    expect((await friendsOf(ANA)).requests!.map((r) => r.alias)).toEqual(['Luis']);
    await call(ANA, 'POST', 'respond', { id: LUIS, accept: true });
    expect((await friendsOf(ANA)).requests).toEqual([]);
    expect((await friendsOf(LUIS)).friends!.map((f) => f.alias)).toEqual(['Ana']);
  });

  it('AM-02: rechazar la quita sin avisar; caduca a los 30 días', async () => {
    await call(LUIS, 'POST', 'request', { id: ANA });
    await call(ANA, 'POST', 'respond', { id: LUIS, accept: false });
    expect((await friendsOf(ANA)).requests).toEqual([]);
    expect((await friendsOf(ANA)).friends).toEqual([]);
    await call(EVA, 'POST', 'request', { id: ANA });
    now += 31 * 86_400_000;
    expect((await friendsOf(ANA)).requests).toEqual([]);
  });

  it('si los dos se lo piden, son amigos', async () => {
    await call(LUIS, 'POST', 'request', { id: ANA });
    expect((await call(ANA, 'POST', 'request', { id: LUIS })).body.friend).toBe(true);
    expect((await friendsOf(LUIS)).friends).toHaveLength(1);
  });

  it('AM-05: eliminar la quita de las dos listas', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    await call(ANA, 'POST', 'remove', { id: LUIS });
    expect((await friendsOf(ANA)).friends).toEqual([]);
    expect((await friendsOf(LUIS)).friends).toEqual([]);
  });

  it('AM-06/IN-05: bloquear quita la amistad; el bloqueado no ve el enlace ni puede pedir amistad; se puede desbloquear', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    await call(ANA, 'POST', 'block', { id: LUIS });
    expect((await friendsOf(LUIS)).friends).toEqual([]);
    expect((await friendsOf(ANA)).blocked!.map((b) => b.id)).toEqual([LUIS]);
    expect((await call(LUIS, 'GET', `profile/${ANA}`)).body.error).toBe('unavailable');
    expect((await call(LUIS, 'POST', 'accept', { id: ANA })).status).toBe(404);
    expect((await call(LUIS, 'POST', 'request', { id: ANA })).status).toBe(404);
    // Tampoco quien bloqueó ve a la otra persona mientras dure
    expect((await call(ANA, 'GET', `profile/${LUIS}`)).status).toBe(404);
    await call(ANA, 'POST', 'unblock', { id: LUIS });
    expect((await call(LUIS, 'POST', 'accept', { id: ANA })).status).toBe(200);
  });

  it('AM-08: como mucho 100 amigos', async () => {
    await stores.social.set(ANA, { friends: Array.from({ length: MAX_FRIENDS }, (_, i) => ({ id: `x-${i}-amigo`, since: '' })), blocked: [], requests: [] });
    expect((await call(LUIS, 'POST', 'accept', { id: ANA })).body.error).toBe('full');
  });

  it('el propio enlace se reconoce y una cuenta que no existe no está disponible', async () => {
    expect((await call(ANA, 'GET', `profile/${ANA}`)).body).toMatchObject({ alias: 'Ana', self: true });
    expect((await call(ANA, 'GET', 'profile/no-existe-cuenta')).status).toBe(404);
    expect((await call(ANA, 'POST', 'accept', { id: ANA })).status).toBe(404);
  });
});
