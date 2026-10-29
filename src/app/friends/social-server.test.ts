// @vitest-environment node
// Servidor de amigos (spec 15, §3.1) con almacenes en memoria.
import { beforeEach, describe, expect, it } from 'vitest';
import { handle, MAX_FRIENDS, type SocialStores } from '../../../netlify/functions/social.mts';
import { sendChallengePushes } from '../../../netlify/lib/socialPush.mts';
import { signSession, type Account, type ListKV } from '../../../netlify/lib/account.mts';

const SECRET = 'secreto-de-prueba';

function memory<T>(): ListKV<T> & { map: Map<string, T> } {
  const map = new Map<string, T>();
  return {
    map,
    list: async (prefix) => [...map.keys()].filter((k) => k.startsWith(prefix)),
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => void map.set(k, structuredClone(v)),
    delete: async (k) => void map.delete(k),
  };
}

let stores: SocialStores;
let now: number;
let pushes: { to: string; type: string; alias?: string; name?: string; done?: number; success?: boolean; winners?: string[] }[];

const ANA = 'ana-0000-cuenta';
const LUIS = 'luis-000-cuenta';
const EVA = 'eva-0000-cuenta';

function account(id: string, alias: string, level = 3): Account {
  return { id, alias, level, createdAt: '', backupVersion: 0, recoveryAuthHash: '', credentials: [], wrapped: { recovery: '', prf: {} } };
}

beforeEach(async () => {
  stores = { accounts: memory(), social: memory(), limits: memory(), challenges: memory() };
  now = Date.UTC(2026, 9, 28, 12);
  pushes = [];
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
  // Para unirse hace falta invitación (D-177): las pruebas de retos la dan por hecha salvo con `noInvite`
  const b = body as { id?: string; noInvite?: boolean } | undefined;
  if (as && route === 'challenges/join' && b?.id && !b.noInvite) {
    const social = (await stores.social.get(as)) ?? { friends: [], blocked: [], requests: [] };
    await stores.social.set(as, { ...social, invites: [...(social.invites ?? []), { challenge: b.id, from: ANA, at: '' }] });
  }
  const res = await handle(
    new Request(`https://arvid.test/api/social/${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${signSession(as, SECRET, now)}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { stores, now: () => now, secret: SECRET, notify: async (to, push) => void pushes.push({ to, ...push }) },
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

interface ViewReply {
  error?: string;
  challenge: { id: string; name: string; cancelled?: boolean };
  participants: { alias: string; done: string[]; left?: string }[];
  ownerFriend?: boolean;
  done?: string[];
}

describe('retos (spec 15, RT, IN, SY, MK)', () => {
  const TODAY = '2026-10-28';
  const base = { name: 'Leer 10 páginas', difficulty: 'easy', days: 7, start: TODAY, mode: 'coop', today: TODAY };
  const create = async (as: string, extra: object = {}) => (await call(as, 'POST', 'challenges/create', { ...base, ...extra })) as unknown as { status: number; body: ViewReply };
  const ch = async (as: string, method: string, route: string, body?: unknown) => (await call(as, method, `challenges/${route}`, body)) as unknown as { status: number; body: ViewReply };

  it('RT-03/IN-02/IN-04: el creador es el primer participante; quien abre el enlace ve el reto y se une', async () => {
    const { body } = await create(ANA);
    expect(body.participants.map((p) => p.alias)).toEqual(['Ana']);
    const seen = await ch(LUIS, 'GET', body.challenge.id);
    expect(seen.body).toMatchObject({ challenge: { name: 'Leer 10 páginas' }, ownerFriend: false });
    const joined = await ch(LUIS, 'POST', 'join', { id: body.challenge.id, today: TODAY });
    expect(joined.body.participants.map((p) => p.alias)).toEqual(['Ana', 'Luis']);
    expect((await ch(LUIS, 'GET', 'mine')).body).toMatchObject({ challenges: [{ challenge: { id: body.challenge.id } }] });
  });

  it('RT-02: duración de 3 a 60 días e inicio hasta 30 días después', async () => {
    expect((await create(ANA, { days: 2 })).status).toBe(400);
    expect((await create(ANA, { days: 61 })).status).toBe(400);
    expect((await create(ANA, { start: '2026-12-01' })).status).toBe(400);
    expect((await create(ANA, { start: '2026-10-27' })).status).toBe(400);
    expect((await create(ANA, { start: '2026-11-27', days: 60 })).status).toBe(200);
  });

  it('RT-05: como mucho 5 retos activos', async () => {
    for (let i = 0; i < 5; i++) expect((await create(ANA)).status).toBe(200);
    expect((await create(ANA)).body.error).toBe('too-many');
  });

  it('IN-03: se acepta hasta el día de inicio incluido; con 20 está completo', async () => {
    const { body } = await create(ANA);
    now += 86_400_000;
    expect((await ch(LUIS, 'POST', 'join', { id: body.challenge.id, today: '2026-10-29' })).body.error).toBe('started');
    now -= 86_400_000;
    for (let i = 0; i < 19; i++) {
      const id = `otra-${i}-cuenta`;
      await stores.accounts.set(id, account(id, `P${i}`));
      expect((await ch(id, 'POST', 'join', { id: body.challenge.id, today: TODAY })).status).toBe(200);
    }
    expect((await ch(LUIS, 'POST', 'join', { id: body.challenge.id, today: TODAY })).body.error).toBe('full');
  });

  it('IN-05: el enlace de alguien que te bloqueó no está disponible', async () => {
    const { body } = await create(ANA);
    await call(ANA, 'POST', 'block', { id: LUIS });
    expect((await ch(LUIS, 'GET', body.challenge.id)).status).toBe(404);
    expect((await ch(LUIS, 'POST', 'join', { id: body.challenge.id, today: TODAY })).status).toBe(404);
  });

  it('SY-02/SY-04: se marcan y desmarcan fechas del reto; pasado el margen el día queda cerrado', async () => {
    const { body } = await create(ANA);
    const id = body.challenge.id;
    expect((await ch(ANA, 'POST', 'mark', { id, date: TODAY })).body.done).toEqual([TODAY]);
    expect((await ch(ANA, 'POST', 'mark', { id, date: '2026-10-27' })).status).toBe(400); // fuera del reto
    expect((await ch(LUIS, 'POST', 'mark', { id, date: TODAY })).status).toBe(403); // no participa
    now += 2 * 86_400_000;
    expect((await ch(ANA, 'POST', 'mark', { id, date: '2026-10-29' })).status).toBe(200);
    now += 2 * 86_400_000; // 1 de noviembre: el 29 queda a 3 días, aún dentro del margen con zona horaria
    expect((await ch(ANA, 'POST', 'unmark', { id, date: TODAY })).body.error).toBe('closed');
    expect((await ch(ANA, 'POST', 'unmark', { id, date: '2026-10-29' })).body.done).toEqual([TODAY]);
  });

  it('MK-04/D-186: al abandonar sale de tu lista; los demás te ven como «abandonó» con tus días y no puedes marcar más', async () => {
    const { body } = await create(ANA);
    const id = body.challenge.id;
    await ch(LUIS, 'POST', 'join', { id, today: TODAY });
    await ch(ANA, 'POST', 'mark', { id, date: TODAY });
    const left = await ch(ANA, 'POST', 'leave', { id, today: TODAY });
    expect(left.body.participants[0]).toMatchObject({ alias: 'Ana', left: TODAY, done: [TODAY] });
    expect(((await ch(ANA, 'GET', 'mine')).body as unknown as { challenges: unknown[] }).challenges).toEqual([]);
    expect(((await ch(LUIS, 'GET', 'mine')).body as unknown as { challenges: unknown[] }).challenges).toHaveLength(1);
    expect((await ch(ANA, 'POST', 'mark', { id, date: TODAY })).status).toBe(400);
  });

  it('D-186: cuando abandona el último, el reto se borra del todo', async () => {
    const { body } = await create(ANA);
    const id = body.challenge.id;
    await ch(LUIS, 'POST', 'join', { id, today: TODAY });
    await ch(ANA, 'POST', 'leave', { id, today: TODAY });
    expect((await ch(LUIS, 'POST', 'leave', { id, today: TODAY })).body).toEqual({ deleted: true });
    expect([...(stores.challenges as unknown as { map: Map<string, unknown> }).map.keys()].filter((k) => k.includes(id))).toEqual([]);
    expect(((await stores.challenges.get('index:active')) as string[]).includes(id)).toBe(false);
    expect((await ch(LUIS, 'GET', id)).status).toBe(404);
  });

  it('RT-04: el creador puede cancelarlo solo antes de que empiece', async () => {
    expect((await ch(ANA, 'POST', 'cancel', { id: (await create(ANA)).body.challenge.id, today: TODAY })).body.error).toBe('started');
    const later = (await create(ANA, { start: '2026-11-02' })).body.challenge.id;
    await ch(LUIS, 'POST', 'join', { id: later, today: TODAY });
    expect((await ch(LUIS, 'POST', 'cancel', { id: later, today: TODAY })).status).toBe(403);
    expect((await ch(ANA, 'POST', 'cancel', { id: later, today: TODAY })).body.challenge.cancelled).toBe(true);
  });
});

describe('avisos (spec 15, AV)', () => {
  const TODAY = '2026-10-28';
  const challengeOf = async (as: string, extra: object = {}) =>
    ((await call(as, 'POST', 'challenges/create', { name: 'Leer', difficulty: 'easy', days: 7, start: TODAY, mode: 'coop', today: TODAY, ...extra })).body as unknown as { challenge: { id: string } }).challenge.id;

  it('AV-01: solicitud y aceptación avisan al momento; rechazar no avisa', async () => {
    await call(LUIS, 'POST', 'request', { id: ANA });
    expect(pushes).toEqual([{ to: ANA, type: 'friend-request', alias: 'Luis', url: '/perfil/amigos' }]);
    await call(ANA, 'POST', 'respond', { id: LUIS, accept: true });
    expect(pushes.at(-1)).toMatchObject({ to: LUIS, type: 'friend-accepted', alias: 'Ana' });
    await call(EVA, 'POST', 'request', { id: ANA });
    const n = pushes.length;
    await call(ANA, 'POST', 'respond', { id: EVA, accept: false });
    expect(pushes).toHaveLength(n);
  });

  it('IN-01: invitar a un amigo a un reto le avisa; a quien no es amigo, no', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    const id = await challengeOf(ANA);
    expect((await call(ANA, 'POST', 'challenges/invite', { id, friendId: LUIS, today: TODAY })).status).toBe(200);
    expect(pushes.at(-1)).toMatchObject({ to: LUIS, type: 'challenge-invite', alias: 'Ana', name: 'Leer', url: '/hoy' });
    expect((await call(ANA, 'POST', 'challenges/invite', { id, friendId: EVA, today: TODAY })).status).toBe(404);
  });

  it('AM-04: la lista cuenta los retos hechos juntos', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    const id = await challengeOf(ANA);
    await call(LUIS, 'POST', 'challenges/join', { id, today: TODAY });
    expect((await friendsOf(ANA)).friends).toMatchObject([{ alias: 'Luis', together: 1 }]);
  });

  it('AV-05: el dispositivo se asocia a la cuenta con sus interruptores', async () => {
    const deviceId = '2f0e8a1c-3b4d-4e5f-8a6b-7c8d9e0f1a2b';
    await call(ANA, 'POST', 'device', { deviceId, prefs: { progress: false } });
    expect((await stores.social.get(ANA))!.devices).toEqual([{ id: deviceId, prefs: { invites: true, progress: false, final: true } }]);
    await call(ANA, 'POST', 'device', { deviceId, remove: true });
    expect((await stores.social.get(ANA))!.devices).toEqual([]);
  });

  it('AV-03/AV-04: un aviso de avances al día y el resultado al terminar el margen', async () => {
    const id = await challengeOf(ANA);
    await call(LUIS, 'POST', 'challenges/join', { id, today: TODAY });
    await call(EVA, 'POST', 'challenges/join', { id, today: TODAY });
    await call(ANA, 'POST', 'challenges/mark', { id, date: TODAY });
    await call(EVA, 'POST', 'challenges/mark', { id, date: TODAY });
    pushes = [];
    const cron = () =>
      sendChallengePushes({ challenges: stores.challenges, accounts: stores.accounts, notify: async (to, push) => void pushes.push({ to, ...push }), zoneOf: async () => 'UTC', now });
    await cron();
    expect(pushes).toEqual([{ to: LUIS, type: 'challenge-progress', url: `/retos/${id}`, name: 'Leer', done: 2, total: 3 }]);
    await cron();
    expect(pushes).toHaveLength(1);
    now = Date.UTC(2026, 10, 7, 12); // 7 de noviembre: el resultado, a todos
    pushes = [];
    await cron();
    expect(pushes.map((p) => [p.to, p.type, p.success])).toEqual([
      [ANA, 'challenge-end', false],
      [LUIS, 'challenge-end', false],
      [EVA, 'challenge-end', false],
    ]);
    await cron();
    expect(pushes).toHaveLength(3);
  });
});

describe('invitaciones directas (enmienda 1, D-177 a D-179)', () => {
  const TODAY = '2026-10-28';
  const create = async () =>
    ((await call(ANA, 'POST', 'challenges/create', { name: 'Leer', difficulty: 'easy', days: 7, start: TODAY, mode: 'coop', today: TODAY })).body as unknown as { challenge: { id: string } }).challenge.id;

  it('sin invitación no se puede entrar en un reto', async () => {
    const id = await create();
    expect((await call(LUIS, 'POST', 'challenges/join', { id, today: TODAY, noInvite: true })).status).toBe(403);
  });

  it('IN-14: la invitación queda en la bandeja; aceptarla la quita; rechazarla también, sin avisar', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    await call(EVA, 'POST', 'accept', { id: ANA });
    const id = await create();
    await call(ANA, 'POST', 'challenges/invite', { id, friendId: LUIS, today: TODAY });
    await call(ANA, 'POST', 'challenges/invite', { id, friendId: EVA, today: TODAY });
    const inbox = (await call(LUIS, 'GET', 'invites')).body as unknown as { invites: { challenge: { name: string }; from: { alias: string }; people: number }[] };
    expect(inbox.invites).toMatchObject([{ challenge: { name: 'Leer' }, from: { alias: 'Ana' }, people: 1 }]);
    expect((await call(LUIS, 'POST', 'challenges/join', { id, today: TODAY, noInvite: true })).status).toBe(200);
    expect(((await call(LUIS, 'GET', 'invites')).body as unknown as { invites: unknown[] }).invites).toEqual([]);
    const n = pushes.length;
    await call(EVA, 'POST', 'invites/decline', { id });
    expect(((await call(EVA, 'GET', 'invites')).body as unknown as { invites: unknown[] }).invites).toEqual([]);
    expect(pushes).toHaveLength(n);
  });

  it('IN-14: una invitación caduca cuando el reto ya empezó', async () => {
    await call(LUIS, 'POST', 'accept', { id: ANA });
    const id = await create();
    await call(ANA, 'POST', 'challenges/invite', { id, friendId: LUIS, today: TODAY });
    now += 2 * 86_400_000;
    expect(((await call(LUIS, 'GET', 'invites')).body as unknown as { invites: unknown[] }).invites).toEqual([]);
  });

  it('EN-13: sin sesión, el enlace de amistad solo muestra el alias', async () => {
    const res = await call(undefined, 'GET', `profile/${ANA}`);
    expect(res.body).toEqual({ id: ANA, alias: 'Ana' });
    expect((await call(undefined, 'GET', 'friends')).status).toBe(401);
  });
});

describe('abandonar con la fecha del teléfono mal puesta', () => {
  it('se usa la fecha del servidor en lugar de rechazarlo', async () => {
    const id = ((await call(ANA, 'POST', 'challenges/create', { name: 'Leer', difficulty: 'easy', days: 7, start: '2026-10-28', mode: 'coop', today: '2026-10-28' })).body as unknown as { challenge: { id: string } }).challenge.id;
    const res = await call(ANA, 'POST', 'challenges/leave', { id, today: '2026-11-15' });
    expect(res.status).toBe(200);
    expect(((await call(ANA, 'GET', 'challenges/mine')).body as unknown as { challenges: unknown[] }).challenges).toEqual([]);
  });
});
