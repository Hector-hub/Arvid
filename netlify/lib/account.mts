// Cuenta ligera (spec 14): sesiones firmadas, datos guardados y almacenes. El servidor no puede leer las copias: solo
// guarda la copia cifrada, las claves de datos envueltas y lo necesario para las passkeys (PV-01).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

/** Una sesión dura un año y se renueva al usarse (S14-05). */
export const SESSION_DAYS = 365;
export const BACKUP_MAX_CHARS = 7_000_000; // ~5 MB de copia cifrada en base64url (CP-06)
export const CHALLENGE_MS = 5 * 60_000;

export interface Account {
  id: string;
  alias: string;
  level: number;
  createdAt: string;
  backupAt?: string;
  backupVersion: number;
  /** sha256 de `auth` de la clave de recuperación. */
  recoveryAuthHash: string;
  credentials: string[];
  /** La clave de datos envuelta con la clave de recuperación y con el PRF de cada passkey que lo admite. */
  wrapped: { recovery: string; prf: Record<string, string> };
}

export interface Credential {
  accountId: string;
  /** Clave pública en base64url. */
  publicKey: string;
  counter: number;
  transports?: string[];
}

export interface Challenge {
  kind: 'register' | 'login' | 'passkey';
  challenge: string;
  accountId: string;
  alias?: string;
  exp: number;
}

export interface Backup {
  version: number;
  data: string;
  updatedAt: string;
}

/** Almacén clave → JSON (Netlify Blobs en producción, en memoria en las pruebas). */
export interface KV<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface AccountStores {
  accounts: KV<Account>;
  credentials: KV<Credential>;
  /** `auth` de la clave de recuperación (su hash) → cuenta. */
  recovery: KV<{ accountId: string }>;
  backups: KV<Backup>;
  challenges: KV<Challenge>;
  limits: KV<{ count: number; until: number }>;
}

export const sha256 = (text: string) => createHash('sha256').update(text).digest('base64url');

// ---------- Sesión (S14-05) ----------

export function signSession(accountId: string, secret: string, now: number): string {
  const payload = Buffer.from(JSON.stringify({ a: accountId, e: now + SESSION_DAYS * 86_400_000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`;
}

/** El id de cuenta de una sesión válida y sin caducar, o `undefined`. */
export function verifySession(token: string | null | undefined, secret: string, now: number): string | undefined {
  const [payload, sig] = (token ?? '').split('.');
  if (!payload || !sig) return undefined;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return undefined;
  try {
    const { a, e } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { a?: unknown; e?: unknown };
    return typeof a === 'string' && typeof e === 'number' && e > now ? a : undefined;
  } catch {
    return undefined;
  }
}

// ---------- Validación ----------

const b64 = z.string().regex(/^[A-Za-z0-9_-]+$/);
export const Alias = z.string().trim().min(1).max(40);
export const RecoveryIn = z.object({ auth: b64.length(43), wrapped: b64.max(200) });
export const BackupIn = z.object({ baseVersion: z.number().int().min(0), data: b64.max(BACKUP_MAX_CHARS), level: z.number().int().min(1).max(999) });

/** Almacén con listado por prefijo (los participantes de un reto, spec 15 §4.1). */
export interface ListKV<T> extends KV<T> {
  list(prefix: string): Promise<string[]>;
}
