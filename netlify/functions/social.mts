// Amigos (spec 15, §3.1, fase 15a). Rutas bajo /api/social/, todas con la sesión de la spec 14:
//   GET friends (AM-04, AM-07) · GET profile/<id> (AM-02, IN-05)
//   POST accept (enlace de amistad: mutua al instante, D-147) · request (tras un reto, AM-03) · respond (AM-07)
//   POST remove (AM-05) · block · unblock (AM-06)
// Retos (§3.2 a §3.6, fase 15b), bajo /api/social/challenges/:
//   POST create (RT) · GET mine · GET <id> (IN-02, MK) · POST join (IN-03, IN-04) · mark · unmark (SY) · leave (MK-04)
//   · cancel (RT-04)
// Cada participante escribe solo su documento `c:<reto>:p:<cuenta>` (S15-01); el servidor solo guarda las fechas
// cumplidas (NFR15-01).
// Cada cuenta tiene un documento `friends:<cuenta>`; el servidor escribe en las dos al hacer o deshacer una amistad.
import { getStore } from '@netlify/blobs';
import { z } from 'zod';
import {
  MARK_GRACE_DAYS,
  MAX_ACTIVE,
  MAX_DAYS,
  MAX_PARTICIPANTS,
  MAX_START_DAYS,
  MIN_DAYS,
  inRange,
  isActive,
  type Challenge,
  type Participant,
} from '../../src/domain/challenges/challenges.ts';
import { addDays, type LocalDate } from '../../src/domain/time/localDate.ts';
import { verifySession, type Account, type KV, type ListKV } from '../lib/account.mts';

export const MAX_FRIENDS = 100; // AM-08
export const REQUEST_DAYS = 30; // AM-07
const REQUESTS_PER_DAY = 50; // NFR15-03
const CREATED_PER_DAY = 20; // NFR15-03
const MARKS_PER_HOUR = 60; // NFR15-03

export interface Social {
  friends: { id: string; since: string }[];
  blocked: string[];
  requests: { from: string; at: string }[];
}

export interface SocialStores {
  accounts: KV<Account>;
  social: KV<Social>;
  limits: KV<{ count: number; until: number }>;
  /** `c:<reto>`, `c:<reto>:p:<cuenta>` y `u:<cuenta>` (§4.1). */
  challenges: ListKV<unknown>;
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

const blobListKV = <T,>(name: string): ListKV<T> => {
  const store = getStore({ name, consistency: 'strong' });
  return {
    ...blobKV<T>(name),
    list: async (prefix) => (await store.list({ prefix })).blobs.map((b) => b.key),
  };
};

const blobStores = (): SocialStores => ({
  accounts: blobKV('accounts'),
  social: blobKV('social'),
  limits: blobKV('account-limits'),
  challenges: blobListKV('challenges'),
});

const ChallengeIn = z.object({
  name: z.string().trim().min(1).max(40),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  days: z.number().int().min(MIN_DAYS).max(MAX_DAYS),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['coop', 'versus']),
  /** Fecha local de quien lo pide (SY-03); el servidor la acepta si está a un día de la suya. */
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const DateIn = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

  /** Límite con ventana: devuelve `false` si se superó. */
  async function within(key: string, max: number, windowMs: number): Promise<boolean> {
    const entry = await stores.limits.get(key);
    const current = entry && entry.until > now ? entry : { count: 0, until: now + windowMs };
    if (current.count >= max) return false;
    await stores.limits.set(key, { count: current.count + 1, until: current.until });
    return true;
  }

  // ---------- Retos ----------
  const serverToday = new Date(now).toISOString().slice(0, 10) as LocalDate;
  /** La fecha local del cliente, si está a un día como mucho de la del servidor (zonas horarias, SY-03). */
  const clientToday = (v: unknown): string | undefined => {
    const d = DateIn.safeParse(v);
    return d.success && d.data >= addDays(serverToday, -1) && d.data <= addDays(serverToday, 1) ? d.data : undefined;
  };
  const cs = stores.challenges;
  const getChallenge = async (id: unknown) => (isId(id) ? ((await cs.get(`c:${id}`)) as Challenge | null) : null);
  const getParticipant = async (cid: string, aid: string) => (await cs.get(`c:${cid}:p:${aid}`)) as Participant | null;
  const myList = async (aid: string) => ((await cs.get(`u:${aid}`)) as string[] | null) ?? [];

  async function view(c: Challenge) {
    const keys = await cs.list(`c:${c.id}:p:`);
    const parts = (await Promise.all(keys.map((k) => cs.get(k)))).filter(Boolean) as Participant[];
    // El alias y el nivel, al día desde la cuenta (PV-02)
    const accounts = await Promise.all(parts.map((p) => stores.accounts.get(p.id)));
    const participants = parts
      .map((p, i) => ({ ...p, alias: accounts[i]?.alias ?? p.alias, level: accounts[i]?.level ?? p.level }))
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
    const ownerFriend = c.owner === me || (await load(me!)).friends.some((f) => f.id === c.owner);
    return { challenge: c, participants, ownerFriend };
  }

  async function activeCount(aid: string, today: string) {
    let n = 0;
    for (const id of await myList(aid)) {
      const c = await getChallenge(id);
      const p = c && (await getParticipant(c.id, aid));
      if (c && p && isActive(c, today, p.left)) n++;
    }
    return n;
  }

  async function addParticipant(c: Challenge) {
    const p: Participant = { id: me!, alias: account!.alias, level: account!.level, joinedAt: new Date(now).toISOString(), done: [] };
    await cs.set(`c:${c.id}:p:${me}`, p);
    await cs.set(`u:${me}`, [...new Set([...(await myList(me!)), c.id])]);
  }

  if (route.startsWith('challenges')) {
    const sub = route.slice('challenges'.length).replace(/^\//, '');

    if (sub === 'create' && req.method === 'POST') {
      const input = ChallengeIn.safeParse(body);
      const today = input.success ? clientToday(input.data.today) : undefined;
      if (!input.success || !today) return json(400, { error: 'invalid' });
      const { today: _, ...data } = input.data;
      if (data.start < today || data.start > addDays(today as LocalDate, MAX_START_DAYS)) return json(400, { error: 'invalid' });
      if ((await activeCount(me, today)) >= MAX_ACTIVE) return json(409, { error: 'too-many' });
      if (!(await within(`acc:${me}:challenges`, CREATED_PER_DAY, 86_400_000))) return json(429, { error: 'limit' });
      const c: Challenge = { id: crypto.randomUUID(), owner: me, ...data, createdAt: new Date(now).toISOString() };
      await cs.set(`c:${c.id}`, c);
      await addParticipant(c);
      return json(200, await view(c));
    }

    if (sub === 'mine' && req.method === 'GET') {
      const views = [];
      for (const id of await myList(me)) {
        const c = await getChallenge(id);
        if (c) views.push(await view(c));
      }
      return json(200, { challenges: views });
    }

    if (req.method === 'GET' && isId(sub)) {
      const c = await getChallenge(sub);
      if (!c) return json(404, { error: 'unavailable' });
      const [mine, theirs] = await Promise.all([load(me), load(c.owner)]);
      if (c.owner !== me && blockedBetween(mine, me, theirs, c.owner) && !(await getParticipant(c.id, me))) return json(404, { error: 'unavailable' });
      return json(200, await view(c));
    }

    const c = await getChallenge(body.id);
    if (!c) return json(404, { error: 'unavailable' });

    if (sub === 'join' && req.method === 'POST') {
      const today = clientToday(body.today);
      if (!today) return json(400, { error: 'invalid' });
      if (await getParticipant(c.id, me)) return json(200, await view(c));
      const [mine, theirs] = await Promise.all([load(me), load(c.owner)]);
      if (c.cancelled || blockedBetween(mine, me, theirs, c.owner)) return json(404, { error: 'unavailable' });
      // Se acepta hasta el día de inicio incluido (IN-03)
      if (today > c.start) return json(409, { error: 'started' });
      if ((await cs.list(`c:${c.id}:p:`)).length >= MAX_PARTICIPANTS) return json(409, { error: 'full' });
      if ((await activeCount(me, today)) >= MAX_ACTIVE) return json(409, { error: 'too-many' });
      await addParticipant(c);
      return json(200, await view(c));
    }

    const p = await getParticipant(c.id, me);
    if (!p) return json(403, { error: 'not-in' });

    if ((sub === 'mark' || sub === 'unmark') && req.method === 'POST') {
      const date = DateIn.safeParse(body.date);
      if (!date.success || !inRange(c, date.data) || c.cancelled || p.left) return json(400, { error: 'invalid' });
      // Pasados 2 días (más uno por zonas horarias) el día queda cerrado (SY-04)
      if (date.data < addDays(serverToday, -(MARK_GRACE_DAYS + 1)) || date.data > addDays(serverToday, 1)) return json(409, { error: 'closed' });
      if (!(await within(`acc:${me}:marks`, MARKS_PER_HOUR, 3_600_000))) return json(429, { error: 'limit' });
      const done = sub === 'mark' ? [...new Set([...p.done, date.data])].sort() : p.done.filter((d) => d !== date.data);
      await cs.set(`c:${c.id}:p:${me}`, { ...p, done });
      return json(200, { done });
    }

    if (sub === 'leave' && req.method === 'POST') {
      const today = clientToday(body.today);
      if (!today) return json(400, { error: 'invalid' });
      if (!p.left) await cs.set(`c:${c.id}:p:${me}`, { ...p, left: today });
      return json(200, await view(c));
    }

    if (sub === 'cancel' && req.method === 'POST') {
      const today = clientToday(body.today);
      if (c.owner !== me || !today) return json(403, { error: 'not-owner' });
      if (today >= c.start) return json(409, { error: 'started' });
      const cancelled = { ...c, cancelled: true };
      await cs.set(`c:${c.id}`, cancelled);
      return json(200, await view(cancelled));
    }

    return json(404, { error: 'route' });
  }

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
