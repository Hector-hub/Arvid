// Qué dice ARVID cuando le escriben o cuando habla por iniciativa propia (spec 06, CH e IA-05).
// Con "ARVID con IA" activado y conexión, pregunta a la función /api/arvid; si no, o si falla, usa sus frases fijas.
import { AI_MAX_HISTORY, type AiMoment, type ChatMessage } from '../../domain/arvid/ai';
import { getLocale, t } from '../../i18n';
import { getCompanion } from '../scene/engine';
import type { NeighborId } from '../../domain/scene/city';

export interface BrainDeps {
  aiEnabled: boolean;
  /** Contexto del usuario (IA-04), calculado al preguntar. */
  context: () => Record<string, unknown>;
}

type AiResult = { ok: true; reply: string } | { ok: false; reason: 'offline' | 'quota' | 'daily' | 'code' | 'error' };

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
      body: JSON.stringify({ locale: getLocale(), moment, messages, context: deps.context(), companion: getCompanion(), ...extra }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 429: créditos del día de este código agotados (D-100) o cuota de Mistral (IA-07)
    if (res.status === 429) {
      const data = (await res.json().catch(() => ({}))) as { error?: unknown };
      return { ok: false, reason: data.error === 'daily' ? 'daily' : 'quota' };
    }
    if (res.status === 401) return { ok: false, reason: 'code' };
    if (!res.ok) return { ok: false, reason: 'error' };
    const data = (await res.json()) as { reply?: unknown };
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

/** Respuesta a un mensaje del usuario (CH-03, CH-05). */
export async function replyTo(message: string, deps: BrainDeps): Promise<string> {
  if (!deps.aiEnabled) return t('arvid.chat.needsPermission');
  if (offline()) return t('arvid.chat.offline');
  const asked = [...history, { role: 'user' as const, content: message }].slice(-AI_MAX_HISTORY);
  const result = await askAi('chat', asked, deps, CHAT_TIMEOUT_MS);
  if (!result.ok) return t(`arvid.chat.${result.reason}`);
  history = [...asked, { role: 'assistant' as const, content: result.reply }].slice(-AI_MAX_HISTORY);
  return result.reply;
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
