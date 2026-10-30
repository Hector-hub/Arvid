// Cuenta ligera y copia en la nube en la app (spec 14, fase 14c), para todos desde la 2.0 (D-203). El cifrado vive en `domain/account/crypto` y el servidor en `netlify/functions/account`.
import { startAuthentication, startRegistration, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { useSyncExternalStore } from 'react';
import { buildBackup, parseBackup, replaceAllData } from '../../data/backup';
import { saveSetting, type DataContext } from '../../data/repository';
import {
  decryptBackup,
  derivePrfWrap,
  deriveRecovery,
  encryptBackup,
  newDataKey,
  newRecoveryKey,
  parseRecoveryKey,
  unwrapDataKey,
  wrapDataKey,
} from '../../domain/account/crypto';

/** La cuenta en este dispositivo (ajuste solo del dispositivo: no va en el backup). */
export interface DeviceAccount {
  id: string;
  alias: string;
  session: string;
  dataKey: CryptoKey;
  /** Entró con la clave de recuperación: se le ofrece añadir una passkey (GC-03). */
  viaRecovery?: boolean;
}

/** Desde la 2.0 la cuenta está para todos (D-203): sin `VITE_ACCOUNTS`, `?cuentas=1` ni los 7 toques. */
export function accountsEnabled(): boolean {
  return true;
}

// ---------- Estado de la copia (CP-03), solo en este dispositivo ----------

export interface CloudState {
  version: number;
  uploadedAt?: string;
  dirty: boolean;
  uploading?: boolean;
  error?: 'offline' | 'failed' | 'too-big';
  /** Otro dispositivo subió entre medias (CP-05). */
  conflict?: { version: number; backupAt?: string };
}

const CLOUD_KEY = 'arvid-cloud';
const listeners = new Set<() => void>();
let cloud: CloudState = readCloud();

function readCloud(): CloudState {
  try {
    return { version: 0, dirty: false, ...(JSON.parse(localStorage.getItem(CLOUD_KEY) ?? '{}') as Partial<CloudState>), uploading: false };
  } catch {
    return { version: 0, dirty: false };
  }
}

export function setCloud(patch: Partial<CloudState>) {
  cloud = { ...cloud, ...patch };
  try {
    // «Subiendo» no se guarda: tras cerrar la app no sigue subiendo
    localStorage.setItem(CLOUD_KEY, JSON.stringify({ ...cloud, uploading: undefined }));
  } catch {
    // Almacenamiento no disponible: el estado vive en memoria
  }
  listeners.forEach((l) => l());
}

export function resetCloud() {
  setCloud({ version: 0, uploadedAt: undefined, dirty: false, error: undefined, conflict: undefined });
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => cloud,
  );
}

// ---------- API ----------

export class AccountError extends Error {
  constructor(
    readonly code: string,
    readonly status = 0,
    readonly detail?: Record<string, unknown>,
  ) {
    super(code);
  }
}

async function api<T>(method: string, route: string, body?: unknown, session?: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/account/${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AccountError('offline');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new AccountError(String(data.error ?? 'failed'), res.status, data);
  return data as T;
}

// ---------- PRF de la passkey (S14-03) ----------

const PRF_SALT = new TextEncoder().encode('arvid-prf-v1');
const withPrf = <T extends object>(options: T) => ({ ...options, extensions: { ...(options as { extensions?: object }).extensions, prf: { eval: { first: PRF_SALT } } } }) as T;

function prfOutput(results: unknown): Uint8Array<ArrayBuffer> | undefined {
  const first = (results as { prf?: { results?: { first?: ArrayBuffer | Uint8Array } } } | undefined)?.prf?.results?.first;
  return first ? new Uint8Array(first) : undefined;
}

export const passkeysAvailable = () => browserSupportsWebAuthn();

/**
 * Dónde puede guardar passkeys este teléfono (D-194): `local` si tiene su propio autenticador (cara, huella o PIN con
 * gestor de passkeys); `remote` si el navegador las admite pero solo con otro dispositivo o una llave USB; `none` si no
 * las admite. Mientras se pregunta, `undefined`.
 */
export type PasskeySupport = 'local' | 'remote' | 'none';
let support: PasskeySupport | undefined;
const supportListeners = new Set<() => void>();
const REMOTE_KEY = 'arvid-passkey-remote';

const setSupport = (value: PasskeySupport) => {
  support = value;
  supportListeners.forEach((l) => l());
};

/** Lo aprendido al intentarlo (D-194): este teléfono solo ofreció otro dispositivo o una llave USB. */
export function rememberRemoteOnly() {
  try {
    localStorage.setItem(REMOTE_KEY, '1');
  } catch {
    // Sin almacenamiento: se vuelve a preguntar la próxima vez
  }
  setSupport('remote');
}

const learnedRemote = () => {
  try {
    return localStorage.getItem(REMOTE_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Pregunta al navegador si puede guardar passkeys en el propio teléfono: con `getClientCapabilities` (Chrome reciente,
 * la respuesta más precisa) o, si no lo tiene, si hay autenticador propio. Algunos Android dicen que sí aunque luego
 * solo ofrezcan otro dispositivo: por eso manda lo aprendido al intentarlo.
 */
async function askSupport(): Promise<PasskeySupport> {
  if (!passkeysAvailable()) return 'none';
  if (learnedRemote()) return 'remote';
  const P = PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean | undefined>> };
  if (typeof P.getClientCapabilities === 'function') {
    const caps = await P.getClientCapabilities().catch(() => ({}) as Record<string, boolean | undefined>);
    if (caps.passkeyPlatformAuthenticator === false) return 'remote';
    if (caps.passkeyPlatformAuthenticator === true) return 'local';
  }
  return (await platformAuthenticatorIsAvailable().catch(() => false)) ? 'local' : 'remote';
}

export function usePasskeySupport(): PasskeySupport | undefined {
  return useSyncExternalStore(
    (fn) => {
      supportListeners.add(fn);
      if (support === undefined) void askSupport().then(setSupport, () => setSupport('remote'));
      return () => supportListeners.delete(fn);
    },
    () => support,
  );
}

/**
 * Crea la passkey pidiendo el PRF (S14-03). Algunos Android rechazan el PRF al crearla: entonces se reintenta sin él
 * (D-192). La passkey sirve igual para entrar; los datos se descifran con la clave de recuperación.
 */
async function registerPasskey(options: PublicKeyCredentialCreationOptionsJSON) {
  // Sin «en este dispositivo»: si el teléfono no tiene gestor de passkeys, que ofrezca lo que tenga (otro dispositivo)
  const anywhere: PublicKeyCredentialCreationOptionsJSON = {
    ...options,
    hints: undefined,
    authenticatorSelection: { ...options.authenticatorSelection, authenticatorAttachment: undefined },
  };
  const attempts = [withPrf(options), options, anywhere];
  let last: unknown;
  for (const optionsJSON of attempts) {
    try {
      return await startRegistration({ optionsJSON });
    } catch (e) {
      last = e;
      const name = (e as { cause?: { name?: string } })?.cause?.name ?? (e as { name?: string })?.name;
      // Cerrar la ventana del sistema no se reintenta
      if (name === 'NotAllowedError' || name === 'AbortError' || (e as { code?: string })?.code === 'ERROR_CEREMONY_ABORTED') break;
    }
  }
  // Sin passkey, sea cual sea el motivo (cancelar, el teléfono solo ofrecía otro dispositivo o una llave USB, o un
  // error del propio teléfono): la app pregunta y ofrece la clave de recuperación (D-194). El motivo, para diagnosticar
  const detail = (last as { cause?: { name?: string }; name?: string })?.cause?.name ?? (last as { name?: string })?.name;
  throw new AccountError('passkey-cancelled', undefined, { reason: detail });
}

// ---------- Crear la cuenta (CU-02, CU-04) ----------

export interface Created {
  account: DeviceAccount;
  /** Se muestra una sola vez (CU-02). */
  recoveryKey: string;
}

export async function createAccount(ctx: DataContext, alias: string, withPasskey = passkeysAvailable()): Promise<Created> {
  const recovery = newRecoveryKey();
  const { auth, wrap } = await deriveRecovery(recovery.bytes);
  const dataKey = await newDataKey();
  const wrapped = await wrapDataKey(dataKey, wrap);
  let result: { accountId: string; session: string };
  if (withPasskey) {
    const { challengeId, options } = await api<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>('POST', 'register/options', { alias });
    const response = await registerPasskey(options);
    const prf = prfOutput(response.clientExtensionResults);
    const prfWrapped = prf ? await wrapDataKey(dataKey, await derivePrfWrap(prf)) : undefined;
    result = await api('POST', 'register/verify', { challengeId, response, recovery: { auth, wrapped }, prfWrapped });
  } else {
    result = await api('POST', 'register/recovery', { alias, recovery: { auth, wrapped } });
  }
  const account: DeviceAccount = { id: result.accountId, alias, session: result.session, dataKey, viaRecovery: !withPasskey };
  quiet();
  await saveSetting(ctx.db, 'account', account);
  resetCloud();
  await uploadBackup(ctx, account);
  quiet();
  return { account, recoveryKey: recovery.text };
}

// ---------- Entrar y restaurar (RC-02 a RC-05) ----------

interface LoginReply {
  accountId: string;
  alias: string;
  session: string;
  wrapped: { recovery: string; prf?: string };
}

/** Lo que falta tras entrar con la passkey sin PRF: la clave de recuperación para abrir la copia (RC-03). */
export interface NeedsRecoveryKey {
  needsKey: true;
  login: LoginReply;
}

export async function signInWithPasskey(): Promise<{ account: Omit<DeviceAccount, 'dataKey'>; dataKey: CryptoKey } | NeedsRecoveryKey> {
  const { challengeId, options } = await api<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>('POST', 'login/options', {});
  const response = await startAuthentication({ optionsJSON: withPrf(options) });
  const login = await api<LoginReply>('POST', 'login/verify', { challengeId, response });
  const prf = prfOutput(response.clientExtensionResults);
  if (!prf || !login.wrapped.prf) return { needsKey: true, login };
  const dataKey = await unwrapDataKey(login.wrapped.prf, await derivePrfWrap(prf));
  return { account: { id: login.accountId, alias: login.alias, session: login.session }, dataKey };
}

/** Con la clave escrita: sirve para entrar (sin passkey) o para abrir la copia tras entrar con una passkey sin PRF. */
export async function signInWithRecoveryKey(text: string, afterPasskey?: LoginReply) {
  const bytes = parseRecoveryKey(text);
  if (!bytes) throw new AccountError('recovery-format');
  const { auth, wrap } = await deriveRecovery(bytes);
  const login = afterPasskey ?? (await api<LoginReply>('POST', 'login/recovery', { auth }));
  let dataKey: CryptoKey;
  try {
    dataKey = await unwrapDataKey(login.wrapped.recovery, wrap);
  } catch {
    throw new AccountError('recovery');
  }
  return { account: { id: login.accountId, alias: login.alias, session: login.session, viaRecovery: !afterPasskey }, dataKey };
}

/** Descarga la copia, la descifra y sustituye lo de este dispositivo (RC-02, RC-05). Sin copia, sube la local. */
/**
 * Los cambios que hace la propia cuenta en la base de datos (guardarla, restaurar la copia) no son cambios del usuario:
 * durante un momento el vigilante de la copia no los marca como pendientes (si no, la copia recién bajada o subida se
 * volvería a subir).
 */
let quietUntil = 0;
const QUIET_MS = 2000;
export const accountWriting = () => Date.now() < quietUntil;
const quiet = () => {
  quietUntil = Date.now() + QUIET_MS;
};

export async function restore(ctx: DataContext, account: DeviceAccount): Promise<'restored' | 'empty'> {
  quiet();
  await saveSetting(ctx.db, 'account', account);
  let remote: { version: number; data: string };
  try {
    remote = await api('GET', 'backup', undefined, account.session);
  } catch (e) {
    if (e instanceof AccountError && e.status === 404) {
      resetCloud();
      await uploadBackup(ctx, account);
      return 'empty';
    }
    throw e;
  }
  const parsed = parseBackup(await decryptBackup(account.dataKey, remote.data));
  if (!parsed.ok) throw new AccountError('backup-invalid');
  quiet();
  await replaceAllData(ctx, parsed.backup);
  quiet();
  // `replaceAllData` conserva los ajustes del dispositivo, incluida la cuenta
  setCloud({ version: remote.version, uploadedAt: new Date().toISOString(), dirty: false, error: undefined, conflict: undefined });
  return 'restored';
}

// ---------- Copia en la nube (CP-01 a CP-06) ----------

export async function uploadBackup(ctx: DataContext, account: DeviceAccount, options: { force?: boolean } = {}): Promise<void> {
  if (cloud.uploading) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setCloud({ dirty: true, error: 'offline' });
    return;
  }
  setCloud({ uploading: true });
  try {
    const backup = await buildBackup(ctx.db, __APP_VERSION__, ctx.now());
    const level = Math.max(1, (await ctx.db.settings.get('lastCelebratedLevel'))?.value as number | undefined ?? 1);
    const data = await encryptBackup(account.dataKey, JSON.stringify(backup));
    const baseVersion = options.force && cloud.conflict ? cloud.conflict.version : cloud.version;
    const reply = await api<{ version: number; updatedAt: string }>('PUT', 'backup', { baseVersion, data, level }, account.session);
    setCloud({ version: reply.version, uploadedAt: reply.updatedAt, dirty: false, uploading: false, error: undefined, conflict: undefined });
  } catch (e) {
    const err = e instanceof AccountError ? e : new AccountError('failed');
    if (err.status === 409) {
      setCloud({ uploading: false, dirty: true, conflict: { version: Number(err.detail?.version ?? 0), backupAt: err.detail?.backupAt as string | undefined } });
    } else {
      setCloud({ uploading: false, dirty: true, error: err.code === 'offline' ? 'offline' : err.status === 413 ? 'too-big' : 'failed' });
    }
  }
}

/** Conflicto (CP-05): quedarse con la copia de la nube y sustituir lo de este dispositivo. */
export async function keepCloudCopy(ctx: DataContext, account: DeviceAccount) {
  setCloud({ conflict: undefined });
  await restore(ctx, account);
}

// ---------- Gestionar (GC-02 a GC-05) ----------

export async function rotateRecoveryKey(account: DeviceAccount): Promise<string> {
  const recovery = newRecoveryKey();
  const { auth, wrap } = await deriveRecovery(recovery.bytes);
  await api('POST', 'recovery/rotate', { recovery: { auth, wrapped: await wrapDataKey(account.dataKey, wrap) } }, account.session);
  return recovery.text;
}

export async function addPasskey(ctx: DataContext, account: DeviceAccount) {
  const { challengeId, options } = await api<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>('POST', 'passkey/options', {}, account.session);
  const response = await registerPasskey(options);
  const prf = prfOutput(response.clientExtensionResults);
  const prfWrapped = prf ? await wrapDataKey(account.dataKey, await derivePrfWrap(prf)) : undefined;
  await api('POST', 'passkey/verify', { challengeId, response, prfWrapped }, account.session);
  await saveSetting(ctx.db, 'account', { ...account, viaRecovery: false });
}

/** Salir de este dispositivo: se olvidan la sesión y la clave; los datos locales se quedan (GC-04). */
export async function signOut(ctx: DataContext) {
  await ctx.db.settings.delete('account');
  resetCloud();
}

/** Borrar la cuenta: todo lo del servidor; aquí sigue todo como sin cuenta (GC-05). */
export async function deleteAccount(ctx: DataContext, account: DeviceAccount) {
  await api('DELETE', '', undefined, account.session);
  await signOut(ctx);
}

/** Fichero de texto con la clave, para «Guardar como archivo» (CU-02). */
export function recoveryKeyFile(key: string, alias: string): Blob {
  return new Blob([`ARVID · ${alias}\nClave de recuperación (guárdala en un lugar seguro):\n\n${key}\n`], { type: 'text/plain' });
}
