// ¿Qué modelos de chat permite la clave? Una petición mínima por modelo (≈60 tokens), con una herramienta de prueba
// para ver también si admiten function calling. Uso: MISTRAL_API_KEY=… node scripts/model-probe.mts
const KEY = process.env.MISTRAL_API_KEY;
if (!KEY) {
  console.error('Falta MISTRAL_API_KEY en el entorno.');
  process.exit(1);
}

// Modelos de chat de la lista (los de embeddings, moderación y voz usan otras APIs)
const MODELS = [
  'ministral-3b-2512',
  'ministral-8b-2512',
  'ministral-14b-2512',
  'mistral-small-2603',
  'mistral-medium-latest',
  'mistral-large-2512',
  'mistral-large-4',
  'codestral-2508',
  'labs-leanstral-1-5-1',
  'glm-5-2',
  'zai-glm-5-3',
  'zai-glm-5-3-flash',
];

const tool = {
  type: 'function',
  function: {
    name: 'create_mission',
    description: 'Create a mission.',
    parameters: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
};

for (const model of MODELS) {
  const t0 = Date.now();
  let line: string;
  try {
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0,
        tools: [tool],
        tool_choice: 'any',
        messages: [{ role: 'user', content: 'Create a mission called "Test".' }],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const ms = Date.now() - t0;
    if (res.ok) {
      const data = (await res.json()) as { choices?: { message?: { tool_calls?: unknown[] } }[] };
      const tools = data.choices?.[0]?.message?.tool_calls?.length ? 'sí' : 'no';
      line = `✅ disponible · function calling: ${tools} · ${ms} ms`;
    } else {
      const body = (await res.text()).replace(/\s+/g, ' ');
      const msg = /"message":"([^"]+)"/.exec(body)?.[1] ?? body.slice(0, 100);
      line = `${res.status === 403 ? '⛔ sin acceso' : res.status === 429 ? '⏳ límite (reintentar)' : '❌ error'} · ${res.status} ${msg}`;
    }
  } catch (e) {
    line = `❌ ${String(e).slice(0, 80)}`;
  }
  console.log(`${model.padEnd(24)} ${line}`);
  await new Promise((ok) => setTimeout(ok, 3000)); // por debajo de 1 petición/s en todos los modelos
}
