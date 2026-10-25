// Hacer hablar a ARVID en la escena: reparte el texto en páginas de 2 líneas que caben en la burbuja (BP-02).
import { paginate } from '../../domain/arvid/speech';
import { BUBBLE_FONT, BUBBLE_TEXT_W } from '../scene/bubble';
import { say } from '../scene/engine';

let ctx: CanvasRenderingContext2D | null | undefined;

export function measure(text: string): number {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 8; // sin canvas (pruebas): 8 px por carácter
  ctx.font = BUBBLE_FONT;
  return ctx.measureText(text).width;
}

/** En el lienzo, Pixelify dibuja mal las ligaduras "fi" y "fl" ("perﬁl"): se separan con un carácter invisible. */
export const noLigatures = (text: string) => text.replace(/f(?=[il])/g, 'f\u200C');

// ---------- Conversación (D-098) ----------
type ChatLine = { from: 'user' | 'companion'; text: string };
const chatListeners = new Set<(line: ChatLine) => void>();

/** Avisa de cada línea de la conversación; quien escucha la guarda (ChatLogWatcher). */
export function onChatLine(listener: (line: ChatLine) => void): () => void {
  chatListeners.add(listener);
  return () => chatListeners.delete(listener);
}

/** Anota una línea en la conversación sin decirla en la escena (p. ej. desde la página del chat). */
export function logChat(from: ChatLine['from'], text: string): void {
  for (const l of chatListeners) l({ from, text });
}

/** ARVID dice `text` en la burbuja de la escena; con `log`, queda en la conversación (D-098). */
export async function speak(text: string, { log = true }: { log?: boolean } = {}): Promise<void> {
  if (log) logChat('companion', text);
  // La medida depende de la fuente pixel: se espera a que esté cargada
  await document.fonts?.load(BUBBLE_FONT).catch(() => undefined);
  say(paginate(noLigatures(text), measure, BUBBLE_TEXT_W));
}
