// Cuenta ligera y copia en la nube (spec 14). Rutas bajo /api/account/:
//   POST register/options · register/verify · register/recovery (sin passkey, CU-04)
//   POST login/options · login/verify · login/recovery (RC-02 a RC-06)
//   GET|PUT backup (CP-01 a CP-06) · POST recovery/rotate (GC-02) · POST passkey/options · passkey/verify (GC-03)
//   DELETE (GC-05)
// La passkey se verifica con SimpleWebAuthn; la clave de recuperación, por el hash de `auth`. El servidor nunca ve la
// clave de datos ni los datos en claro (NFR14-01).
import { getStore } from '@netlify/blobs';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { z } from 'zod';
import {
  Alias,
  BackupIn,
  CHALLENGE_MS,
  RecoveryIn,
  sha256,
  signSession,
  verifySession,
  type Account,
  type AccountStores,
  type KV,
} from '../lib/account.mts';

/** Límites (NFR14-03). */
const ACCOUNTS_PER_IP_DAY = 5;
const RECOVERY_FAILS = 5;
const RECOVERY_LOCK_MS = 15 * 60_000;
const UPLOADS_PER_HOUR = 60;

const json = (status: number, body: unknown) => {
  // En los registros de Netlify, qué paso falló y por qué (solo la ruta y el código; nunca datos, D-192)
  if (status >= 400 && status !== 404) console.warn(`account ${status} ${(body as { error?: string }).error ?? ''}`);
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};

/** Lo que hace la librería de passkeys; las pruebas lo sustituyen por una versión simulada (NFR14-05). */
export interface WebAuthn {
  registrationOptions: typeof generateRegistrationOptions;
  verifyRegistration: typeof verifyRegistrationResponse;
  authenticationOptions: typeof generateAuthenticationOptions;
  verifyAuthentication: typeof verifyAuthenticationResponse;
}

export interface Deps {
  stores?: AccountStores;
  webauthn?: WebAuthn;
  now?: () => number;
  secret?: string;
  newId?: () => string;
}

const blobKV = <T,>(name: string): KV<T> => {
  const store = getStore({ name, consistency: 'strong' });
  return {
    get: async (key) => (await store.get(key, { type: 'json' })) as T | null,
    set: async (key, value) => void (await store.setJSON(key, value)),
    delete: (key) => store.delete(key),
  };
};

const blobStores = (): AccountStores => ({
  accounts: blobKV('accounts'),
  credentials: blobKV('accounts-credentials'),
  recovery: blobKV('accounts-recovery'),
  backups: blobKV('backups'),
  challenges: blobKV('account-challenges'),
  limits: blobKV('account-limits'),
});

/** RP de las passkeys: el dominio de la app (S14-07), o el de la petición en desarrollo local. */
function relyingParty(req: Request): { rpID: string; origin: string } {
  const url = new URL(req.url);
  const rpID = process.env.ARVID_RP_ID ?? (url.hostname === 'localhost' ? 'localhost' : 'arvid-app.netlify.app');
  return { rpID, origin: process.env.ARVID_ORIGIN ?? (rpID === 'localhost' ? url.origin : `https://${rpID}`) };
}

const clientIp = (req: Request) => req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';

export async function handle(req: Request, deps: Deps = {}): Promise<Response> {
  const stores = deps.stores ?? blobStores();
  const wa = deps.webauthn ?? {
    registrationOptions: generateRegistrationOptions,
    verifyRegistration: verifyRegistrationResponse,
    authenticationOptions: generateAuthenticationOptions,
    verifyAuthentication: verifyAuthenticationResponse,
  };
  const now = deps.now?.() ?? Date.now();
  const secret = deps.secret ?? process.env.ARVID_SESSION_SECRET;
  if (!secret) return json(503, { error: 'not-configured' });
  const newId = deps.newId ?? (() => crypto.randomUUID());
  const route = new URL(req.url).pathname.replace(/^\/api\/account\/?/, '').replace(/\/$/, '');
  const ipKey = `ip:${sha256(`${secret}:${clientIp(req)}`)}`;
  const { rpID, origin } = relyingParty(req);

  let body: Record<string, unknown> = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json(400, { error: 'invalid' });
    }
  }
  const sessionAccount = () => verifySession(req.headers.get('authorization')?.replace(/^Bearer /, ''), secret, now);
  const session = (accountId: string) => signSession(accountId, secret, now);

  /** Límite con ventana: devuelve `false` si se superó. */
  async function within(key: string, max: number, windowMs: number): Promise<boolean> {
    const entry = await stores.limits.get(key);
    const current = entry && entry.until > now ? entry : { count: 0, until: now + windowMs };
    if (current.count >= max) return false;
    await stores.limits.set(key, { count: current.count + 1, until: current.until });
    return true;
  }

  async function takeChallenge(id: unknown, kind: string) {
    if (typeof id !== 'string') return undefined;
    const c = await stores.challenges.get(id);
    await stores.challenges.delete(id);
    return c && c.kind === kind && c.exp > now ? c : undefined;
  }

  async function createAccount(id: string, alias: string, recovery: { auth: string; wrapped: string }): Promise<Account> {
    const account: Account = {
      id,
      alias,
      level: 1,
      createdAt: new Date(now).toISOString(),
      backupVersion: 0,
      recoveryAuthHash: sha256(recovery.auth),
      credentials: [],
      wrapped: { recovery: recovery.wrapped, prf: {} },
    };
    await stores.recovery.set(account.recoveryAuthHash, { accountId: id });
    return account;
  }

  const prfWrapped = z.string().regex(/^[A-Za-z0-9_-]+$/).max(200).optional();

  // ---------- Crear la cuenta (CU-02, CU-04) ----------
  if (route === 'register/options' && req.method === 'POST') {
    const alias = Alias.safeParse(body.alias);
    if (!alias.success) return json(400, { error: 'invalid' });
    const accountId = newId();
    const options = await wa.registrationOptions({
      rpName: 'ARVID',
      rpID,
      userName: alias.data,
      userDisplayName: `ARVID · ${alias.data}`,
      userID: new TextEncoder().encode(accountId),
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      // En el propio teléfono: Android usa su gestor y no ofrece el QR de otro dispositivo (D-181)
      preferredAuthenticatorType: 'localDevice',
    });
    const challengeId = newId();
    await stores.challenges.set(challengeId, { kind: 'register', challenge: options.challenge, accountId, alias: alias.data, exp: now + CHALLENGE_MS });
    return json(200, { challengeId, options });
  }

  if (route === 'register/verify' && req.method === 'POST') {
    const recovery = RecoveryIn.safeParse(body.recovery);
    const prf = prfWrapped.safeParse(body.prfWrapped);
    if (!recovery.success || !prf.success) return json(400, { error: 'invalid' });
    const c = await takeChallenge(body.challengeId, 'register');
    if (!c) return json(400, { error: 'challenge' });
    if (!(await within(`${ipKey}:accounts`, ACCOUNTS_PER_IP_DAY, 86_400_000))) return json(429, { error: 'limit' });
    let info;
    try {
      const v = await wa.verifyRegistration({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
      if (!v.verified || !v.registrationInfo) return json(401, { error: 'passkey' });
      info = v.registrationInfo.credential;
    } catch (e) {
      // El motivo de la librería (origen, reto, formato…), sin datos de la cuenta
      console.warn(`account passkey: ${(e as Error).message}`);
      return json(401, { error: 'passkey' });
    }
    const account = await createAccount(c.accountId, c.alias ?? 'ARVID', recovery.data);
    account.credentials.push(info.id);
    if (prf.data) account.wrapped.prf[info.id] = prf.data;
    await stores.credentials.set(info.id, {
      accountId: account.id,
      publicKey: Buffer.from(info.publicKey).toString('base64url'),
      counter: info.counter,
      transports: info.transports,
    });
    await stores.accounts.set(account.id, account);
    return json(200, { accountId: account.id, session: session(account.id) });
  }

  if (route === 'register/recovery' && req.method === 'POST') {
    const alias = Alias.safeParse(body.alias);
    const recovery = RecoveryIn.safeParse(body.recovery);
    if (!alias.success || !recovery.success) return json(400, { error: 'invalid' });
    if (!(await within(`${ipKey}:accounts`, ACCOUNTS_PER_IP_DAY, 86_400_000))) return json(429, { error: 'limit' });
    const account = await createAccount(newId(), alias.data, recovery.data);
    await stores.accounts.set(account.id, account);
    return json(200, { accountId: account.id, session: session(account.id) });
  }

  // ---------- Entrar (RC-02 a RC-06) ----------
  if (route === 'login/options' && req.method === 'POST') {
    const options = await wa.authenticationOptions({ rpID, userVerification: 'required', allowCredentials: [] });
    const challengeId = newId();
    await stores.challenges.set(challengeId, { kind: 'login', challenge: options.challenge, accountId: '', exp: now + CHALLENGE_MS });
    return json(200, { challengeId, options });
  }

  if (route === 'login/verify' && req.method === 'POST') {
    const c = await takeChallenge(body.challengeId, 'login');
    if (!c) return json(400, { error: 'challenge' });
    const response = body.response as AuthenticationResponseJSON | undefined;
    const cred = typeof response?.id === 'string' ? await stores.credentials.get(response.id) : null;
    const account = cred ? await stores.accounts.get(cred.accountId) : null;
    if (!response || !cred || !account) return json(401, { error: 'passkey' });
    try {
      const v = await wa.verifyAuthentication({
        response,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: { id: response.id, publicKey: Buffer.from(cred.publicKey, 'base64url'), counter: cred.counter, transports: cred.transports as never },
      });
      if (!v.verified) return json(401, { error: 'passkey' });
      await stores.credentials.set(response.id, { ...cred, counter: v.authenticationInfo.newCounter });
    } catch (e) {
      // El motivo de la librería (origen, reto, formato…), sin datos de la cuenta
      console.warn(`account passkey: ${(e as Error).message}`);
      return json(401, { error: 'passkey' });
    }
    return json(200, {
      accountId: account.id,
      alias: account.alias,
      session: session(account.id),
      wrapped: { recovery: account.wrapped.recovery, prf: account.wrapped.prf[response.id] },
    });
  }

  if (route === 'login/recovery' && req.method === 'POST') {
    const auth = RecoveryIn.shape.auth.safeParse(body.auth);
    // Cada 5 intentos fallidos desde una IP, 15 min de espera; el mensaje nunca dice si la cuenta existe (RC-06)
    const fails = await stores.limits.get(`${ipKey}:recovery`);
    if (fails && fails.until > now && fails.count >= RECOVERY_FAILS) return json(429, { error: 'wait' });
    const entry = auth.success ? await stores.recovery.get(sha256(auth.data)) : null;
    const account = entry ? await stores.accounts.get(entry.accountId) : null;
    if (!account) {
      await within(`${ipKey}:recovery`, RECOVERY_FAILS, RECOVERY_LOCK_MS);
      return json(401, { error: 'recovery' });
    }
    return json(200, { accountId: account.id, alias: account.alias, session: session(account.id), wrapped: { recovery: account.wrapped.recovery } });
  }

  // ---------- Con sesión ----------
  const accountId = sessionAccount();
  if (!accountId) return json(401, { error: 'session' });
  const account = await stores.accounts.get(accountId);
  if (!account) return json(401, { error: 'session' });

  if (route === 'backup' && req.method === 'GET') {
    const backup = await stores.backups.get(accountId);
    return backup ? json(200, { ...backup, session: session(accountId) }) : json(404, { error: 'none', version: 0 });
  }

  if (route === 'backup' && req.method === 'PUT') {
    const parsed = BackupIn.safeParse(body);
    if (!parsed.success) return json(parsed.error.issues.some((i) => i.code === 'too_big') ? 413 : 400, { error: 'invalid' });
    // Otro dispositivo subió entre medias: la app pregunta qué copia usar (CP-05)
    if (parsed.data.baseVersion !== account.backupVersion) return json(409, { error: 'conflict', version: account.backupVersion, backupAt: account.backupAt });
    if (!(await within(`acc:${accountId}:uploads`, UPLOADS_PER_HOUR, 3_600_000))) return json(429, { error: 'limit' });
    const version = account.backupVersion + 1;
    const updatedAt = new Date(now).toISOString();
    await stores.backups.set(accountId, { version, data: parsed.data.data, updatedAt });
    await stores.accounts.set(accountId, { ...account, backupVersion: version, backupAt: updatedAt, level: parsed.data.level });
    return json(200, { version, updatedAt, session: session(accountId) });
  }

  if (route === 'recovery/rotate' && req.method === 'POST') {
    const recovery = RecoveryIn.safeParse(body.recovery);
    if (!recovery.success) return json(400, { error: 'invalid' });
    await stores.recovery.delete(account.recoveryAuthHash);
    const recoveryAuthHash = sha256(recovery.data.auth);
    await stores.recovery.set(recoveryAuthHash, { accountId });
    await stores.accounts.set(accountId, { ...account, recoveryAuthHash, wrapped: { ...account.wrapped, recovery: recovery.data.wrapped } });
    return json(200, { ok: true });
  }

  if (route === 'passkey/options' && req.method === 'POST') {
    const options = await wa.registrationOptions({
      rpName: 'ARVID',
      rpID,
      userName: account.alias,
      userDisplayName: `ARVID · ${account.alias}`,
      userID: new TextEncoder().encode(accountId),
      attestationType: 'none',
      excludeCredentials: account.credentials.map((id) => ({ id })),
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      // En el propio teléfono: Android usa su gestor y no ofrece el QR de otro dispositivo (D-181)
      preferredAuthenticatorType: 'localDevice',
    });
    const challengeId = newId();
    await stores.challenges.set(challengeId, { kind: 'passkey', challenge: options.challenge, accountId, exp: now + CHALLENGE_MS });
    return json(200, { challengeId, options });
  }

  if (route === 'passkey/verify' && req.method === 'POST') {
    const prf = prfWrapped.safeParse(body.prfWrapped);
    const c = await takeChallenge(body.challengeId, 'passkey');
    if (!c || c.accountId !== accountId || !prf.success) return json(400, { error: 'challenge' });
    try {
      const v = await wa.verifyRegistration({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
      if (!v.verified || !v.registrationInfo) return json(401, { error: 'passkey' });
      const info = v.registrationInfo.credential;
      await stores.credentials.set(info.id, {
        accountId,
        publicKey: Buffer.from(info.publicKey).toString('base64url'),
        counter: info.counter,
        transports: info.transports,
      });
      await stores.accounts.set(accountId, {
        ...account,
        credentials: [...account.credentials, info.id],
        wrapped: { ...account.wrapped, prf: prf.data ? { ...account.wrapped.prf, [info.id]: prf.data } : account.wrapped.prf },
      });
    } catch (e) {
      // El motivo de la librería (origen, reto, formato…), sin datos de la cuenta
      console.warn(`account passkey: ${(e as Error).message}`);
      return json(401, { error: 'passkey' });
    }
    return json(200, { ok: true });
  }

  // Borrar la cuenta: todo lo del servidor; en el dispositivo sigue todo como sin cuenta (GC-05)
  if (route === '' && req.method === 'DELETE') {
    await Promise.all([
      ...account.credentials.map((id) => stores.credentials.delete(id)),
      stores.recovery.delete(account.recoveryAuthHash),
      stores.backups.delete(accountId),
    ]);
    await stores.accounts.delete(accountId);
    return json(200, { ok: true });
  }

  return json(404, { error: 'route' });
}

export default (req: Request): Promise<Response> => handle(req);

export const config = {
  path: ['/api/account', '/api/account/*'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
