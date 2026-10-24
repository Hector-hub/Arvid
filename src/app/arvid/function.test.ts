// @vitest-environment node
// Función de Netlify /api/arvid (spec 06, IA-01 a IA-08), con Mistral simulado.
import { describe, expect, it, vi } from 'vitest';
import { handle, usedToday } from '../../../netlify/functions/arvid.mts';
import { createCode, verifyCode } from '../../../netlify/lib/accessCode.mts';

const body = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ locale: 'es', moment: 'chat', messages: [{ role: 'user', content: 'Hola' }], context: { level: { level: 2 } }, ...extra });

const post = (text: string) => new Request('https://x/api/arvid', { method: 'POST', body: text });
const withCode = (code: string) => new Request('https://x/api/arvid', { method: 'POST', body: body(), headers: { 'X-Arvid-Code': code } });

function mistral(status: number, content = 'Hola, **Ana**. Sigue así.') {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status }),
  ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('función /api/arvid', () => {
  it('IA-01/02/03: llama a Mistral con la clave, el modelo y las instrucciones, y devuelve texto plano', async () => {
    const fetch = mistral(200);
    const res = await handle(post(body()), { apiKey: 'clave-de-prueba', fetch });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: 'Hola, Ana. Sigue así.' });
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://api.mistral.ai/v1/chat/completions');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer clave-de-prueba');
    const sent = JSON.parse(init!.body as string);
    expect(sent).toMatchObject({ model: 'ministral-8b-2512', temperature: 0.7, max_tokens: 350 });
    expect(sent.messages[0].content).toMatch(/You are ARVID/);
    expect(sent.messages.at(-1)).toEqual({ role: 'user', content: 'Hola' });
  });

  it('IA-07: un 429 de Mistral se devuelve como 429; cuerpo de más de 24 KB → 413', async () => {
    expect((await handle(post(body()), { apiKey: 'k', fetch: mistral(429) })).status).toBe(429);
    const big = body({ context: { padding: 'x'.repeat(25 * 1024) } });
    expect((await handle(post(big), { apiKey: 'k', fetch: mistral(200) })).status).toBe(413);
  });

  it('ID-03: acepta el compañero y usa su persona; un compañero desconocido es un 400', async () => {
    const fetch = mistral(200);
    expect((await handle(post(body({ companion: 'daris' })), { apiKey: 'k', fetch })).status).toBe(200);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string).messages[0].content).toMatch(/You are DARIS/);
    expect((await handle(post(body({ companion: 'otro' })), { apiKey: 'k', fetch: mistral(200) })).status).toBe(400);
  });

  it('valida la petición y el método; sin clave responde 503', async () => {
    expect((await handle(post('no es json'), { apiKey: 'k', fetch: mistral(200) })).status).toBe(400);
    expect((await handle(post(body({ moment: 'otro' })), { apiKey: 'k', fetch: mistral(200) })).status).toBe(400);
    expect((await handle(new Request('https://x/api/arvid'), { apiKey: 'k', fetch: mistral(200) })).status).toBe(405);
    expect((await handle(post(body()), { apiKey: undefined, fetch: mistral(200) })).status).toBe(503);
  });

  it('errores de Mistral o de red → 502/504 (la app usa su frase fija)', async () => {
    expect((await handle(post(body()), { apiKey: 'k', fetch: mistral(500) })).status).toBe(502);
    const failing = vi.fn(async () => {
      throw new Error('timeout');
    }) as unknown as typeof fetch;
    expect((await handle(post(body()), { apiKey: 'k', fetch: failing })).status).toBe(504);
  });

  it('D-100: con ARVID_CODE_SECRET, sin código o con uno inventado, 401 y no llama a Mistral', async () => {
    const fetch = mistral(200);
    const usage = { take: vi.fn(async () => true) };
    expect((await handle(post(body()), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    expect((await handle(withCode('ARVID-ANA-AAAAAAAAAA'), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    // Firmado con otro secreto
    expect((await handle(withCode(createCode('ana', 'otro')), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('D-100: un código válido (sin importar mayúsculas) gasta un crédito del día de su dueño', async () => {
    const fetch = mistral(200);
    const usage = { take: vi.fn(async () => true) };
    const code = createCode('ana', 's').toLowerCase();
    const res = await handle(withCode(code), { apiKey: 'k', codeSecret: 's', usage, now: () => new Date('2026-10-23T12:00:00Z'), fetch });
    expect(res.status).toBe(200);
    expect(usage.take).toHaveBeenCalledWith('ana', '2026-10-23', 25);
  });

  it('D-100: sin créditos del día, 429 «daily» y no llama a Mistral', async () => {
    const fetch = mistral(200);
    const res = await handle(withCode(createCode('ana', 's')), { apiKey: 'k', codeSecret: 's', usage: { take: async () => false }, fetch });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'daily' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('D-100: códigos distintos por persona con el patrón ARVID-NOMBRE-FIRMA', () => {
    expect(createCode('ana', 's')).toMatch(/^ARVID-ANA-[A-Z2-9]{10}$/);
    expect(createCode('ana', 's')).not.toBe(createCode('luis', 's'));
    expect(verifyCode(createCode('luis', 's'), 's')).toBe('luis');
    expect(() => createCode('Ana López', 's')).toThrow();
  });

  it('D-100: la entrada de un código vale solo para su día; la de ayer cuenta como cero', () => {
    expect(usedToday({ day: '2026-10-24', used: 7 }, '2026-10-24')).toBe(7);
    expect(usedToday({ day: '2026-10-23', used: 25 }, '2026-10-24')).toBe(0);
    expect(usedToday(null, '2026-10-24')).toBe(0);
    expect(usedToday('basura', '2026-10-24')).toBe(0);
  });
});
