// @vitest-environment node
// Cifrado de la cuenta (spec 14, S14-02, CP-01, NFR14-01).
import { describe, expect, it } from 'vitest';
import {
  decryptBackup,
  deriveRecovery,
  derivePrfWrap,
  encryptBackup,
  formatRecoveryKey,
  newDataKey,
  newRecoveryKey,
  parseRecoveryKey,
  unwrapDataKey,
  wrapDataKey,
} from './crypto';

describe('clave de recuperación', () => {
  it('formato ARVID- con 7 grupos y se vuelve a leer igual', () => {
    const { bytes, text } = newRecoveryKey();
    expect(text).toMatch(/^ARVID(-[0-9A-HJKMNP-TV-Z]{4}){6}-[0-9A-HJKMNP-TV-Z]{3}$/);
    expect(parseRecoveryKey(text)).toEqual(bytes);
  });

  it('se lee escrita a mano: minúsculas, espacios, sin prefijo, I/L por 1 y O por 0', () => {
    const bytes = new Uint8Array(16).fill(0);
    const text = formatRecoveryKey(bytes);
    expect(parseRecoveryKey(text.toLowerCase().replace(/-/g, ' '))).toEqual(bytes);
    expect(parseRecoveryKey(text.replace('ARVID-', '').replace(/0/g, 'O'))).toEqual(bytes);
  });

  it('una letra cambiada o dos intercambiadas se detectan', () => {
    const { text } = newRecoveryKey();
    const chars = text.replace(/-/g, '').slice(5);
    const changed = chars[0] === 'A' ? 'B' + chars.slice(1) : 'A' + chars.slice(1);
    expect(parseRecoveryKey(changed)).toBeUndefined();
    if (chars[0] !== chars[1]) expect(parseRecoveryKey(chars[1]! + chars[0]! + chars.slice(2))).toBeUndefined();
    expect(parseRecoveryKey('ARVID-1234')).toBeUndefined();
  });
});

describe('claves y copia', () => {
  it('de la clave de recuperación salen `auth` (para el servidor) y `wrap`, distintas y deterministas', async () => {
    const { bytes } = newRecoveryKey();
    const a = await deriveRecovery(bytes);
    const b = await deriveRecovery(bytes);
    expect(a.auth).toHaveLength(43);
    expect(a.auth).toBe(b.auth);
    const other = await deriveRecovery(newRecoveryKey().bytes);
    expect(other.auth).not.toBe(a.auth);
  });

  it('la clave de datos se envuelve y desenvuelve con la de recuperación o con el PRF; con otra, falla', async () => {
    const dataKey = await newDataKey();
    const { wrap } = await deriveRecovery(newRecoveryKey().bytes);
    const prfWrap = await derivePrfWrap(crypto.getRandomValues(new Uint8Array(32)));
    const viaRecovery = await unwrapDataKey(await wrapDataKey(dataKey, wrap), wrap);
    const viaPrf = await unwrapDataKey(await wrapDataKey(dataKey, prfWrap), prfWrap);
    const raw = async (k: CryptoKey) => new Uint8Array(await crypto.subtle.exportKey('raw', k));
    expect(await raw(viaRecovery)).toEqual(await raw(dataKey));
    expect(await raw(viaPrf)).toEqual(await raw(dataKey));
    const wrong = (await deriveRecovery(newRecoveryKey().bytes)).wrap;
    await expect(unwrapDataKey(await wrapDataKey(dataKey, wrap), wrong)).rejects.toThrow();
  });

  it('la copia se comprime y cifra; vuelve igual, con otro IV cada vez y sin el texto en claro', async () => {
    const dataKey = await newDataKey();
    const json = JSON.stringify({ activities: Array.from({ length: 50 }, (_, i) => ({ name: `Leer ${i}` })) });
    const a = await encryptBackup(dataKey, json);
    const b = await encryptBackup(dataKey, json);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThan(json.length);
    expect(Buffer.from(a, 'base64url').toString('latin1')).not.toContain('Leer');
    expect(await decryptBackup(dataKey, a)).toBe(json);
    await expect(decryptBackup(await newDataKey(), a)).rejects.toThrow();
  });
});
