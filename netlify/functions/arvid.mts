// Función de Netlify para ARVID con IA (spec 06, IA-01): única pieza de servidor de la app (D-066).
// Añade la clave de Mistral (variable de entorno MISTRAL_API_KEY, nunca en el código) y reenvía la petición.
// Protección contra abuso (D-100): código de acceso por persona (cabecera X-Arvid-Code, firmado con la variable
// ARVID_CODE_SECRET), DAILY_CREDITS mensajes por código y día (contados en Netlify Blobs) y límite por IP de Netlify.
import { getStore } from '@netlify/blobs';
import { z } from 'zod';
import { DAILY_CREDITS, verifyCode } from '../lib/accessCode.mts';
import {
  AI_MAX_BODY,
  AI_MAX_HISTORY,
  AI_MAX_TOKENS,
  AI_MAX_USER_MESSAGE,
  AI_MODEL,
  AI_MOMENTS,
  AI_TEMPERATURE,
  buildMessages,
  sanitizeReply,
  type AiRequest,
} from '../../src/domain/arvid/ai';
import { COMPANIONS } from '../../src/domain/arvid/companion';

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
/** El plan gratuito de Netlify corta las funciones a los 10 s. */
const MISTRAL_TIMEOUT_MS = 9_000;

const RequestSchema = z.object({
  locale: z.enum(['es', 'en']),
  moment: z.enum(AI_MOMENTS as unknown as [string, ...string[]]),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(AI_MAX_USER_MESSAGE * 5) }))
    .max(AI_MAX_HISTORY),
  context: z.record(z.string(), z.unknown()),
  companion: z.enum(COMPANIONS).optional(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Contador de mensajes por código y día. */
export interface Usage {
  /** Suma uno si queda crédito y devuelve si se pudo. */
  take(key: string, limit: number): Promise<boolean>;
}

/** Contador en Netlify Blobs. Dos peticiones a la vez pueden contar una sola: es un tope de gasto, no de facturación. */
const blobUsage: Usage = {
  async take(key, limit) {
    const store = getStore('ai-usage');
    const used = Number((await store.get(key)) ?? 0);
    if (used >= limit) return false;
    await store.set(key, String(used + 1));
    return true;
  },
};

/** Lógica de la función con dependencias inyectables (pruebas). */
export async function handle(
  req: Request,
  deps: { apiKey?: string; codeSecret?: string; usage?: Usage; now?: () => Date; fetch: typeof fetch },
): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  if (!deps.apiKey) return json(503, { error: 'unavailable' });
  // Sin el secreto configurado no se exige código (para no cortar la IA al desplegar antes de crearlo)
  let owner: string | undefined;
  if (deps.codeSecret) {
    owner = verifyCode(req.headers.get('X-Arvid-Code') ?? '', deps.codeSecret);
    if (!owner) return json(401, { error: 'code' });
  }

  const raw = await req.text();
  if (raw.length > AI_MAX_BODY) return json(413, { error: 'too-large' });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid' });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return json(400, { error: 'invalid' });

  // El crédito se gasta solo con peticiones válidas
  if (owner) {
    const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
    if (!(await (deps.usage ?? blobUsage).take(`${owner}/${day}`, DAILY_CREDITS))) return json(429, { error: 'daily' });
  }

  let res: Response;
  try {
    res = await deps.fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deps.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        max_tokens: AI_MAX_TOKENS,
        messages: buildMessages(parsed.data as AiRequest),
      }),
      signal: AbortSignal.timeout(MISTRAL_TIMEOUT_MS),
    });
  } catch {
    return json(504, { error: 'timeout' });
  }
  if (!res.ok) {
    // El mensaje de Mistral solo va a los registros de la función (no contiene la clave ni el contexto)
    console.error(`Mistral ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    // Cuota de la clave de pruebas agotada (IA-07): ARVID lo explica con su frase fija
    return res.status === 429 ? json(429, { error: 'quota' }) : json(502, { error: 'upstream' });
  }

  const data = (await res.json().catch(() => undefined)) as { choices?: { message?: { content?: unknown } }[] } | undefined;
  const content = data?.choices?.[0]?.message?.content;
  const reply = typeof content === 'string' ? sanitizeReply(content) : '';
  if (!reply) return json(502, { error: 'empty' });
  return json(200, { reply });
}

export default (req: Request): Promise<Response> =>
  handle(req, { apiKey: process.env.MISTRAL_API_KEY, codeSecret: process.env.ARVID_CODE_SECRET, fetch });

/** Más de 20 peticiones por minuto desde la misma IP las rechaza Netlify (429) antes de llegar aquí. */
export const config = {
  path: '/api/arvid',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
