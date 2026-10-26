// Función de Netlify para ARVID con IA (spec 06, IA-01): única pieza de servidor de la app (D-066).
// Añade la clave de Mistral (variable de entorno MISTRAL_API_KEY, nunca en el código) y reenvía la petición.
// Protección contra abuso (D-100): código de acceso por persona (cabecera X-Arvid-Code, firmado con la variable
// ARVID_CODE_SECRET), DAILY_CREDITS mensajes por código y día (contados en Netlify Blobs) y límite por IP de Netlify.
import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { z } from 'zod';
import { DAILY_CREDITS, verifyCode } from '../lib/accessCode.mts';
import { ACTION_RULES, actionTools, checkProposal } from '../../src/domain/arvid/actions';
import { checkMemoryOp, MEMORY_MAX, MEMORY_TEXT_MAX, memoryRules, memoryTools, MEMORY_TOOL_NAMES, type MemoryOp } from '../../src/domain/arvid/memory';
import { isLocalDate, type LocalDate } from '../../src/domain/time/localDate';
import {
  AI_MAX_BODY,
  AI_MAX_HISTORY,
  AI_MAX_TOKENS,
  AI_MAX_USER_MESSAGE,
  AI_MODEL,
  AI_MOMENTS,
  AI_TEMPERATURE,
  NEIGHBOR_IDS,
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
  neighbor: z.enum(NEIGHBOR_IDS).optional(),
  memory: z.array(z.string().max(MEMORY_TEXT_MAX)).max(MEMORY_MAX).optional(),
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Contador de mensajes por código y día. */
export interface Usage {
  /** Suma uno al día `day` del código `owner` si queda crédito y devuelve si se pudo. */
  take(owner: string, day: string, limit: number): Promise<boolean>;
  /** Frase de vecino del día (spec 11, VC-06): aparte de los créditos, como mucho una al día. */
  takeNeighbor(owner: string, day: string): Promise<boolean>;
  /** Devuelve lo gastado si la generación falla (D-124): un error de Mistral no cuesta un crédito. */
  refund(owner: string, day: string, neighbor: boolean): Promise<void>;
}

/**
 * Contador en Netlify Blobs: una sola entrada por código ({ day, used }), que se sobrescribe al cambiar de día, así
 * que no se acumulan registros de días pasados (Blobs no los caduca). Dos peticiones a la vez pueden contar una sola:
 * es un tope de gasto, no de facturación.
 */
/** Lo usado hoy según la entrada guardada: si es de otro día (o no hay), cero. */
export function usedToday(saved: unknown, day: string): number {
  const entry = saved as { day?: unknown; used?: unknown } | null | undefined;
  return entry?.day === day && typeof entry.used === 'number' ? entry.used : 0;
}

type UsageEntry = { day?: string; used?: number; neighborDay?: string };

const blobUsage: Usage = {
  async take(owner, day, limit) {
    const store = getStore('ai-usage');
    const saved = ((await store.get(owner, { type: 'json' }).catch(() => null)) ?? {}) as UsageEntry;
    const used = usedToday(saved, day);
    if (used >= limit) return false;
    await store.setJSON(owner, { ...saved, day, used: used + 1 });
    return true;
  },
  async takeNeighbor(owner, day) {
    const store = getStore('ai-usage');
    const saved = ((await store.get(owner, { type: 'json' }).catch(() => null)) ?? {}) as UsageEntry;
    if (saved.neighborDay === day) return false;
    await store.setJSON(owner, { ...saved, neighborDay: day });
    return true;
  },
  async refund(owner, day, neighbor) {
    const store = getStore('ai-usage');
    const saved = ((await store.get(owner, { type: 'json' }).catch(() => null)) ?? {}) as UsageEntry;
    if (neighbor) {
      if (saved.neighborDay === day) await store.setJSON(owner, { ...saved, neighborDay: undefined });
      return;
    }
    const used = usedToday(saved, day);
    if (used > 0) await store.setJSON(owner, { ...saved, day, used: used - 1 });
  },
};

// ---------- Mensajes de prueba sin código (D-135) ----------
/** 5 mensajes de prueba en total por dispositivo y, como mucho, 15 por IP. */
export const TRIAL_DEVICE = 5;
export const TRIAL_IP = 15;

/** Contadores de la prueba: `device:<id>` e `ip:<resumen>`, en total (no por día). */
export interface Trial {
  /** Gasta uno de los dos si quedan; devuelve lo que le queda al dispositivo, o `undefined` si no quedan. */
  take(device: string, ip: string): Promise<number | undefined>;
  refund(device: string, ip: string): Promise<void>;
}

const blobTrial: Trial = {
  async take(device, ip) {
    const store = getStore('ai-trial');
    const [d, i] = await Promise.all([store.get(`device:${device}`), store.get(`ip:${ip}`)]);
    const usedD = Number(d ?? 0);
    const usedI = Number(i ?? 0);
    if (usedD >= TRIAL_DEVICE || usedI >= TRIAL_IP) return undefined;
    await Promise.all([store.set(`device:${device}`, String(usedD + 1)), store.set(`ip:${ip}`, String(usedI + 1))]);
    return TRIAL_DEVICE - usedD - 1;
  },
  async refund(device, ip) {
    const store = getStore('ai-trial');
    for (const key of [`device:${device}`, `ip:${ip}`]) {
      const used = Number((await store.get(key)) ?? 0);
      if (used > 0) await store.set(key, String(used - 1));
    }
  },
};

/** La IP no se guarda en claro: solo un resumen con el secreto (D-135). */
const ipKey = (ip: string, secret: string) => createHash('sha256').update(`${secret}:${ip}`).digest('hex').slice(0, 32);
const clientIp = (req: Request) => req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
const DEVICE = /^[0-9a-f-]{36}$/;

/** Lógica de la función con dependencias inyectables (pruebas). */
export async function handle(
  req: Request,
  deps: { apiKey?: string; codeSecret?: string; usage?: Usage; trial?: Trial; now?: () => Date; fetch: typeof fetch },
): Promise<Response> {
  if (req.method !== 'POST') return json(405, { error: 'method' });
  if (!deps.apiKey) return json(503, { error: 'unavailable' });
  // Sin el secreto configurado no se exige código (para no cortar la IA al desplegar antes de crearlo)
  let owner: string | undefined;
  // Sin código: mensajes de prueba, solo en el chat (D-135)
  let trial: { device: string; ip: string } | undefined;
  if (deps.codeSecret) {
    const code = req.headers.get('X-Arvid-Code') ?? '';
    owner = code ? verifyCode(code, deps.codeSecret) : undefined;
    const device = req.headers.get('X-Arvid-Device') ?? '';
    if (!owner && !code && DEVICE.test(device)) trial = { device, ip: ipKey(clientIp(req), deps.codeSecret) };
    else if (!owner) return json(401, { error: 'code' });
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

  // El crédito se gasta solo con peticiones válidas; se descuenta antes de llamar a Mistral (así varias peticiones a la
  // vez no se saltan el límite) y se devuelve si la generación falla (D-124)
  const neighbor = parsed.data.moment === 'neighbor';
  const day = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const usage = deps.usage ?? blobUsage;
  if (owner) {
    const ok = neighbor ? await usage.takeNeighbor(owner, day) : await usage.take(owner, day, DAILY_CREDITS);
    if (!ok) return json(429, { error: 'daily' });
  }
  if (trial) {
    // La prueba es solo para el chat: el resto (saludo, vecinos…) usa sus frases fijas sin gastarla
    if (parsed.data.moment !== 'chat') return json(401, { error: 'code' });
    const left = await (deps.trial ?? blobTrial).take(trial.device, trial.ip);
    if (left === undefined) return json(429, { error: 'trial' });
    const response = await generate(parsed.data as AiRequest, deps);
    if (response.status !== 200) {
      await (deps.trial ?? blobTrial).refund(trial.device, trial.ip).catch(() => undefined);
      return response;
    }
    return json(200, { ...(await response.json()), trialLeft: left });
  }
  const response = await generate(parsed.data as AiRequest, deps);
  if (owner && response.status !== 200) await usage.refund(owner, day, neighbor).catch(() => undefined);
  return response;
}

/** Llama a Mistral y devuelve la respuesta saneada, o el error. */
type MistralMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type MistralReply = { content?: unknown; tool_calls?: { function?: { name?: string; arguments?: unknown } }[] };

/** Una llamada a Mistral; `undefined` con el error ya convertido en respuesta. */
async function callMistral(
  messages: MistralMessage[],
  deps: { apiKey?: string; fetch: typeof fetch },
  timeoutMs: number,
  withTools: boolean,
): Promise<{ message: MistralReply } | { error: Response }> {
  let res: Response;
  try {
    res = await deps.fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deps.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: AI_TEMPERATURE,
        max_tokens: AI_MAX_TOKENS,
        messages,
        ...(withTools ? { tools: [...actionTools(), ...memoryTools()], tool_choice: 'auto' } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    return { error: json(504, { error: 'timeout' }) };
  }
  if (!res.ok) {
    // El mensaje de Mistral solo va a los registros de la función (no contiene la clave ni el contexto)
    console.error(`Mistral ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
    // Cuota de la clave de pruebas agotada (IA-07): ARVID lo explica con su frase fija
    return { error: res.status === 429 ? json(429, { error: 'quota' }) : json(502, { error: 'upstream' }) };
  }
  const data = (await res.json().catch(() => undefined)) as { choices?: { message?: MistralReply }[] } | undefined;
  return { message: data?.choices?.[0]?.message ?? {} };
}

const parseArgs = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

/** Contexto que la app manda para validar las acciones (AC-04). */
function actionContext(context: Record<string, unknown>) {
  const calendar = context.calendar as { today?: string } | undefined;
  const categories = (context.categories as { id?: unknown }[] | undefined) ?? [];
  const today = typeof calendar?.today === 'string' && isLocalDate(calendar.today) ? calendar.today : new Date().toISOString().slice(0, 10);
  return { today: today as LocalDate, categoryIds: categories.map((c) => c.id).filter((id): id is string => typeof id === 'string') };
}

/**
 * Llama a Mistral y devuelve la respuesta saneada, o el error. En el chat, con el catálogo de acciones (spec 12, AC):
 * si propone una, se valida; si no es válida, se reintenta una vez con el error (sin gastar otro crédito, D-124) y,
 * si sigue sin serlo, se devuelve lo entendido como borrador para el formulario (AC-06).
 */
async function generate(req: AiRequest, deps: { apiKey?: string; fetch: typeof fetch }): Promise<Response> {
  const started = Date.now();
  const chat = req.moment === 'chat';
  const messages: MistralMessage[] = buildMessages(req);
  const memoryCount = req.memory?.length ?? 0;
  // Tras la memoria y antes del contexto: reglas de las acciones (spec 12) y de la memoria (spec 13)
  if (chat) messages.splice(2, 0, { role: 'system', content: `${ACTION_RULES}\n${memoryRules(memoryCount)}` });

  const first = await callMistral(messages, deps, MISTRAL_TIMEOUT_MS, chat);
  if ('error' in first) return first.error;
  let message = first.message;
  const text = () => (typeof message.content === 'string' ? sanitizeReply(message.content) : '');
  // Operaciones de memoria (spec 13, MC-04): las válidas, en orden; las propuestas de crear, aparte (spec 12)
  const calls = (message.tool_calls ?? []).map((c) => c.function).filter((f): f is { name: string; arguments?: unknown } => !!f?.name);
  const memoryOps = chat
    ? calls
        .filter((c) => (MEMORY_TOOL_NAMES as string[]).includes(c.name))
        .map((c) => checkMemoryOp(c.name, parseArgs(c.arguments), memoryCount))
        .filter((op): op is MemoryOp => !!op)
    : [];
  const withMemory = (body: Record<string, unknown>) => json(200, memoryOps.length ? { ...body, memoryOps } : body);
  const call = calls.find((c) => !(MEMORY_TOOL_NAMES as string[]).includes(c.name));

  if (chat && call?.name) {
    const ctx = actionContext(req.context);
    let check = checkProposal(call.name, parseArgs(call.arguments), ctx);
    // Un reintento si queda tiempo (el plan gratuito corta a los 10 s)
    const left = MISTRAL_TIMEOUT_MS - (Date.now() - started);
    if (!check.ok && left > 3_000) {
      const retry = await callMistral(
        [...messages, { role: 'user', content: `Your ${call.name} call was invalid (${check.error}). Call the tool again with valid arguments.` }],
        deps,
        left - 500,
        true,
      );
      if (!('error' in retry)) {
        const again = retry.message.tool_calls?.map((c) => c.function).find((f) => f?.name && !(MEMORY_TOOL_NAMES as string[]).includes(f.name));
        if (again?.name) {
          const second = checkProposal(again.name, parseArgs(again.arguments), ctx);
          if (second.ok || !check.partial) check = second;
          message = retry.message;
        }
      }
    }
    if (check.ok) return withMemory({ reply: text(), proposal: check.proposal });
    return withMemory({ reply: text(), draft: check.partial ?? null });
  }

  // Solo memoria: la app pone el texto si la IA no escribió nada
  if (memoryOps.length) return withMemory({ reply: text() });

  const reply = text();
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
