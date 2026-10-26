// Qué dice ARVID cuando le escriben o cuando habla por iniciativa propia (spec 06, CH e IA-05).
// Con "ARVID con IA" activado y conexión, pregunta a la función /api/arvid; si no, o si falla, usa sus frases fijas.
import { AI_MAX_HISTORY, type AiMoment, type ChatMessage } from '../../domain/arvid/ai';
import { checkProposal, type ActionName, type Proposal } from '../../domain/arvid/actions';
import { checkMemoryOp, type MemoryOp } from '../../domain/arvid/memory';
import type { ChatEntry } from '../../data/repository';
import { toLocalDate, type LocalDate } from '../../domain/time/localDate';
import { getLocale, t } from '../../i18n';
import { getCompanion } from '../scene/engine';
import type { NeighborId } from '../../domain/scene/city';

export interface BrainDeps {
  aiEnabled: boolean;
  /** Contexto del usuario (IA-04), calculado al preguntar. */
  context: () => Record<string, unknown>;
}

type AiResult =
  | { ok: true; reply: string; proposal?: Proposal; draft?: Draft; memoryOps?: MemoryOp[] }
  | { ok: false; reason: 'offline' | 'quota' | 'daily' | 'code' | 'error' };

/** Lo entendido de una propuesta que no pasó la validación (spec 12, AC-06): abre el formulario. */
export type Draft = { action: ActionName; args: unknown };

/** Notas de memoria (spec 13, MU-01), en el orden en que las ve la IA (`n1`, `n2`…); las fija la app al cargarlas. */
let memoryTexts: string[] = [];
export function setMemoryTexts(texts: readonly string[]): void {
  memoryTexts = [...texts];
}

/** Mensajes que se envían como historial (spec 13, MU-03). */
export const HISTORY_MESSAGES = 10;

/** Código de acceso a la IA guardado en el dispositivo (D-100); lo fija la app al cargar los ajustes. */
let accessCode = '';
export function setAccessCode(code: string | undefined): void {
  accessCode = code?.trim() ?? '';
}

/** Tiempo máximo de espera: 15 s en el chat y 6 s por iniciativa propia (IA-05). */
export const CHAT_TIMEOUT_MS = 15_000;
export const MOMENT_TIMEOUT_MS = 6_000;

const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

async function askAi(
  moment: AiMoment,
  messages: ChatMessage[],
  deps: BrainDeps,
  timeoutMs: number,
  extra: Record<string, unknown> = {},
): Promise<AiResult> {
  if (offline()) return { ok: false, reason: 'offline' };
  try {
    const res = await fetch('/api/arvid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessCode ? { 'X-Arvid-Code': accessCode } : {}) },
      body: JSON.stringify({ locale: getLocale(), moment, messages, context: deps.context(), companion: getCompanion(), memory: memoryTexts, ...extra }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 429: créditos del día de este código agotados (D-100) o cuota de Mistral (IA-07)
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      return { ok: false, reason: data.error === 'daily' ? 'daily' : 'quota' };
    }
    if (res.status === 401) return { ok: false, reason: 'code' };
    if (!res.ok) return { ok: false, reason: 'error' };
    const data = (await res.json()) as { reply?: unknown; proposal?: unknown; draft?: unknown; memoryOps?: unknown };
    // Operaciones de memoria (spec 13): se vuelven a validar en la app (MC-05)
    const memoryOps = (Array.isArray(data.memoryOps) ? data.memoryOps : [])
      .map((o) => {
        const { op, ...args } = (o ?? {}) as { op?: string };
        return checkMemoryOp(op ?? '', args, memoryTexts.length);
      })
      .filter((o): o is MemoryOp => !!o);
    // Una propuesta de acción (spec 12, AC-03) se vuelve a validar en la app antes de mostrarla
    const ctx = deps.context() as { calendar?: { today?: LocalDate }; categories?: { id: string }[] };
    if (data.proposal && typeof data.proposal === 'object') {
      const p = data.proposal as { action?: string; args?: unknown };
      const check = checkProposal(p.action ?? '', p.args, { today: ctx.calendar?.today ?? toLocalDate(new Date()), categoryIds: ctx.categories?.map((c) => c.id) ?? [] });
      const reply = typeof data.reply === 'string' ? data.reply : '';
      if (check.ok) return { ok: true, reply, proposal: check.proposal, memoryOps };
      if (check.partial) return { ok: true, reply, draft: check.partial, memoryOps };
    }
    if (data.draft && typeof data.draft === 'object') {
      const d = data.draft as Draft;
      return { ok: true, reply: typeof data.reply === 'string' ? data.reply : '', draft: d, memoryOps };
    }
    if (memoryOps.length) return { ok: true, reply: typeof data.reply === 'string' ? data.reply : '', memoryOps };
    return typeof data.reply === 'string' && data.reply ? { ok: true, reply: data.reply } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Conversación de la sesión: no se guarda al cerrar la app (CH-04). */
let history: ChatMessage[] = [];

export function resetConversation(): void {
  history = [];
}

/** Turno del chat: lo que responde el compañero y, si lo pediste, su propuesta para crear algo (spec 12, AC). */
export interface ChatTurn {
  text: string;
  proposal?: Proposal;
  draft?: Draft;
  /** Lo que el compañero quiere recordar, actualizar u olvidar (spec 13, MC-04); lo guarda quien llama. */
  memoryOps?: MemoryOp[];
}

/** Historial desde la conversación guardada (MU-03): los últimos mensajes, sin avisos de memoria. */
export function historyFrom(log: readonly ChatEntry[] | undefined): ChatMessage[] {
  return (log ?? [])
    .filter((e) => e.kind !== 'memory' && e.text.trim())
    .slice(-HISTORY_MESSAGES)
    .map((e) => ({ role: e.from === 'user' ? ('user' as const) : ('assistant' as const), content: e.text.slice(0, 1400) }));
}

/**
 * Respuesta a un mensaje del usuario (CH-03, CH-05), con una propuesta de acción si la hay (AC-01) y operaciones de
 * memoria (spec 13). `log`: la conversación guardada antes de este mensaje (MU-03); sin ella, la de la sesión.
 */
export async function chatTurn(message: string, deps: BrainDeps, log?: readonly ChatEntry[]): Promise<ChatTurn> {
  if (!deps.aiEnabled) return { text: t('arvid.chat.needsPermission') };
  if (offline()) return { text: t('arvid.chat.offline') };
  const past = log ? historyFrom(log).slice(-(HISTORY_MESSAGES - 1)) : history;
  const asked = [...past, { role: 'user' as const, content: message }].slice(-AI_MAX_HISTORY);
  const result = await askAi('chat', asked, deps, CHAT_TIMEOUT_MS);
  if (!result.ok) return { text: t(`arvid.chat.${result.reason}`) };
  const text =
    result.reply ||
    t(result.proposal ? 'actions.prepared' : result.draft ? 'actions.draft' : result.memoryOps?.length ? 'memory.noted' : 'arvid.chat.error');
  history = [...asked, { role: 'assistant' as const, content: text }].slice(-AI_MAX_HISTORY);
  return { text, proposal: result.proposal, draft: result.draft, memoryOps: result.memoryOps };
}

/** Solo el texto de la respuesta (CH-03). */
export async function replyTo(message: string, deps: BrainDeps): Promise<string> {
  return (await chatTurn(message, deps)).text;
}

/** Lo que dice un vecino al pasar (spec 11, VC-05, VC-07): con IA si se puede; si no, su frase fija `fallback`. */
export async function neighborLine(neighbor: NeighborId, fallback: string, deps: BrainDeps): Promise<string> {
  if (!deps.aiEnabled) return fallback;
  const result = await askAi('neighbor', [], deps, MOMENT_TIMEOUT_MS, { neighbor });
  return result.ok ? result.reply : fallback;
}

/** Lo que dice ARVID por iniciativa propia: con IA si se puede; si no, la frase fija `fallback` (IA-05). */
export async function momentLine(moment: Exclude<AiMoment, 'chat' | 'neighbor'>, fallback: string, deps: BrainDeps): Promise<string> {
  if (!deps.aiEnabled) return fallback;
  const result = await askAi(moment, [], deps, MOMENT_TIMEOUT_MS);
  return result.ok ? result.reply : fallback;
}
