// Amigos (spec 15, §3.1, fase 15a). Rutas bajo /api/social/, todas con la sesión de la spec 14:
//   GET friends (AM-04, AM-07) · GET profile/<id> (AM-02, IN-05)
//   POST accept (enlace de amistad: mutua al instante, D-147) · request (tras un reto, AM-03) · respond (AM-07)
//   POST remove (AM-05) · block · unblock (AM-06)
// Cada cuenta tiene un documento `friends:<cuenta>`; el servidor escribe en las dos al hacer o deshacer una amistad.
import { getStore } from '@netlify/blobs';
import { verifySession, type Account, type KV } from '../lib/account.mts';

export const MAX_FRIENDS = 100; // AM-08
export const REQUEST_DAYS = 30; // AM-07
const REQUESTS_PER_DAY = 50; // NFR15-03

export interface Social {
  friends: { id: string; since: string }[];
  blocked: string[];
  requests: { from: string; at: string }[];
}

export interface SocialStores {
  accounts: KV<Account>;
  social: KV<Social>;
  limits: KV<{ count: number; until: number }>;
}

export interface Deps {
  stores?: SocialStores;
  now?: () => number;
  secret?: string;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const blobKV = <T,>(name: string): KV<T> => {
  const store = getStore({ name, consistency: 'strong' });
  return {
    get: async (key) => (await store.get(key, { type: 'json' })) as T | null,
    set: async (key, value) => void (await store.setJSON(key, value)),
    delete: (key) => store.delete(key),
  };
};

const blobStores = (): SocialStores => ({ accounts: blobKV('accounts'), social: blobKV('social'), limits: blobKV('account-limits') });

const isId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(v);

export async function handle(req: Request, deps: Deps = {}): Promise<Response> {
  const stores = deps.stores ?? blobStores();
  const now = deps.now?.() ?? Date.now();
  const secret = deps.secret ?? process.env.ARVID_SESSION_SECRET;
  if (!secret) return json(503, { error: 'not-configured' });
  const route = new URL(req.url).pathname.replace(/^\/api\/social\/?/, '').replace(/\/$/, '');

  const me = verifySession(req.headers.get('authorization')?.replace(/^Bearer /, ''), secret, now);
  const account = me ? await stores.accounts.get(me) : null;
  if (!me || !account) return json(401, { error: 'session' });

  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json(400, { error: 'invalid' });
    }
  }

  const fresh = (s: Social): Social => ({ ...s, requests: s.requests.filter((r) => now - Date.parse(r.at) < REQUEST_DAYS * 86_400_000) });
  const load = async (id: string): Promise<Social> => fresh((await stores.social.get(id)) ?? { friends: [], blocked: [], requests: [] });
  const save = (id: string, s: Social) => stores.social.set(id, s);
  const isFriend = (s: Social, id: string) => s.friends.some((f) => f.id === id);
  /** Un bloqueo en cualquier sentido oculta a la otra persona (IN-05). */
  const blockedBetween = (a: Social, aId: string, b: Social, bId: string) => a.blocked.includes(bId) || b.blocked.includes(aId);

  async function befriend(other: string, mine: Social, theirs: Social) {
    const since = new Date(now).toISOString();
    if (!isFriend(mine, other)) mine.friends.push({ id: other, since });
    if (!isFriend(theirs, me!)) theirs.friends.push({ id: me!, since });
    mine.requests = mine.requests.filter((r) => r.from !== other);
    theirs.requests = theirs.requests.filter((r) => r.from !== me);
    await Promise.all([save(me!, mine), save(other, theirs)]);
  }

  /** La otra cuenta, si existe y no hay bloqueo entre las dos. */
  async function other(id: unknown) {
    if (!isId(id) || id === me) return undefined;
    const acc = await stores.accounts.get(id);
    if (!acc) return undefined;
    const [mine, theirs] = await Promise.all([load(me!), load(id)]);
    if (blockedBetween(mine, me!, theirs, id)) return undefined;
    return { acc, mine, theirs };
  }

  const card = (a: Account) => ({ id: a.id, alias: a.alias, level: a.level });

  if (route === 'friends' && req.method === 'GET') {
    const mine = await load(me);
    const cards = async (ids: string[]) => (await Promise.all(ids.map((id) => stores.accounts.get(id)))).filter((a): a is Account => !!a).map(card);
    const friends = await cards(mine.friends.map((f) => f.id));
    const since = new Map(mine.friends.map((f) => [f.id, f.since]));
    const requests = await cards(mine.requests.map((r) => r.from));
    return json(200, {
      friends: friends.map((f) => ({ ...f, since: since.get(f.id), together: 0 })),
      requests,
      blocked: await cards(mine.blocked),
    });
  }

  if (route.startsWith('profile/') && req.method === 'GET') {
    const id = route.slice('profile/'.length);
    if (id === me) return json(200, { ...card(account), self: true });
    const o = await other(id);
    if (!o) return json(404, { error: 'unavailable' });
    return json(200, { ...card(o.acc), friend: isFriend(o.mine, id) });
  }

  if (route === 'accept' && req.method === 'POST') {
    const o = await other(body.id);
    if (!o) return json(404, { error: 'unavailable' });
    if (!isFriend(o.mine, o.acc.id) && (o.mine.friends.length >= MAX_FRIENDS || o.theirs.friends.length >= MAX_FRIENDS)) return json(409, { error: 'full' });
    await befriend(o.acc.id, o.mine, o.theirs);
    return json(200, { ok: true });
  }

  if (route === 'request' && req.method === 'POST') {
    const o = await other(body.id);
    if (!o) return json(404, { error: 'unavailable' });
    if (isFriend(o.mine, o.acc.id)) return json(200, { ok: true, friend: true });
    // Si la otra persona ya me lo había pedido, pedirlo es aceptarlo
    if (o.mine.requests.some((r) => r.from === o.acc.id)) {
      await befriend(o.acc.id, o.mine, o.theirs);
      return json(200, { ok: true, friend: true });
    }
    const limit = await stores.limits.get(`acc:${me}:requests`);
    const window = limit && limit.until > now ? limit : { count: 0, until: now + 86_400_000 };
    if (window.count >= REQUESTS_PER_DAY) return json(429, { error: 'limit' });
    await stores.limits.set(`acc:${me}:requests`, { count: window.count + 1, until: window.until });
    o.theirs.requests = [...o.theirs.requests.filter((r) => r.from !== me), { from: me, at: new Date(now).toISOString() }];
    await save(o.acc.id, o.theirs);
    return json(200, { ok: true, friend: false });
  }

  if (route === 'respond' && req.method === 'POST') {
    if (!isId(body.id)) return json(400, { error: 'invalid' });
    const mine = await load(me);
    if (!mine.requests.some((r) => r.from === body.id)) return json(404, { error: 'unavailable' });
    if (body.accept === true) {
      const o = await other(body.id);
      if (!o) return json(404, { error: 'unavailable' });
      if (o.mine.friends.length >= MAX_FRIENDS || o.theirs.friends.length >= MAX_FRIENDS) return json(409, { error: 'full' });
      await befriend(o.acc.id, o.mine, o.theirs);
    } else {
      // Rechazar no avisa a la otra persona (AM-02)
      await save(me, { ...mine, requests: mine.requests.filter((r) => r.from !== body.id) });
    }
    return json(200, { ok: true });
  }

  if ((route === 'remove' || route === 'block') && req.method === 'POST') {
    const id = body.id;
    if (!isId(id) || id === me) return json(400, { error: 'invalid' });
    const [mine, theirs] = await Promise.all([load(me), load(id)]);
    mine.friends = mine.friends.filter((f) => f.id !== id);
    theirs.friends = theirs.friends.filter((f) => f.id !== me);
    if (route === 'block') {
      if (!mine.blocked.includes(id)) mine.blocked.push(id);
      mine.requests = mine.requests.filter((r) => r.from !== id);
      theirs.requests = theirs.requests.filter((r) => r.from !== me);
    }
    await Promise.all([save(me, mine), save(id, theirs)]);
    return json(200, { ok: true });
  }

  if (route === 'unblock' && req.method === 'POST') {
    const mine = await load(me);
    await save(me, { ...mine, blocked: mine.blocked.filter((b) => b !== body.id) });
    return json(200, { ok: true });
  }

  return json(404, { error: 'route' });
}

export default (req: Request): Promise<Response> => handle(req);

export const config = {
  path: ['/api/social', '/api/social/*'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
