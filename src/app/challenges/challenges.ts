// Retos en la app (spec 15, §3.2 a §3.6): crear, unirse, abandonar, cancelar y sincronizar. La copia local vive en la
// tabla `challenges`; al servidor solo van las fechas cumplidas de la actividad del reto (SY-02, NFR15-01).
import { changeStatus, createActivity, loadRecord, type DataContext } from '../../data/repository';
import {
  MARK_GRACE_DAYS,
  endDate,
  inRange,
  type Challenge,
  type ChallengeDifficulty,
  type ChallengeMode,
  type ChallengeView,
  type LocalChallenge,
} from '../../domain/challenges/challenges';
import { addDays, toLocalDate, type LocalDate } from '../../domain/time/localDate';
import type { DeviceAccount } from '../account/account';
import { social } from '../friends/friends';

export interface ChallengeInput {
  name: string;
  difficulty: ChallengeDifficulty;
  days: number;
  start: string;
  mode: ChallengeMode;
}

const todayOf = (ctx: DataContext) => toLocalDate(ctx.now());

/** Enlace del reto (IN-01). */
export const challengeLink = (id: string) => `${location.origin}/r/${id}`;

export const getChallenge = (a: DeviceAccount, id: string) => social<ChallengeView>(a, 'GET', `challenges/${encodeURIComponent(id)}`);

async function saveView(ctx: DataContext, view: ChallengeView, patch: Partial<LocalChallenge> = {}) {
  const prev = await ctx.db.challenges.get(view.challenge.id);
  await ctx.db.challenges.put({ ...prev, ...patch, id: view.challenge.id, view, fetchedAt: ctx.now().toISOString() });
}

/** La actividad del reto: diaria, 1 vez, con el nombre y la dificultad del reto y el área elegida (RT-07). */
async function createChallengeActivity(ctx: DataContext, c: Challenge, categoryId: string) {
  return createActivity(ctx, { name: c.name, challengeId: c.id, config: { period: 'day', target: 1, difficulty: c.difficulty, categoryId } });
}

/** RT-03: el creador es el primer participante y se le crea su actividad. */
export async function createChallenge(ctx: DataContext, account: DeviceAccount, input: ChallengeInput, categoryId: string): Promise<string> {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/create', { ...input, today: todayOf(ctx) });
  const activityId = await createChallengeActivity(ctx, view.challenge, categoryId);
  await saveView(ctx, view, { activityId, sent: [] });
  return view.challenge.id;
}

/** IN-04: unirse crea siempre una actividad nueva (D-145). */
export async function joinChallenge(ctx: DataContext, account: DeviceAccount, id: string, categoryId: string): Promise<ChallengeView> {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/join', { id, today: todayOf(ctx) });
  const local = await ctx.db.challenges.get(id);
  const activityId = local?.activityId ?? (await createChallengeActivity(ctx, view.challenge, categoryId));
  await saveView(ctx, view, { activityId, sent: local?.sent ?? [] });
  return view;
}

/** MK-04: abandonar archiva la actividad; sus días se quedan. */
export async function leaveChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  await syncMarks(ctx, account).catch(() => undefined);
  const view = await social<ChallengeView>(account, 'POST', 'challenges/leave', { id, today: todayOf(ctx) });
  await saveView(ctx, view, { left: true });
  await archiveActivity(ctx, id);
}

/** RT-04: solo el creador y antes de que empiece. */
export async function cancelChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  const view = await social<ChallengeView>(account, 'POST', 'challenges/cancel', { id, today: todayOf(ctx) });
  await saveView(ctx, view);
  await archiveActivity(ctx, id);
}

async function archiveActivity(ctx: DataContext, challengeId: string) {
  const local = await ctx.db.challenges.get(challengeId);
  if (local?.activityId) await changeStatus(ctx, local.activityId, 'archived');
}

/**
 * Descarga el progreso de todos los retos (SY-05) y archiva la actividad de los terminados, cancelados o abandonados
 * (RT-11). Un reto en el que ya no estás (por ejemplo, tras restaurar en otro dispositivo) se queda con la última copia.
 */
export async function refreshChallenges(ctx: DataContext, account: DeviceAccount) {
  const { challenges } = await social<{ challenges: ChallengeView[] }>(account, 'GET', 'challenges/mine');
  const today = todayOf(ctx);
  for (const view of challenges) {
    const me = view.participants.find((p) => p.id === account.id);
    await saveView(ctx, view, { left: !!me?.left });
    if (view.challenge.cancelled || me?.left || endDate(view.challenge) < today) {
      const local = await ctx.db.challenges.get(view.challenge.id);
      const record = local?.activityId ? await loadRecord(ctx.db, local.activityId) : undefined;
      const archived = record?.events.some((e) => e.type === 'archived');
      if (local?.activityId && !archived) await changeStatus(ctx, local.activityId, 'archived');
    }
  }
}

/** Refresca un reto (al entrar en él, SY-05). */
export async function refreshChallenge(ctx: DataContext, account: DeviceAccount, id: string) {
  const view = await getChallenge(account, id);
  await saveView(ctx, view);
  return view;
}

/**
 * Envía las fechas cumplidas que faltan y retira las deshechas (SY-02), dentro del margen de SY-04. Compara lo
 * registrado en la actividad con lo que el servidor ya tiene; sin cambios no llama al servidor.
 */
export async function syncMarks(ctx: DataContext, account: DeviceAccount) {
  const today = todayOf(ctx);
  const from = addDays(today as LocalDate, -MARK_GRACE_DAYS);
  for (const local of await ctx.db.challenges.toArray()) {
    const c = local.view.challenge;
    if (!local.activityId || local.left || c.cancelled) continue;
    const me = local.view.participants.find((p) => p.id === account.id);
    if (!me) continue;
    const record = await loadRecord(ctx.db, local.activityId);
    if (!record) continue;
    const window = (d: string) => inRange(c, d) && d >= from && d <= today;
    const logged = new Set(record.completions.map((x) => x.date as string).filter(window));
    const server = new Set(me.done.filter(window));
    let done = me.done;
    for (const date of logged) if (!server.has(date)) ({ done } = await social<{ done: string[] }>(account, 'POST', 'challenges/mark', { id: c.id, date }));
    for (const date of server) if (!logged.has(date)) ({ done } = await social<{ done: string[] }>(account, 'POST', 'challenges/unmark', { id: c.id, date }));
    if (done !== me.done) {
      const participants = local.view.participants.map((p) => (p.id === account.id ? { ...p, done } : p));
      await ctx.db.challenges.update(c.id, { view: { ...local.view, participants } });
    }
  }
}
