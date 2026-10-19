// Hacer hablar a ARVID en la escena: reparte el texto en páginas de 2 líneas que caben en la burbuja (BP-02).
import { paginate } from '../../domain/arvid/speech';
import { BUBBLE_FONT, BUBBLE_TEXT_W } from '../scene/bubble';
import { say } from '../scene/engine';

let ctx: CanvasRenderingContext2D | null | undefined;

function measure(text: string): number {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 8; // sin canvas (pruebas): 8 px por carácter
  ctx.font = BUBBLE_FONT;
  return ctx.measureText(text).width;
}

/** En el lienzo, Pixelify dibuja mal las ligaduras "fi" y "fl" ("perﬁl"): se separan con un carácter invisible. */
export const noLigatures = (text: string) => text.replace(/f(?=[il])/g, 'f\u200C');

/** ARVID dice `text` en la burbuja de la escena. */
export async function speak(text: string): Promise<void> {
  // La medida depende de la fuente pixel: se espera a que esté cargada
  await document.fonts?.load(BUBBLE_FONT).catch(() => undefined);
  say(paginate(noLigatures(text), measure, BUBBLE_TEXT_W));
}
