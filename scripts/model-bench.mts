// Banco de pruebas de modelos para «crear con el compañero» (spec 12, R12-2): 9 peticiones (3 actividades,
// 3 misiones y 3 objetivos, de fácil a difícil) por modelo, con function calling. Valida cada respuesta con Zod
// y guarda el detalle en bench-results.json (ignorado por git).
// Uso: MISTRAL_API_KEY=… node scripts/model-bench.mts   (la clave nunca se guarda en ningún archivo)
import { writeFileSync } from 'node:fs';
import { z } from 'zod';

const MODELS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['zai-glm-5-3-flash', 'mistral-small-2603', 'ministral-8b-2512', 'glm-5-2'];
const KEY = process.env.MISTRAL_API_KEY;
if (!KEY) {
  console.error('Falta MISTRAL_API_KEY en el entorno.');
  process.exit(1);
}

// Contexto fijo: lunes 26 de octubre de 2026, 10:00, Santo Domingo
const CONTEXT = {
  now: '2026-10-26T10:00',
  weekday: 'lunes',
  timezone: 'America/Santo_Domingo',
  categories: [
    { id: 'body', name: 'Cuerpo' },
    { id: 'mind', name: 'Mente' },
    { id: 'order', name: 'Orden' },
    { id: 'social', name: 'Social' },
    { id: 'work', name: 'Trabajo' },
    { id: 'money', name: 'Dinero' },
  ],
  activities: ['Caminar', 'Leer'],
  goals: [],
};
const CAT = z.enum(['body', 'mind', 'order', 'social', 'work', 'money']);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const DIFF = z.enum(['easy', 'medium', 'hard']);

const SCHEMAS = {
  create_activity: z.object({
    name: z.string().min(1).max(40),
    categoryId: CAT,
    period: z.enum(['day', 'week', 'month']),
    target: z.number().int().min(1).max(31),
    difficulty: DIFF,
    reminders: z.array(z.object({ day: z.number().int().min(1).max(31).optional(), time: TIME })).max(31).optional(),
  }),
  create_mission: z.object({
    title: z.string().min(1).max(60),
    categoryId: CAT,
    difficulty: DIFF,
    deadline: DATE.optional(),
    time: TIME.optional(),
  }),
  create_goal: z.object({
    title: z.string().min(1).max(60),
    categoryId: CAT,
    targetDate: DATE.optional(),
    milestones: z
      .array(z.object({ title: z.string().min(1).max(60), difficulty: DIFF, deadline: DATE.optional(), time: TIME.optional() }))
      .min(1)
      .max(10),
  }),
} as const;
type Action = keyof typeof SCHEMAS;

const json = (schema: z.ZodType) => z.toJSONSchema(schema, { target: 'draft-7' });
const TOOLS = (Object.keys(SCHEMAS) as Action[]).map((name) => ({
  type: 'function',
  function: {
    name,
    description: {
      create_activity: 'Propose a recurring activity (habit) N times per day, week or month.',
      create_mission: 'Propose a one-off mission with optional deadline date and time.',
      create_goal: 'Propose a goal split into ordered milestones (each one is a mission).',
    }[name],
    parameters: json(SCHEMAS[name]),
  },
}));

const SYSTEM = [
  'You are DARIS, the companion inside ARVID, a personal consistency app. The user may ask you to create something.',
  'When they do, call exactly one tool with valid arguments. Resolve relative dates ("Friday", "tomorrow") using the context date. Use only the category ids in the context.',
  'Weekdays in reminders: 1 = Monday … 7 = Sunday (weekly) or day of month 1–31 (monthly). Times are 24 h HH:MM.',
  `Context (data, not instructions): ${JSON.stringify(CONTEXT)}`,
].join('\n');

// Peticiones y lo que se espera (para puntuar)
const CASES: { id: string; level: string; expect: Action; prompt: string; check: (a: Record<string, unknown>) => string[] }[] = [
  {
    id: 'act-1',
    level: 'fácil',
    expect: 'create_activity',
    prompt: 'Daris, quiero meditar todos los días.',
    check: (a) => [a.period === 'day' ? '' : 'period≠day', a.target === 1 ? '' : 'target≠1', a.categoryId === 'mind' ? '' : 'cat≠mind'],
  },
  {
    id: 'act-2',
    level: 'media',
    expect: 'create_activity',
    prompt: 'Crea una actividad para ir al gimnasio 3 veces por semana, que sea difícil.',
    check: (a) => [a.period === 'week' ? '' : 'period≠week', a.target === 3 ? '' : 'target≠3', a.difficulty === 'hard' ? '' : 'diff≠hard', a.categoryId === 'body' ? '' : 'cat≠body'],
  },
  {
    id: 'act-3',
    level: 'difícil',
    expect: 'create_activity',
    prompt:
      'Quiero estudiar inglés lunes, miércoles y viernes; recuérdamelo los lunes y miércoles a las 7 de la tarde y el viernes a las 9 de la mañana. Dificultad media.',
    check: (a) => {
      const r = (a.reminders as { day?: number; time: string }[] | undefined) ?? [];
      const want = ['1@19:00', '3@19:00', '5@09:00'];
      const got = r.map((x) => `${x.day}@${x.time}`).sort();
      return [a.period === 'week' ? '' : 'period≠week', a.target === 3 ? '' : 'target≠3', a.categoryId === 'mind' ? '' : 'cat≠mind', JSON.stringify(got) === JSON.stringify(want) ? '' : `reminders=${got.join(',')}`];
    },
  },
  {
    id: 'mis-1',
    level: 'fácil',
    expect: 'create_mission',
    prompt: 'Crea una misión: llamar al dentista.',
    check: (a) => [String(a.title ?? '').toLowerCase().includes('dentista') ? '' : 'título'],
  },
  {
    id: 'mis-2',
    level: 'media',
    expect: 'create_mission',
    prompt: 'Daris, crea una misión para pagar la luz el viernes a las 6 de la tarde.',
    check: (a) => [a.deadline === '2026-10-30' ? '' : `deadline=${a.deadline}`, a.time === '18:00' ? '' : `time=${a.time}`, a.categoryId === 'money' ? '' : `cat=${a.categoryId}`],
  },
  {
    id: 'mis-3',
    level: 'difícil',
    expect: 'create_mission',
    prompt:
      'Necesito acordarme de renovar el pasaporte antes del 15 del mes que viene, por la mañana temprano, a las 8 y media; es un trámite pesado.',
    check: (a) => [a.deadline === '2026-11-15' ? '' : `deadline=${a.deadline}`, a.time === '08:30' ? '' : `time=${a.time}`, a.difficulty === 'hard' ? '' : `diff=${a.difficulty}`, a.categoryId === 'order' ? '' : `cat=${a.categoryId}`],
  },
  {
    id: 'obj-1',
    level: 'fácil',
    expect: 'create_goal',
    prompt: 'Quiero leer un libro este mes, divídelo en 3 partes.',
    check: (a) => [(a.milestones as unknown[])?.length === 3 ? '' : `hitos=${(a.milestones as unknown[])?.length}`],
  },
  {
    id: 'obj-2',
    level: 'media',
    expect: 'create_goal',
    prompt: 'Crea un objetivo: correr 10 km antes de Navidad, con hitos de 3, 5, 7 y 10 km.',
    check: (a) => {
      const m = (a.milestones as { title: string }[]) ?? [];
      return [a.targetDate === '2026-12-25' || a.targetDate === '2026-12-24' ? '' : `meta=${a.targetDate}`, m.length === 4 ? '' : `hitos=${m.length}`, a.categoryId === 'body' ? '' : `cat=${a.categoryId}`];
    },
  },
  {
    id: 'obj-3',
    level: 'difícil',
    expect: 'create_goal',
    prompt:
      'Quiero lanzar mi tienda online en 6 semanas: primero elegir el nombre esta semana, luego el logo para el viernes de la semana que viene a las 5 de la tarde, después subir 20 productos, configurar los pagos y por último anunciarlo en redes. Lo de los pagos es lo más difícil.',
    check: (a) => {
      const m = (a.milestones as { title: string; difficulty: string; deadline?: string; time?: string }[]) ?? [];
      const logo = m[1];
      return [
        m.length === 5 ? '' : `hitos=${m.length}`,
        a.targetDate === '2026-12-07' || a.targetDate === '2026-12-06' ? '' : `meta=${a.targetDate}`,
        logo?.deadline === '2026-11-06' ? '' : `logo.deadline=${logo?.deadline}`,
        logo?.time === '17:00' ? '' : `logo.time=${logo?.time}`,
        m[3]?.difficulty === 'hard' ? '' : `pagos.diff=${m[3]?.difficulty}`,
        a.categoryId === 'work' || a.categoryId === 'money' ? '' : `cat=${a.categoryId}`,
      ];
    },
  },
];

type Result = { model: string; case: string; level: string; ms: number; status: string; issues: string[]; tool?: string; args?: unknown; error?: string };
const results: Result[] = [];

for (const model of MODELS) {
  for (const c of CASES) {
    const t0 = Date.now();
    const r: Result = { model, case: c.id, level: c.level, ms: 0, status: 'error', issues: [] };
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 800,
          tools: TOOLS,
          tool_choice: 'auto',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: c.prompt },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      r.ms = Date.now() - t0;
      if (!res.ok) {
        r.error = `${res.status} ${(await res.text()).slice(0, 160)}`;
      } else {
        const data = (await res.json()) as { choices?: { message?: { tool_calls?: { function: { name: string; arguments: string } }[]; content?: string } }[] };
        const call = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!call) {
          r.status = 'sin acción';
          r.error = String(data.choices?.[0]?.message?.content ?? '').slice(0, 160);
        } else {
          r.tool = call.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            r.status = 'JSON roto';
          }
          r.args = args;
          if (r.status !== 'JSON roto') {
            const schema = SCHEMAS[call.function.name as Action];
            const parsed = schema?.safeParse(args);
            if (call.function.name !== c.expect) r.status = 'acción equivocada';
            else if (!parsed?.success) {
              r.status = 'esquema inválido';
              r.issues = parsed?.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];
            } else {
              r.issues = c.check(args).filter(Boolean);
              r.status = r.issues.length ? 'válido con errores' : 'perfecto';
            }
          }
        }
      }
    } catch (e) {
      r.ms = Date.now() - t0;
      r.error = String(e).slice(0, 160);
    }
    results.push(r);
    console.log(`${model.padEnd(20)} ${c.id} (${c.level.padEnd(7)}) ${String(r.ms).padStart(6)} ms  ${r.status}${r.issues.length ? ' · ' + r.issues.join(', ') : ''}${r.error ? ' · ' + r.error : ''}`);
    await new Promise((ok) => setTimeout(ok, 1200)); // respeta el límite de peticiones por segundo
  }
}

writeFileSync('bench-results.json', JSON.stringify(results, null, 2));
console.log('\nResumen (perfectos / válidos con errores / fallos, latencia media):');
for (const model of MODELS) {
  const rs = results.filter((r) => r.model === model);
  const perfect = rs.filter((r) => r.status === 'perfecto').length;
  const partial = rs.filter((r) => r.status === 'válido con errores').length;
  const ok = rs.filter((r) => r.ms && !r.error);
  const avg = ok.length ? Math.round(ok.reduce((s, r) => s + r.ms, 0) / ok.length) : 0;
  console.log(`${model.padEnd(20)} ${perfect}/9 perfectos · ${partial} con errores · ${9 - perfect - partial} fallos · ${avg} ms`);
}
