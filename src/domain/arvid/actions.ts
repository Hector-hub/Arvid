// Crear con el compañero (spec 12, AC): catálogo de acciones que la IA puede proponer, con su esquema exacto (function
// calling), la validación que comparten la función de Netlify y la app (AC-03) y el calendario que se le da como
// contexto (AC-04). La IA nunca crea nada: solo propone, y el usuario confirma (D-120, NFR12-01).
import { z } from 'zod';
import { ACTIVITY_NAME_MAX, TARGET_LIMITS } from '../config';
import { addDays, compareDates, daysInMonth, isLocalDate, isoWeekday, type LocalDate } from '../time/localDate';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const date = z.string().refine(isLocalDate, 'date must be YYYY-MM-DD');
const time = z.string().regex(TIME_RE, 'time must be HH:MM (24 h)');
const difficulty = z.enum(['easy', 'medium', 'hard']);
const title = z.string().trim().min(1).max(60);

export const ACTION_SCHEMAS = {
  create_mission: z.object({
    title,
    categoryId: z.string().min(1),
    difficulty,
    deadline: date.optional(),
    time: time.optional(),
  }),
  create_goal: z.object({
    title,
    categoryId: z.string().min(1),
    targetDate: date.optional(),
    milestones: z.array(z.object({ title, difficulty, deadline: date.optional(), time: time.optional() })).min(1).max(10),
  }),
  create_rest: z.object({
    from: date,
    to: date,
    /** Nombres de actividades; sin ellos, todas. */
    activities: z.array(z.string().min(1)).max(20).optional(),
    note: z.string().trim().max(40).optional(),
  }),
  create_activity: z.object({
    name: z.string().trim().min(1).max(ACTIVITY_NAME_MAX),
    categoryId: z.string().min(1),
    period: z.enum(['day', 'week', 'month']),
    target: z.number().int().min(1).max(28),
    difficulty,
    reminders: z.array(z.object({ day: z.number().int().min(1).max(31).optional(), time })).max(28).optional(),
  }),
} as const;

export type ActionName = keyof typeof ACTION_SCHEMAS;
export const ACTION_NAMES = Object.keys(ACTION_SCHEMAS) as ActionName[];
export type ActionArgs<A extends ActionName = ActionName> = z.infer<(typeof ACTION_SCHEMAS)[A]>;
export type Proposal = { [A in ActionName]: { action: A; args: ActionArgs<A> } }[ActionName];

const DESCRIPTIONS: Record<ActionName, string> = {
  create_mission: 'Propose a one-off mission (task) with optional deadline date and reminder time.',
  create_goal: 'Propose a goal split into ordered milestones; each milestone becomes a mission when the previous one is done.',
  create_rest: 'Propose rest days (from–to) when the user will not do their activities (trip, illness, day off).',
  create_activity: 'Propose a recurring activity (habit): N times per day, week or month, with optional reminders.',
};

/** Herramientas para Mistral (AC-03). */
export function actionTools() {
  return ACTION_NAMES.map((name) => ({
    type: 'function' as const,
    function: { name, description: DESCRIPTIONS[name], parameters: z.toJSONSchema(ACTION_SCHEMAS[name], { target: 'draft-7' }) },
  }));
}

/** Reglas para la IA (AC-04 y lo aprendido en el banco de pruebas, R12-2). */
export const ACTION_RULES = [
  'If, and only if, the user explicitly asks you to create, add, plan or schedule a mission, goal, activity or rest days, call exactly ONE tool. Otherwise just talk.',
  'Use only category ids from context.categories. Resolve relative dates with context.calendar (today, the next days with their weekday, end of week, end of month).',
  '"this month" = context.calendar.endOfMonth; "this week" = context.calendar.endOfWeek; "next month" = the next month.',
  'Never add reminders, dates, times or a target date the user did not mention. Titles: short, at most 60 characters.',
  'Weekly reminders: day 1 = Monday … 7 = Sunday. Monthly: day of month 1–31. Daily: no day. Times are 24 h HH:MM.',
  'When you call a tool, do not say it is already created: the user still has to confirm it.',
].join('\n');

/** Calendario para resolver fechas relativas (AC-04). */
export function calendarContext(today: LocalDate, time: string) {
  const name = (d: LocalDate) => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][isoWeekday(d) - 1]!;
  const [y, m] = today.split('-').map(Number) as [number, number];
  const endOfMonth = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return {
    today,
    weekday: name(today),
    time,
    endOfWeek: addDays(today, 7 - isoWeekday(today)),
    endOfMonth,
    endOfNextMonth: `${ny}-${String(nm).padStart(2, '0')}-${String(daysInMonth(ny, nm)).padStart(2, '0')}`,
    next7Days: Array.from({ length: 7 }, (_, i) => ({ date: addDays(today, i + 1), weekday: name(addDays(today, i + 1)) })),
  };
}

export type ProposalCheck =
  | { ok: true; proposal: Proposal }
  | { ok: false; error: string; /** Lo que se pudo entender, para abrir el formulario (AC-06). */ partial?: { action: ActionName; args: unknown } };

/**
 * Valida y limpia los argumentos de una acción (AC-03): esquema, fechas no pasadas, categorías conocidas, veces dentro
 * de los límites; quita lo imposible (día en recordatorios diarios, hora sin fecha, recordatorios de más).
 */
export function checkProposal(name: string, raw: unknown, ctx: { today: LocalDate; categoryIds: readonly string[] }): ProposalCheck {
  if (!(name in ACTION_SCHEMAS)) return { ok: false, error: `unknown tool ${name}` };
  const action = name as ActionName;
  const parsed = ACTION_SCHEMAS[action].safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `${issue?.path.join('.') || 'arguments'}: ${issue?.message ?? 'invalid'}`, partial: { action, args: raw } };
  }
  const args = parsed.data as Record<string, unknown>;
  const fail = (error: string): ProposalCheck => ({ ok: false, error, partial: { action, args } });
  const past = (d?: string) => !!d && compareDates(d as LocalDate, ctx.today) < 0;
  if ('categoryId' in args && !ctx.categoryIds.includes(args.categoryId as string)) return fail(`categoryId must be one of: ${ctx.categoryIds.join(', ')}`);

  switch (action) {
    case 'create_mission': {
      const a = args as ActionArgs<'create_mission'>;
      if (past(a.deadline)) return fail('deadline is in the past');
      return { ok: true, proposal: { action, args: { ...a, time: a.deadline ? a.time : undefined } } };
    }
    case 'create_goal': {
      const a = args as ActionArgs<'create_goal'>;
      if (past(a.targetDate)) return fail('targetDate is in the past');
      if (a.milestones.some((m) => past(m.deadline))) return fail('a milestone deadline is in the past');
      return { ok: true, proposal: { action, args: { ...a, milestones: a.milestones.map((m) => ({ ...m, time: m.deadline ? m.time : undefined })) } } };
    }
    case 'create_rest': {
      const a = args as ActionArgs<'create_rest'>;
      if (past(a.from)) return fail('from is in the past');
      if (compareDates(a.to as LocalDate, a.from as LocalDate) < 0) return fail('to is before from');
      return { ok: true, proposal: { action, args: a } };
    }
    case 'create_activity': {
      const a = args as ActionArgs<'create_activity'>;
      const max = TARGET_LIMITS[a.period];
      if (a.target > max) return fail(`target for ${a.period} must be at most ${max}`);
      const maxDay = a.period === 'week' ? 7 : 31;
      const reminders = (a.reminders ?? [])
        .slice(0, a.target)
        .map((r) => (a.period === 'day' ? { time: r.time } : r))
        .filter((r) => a.period === 'day' || (r.day !== undefined && r.day <= maxDay));
      return { ok: true, proposal: { action, args: { ...a, reminders: reminders.length ? reminders : undefined } } };
    }
  }
}
