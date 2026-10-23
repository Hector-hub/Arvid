// Código de acceso a la IA (D-100): la app lo envía en una cabecera y explica el 401.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { replyTo, resetConversation, setAccessCode } from './brain';

const deps = { aiEnabled: true, context: () => ({}) };

describe('código de acceso (D-100)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setAccessCode(undefined);
    resetConversation();
  });

  it('envía el código guardado en la cabecera X-Arvid-Code', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ reply: 'Hola' })));
    setAccessCode(' secreto ');
    expect(await replyTo('Hola', deps)).toBe('Hola');
    expect((fetchSpy.mock.calls[0]![1]!.headers as Record<string, string>)['X-Arvid-Code']).toBe('secreto');
  });

  it('sin código válido (401), el compañero pide ponerlo en Ajustes', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}', { status: 401 }));
    expect(await replyTo('Hola', deps)).toMatch(/código de acceso/);
  });

  it('con los mensajes del día agotados (429 «daily»), lo explica', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ error: 'daily' }), { status: 429 }));
    expect(await replyTo('Hola', deps)).toMatch(/25 mensajes/);
  });
});
