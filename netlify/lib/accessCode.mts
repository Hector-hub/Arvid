// Códigos de acceso a la IA (D-100): uno por persona, con forma ARVID-<nombre>-<firma>. La firma es un HMAC del
// nombre con el secreto ARVID_CODE_SECRET (solo en Netlify y en la máquina del responsable), así que se pueden crear
// tantos códigos como haga falta sin guardarlos en ningún sitio, y nadie puede inventarse uno válido.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Mensajes con IA por código y día (UTC). */
export const DAILY_CREDITS = 25;

const NAME = /^[a-z0-9]{2,16}$/;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I, para teclearlo sin dudas
const SIG_LENGTH = 10;

function signature(name: string, secret: string): string {
  const mac = createHmac('sha256', secret).update(`arvid-ai:${name}`).digest();
  return Array.from(mac.subarray(0, SIG_LENGTH), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** Crea el código de una persona. `name`: 2–16 letras minúsculas o números. */
export function createCode(name: string, secret: string): string {
  if (!NAME.test(name)) throw new Error('El nombre debe tener de 2 a 16 letras minúsculas o números, sin espacios.');
  return `ARVID-${name.toUpperCase()}-${signature(name, secret)}`;
}

/** Nombre del dueño si el código es válido (sin distinguir mayúsculas ni espacios); si no, `undefined`. */
export function verifyCode(code: string, secret: string): string | undefined {
  const match = /^ARVID-([A-Z0-9]{2,16})-([A-Z0-9]{10})$/.exec(code.trim().toUpperCase().replace(/\s+/g, ''));
  if (!match) return undefined;
  const name = match[1]!.toLowerCase();
  const expected = Buffer.from(signature(name, secret));
  const given = Buffer.from(match[2]!);
  return expected.length === given.length && timingSafeEqual(expected, given) ? name : undefined;
}
