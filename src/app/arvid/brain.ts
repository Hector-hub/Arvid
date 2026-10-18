// Qué responde ARVID cuando el usuario le escribe (spec 06, CH). En la 0.6.0 no hay IA: explica que pronto podrá
// conversar o que no hay conexión (CH-05). La 0.6.1 añade la llamada a /api/arvid.
import { t } from '../../i18n';

const THINKING_MS = 700;

export async function replyTo(message: string): Promise<string> {
  void message;
  await new Promise((r) => setTimeout(r, THINKING_MS));
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return t('arvid.chat.offline');
  return t('arvid.chat.unavailable');
}
