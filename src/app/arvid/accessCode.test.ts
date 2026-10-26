// Código de acceso a la IA (D-100): la app lo envía en una cabecera y explica el 401.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { replyTo, resetConversation, setAccessCode, setTrial } from './brain';

const deps = { aiEnabled: true, context: () => ({}) };

describe('código de acceso (D-100)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setAccessCode(undefined);
    setTrial(undefined);
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

  it('D-135: sin código envía el dispositivo y anota cuántos mensajes de prueba quedan; agotados, lo explica', async () => {
    const left = vi.fn();
    setTrial('2f0e8a1c-3b4d-4e5f-8a6b-7c8d9e0f1a2b', left);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ reply: 'Hola', trialLeft: 3 })));
    expect(await replyTo('Hola', deps)).toBe('Hola');
    const headers = fetchSpy.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers['X-Arvid-Device']).toBe('2f0e8a1c-3b4d-4e5f-8a6b-7c8d9e0f1a2b');
    expect(headers['X-Arvid-Code']).toBeUndefined();
    expect(left).toHaveBeenCalledWith(3);
    fetchSpy.mockImplementation(async () => new Response(JSON.stringify({ error: 'trial' }), { status: 429 }));
    expect(await replyTo('Hola', deps)).toMatch(/5 mensajes de prueba/);
    expect(left).toHaveBeenLastCalledWith(0);
  });
});
