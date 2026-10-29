// Cifrado de la cuenta (spec 14, §3 y §5.1): todo ocurre en el dispositivo con Web Crypto. El servidor solo recibe
// `auth` (para reconocer la clave de recuperación) y la clave de datos envuelta; nunca la clave `wrap` ni los datos en
// claro (NFR14-01).

/** Base32 de Crockford: sin I, L, O ni U, para leer y escribir la clave sin confusiones. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const KEY_BYTES = 16; // 128 bits
const KEY_CHARS = 26; // 26 × 5 = 130 bits (los 2 de más, a cero)
const SALT = new TextEncoder().encode('arvid-account-v1');

// ---------- base64url ----------

export function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// ---------- Clave de recuperación (CU-02) ----------

/** Carácter de control: suma ponderada por posición, así detecta una letra mal copiada o dos intercambiadas. */
function checkChar(chars: string): string {
  let sum = 0;
  for (let i = 0; i < chars.length; i++) sum += (i + 1) * ALPHABET.indexOf(chars[i]!);
  return ALPHABET[sum % 32]!;
}

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32ToBytes(chars: string): Uint8Array<ArrayBuffer> {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of chars) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out.slice(0, KEY_BYTES));
}

/** Formato visible: `ARVID-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXX` (26 caracteres y uno de control). */
export function formatRecoveryKey(bytes: Uint8Array): string {
  const chars = bytesToBase32(bytes).slice(0, KEY_CHARS);
  const all = chars + checkChar(chars);
  return ['ARVID', ...(all.match(/.{1,4}/g) ?? [])].join('-');
}

export function newRecoveryKey(): { bytes: Uint8Array<ArrayBuffer>; text: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(KEY_BYTES));
  return { bytes, text: formatRecoveryKey(bytes) };
}

/** Lee una clave escrita a mano: sin importar mayúsculas, guiones ni espacios; I/L se leen como 1 y O como 0. */
export function parseRecoveryKey(text: string): Uint8Array<ArrayBuffer> | undefined {
  let s = text.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.startsWith('ARVID')) s = s.slice(5);
  s = s.replace(/[IL]/g, '1').replace(/O/g, '0');
  if (s.length !== KEY_CHARS + 1 || [...s].some((c) => !ALPHABET.includes(c))) return undefined;
  const chars = s.slice(0, KEY_CHARS);
  if (checkChar(chars) !== s[KEY_CHARS]) return undefined;
  return base32ToBytes(chars);
}

// ---------- Derivación de claves (S14-02) ----------

async function hkdf(secret: Uint8Array<ArrayBuffer>) {
  return crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

const wrapKeyFrom = (base: CryptoKey, info: string) =>
  crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: new TextEncoder().encode(info) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

/**
 * De la clave de recuperación salen dos claves independientes: `auth`, que va al servidor para reconocerla, y `wrap`,
 * que nunca sale del dispositivo y envuelve la clave de datos.
 */
export async function deriveRecovery(bytes: Uint8Array<ArrayBuffer>): Promise<{ auth: string; wrap: CryptoKey }> {
  const base = await hkdf(bytes);
  const auth = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: new TextEncoder().encode('auth') }, base, 256);
  return { auth: toBase64Url(new Uint8Array(auth)), wrap: await wrapKeyFrom(base, 'wrap') };
}

/** Clave `wrap` a partir del secreto PRF de una passkey (S14-03). */
export async function derivePrfWrap(prf: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return wrapKeyFrom(await hkdf(prf), 'prf-wrap');
}

// ---------- Clave de datos y copia cifrada (CP-01) ----------

/** Extraíble: hace falta volver a envolverla al generar otra clave de recuperación o añadir una passkey (GC-02, GC-03). */
export function newDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function seal(key: CryptoKey, plain: Uint8Array<ArrayBuffer>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return toBase64Url(out);
}

async function open(key: CryptoKey, sealed: string): Promise<Uint8Array<ArrayBuffer>> {
  const bytes = fromBase64Url(sealed);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12)));
}

export async function wrapDataKey(dataKey: CryptoKey, wrap: CryptoKey): Promise<string> {
  return seal(wrap, new Uint8Array(await crypto.subtle.exportKey('raw', dataKey)));
}

/** Falla (lanza) si la clave `wrap` no es la correcta. */
export async function unwrapDataKey(wrapped: string, wrap: CryptoKey): Promise<CryptoKey> {
  const raw = await open(wrap, wrapped);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** La copia: comprimida (gzip) y cifrada con la clave de datos antes de salir del dispositivo (CP-01). */
export async function encryptBackup(dataKey: CryptoKey, json: string): Promise<string> {
  return seal(dataKey, await pipe(new TextEncoder().encode(json), new CompressionStream('gzip')));
}

export async function decryptBackup(dataKey: CryptoKey, sealed: string): Promise<string> {
  return new TextDecoder().decode(await pipe(await open(dataKey, sealed), new DecompressionStream('gzip')));
}
