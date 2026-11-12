import { describe, expect, it } from 'vitest';
import { keysOf } from '../../i18n';
import { companionKnows, companionStoryPrompt } from './companionStory';
import { buildMessages } from '../arvid/ai';
import { SOMBRA_REPLIES, SOMBRA_REPLY_DELAY_S, sombraReply } from './sombra';

describe('Sombra en su chat (ME-09)', () => {
  it('contesta una de cada cinco veces, tras una espera, con una frase fija', () => {
    expect(sombraReply(() => 0.5)).toBeUndefined();
    const r = sombraReply(() => 0.1);
    expect(r).toBeDefined();
    expect(r!.afterS).toBeGreaterThanOrEqual(SOMBRA_REPLY_DELAY_S[0]);
    expect(r!.afterS).toBeLessThanOrEqual(SOMBRA_REPLY_DELAY_S[1]);
    for (const locale of ['es', 'en'] as const)
      for (let i = 0; i < SOMBRA_REPLIES; i++) {
        expect(keysOf(locale)).toContain(`origen.sombraChat.replies.${i}`);
      }
  });
});

describe('lo que sabe el compañero (VI-06)', () => {
  it('solo sabe lo de su capítulo: el nombre de Sombra llega en el 11 y la firma en el 14', () => {
    expect(companionKnows(10).join(' ')).not.toMatch(/Sombra/);
    expect(companionKnows(11).join(' ')).toMatch(/Sombra/);
    expect(companionKnows(13).join(' ')).not.toMatch(/credentials/);
    expect(companionKnows(14).join(' ')).toMatch(/credentials/);
    expect(companionStoryPrompt(16)).toMatch(/Never reveal, guess or hint/);
  });

  it('se añade al chat del compañero solo con la historia en marcha', () => {
    const base = {
      locale: 'es' as const,
      moment: 'chat' as const,
      messages: [{ role: 'user' as const, content: 'hola' }],
      context: {},
    };
    const story = (m: { content: string }[]) => m.some((x) => x.content.startsWith('Story context'));
    expect(story(buildMessages(base))).toBe(false);
    expect(story(buildMessages({ ...base, chapter: 12 }))).toBe(true);
    expect(story(buildMessages({ ...base, moment: 'greeting', chapter: 12 }))).toBe(false);
  });
});
