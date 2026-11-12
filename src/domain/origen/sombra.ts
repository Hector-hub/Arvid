// Sombra en su chat (spec 17, ME-09): no usa IA (RV-05). Escribe cuando le toca la historia; si le escribes, contesta
// una de cada cinco veces, tras una espera, con una frase fija de menos de 60 caracteres.

/** Frases fijas con las que contesta (i18n `origen.sombraChat.replies.N`). */
export const SOMBRA_REPLIES = 8;
/** Contesta una de cada cinco veces. */
export const SOMBRA_REPLY_CHANCE = 0.2;
/** Espera antes de contestar, en segundos. */
export const SOMBRA_REPLY_DELAY_S: [number, number] = [4, 12];

/** Si contesta a un mensaje tuyo, qué frase y tras cuántos segundos; si no, nada. */
export function sombraReply(random: () => number = Math.random): { reply: number; afterS: number } | undefined {
  if (random() >= SOMBRA_REPLY_CHANCE) return undefined;
  const reply = Math.min(SOMBRA_REPLIES - 1, Math.floor(random() * SOMBRA_REPLIES));
  const afterS = SOMBRA_REPLY_DELAY_S[0] + random() * (SOMBRA_REPLY_DELAY_S[1] - SOMBRA_REPLY_DELAY_S[0]);
  return { reply, afterS };
}
