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
    const usage = { take: vi.fn(async () => true), takeNeighbor: vi.fn(async () => true), refund: vi.fn(async () => undefined) };
    expect((await handle(post(body()), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    expect((await handle(withCode('ARVID-ANA-AAAAAAAAAA'), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    // Firmado con otro secreto
    expect((await handle(withCode(createCode('ana', 'otro')), { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('D-100: un código válido (sin importar mayúsculas) gasta un crédito del día de su dueño', async () => {
    const fetch = mistral(200);
    const usage = { take: vi.fn(async () => true), takeNeighbor: vi.fn(async () => true), refund: vi.fn(async () => undefined) };
    const code = createCode('ana', 's').toLowerCase();
    const res = await handle(withCode(code), { apiKey: 'k', codeSecret: 's', usage, now: () => new Date('2026-10-23T12:00:00Z'), fetch });
    expect(res.status).toBe(200);
    expect(usage.take).toHaveBeenCalledWith('ana', '2026-10-23', 25);
  });

  it('D-100: sin créditos del día, 429 «daily» y no llama a Mistral', async () => {
    const fetch = mistral(200);
    const res = await handle(withCode(createCode('ana', 's')), { apiKey: 'k', codeSecret: 's', usage: { take: async () => false, takeNeighbor: async () => true, refund: async () => undefined }, fetch });
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

  it('spec 11, VC-06: la frase de un vecino no gasta créditos y se limita a una al día', async () => {
    const fetch = mistral(200, 'Esta canción va por ti.');
    const usage = { take: vi.fn(async () => true), takeNeighbor: vi.fn(async () => true), refund: vi.fn(async () => undefined) };
    const req = new Request('https://x/api/arvid', {
      method: 'POST',
      body: body({ moment: 'neighbor', neighbor: 'dex', messages: [] }),
      headers: { 'X-Arvid-Code': createCode('ana', 's') },
    });
    const res = await handle(req, { apiKey: 'k', codeSecret: 's', usage, fetch });
    expect(res.status).toBe(200);
    expect(usage.take).not.toHaveBeenCalled();
    expect(usage.takeNeighbor).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
    expect(sent.messages[0].content).toMatch(/You are Dex/);
    usage.takeNeighbor.mockResolvedValue(false);
    const again = new Request('https://x/api/arvid', { method: 'POST', body: body({ moment: 'neighbor', neighbor: 'dex', messages: [] }), headers: { 'X-Arvid-Code': createCode('ana', 's') } });
    expect((await handle(again, { apiKey: 'k', codeSecret: 's', usage, fetch })).status).toBe(429);
  });

  it('D-124: si la generación falla, el crédito se devuelve; si va bien, no', async () => {
    for (const [fetchMock, status] of [
      [mistral(502), 502],
      [mistral(200, ''), 502],
      [vi.fn(async () => Promise.reject(new Error('timeout'))) as unknown as typeof globalThis.fetch, 504],
    ] as const) {
      const usage = { take: vi.fn(async () => true), takeNeighbor: vi.fn(async () => true), refund: vi.fn(async () => undefined) };
      const res = await handle(withCode(createCode('ana', 's')), { apiKey: 'k', codeSecret: 's', usage, now: () => new Date('2026-10-26T12:00:00Z'), fetch: fetchMock });
      expect(res.status).toBe(status);
      expect(usage.refund).toHaveBeenCalledWith('ana', '2026-10-26', false);
    }
    const usage = { take: vi.fn(async () => true), takeNeighbor: vi.fn(async () => true), refund: vi.fn(async () => undefined) };
    expect((await handle(withCode(createCode('ana', 's')), { apiKey: 'k', codeSecret: 's', usage, fetch: mistral(200) })).status).toBe(200);
    expect(usage.refund).not.toHaveBeenCalled();
  });

  describe('crear con el compañero (spec 12, AC)', () => {
    const ctx = { calendar: { today: '2026-10-26' }, categories: [{ id: 'money', name: 'Dinero' }, { id: 'order', name: 'Orden' }] };
    const chat = (text: string) => body({ messages: [{ role: 'user', content: text }], context: ctx });
    const toolReply = (name: string, args: unknown, content = '') =>
      new Response(JSON.stringify({ choices: [{ message: { content, tool_calls: [{ function: { name, arguments: JSON.stringify(args) } }] } }] }), { status: 200 });
    const seq = (...responses: Response[]) => {
      const f = vi.fn(async () => responses.shift()!);
      return f as unknown as typeof fetch & ReturnType<typeof vi.fn>;
    };

    it('AC-03: envía el catálogo de acciones y devuelve la propuesta validada', async () => {
      const fetch = seq(toolReply('create_mission', { title: 'Pagar la luz', categoryId: 'money', difficulty: 'easy', deadline: '2026-10-30', time: '18:00' }, 'Te la preparo.'));
      const res = await handle(post(chat('crea una misión para pagar la luz el viernes a las 6')), { apiKey: 'k', fetch });
      expect(await res.json()).toEqual({
        reply: 'Te la preparo.',
        proposal: { action: 'create_mission', args: { title: 'Pagar la luz', categoryId: 'money', difficulty: 'easy', deadline: '2026-10-30', time: '18:00' } },
      });
      const sent = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
      expect(sent.tools.map((t: { function: { name: string } }) => t.function.name)).toEqual(['create_mission', 'create_goal', 'create_rest', 'create_activity', 'remember', 'update_memory', 'forget']);
      expect(sent.messages.some((m: { content: string }) => /call exactly ONE tool/.test(m.content))).toBe(true);
    });

    it('si la propuesta no es válida, reintenta una vez con el error', async () => {
      const fetch = seq(
        toolReply('create_mission', { title: 'Pagar la luz', categoryId: 'casa', difficulty: 'easy' }),
        toolReply('create_mission', { title: 'Pagar la luz', categoryId: 'money', difficulty: 'easy' }),
      );
      const data = await (await handle(post(chat('misión pagar la luz')), { apiKey: 'k', fetch })).json();
      expect(data.proposal.args.categoryId).toBe('money');
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
      expect(JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string).messages.at(-1).content).toMatch(/categoryId must be one of: money, order/);
    });

    it('AC-06: si sigue sin ser válida, devuelve lo entendido como borrador', async () => {
      const bad = { title: 'Pagar la luz', categoryId: 'money', difficulty: 'easy', deadline: '2026-10-01' };
      const fetch = seq(toolReply('create_mission', bad), toolReply('create_mission', bad));
      const data = await (await handle(post(chat('misión pagar la luz ayer')), { apiKey: 'k', fetch })).json();
      expect(data.proposal).toBeUndefined();
      expect(data.draft).toEqual({ action: 'create_mission', args: bad });
    });

    it('sin pedir nada, conversación normal; los momentos no llevan acciones', async () => {
      const fetch = mistral(200, 'Hola, Ana.');
      expect(await (await handle(post(chat('hola')), { apiKey: 'k', fetch })).json()).toEqual({ reply: 'Hola, Ana.' });
      const moment = mistral(200, 'Buenos días.');
      await handle(post(body({ moment: 'greeting', messages: [] })), { apiKey: 'k', fetch: moment });
      expect(JSON.parse(vi.mocked(moment).mock.calls[0]![1]!.body as string).tools).toBeUndefined();
    });
  });

  describe('memoria (spec 13)', () => {
    const ctx = { calendar: { today: '2026-10-26' }, categories: [] };
    const calls = (...fns: { name: string; args: unknown }[]) =>
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '', tool_calls: fns.map((f) => ({ function: { name: f.name, arguments: JSON.stringify(f.args) } })) } }] })),
      ) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

    it('MU-01: las notas van como mensaje de sistema antes del contexto, también en los momentos; no en los vecinos', async () => {
      const fetch = mistral(200, 'Buenos días.');
      await handle(post(body({ moment: 'greeting', messages: [], memory: ['Prefiere entrenar por la mañana'] })), { apiKey: 'k', fetch });
      const sent = JSON.parse(vi.mocked(fetch).mock.calls[0]![1]!.body as string);
      expect(sent.messages[1]).toEqual({ role: 'system', content: expect.stringMatching(/n1\. Prefiere entrenar por la mañana/) });
      expect(sent.messages[2].content).toMatch(/User context/);
      const neighbor = mistral(200, 'Hola.');
      await handle(post(body({ moment: 'neighbor', neighbor: 'dex', messages: [], memory: ['x'] })), { apiKey: 'k', fetch: neighbor });
      expect(JSON.stringify(JSON.parse(vi.mocked(neighbor).mock.calls[0]![1]!.body as string).messages)).not.toMatch(/What you know about the user/);
    });

    it('MC-04, MC-05: devuelve las operaciones de memoria válidas e ignora las inválidas', async () => {
      const fetch = calls(
        { name: 'remember', args: { text: 'Los lunes trabaja hasta tarde', source: 'user' } },
        { name: 'forget', args: { id: 'n9' } },
        { name: 'update_memory', args: { id: 'n1', text: 'x'.repeat(200) } },
      );
      const data = await (await handle(post(body({ messages: [{ role: 'user', content: 'recuerda que los lunes trabajo hasta tarde' }], context: ctx, memory: ['Le gusta leer'] })), { apiKey: 'k', fetch })).json();
      expect(data.memoryOps).toEqual([{ op: 'remember', text: 'Los lunes trabaja hasta tarde', source: 'user' }]);
    });

    it('memoria y propuesta en el mismo mensaje', async () => {
      const fetch = calls(
        { name: 'remember', args: { text: 'Quiere ahorrar', source: 'companion' } },
        { name: 'create_mission', args: { title: 'Abrir cuenta de ahorro', categoryId: 'money', difficulty: 'easy' } },
      );
      const data = await (
        await handle(post(body({ messages: [{ role: 'user', content: 'quiero ahorrar' }], context: { ...ctx, categories: [{ id: 'money', name: 'Dinero' }] } })), { apiKey: 'k', fetch })
      ).json();
      expect(data.memoryOps).toHaveLength(1);
      expect(data.proposal.action).toBe('create_mission');
    });
  });

  describe('mensajes de prueba sin código (D-135)', () => {
    const device = '2f0e8a1c-3b4d-4e5f-8a6b-7c8d9e0f1a2b';
    const trialReq = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
      new Request('https://x/api/arvid', { method: 'POST', body: body(extra), headers: { 'X-Arvid-Device': device, 'x-nf-client-connection-ip': '203.0.113.9', ...headers } });
    const memoryTrial = () => {
      const used = new Map<string, number>();
      return {
        used,
        trial: {
          take: vi.fn(async (d: string, ip: string) => {
            const ud = used.get(`d:${d}`) ?? 0;
            const ui = used.get(`i:${ip}`) ?? 0;
            if (ud >= 5 || ui >= 15) return undefined;
            used.set(`d:${d}`, ud + 1);
            used.set(`i:${ip}`, ui + 1);
            return 5 - ud - 1;
          }),
          refund: vi.fn(async () => undefined),
        },
      };
    };

    it('sin código, el chat funciona 5 veces por dispositivo y dice cuántos quedan; el sexto, 429 «trial»', async () => {
      const { trial } = memoryTrial();
      const fetch = mistral(200);
      for (let i = 4; i >= 0; i--) {
        const res = await handle(trialReq(), { apiKey: 'k', codeSecret: 's', trial, fetch });
        expect(await res.json()).toMatchObject({ trialLeft: i });
      }
      const sixth = await handle(trialReq(), { apiKey: 'k', codeSecret: 's', trial, fetch });
      expect(sixth.status).toBe(429);
      expect(await sixth.json()).toEqual({ error: 'trial' });
    });

    it('la IP no se guarda en claro y los momentos sin código no gastan prueba', async () => {
      const { trial } = memoryTrial();
      await handle(trialReq(), { apiKey: 'k', codeSecret: 's', trial, fetch: mistral(200) });
      const ip = vi.mocked(trial.take).mock.calls[0]![1];
      expect(ip).not.toContain('203.0.113.9');
      expect(ip).toMatch(/^[0-9a-f]{32}$/);
      expect((await handle(trialReq({ moment: 'greeting', messages: [] }), { apiKey: 'k', codeSecret: 's', trial, fetch: mistral(200) })).status).toBe(401);
      expect(trial.take).toHaveBeenCalledTimes(1);
    });

    it('un código inventado no cae en la prueba; un fallo de la IA devuelve el crédito', async () => {
      const { trial } = memoryTrial();
      expect((await handle(trialReq({}, { 'X-Arvid-Code': 'ARVID-X-AAAAAAAAAA' }), { apiKey: 'k', codeSecret: 's', trial, fetch: mistral(200) })).status).toBe(401);
      await handle(trialReq(), { apiKey: 'k', codeSecret: 's', trial, fetch: mistral(502) });
      expect(trial.refund).toHaveBeenCalledTimes(1);
    });
  });
});
